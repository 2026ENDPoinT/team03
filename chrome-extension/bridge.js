// Allow explicit sync requests from the local development web application only.
window.addEventListener('message', (event) => {
  if (event.source !== window || event.origin !== location.origin) return;
  const typeMap = {
    ASTRA_SYNC_REQUEST: ['ASTRA_SYNC','ASTRA_SYNC_RESULT'],
    ASTRA_TODO_SYNC_REQUEST: ['ASTRA_TODO_SYNC','ASTRA_TODO_SYNC_RESULT']
  };
  const mapping = typeMap[event.data?.type];
  if (!mapping) return;
  const [requestType,resultType]=mapping;
  const request = {type:requestType};
  if (requestType === 'ASTRA_SYNC') request.mode = event.data.mode === 'dated' ? 'dated' : 'weekly';
  chrome.runtime.sendMessage(request, (response) => {
    const error=chrome.runtime.lastError?.message;
    window.postMessage({type:resultType,requestId:event.data.requestId,
      response:error ? {ok:false,error} : (response || {ok:false,error:'확장 프로그램에서 응답을 받지 못했습니다.'})},location.origin);
  });
});
