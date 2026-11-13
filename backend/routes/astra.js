const express = require('express');
const db = require('../db');
const router = express.Router();

// Imported classes remain separate from manually added records.
db.exec(`
 CREATE TABLE IF NOT EXISTS astra_imports (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   subject_name TEXT NOT NULL,
   instructor TEXT NOT NULL DEFAULT '',
   day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
   start_time TEXT NOT NULL,
   end_time TEXT NOT NULL,
   event_date TEXT,
   mode TEXT NOT NULL CHECK (mode IN ('weekly','dated')),
   created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 );
 CREATE UNIQUE INDEX IF NOT EXISTS astra_imports_unique
 ON astra_imports(subject_name, instructor, day_of_week, start_time, end_time, COALESCE(event_date,''), mode);
 CREATE TABLE IF NOT EXISTS astra_profile (
   id INTEGER PRIMARY KEY CHECK(id=1),
   school_year INTEGER CHECK (school_year BETWEEN 1 AND 6),
   updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 );
`);

function minutes(t) {
  if (typeof t !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function dateValid(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0,10) === s;
}
const selectExisting = db.prepare(`SELECT 1 FROM timetable_classes
 WHERE subject_name=? AND day_of_week=? AND start_time=? AND end_time=? LIMIT 1`);
const insertImported = db.prepare(`INSERT OR IGNORE INTO astra_imports
 (subject_name,instructor,day_of_week,start_time,end_time,event_date,mode)
 VALUES (@subjectName,@instructor,@dayOfWeek,@startTime,@endTime,@eventDate,@mode)`);
const insertWeekly = db.prepare(`INSERT INTO timetable_classes
 (subject_name,instructor,day_of_week,start_time,end_time) VALUES (?,?,?,?,?)`);
const profileUpsert = db.prepare(`INSERT INTO astra_profile (id,school_year,updated_at)
 VALUES (1,?,CURRENT_TIMESTAMP)
 ON CONFLICT(id) DO UPDATE SET school_year=excluded.school_year, updated_at=CURRENT_TIMESTAMP`);

router.post('/sync', (req,res) => {
  const { classes, mode, schoolYear } = req.body || {};
  if (!Array.isArray(classes) || classes.length < 1 || classes.length > 100 ||
      !['weekly','dated'].includes(mode)) {
    return res.status(400).json({message:'classes(1~100개) 및 mode(weekly/dated)를 확인해 주세요.'});
  }
  if (schoolYear !== null && schoolYear !== undefined &&
      (!Number.isInteger(schoolYear) || schoolYear < 1 || schoolYear > 6)) {
    return res.status(400).json({message:'학년 정보가 올바르지 않습니다.'});
  }
  const clean = [];
  for (const x of classes) {
    if (!x || typeof x.subjectName !== 'string' || !x.subjectName.trim() || x.subjectName.length > 200 ||
        (x.instructor !== undefined && typeof x.instructor !== 'string') ||
        !Number.isInteger(x.dayOfWeek) || x.dayOfWeek < 1 || x.dayOfWeek > 7 ||
        minutes(x.startTime) === null || minutes(x.endTime) === null ||
        minutes(x.startTime) >= minutes(x.endTime) ||
        (mode === 'dated' && !dateValid(x.eventDate))) {
      return res.status(400).json({message:'시간표에 유효하지 않은 항목이 있습니다.', item:x?.subjectName});
    }
    clean.push({subjectName:x.subjectName.trim(), instructor:(x.instructor || '').trim().slice(0,100),
      dayOfWeek:x.dayOfWeek, startTime:x.startTime, endTime:x.endTime,
      eventDate:mode === 'dated' ? x.eventDate : null, mode});
  }
  try {
    const result = db.transaction(() => {
      let added=0, skipped=0;
      for (const x of clean) {
        const wasInserted = insertImported.run(x).changes > 0;
        if (!wasInserted) { skipped++; continue; }
        if (mode === 'weekly') {
          if (selectExisting.get(x.subjectName,x.dayOfWeek,x.startTime,x.endTime)) {
            skipped++;
            // Already in the existing timetable; keep import key to avoid retries.
            continue;
          }
          insertWeekly.run(x.subjectName,x.instructor,x.dayOfWeek,x.startTime,x.endTime);
        }
        added++;
      }
      if (Number.isInteger(schoolYear)) profileUpsert.run(schoolYear);
      return {added, skipped};
    })();
    return res.json({message:'ASTRA 동기화 처리 완료', mode, total:clean.length, ...result,
      note:mode === 'dated' ? '일회성 일정은 /api/astra/events에서 조회합니다.' : '기존 시간표 API에서 확인할 수 있습니다.'});
  } catch(err) {
    console.error('ASTRA 동기화 저장 실패:',err);
    return res.status(500).json({message:'시간표 저장에 실패했습니다.'});
  }
});
router.get('/events', (_req,res) => {
  const events=db.prepare(`SELECT id,subject_name AS subjectName,instructor,
    day_of_week AS dayOfWeek,start_time AS startTime,end_time AS endTime,
    event_date AS eventDate FROM astra_imports WHERE mode='dated' ORDER BY event_date,start_time`).all();
  res.json(events);
});
router.get('/profile', (_req,res) => {
  res.json(db.prepare('SELECT school_year AS schoolYear,updated_at AS updatedAt FROM astra_profile WHERE id=1').get() || {schoolYear:null});
});
module.exports=router;
