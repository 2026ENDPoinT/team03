const API_BASE = "http://localhost:3000";

function minuteOfDay(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value ?? ""));
  if (!match) return NaN;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return NaN;
  return hour * 60 + minute;
}

// 기존 WEEKLY가 사용하는 {day,start,duration,title,room,type} 형식으로 변환.
// start/duration은 30분 단위이며 hours[0]을 시작 시간으로 사용한다.
export function convertTimetableClass(course, hours) {
  const base = minuteOfDay(hours?.[0]);
  const from = minuteOfDay(course.startTime);
  const to = minuteOfDay(course.endTime);
  const day = Number(course.dayOfWeek);

  if (!Number.isFinite(base) || !Number.isFinite(from) || !Number.isFinite(to)) return null;
  if (!Number.isInteger(day) || day < 0 || day > 6 || to <= from) return null;
  if ((from - base) % 30 !== 0 || (to - from) % 30 !== 0) return null;

  return {
    id: `astra-db-${course.id}`,
    day,
    start: (from - base) / 30,
    duration: (to - from) / 30,
    title: course.subjectName || "이름 없는 수업",
    room: course.instructor || "",
    type: "green",
    source: "timetable-api",
    backendId: course.id,
    startTime: course.startTime,
    endTime: course.endTime,
  };
}

export async function fetchTimetableItems(hours) {
  const response = await fetch(`${API_BASE}/api/timetable`);
  if (!response.ok) throw new Error(`시간표 조회 실패 (${response.status})`);
  const data = await response.json();
  if (!Array.isArray(data.classes)) throw new Error("시간표 API 응답에 classes 배열이 없습니다.");
  const converted = data.classes.map((course) => convertTimetableClass(course, hours));
  const invalid = converted.filter((item) => item === null).length;
  if (invalid) console.warn(`시간표 ${invalid}개를 변환하지 못했습니다. 요일/시간 형식을 확인하세요.`);
  return converted.filter(Boolean);
}

// React 로컬에서 추가한 수업·불가능 시간은 보존하고 서버 수업만 새 목록으로 교체.
export function mergeTimetableItems(previous, incoming) {
  return [
    ...previous.filter((item) => item.source !== "timetable-api"),
    ...incoming,
  ];
}
