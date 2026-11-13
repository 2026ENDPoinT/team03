// Only forwards a deliberate click from this local development web app.
window.addEventListener('message',(event)=>{
 if (event.source!==window || event.origin!==location.origin || event.data?.type!=='ASTRA_SYNC_REQUEST') return;
 const mode=event.data.mode === 'dated' ? 'dated' : 'weekly';
 chrome.runtime.sendMessage({type:'ASTRA_SYNC',mode}, (response)=>{
   const error=chrome.runtime.lastError?.message;
   window.postMessage({type:'ASTRA_SYNC_RESULT',requestId:event.data.requestId,
     response:error?{ok:false,error}:{...response}},location.origin);
 });
});
