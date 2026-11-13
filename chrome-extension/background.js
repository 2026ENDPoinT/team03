chrome.runtime.onMessage.addListener((request,sender,sendResponse)=>{
 if (request?.type !== 'ASTRA_SYNC') return;
 (async()=>{
   if (!sender.tab?.url?.startsWith('http://localhost:5173/') &&
       !sender.tab?.url?.startsWith('http://127.0.0.1:5173/')) throw new Error('로컬 웹앱에서만 사용할 수 있습니다.');
   const tabs=await chrome.tabs.query({url:'https://eclass.seoultech.ac.kr/*'});
   if (!tabs.length) throw new Error('ASTRA에 로그인한 탭을 먼저 열어 주세요.');
   const tab=tabs.find(t=>t.active) || tabs[0];
   const injected=await chrome.scripting.executeScript({target:{tabId:tab.id},files:['extract.js']});
   if (!injected?.[0]?.result) throw new Error('ASTRA 시간표를 읽지 못했습니다.');
   const {classes,weekStart,schoolYear}=injected[0].result;
   const mode=request.mode === 'dated' ? 'dated' : 'weekly';
   let data=classes;
   if (mode === 'dated') {
     if (!weekStart) throw new Error('화면에서 주간 시작 날짜를 읽지 못했습니다.');
     const monday = new Date(weekStart+'T00:00:00Z');
     if (Number.isNaN(monday.getTime())) throw new Error('주간 날짜가 올바르지 않습니다.');
     // ASTRA's displayed week starts on Sunday.
     data=classes.map(c=>{
       const d=new Date(monday);
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
 })().then(result=>sendResponse({ok:true,result})).catch(err=>sendResponse({ok:false,error:err.message}));
 return true;
});
