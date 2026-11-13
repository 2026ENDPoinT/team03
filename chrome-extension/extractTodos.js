// Injected into the logged-in ASTRA HOME page only. No credentials are read.
(() => {
  const typeMap = { report: 'assignment', discuss: 'discussion', lecture_weeks: 'video' };
  const rows = [...document.querySelectorAll('a.aside_list_todo_item')];
  if (!rows.length) throw new Error('ASTRA 홈 화면에서 할일 목록을 찾지 못했습니다. 홈으로 이동하고 더보기를 눌러 주세요.');

  // ASTRA displays many dates without the year. Resolve them against the
  // calendar's year, falling back to the user's local year when not visible.
  const calendarText = document.body.innerText.match(/(20\d{2})년\s*(\d{1,2})월/);
  const now = new Date();
  const baseYear = calendarText ? Number(calendarText[1]) : now.getFullYear();
  function parseKoreanDate(text) {
    if (!text) return null;
    const tokens = [...text.matchAll(/(?:(20\d{2})년\s*)?(\d{1,2})월\s*(\d{1,2})일(?:\s*\([^)]*\))?\s*(오전|오후)?\s*(\d{1,2}):(\d{2})/g)];
    if (!tokens.length) return null;
    const m = tokens[tokens.length - 1]; // For videos, the last date is usually the viewing deadline.
    const month = Number(m[2]), day = Number(m[3]);
    let hour = Number(m[5]), minute = Number(m[6]);
    if (month < 1 || month > 12 || minute > 59 || hour > 23) return null;
    if (m[4] === '오후' && hour < 12) hour += 12;
    if (m[4] === '오전' && hour === 12) hour = 0;
    const years = m[1] ? [Number(m[1])] : [baseYear - 1, baseYear, baseYear + 1];
    const valid = years.map(year => {
      const d = new Date(year, month - 1, day, hour, minute);
      return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day ? {year, d} : null;
    }).filter(Boolean);
    if (!valid.length) return null;
    // Without a year, choose the date nearest now; avoid made-up dates too far away.
    const chosen = m[1] ? valid[0] : valid.sort((a,b) => Math.abs(a.d-now)-Math.abs(b.d-now))[0];
    if (!m[1] && Math.abs(chosen.d-now) > 200 * 86400000) return null;
    return `${chosen.year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
  }

  let excludedNonregular=0, excludedUnknown=0, unparsedDates=0;
  const activities=[];
  for (const item of rows) {
    const raw=item.getAttribute('onclick') || '';
    const match=raw.match(/goLecture\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/);
    if (!match) { excludedUnknown++; continue; }
    const [,courseId,activityType,activityId] = match;
    if (!courseId.startsWith('A')) { excludedNonregular++; continue; }
    if (!Object.hasOwn(typeMap,activityType)) { excludedUnknown++; continue; }
    const title=item.querySelector('.aside_list_title')?.textContent.trim();
    const subjectName=item.querySelector('.aside_list_info')?.textContent.trim();
    const dueDateText=item.querySelector('.aside_list_date')?.textContent.trim() || '';
    if (!title || !subjectName) { excludedUnknown++; continue; }
    const dueAt=parseKoreanDate(dueDateText);
    if (!dueAt) unparsedDates++;
    activities.push({
      sourceKey: `${courseId}:${activityType}:${activityId}`,
      courseId, activityId, activityType: typeMap[activityType],
      subjectName, assignmentName: title, dueAt,
      dueDateText
    });
  }
  if (!activities.length) throw new Error('가져올 정규과목 할일이 없습니다. 할일 목록과 정규과목 여부를 확인해 주세요.');
  return {activities, scanned:rows.length, excludedNonregular, excludedUnknown, unparsedDates};
})()
