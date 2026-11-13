chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!['ASTRA_SYNC', 'ASTRA_TODO_SYNC'].includes(request?.type)) return;
  (async () => {
    const pageUrl = sender.tab?.url || '';
    if (!/^http:\/\/(localhost|127\.0\.0\.1):5173\//.test(pageUrl)) {
      throw new Error('로컬 웹앱(5173)에서만 사용할 수 있습니다.');
    }
    const tabs = await chrome.tabs.query({url:'https://eclass.seoultech.ac.kr/*'});
    if (!tabs.length) throw new Error('ASTRA에 로그인한 탭을 먼저 열어 주세요.');
    // For TODO extraction, prefer the ASTRA main page over lecture tabs.
    const tab = request.type === 'ASTRA_TODO_SYNC'
      ? (tabs.find(t => t.url?.includes('/ilos/main/main_form.acl')) || tabs[0])
      : (tabs.find(t => t.active) || tabs[0]);

    if (request.type === 'ASTRA_TODO_SYNC') {
      const injected = await chrome.scripting.executeScript({target:{tabId:tab.id},files:['extractTodos.js']});
      const extracted = injected?.[0]?.result;
      if (!extracted?.activities?.length) throw new Error('ASTRA 할일 정보를 읽지 못했습니다.');
      const response = await fetch('http://localhost:3000/api/astra/assignments/sync', {
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({assignments:extracted.activities})
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || '할일 저장 실패');
      return {...json, scanned:extracted.scanned,
        excludedNonregular:extracted.excludedNonregular,
        excludedUnknown:extracted.excludedUnknown,
        unparsedDates:extracted.unparsedDates};
    }

    // Original timetable sync remains intact.
    const injected = await chrome.scripting.executeScript({target:{tabId:tab.id},files:['extract.js']});
    if (!injected?.[0]?.result) throw new Error('ASTRA 시간표를 읽지 못했습니다.');
    const {classes,weekStart,schoolYear} = injected[0].result;
    const mode = request.mode === 'dated' ? 'dated' : 'weekly';
    let data=classes;
    if (mode === 'dated') {
      if (!weekStart) throw new Error('화면에서 주간 시작 날짜를 읽지 못했습니다.');
      const sunday = new Date(weekStart + 'T00:00:00Z');
      if (Number.isNaN(sunday.getTime())) throw new Error('주간 날짜가 올바르지 않습니다.');
      data=classes.map(c => {
        const d=new Date(sunday);
        d.setUTCDate(d.getUTCDate() + (c.dayOfWeek % 7));
        return {...c,eventDate:d.toISOString().slice(0,10)};
      });
    }
    const response=await fetch('http://localhost:3000/api/astra/sync',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({mode,classes:data,schoolYear})
    });
    const json=await response.json();
    if (!response.ok) throw new Error(json.message || '백엔드 저장 실패');
    return json;
  })().then(result => sendResponse({ok:true,result}))
    .catch(err => sendResponse({ok:false,error:err.message}));
  return true;
});
