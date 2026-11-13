// ASTRA TODOs are stored separately from manually entered assignments.
const express = require('express');
const db = require('../db');
const router = express.Router();

db.exec(`
 CREATE TABLE IF NOT EXISTS astra_assignments (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   source_key TEXT NOT NULL UNIQUE,
   subject_name TEXT NOT NULL,
   assignment_name TEXT NOT NULL,
   due_at TEXT,
   imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 );
`);
// Safe migration of the old table: preserve all existing records.
const fields = new Set(db.prepare('PRAGMA table_info(astra_assignments)').all().map(x => x.name));
for (const [name,sql] of [
  ['course_id','TEXT'], ['activity_id','TEXT'], ['activity_type','TEXT'],
  ['start_at','TEXT'], ['due_date_text','TEXT']
]) {
  if (!fields.has(name)) db.exec(`ALTER TABLE astra_assignments ADD COLUMN ${name} ${sql}`);
}
db.exec(`CREATE INDEX IF NOT EXISTS idx_astra_assignments_due_at ON astra_assignments(due_at)`);

function validDateTime(value) {
  if (value === null) return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
  const [date,time] = value.split('T');
  const stamp = new Date(date + 'T00:00:00Z');
  if (Number.isNaN(stamp.getTime()) || stamp.toISOString().slice(0,10) !== date) return false;
  const [h,m] = time.split(':').map(Number);
  return h <= 23 && m <= 59;
}
const insert = db.prepare(`INSERT OR IGNORE INTO astra_assignments
 (source_key,subject_name,assignment_name,due_at,course_id,activity_id,activity_type,start_at,due_date_text)
 VALUES (?,?,?,?,?,?,?,?,?)`);
const update = db.prepare(`UPDATE astra_assignments
 SET subject_name=?,assignment_name=?,due_at=?,course_id=?,activity_id=?,activity_type=?,start_at=?,due_date_text=?,imported_at=CURRENT_TIMESTAMP
 WHERE source_key=? AND (subject_name IS NOT ? OR assignment_name IS NOT ? OR due_at IS NOT ?
 OR course_id IS NOT ? OR activity_id IS NOT ? OR activity_type IS NOT ? OR start_at IS NOT ? OR due_date_text IS NOT ?)`);
const list = db.prepare(`SELECT id, source_key AS sourceKey, subject_name AS subjectName,
 assignment_name AS assignmentName, due_at AS dueAt, imported_at AS importedAt,
 course_id AS courseId, activity_id AS activityId, activity_type AS activityType,
 start_at AS startAt, due_date_text AS dueDateText
 FROM astra_assignments ORDER BY (due_at IS NULL), due_at, id`);

router.get('/', (_req,res) => {
  try { res.json(list.all()); }
  catch (err) {console.error(err);res.status(500).json({message:'ASTRA 할일 조회 실패'});}
});
router.post('/sync', (req,res) => {
  const assignments=req.body?.assignments;
  if (!Array.isArray(assignments) || assignments.length < 1 || assignments.length > 100) {
    return res.status(400).json({message:'assignments 배열(1~100개)이 필요합니다.'});
  }
  const clean=[];
  for (const row of assignments) {
    if (!row || typeof row.courseId !== 'string' || !/^A[\w-]{1,100}$/.test(row.courseId) ||
      typeof row.activityId !== 'string' || !/^[\w-]{1,100}$/.test(row.activityId) ||
      !['assignment','discussion','video'].includes(row.activityType) ||
      typeof row.subjectName !== 'string' || !row.subjectName.trim() || row.subjectName.length > 200 ||
      typeof row.assignmentName !== 'string' || !row.assignmentName.trim() || row.assignmentName.length > 300 ||
      !validDateTime(row.dueAt ?? null) || !validDateTime(row.startAt ?? null) ||
      (row.dueDateText != null && (typeof row.dueDateText !== 'string' || row.dueDateText.length > 300))) {
      return res.status(400).json({message:'할일 데이터 형식 또는 정규과목 ID를 확인해 주세요.'});
    }
    const activityCode = {assignment:'report', discussion:'discuss', video:'lecture_weeks'}[row.activityType];
    const sourceKey=`${row.courseId}:${activityCode}:${row.activityId}`;
    // Never trust a client-provided key for de-duplication.
    clean.push({key:sourceKey,subject:row.subjectName.trim(),name:row.assignmentName.trim(),
      due:row.dueAt ?? null,courseId:row.courseId,activityId:row.activityId,
      type:row.activityType,start:row.startAt ?? null,dueText:row.dueDateText ?? null});
  }
  try {
    const result=db.transaction(() => {
      let added=0,updated=0,skipped=0;
      for (const x of clean) {
        const values=[x.subject,x.name,x.due,x.courseId,x.activityId,x.type,x.start,x.dueText];
        if (insert.run(x.key,...values).changes) {added++;continue;}
        if (update.run(...values,x.key,...values).changes) updated++;
        else skipped++;
      }
      return {added,updated,skipped};
    })();
    res.json({message:'ASTRA 할일 저장 완료',total:clean.length,...result});
  } catch (err) {console.error(err);res.status(500).json({message:'ASTRA 할일 저장 실패'});}
});
module.exports=router;
