const express = require("express");
const db = require("../db");

const router = express.Router();

const dayNames = {
    1: "월요일",
    2: "화요일",
    3: "수요일",
    4: "목요일",
    5: "금요일",
    6: "토요일",
    7: "일요일"
};

function isValidDay(dayOfWeek) {
    return Number.isInteger(dayOfWeek) &&
        dayOfWeek >= 1 &&
        dayOfWeek <= 7;
}

// HH:mm 형식이며 30분 단위인지 확인합니다.
// 종료 시각에는 24:00을 허용합니다.
function timeToMinutes(time, allow24 = false) {
    if (typeof time !== "string") {
        return null;
    }

    const match = time.match(/^(\d{2}):(\d{2})$/);

    if (!match) {
        return null;
    }

    const hour = Number(match[1]);
    const minute = Number(match[2]);

    if (minute !== 0 && minute !== 30) {
        return null;
    }

    if (allow24 && hour === 24 && minute === 0) {
        return 24 * 60;
    }

    if (hour < 0 || hour > 23) {
        return null;
    }

    return hour * 60 + minute;
}

function isValidTimeRange(startTime, endTime) {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime, true);

    return start !== null && end !== null && start < end;
}

function isValidDate(date) {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false;
    }

    const parsed = new Date(`${date}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === date;
}

const getClasses = db.prepare(`
    SELECT
        id,
        subject_name AS subjectName,
        instructor,
        day_of_week AS dayOfWeek,
        start_time AS startTime,
        end_time AS endTime
    FROM timetable_classes
    ORDER BY day_of_week, start_time
`);

const getUnavailableTimes = db.prepare(`
    SELECT
        id,
        name,
        day_of_week AS dayOfWeek,
        start_time AS startTime,
        end_time AS endTime,
        repeat_weekly AS repeatWeekly,
        date
    FROM unavailable_times
    ORDER BY day_of_week, start_time
`);

router.get("/", (req, res) => {
    try {
        res.json({
            classes: getClasses.all(),
            unavailableTimes: getUnavailableTimes.all().map((item) => ({
                ...item,
                repeatWeekly: Boolean(item.repeatWeekly)
            }))
        });
    } catch (error) {
        console.error("시간표 조회 오류:", error);
        res.status(500).json({
            message: "시간표를 불러오지 못했습니다."
        });
    }
});

router.post("/classes", (req, res) => {
    const {
        subjectName,
        instructor = "",
        dayOfWeek,
        startTime,
        endTime
    } = req.body;

    if (typeof subjectName !== "string" || subjectName.trim() === "") {
        return res.status(400).json({
            message: "과목명을 입력해 주세요."
        });
    }

    if (typeof instructor !== "string") {
        return res.status(400).json({
            message: "담당 교수 이름은 문자열로 입력해 주세요."
        });
    }

    if (!isValidDay(dayOfWeek)) {
        return res.status(400).json({
            message: "요일은 월요일 1부터 일요일 7 사이의 숫자로 입력해 주세요."
        });
    }

    if (!isValidTimeRange(startTime, endTime)) {
        return res.status(400).json({
            message: "시작·종료 시각을 30분 단위로 입력해 주세요. 종료는 시작보다 뒤여야 합니다."
        });
    }

    const conflict = db.prepare(`
    SELECT name
    FROM unavailable_times
    WHERE day_of_week = ?
      AND repeat_weekly = 1
      AND start_time < ?
      AND end_time > ?
    LIMIT 1
`).get(dayOfWeek, endTime, startTime);

if (conflict) {
    return res.status(409).json({
        message: `등록하려는 시간은 불가능 시간("${conflict.name}")과 겹칩니다.`
    });
}

    try {
        const result = db.prepare(`
            INSERT INTO timetable_classes
                (subject_name, instructor, day_of_week, start_time, end_time)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            subjectName.trim(),
            instructor.trim(),
            dayOfWeek,
            startTime,
            endTime
        );

        res.status(201).json({
            message: "시간표에 수업이 등록되었습니다.",
            class: {
                id: Number(result.lastInsertRowid),
                subjectName: subjectName.trim(),
                instructor: instructor.trim(),
                dayOfWeek,
                dayName: dayNames[dayOfWeek],
                startTime,
                endTime
            }
        });
    } catch (error) {
        console.error("수업 등록 오류:", error);
        res.status(500).json({
            message: "수업을 등록하지 못했습니다."
        });
    }
});

router.put("/classes/:id", (req, res) => {
    const id = Number(req.params.id);
    const { subjectName, instructor = "", dayOfWeek, startTime, endTime } = req.body;
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "올바른 수업 ID가 아닙니다." });
    if (typeof subjectName !== "string" || subjectName.trim() === "") return res.status(400).json({ message: "과목명을 입력해 주세요." });
    if (typeof instructor !== "string") return res.status(400).json({ message: "담당 교수 이름은 문자열로 입력해 주세요." });
    if (!isValidDay(dayOfWeek)) return res.status(400).json({ message: "요일은 월요일 1부터 일요일 7 사이의 숫자로 입력해 주세요." });
    if (!isValidTimeRange(startTime, endTime)) return res.status(400).json({ message: "시작·종료 시각을 30분 단위로 입력해 주세요. 종료는 시작보다 뒤여야 합니다." });
    try {
        const conflict = db.prepare(`SELECT name FROM unavailable_times WHERE day_of_week = ? AND repeat_weekly = 1 AND start_time < ? AND end_time > ? LIMIT 1`).get(dayOfWeek, endTime, startTime);
        if (conflict) return res.status(409).json({ message: `수정하려는 시간은 불가능 시간("${conflict.name}")과 겹칩니다.` });
        const result = db.prepare(`UPDATE timetable_classes SET subject_name = ?, instructor = ?, day_of_week = ?, start_time = ?, end_time = ? WHERE id = ?`).run(subjectName.trim(), instructor.trim(), dayOfWeek, startTime, endTime, id);
        if (result.changes === 0) return res.status(404).json({ message: "해당 수업을 찾을 수 없습니다." });
        res.json({ message: "시간표 수업을 수정했습니다.", class: { id, subjectName: subjectName.trim(), instructor: instructor.trim(), dayOfWeek, dayName: dayNames[dayOfWeek], startTime, endTime } });
    } catch (error) {
        console.error("수업 수정 오류:", error);
        res.status(500).json({ message: "수업을 수정하지 못했습니다." });
    }
});
router.delete("/classes/:id", (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            message: "올바른 수업 ID가 아닙니다."
        });
    }

    try {
        const result = db.prepare(`
            DELETE FROM timetable_classes
            WHERE id = ?
        `).run(id);

        if (result.changes === 0) {
            return res.status(404).json({
                message: "해당 수업을 찾을 수 없습니다."
            });
        }

        res.json({
            message: "시간표에서 수업을 삭제했습니다."
        });
    } catch (error) {
        console.error("수업 삭제 오류:", error);
        res.status(500).json({
            message: "수업을 삭제하지 못했습니다."
        });
    }
});

router.post("/unavailable-times", (req, res) => {
    const {
        name,
        dayOfWeek,
        startTime,
        endTime,
        repeatWeekly = true,
        date = null
    } = req.body;

    if (typeof name !== "string" || name.trim() === "") {
        return res.status(400).json({
            message: "불가능 시간 이름을 입력해 주세요."
        });
    }

    if (!isValidDay(dayOfWeek)) {
        return res.status(400).json({
            message: "요일은 월요일 1부터 일요일 7 사이의 숫자로 입력해 주세요."
        });
    }

    if (!isValidTimeRange(startTime, endTime)) {
        return res.status(400).json({
            message: "시작·종료 시각을 30분 단위로 입력해 주세요. 종료는 시작보다 뒤여야 합니다."
        });
    }

    if (typeof repeatWeekly !== "boolean") {
        return res.status(400).json({
            message: "repeatWeekly는 true 또는 false로 입력해 주세요."
        });
    }

    if (date !== null && !isValidDate(date)) {
        return res.status(400).json({
            message: "날짜는 YYYY-MM-DD 형식으로 입력해 주세요."
        });
    }

    if (!repeatWeekly && date === null) {
        return res.status(400).json({
            message: "매주 반복하지 않는 일정에는 date를 입력해 주세요."
        });
    }

    const conflict = db.prepare(`
    SELECT subject_name
    FROM timetable_classes
    WHERE day_of_week = ?
      AND start_time < ?
      AND end_time > ?
    LIMIT 1
`).get(dayOfWeek, endTime, startTime);

if (conflict) {
    return res.status(409).json({
        message: `등록하려는 시간은 수업 "${conflict.subject_name}"과 겹칩니다.`
    });
}

    try {
        const result = db.prepare(`
            INSERT INTO unavailable_times
                (name, day_of_week, start_time, end_time, repeat_weekly, date)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            name.trim(),
            dayOfWeek,
            startTime,
            endTime,
            repeatWeekly ? 1 : 0,
            repeatWeekly ? null : date
        );

        res.status(201).json({
            message: "불가능 시간이 등록되었습니다.",
            unavailableTime: {
                id: Number(result.lastInsertRowid),
                name: name.trim(),
                dayOfWeek,
                dayName: dayNames[dayOfWeek],
                startTime,
                endTime,
                repeatWeekly,
                date: repeatWeekly ? null : date
            }
        });
    } catch (error) {
        console.error("불가능 시간 등록 오류:", error);
        res.status(500).json({
            message: "불가능 시간을 등록하지 못했습니다."
        });
    }
});

router.put("/unavailable-times/:id", (req, res) => {
    const id = Number(req.params.id);
    const { name, dayOfWeek, startTime, endTime, repeatWeekly = true, date = null } = req.body;
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "올바른 불가능 시간 ID가 아닙니다." });
    if (typeof name !== "string" || name.trim() === "") return res.status(400).json({ message: "불가능 시간 이름을 입력해 주세요." });
    if (!isValidDay(dayOfWeek)) return res.status(400).json({ message: "요일은 월요일 1부터 일요일 7 사이의 숫자로 입력해 주세요." });
    if (!isValidTimeRange(startTime, endTime)) return res.status(400).json({ message: "시작·종료 시각을 30분 단위로 입력해 주세요. 종료는 시작보다 뒤여야 합니다." });
    if (typeof repeatWeekly !== "boolean") return res.status(400).json({ message: "repeatWeekly는 true 또는 false로 입력해 주세요." });
    if (date !== null && !isValidDate(date)) return res.status(400).json({ message: "날짜는 YYYY-MM-DD 형식으로 입력해 주세요." });
    if (!repeatWeekly && date === null) return res.status(400).json({ message: "매주 반복하지 않는 일정에는 date를 입력해 주세요." });
    try {
        const conflict = db.prepare(`SELECT subject_name FROM timetable_classes WHERE day_of_week = ? AND start_time < ? AND end_time > ? LIMIT 1`).get(dayOfWeek, endTime, startTime);
        if (conflict) return res.status(409).json({ message: `수정하려는 시간은 수업 "${conflict.subject_name}"과 겹칩니다.` });
        const result = db.prepare(`UPDATE unavailable_times SET name = ?, day_of_week = ?, start_time = ?, end_time = ?, repeat_weekly = ?, date = ? WHERE id = ?`).run(name.trim(), dayOfWeek, startTime, endTime, repeatWeekly ? 1 : 0, repeatWeekly ? null : date, id);
        if (result.changes === 0) return res.status(404).json({ message: "해당 불가능 시간을 찾을 수 없습니다." });
        res.json({ message: "불가능 시간을 수정했습니다.", unavailableTime: { id, name: name.trim(), dayOfWeek, dayName: dayNames[dayOfWeek], startTime, endTime, repeatWeekly, date: repeatWeekly ? null : date } });
    } catch (error) {
        console.error("불가능 시간 수정 오류:", error);
        res.status(500).json({ message: "불가능 시간을 수정하지 못했습니다." });
    }
});
router.delete("/unavailable-times/:id", (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            message: "올바른 불가능 시간 ID가 아닙니다."
        });
    }

    try {
        const result = db.prepare(`
            DELETE FROM unavailable_times
            WHERE id = ?
        `).run(id);

        if (result.changes === 0) {
            return res.status(404).json({
                message: "해당 불가능 시간을 찾을 수 없습니다."
            });
        }

        res.json({
            message: "불가능 시간을 삭제했습니다."
        });
    } catch (error) {
        console.error("불가능 시간 삭제 오류:", error);
        res.status(500).json({
            message: "불가능 시간을 삭제하지 못했습니다."
        });
    }
});

module.exports = router;