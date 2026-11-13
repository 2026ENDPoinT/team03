// Runs only on the ASTRA tab. Reads the visible DOM; never reads passwords or cookies.
(() => {
 const container=document.querySelector('.timetable_container');
 if (!container) throw new Error('ASTRA에서 수업시간표 팝업을 열어 주세요.');
 const dayMap={'월':1,'화':2,'수':3,'목':4,'금':5,'토':6,'일':7};
 const blocks=[...container.querySelectorAll('.day_wrap')];
 const classes=[];
 for (const block of blocks) {
   const name=block.querySelector('.day_item')?.textContent.trim();
   const dayOfWeek=dayMap[name];
   if (!dayOfWeek) continue;
   for (const item of block.querySelectorAll('.time_item')) {
     const subjectName=item.querySelector('.font_subtitle5')?.textContent.trim();
     const time=item.querySelector('.lect_time_wrap')?.textContent.trim();
     // In ASTRA, the instructor is the last short label inside .time_info.
     const ellips=[...item.querySelectorAll('.time_info .ellip')];
     const instructor=ellips.at(-1)?.textContent.trim() || '';
     const times=time?.match(/(\d{2}:\d{2})\s*[~～\-]\s*(\d{2}:\d{2})/);
     if (!subjectName || !times) throw new Error('시간표 항목을 읽지 못했습니다. ASTRA 화면 구조를 확인해 주세요.');
     classes.push({subjectName,instructor,dayOfWeek,startTime:times[1],endTime:times[2]});
   }
 }
 if (!classes.length) throw new Error('시간표 수업을 찾지 못했습니다. 팝업을 열어 주세요.');
 const topText=container.textContent.slice(0,300);
 const week=topText.match(/(20\d{2})\.(\d{2})\.(\d{2})\s*[~～-]\s*(20\d{2})\.(\d{2})\.(\d{2})/);
 const weekStart=week ? `${week[1]}-${week[2]}-${week[3]}` : null;
 const schoolYearText=document.querySelector('.dept_grade')?.textContent || '';
 const schoolYear=Number(schoolYearText.match(/(\d+)학년/)?.[1]) || null;
 return {classes,weekStart,schoolYear};
})()
