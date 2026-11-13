
const express = require("express");
const db = require("../db");

const router = express.Router();

// AI 계획표 저장 테이블
db.exec(`
    CREATE TABLE IF NOT EXISTS saved_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        week_start TEXT NOT NULL UNIQUE,
        goal TEXT NOT NULL
            CHECK (goal IN ('major', 'complete', 'deadline')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS saved_plan_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER NOT NULL,
        assignment_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        FOREIGN KEY (plan_id) REFERENCES saved_plans(id)
            ON DELETE CASCADE,
        FOREIGN KEY (assignment_id) REFERENCES astra_assignments(id)
            ON DELETE CASCADE
    );
`);

function validDate(value) {
    if (typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const d = new Date(value + "T00:00:00Z");
    return !Number.isNaN(d.getTime()) &&
        d.toISOString().slice(0, 10) === value;
}

function addDays(value, days) {
    const d = new Date(value + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

function minutes(value, allow24 = false) {
    if (typeof value !== "string") return null;
    const m = /^(\d{2}):(\d{2})$/.exec(value);
    if (!m) return null;

    const h = Number(m[1]);
    const min = Number(m[2]);

    if (allow24 && h === 24 && min === 0) return 1440;
    if (h > 23 || (min !== 0 && min !== 30)) return null;

    return h * 60 + min;
}

function validWeek(value) {
    return validDate(value) &&
        new Date(value + "T00:00:00Z").getUTCDay() === 1;
}

function dayNumber(date) {
    return (new Date(date + "T00:00:00Z").getUTCDay() + 6) % 7 + 1;
}

function getEvents(planId) {
    return db.prepare(`
        SELECT
            e.id,
            e.assignment_id AS assignmentId,
            a.assignment_name AS title,
            a.subject_name AS subjectName,
            a.activity_type AS activityType,
            e.date,
            e.start_time AS startTime,
            e.end_time AS endTime
        FROM saved_plan_events e
        JOIN astra_assignments a ON a.id = e.assignment_id
        WHERE e.plan_id = ?
        ORDER BY e.date, e.start_time, e.id
    `).all(planId).map(e => ({
        ...e,
        durationMinutes: minutes(e.endTime, true) -
                         minutes(e.startTime)
    }));
}

// 일정 한 개의 날짜, 시간, 과제 조건 확인
function checkEvent(event, weekStart) {
    const id = Number(event.assignmentId);
    const { date, startTime, endTime } = event;

    if (!Number.isSafeInteger(id) || id <= 0 ||
        !validDate(date) ||
        date < weekStart || date >= addDays(weekStart, 7)) {
        return "과제 ID 또는 날짜가 올바르지 않습니다.";
    }

    const start = minutes(startTime);
    const end = minutes(endTime, true);

    if (start === null || end === null || start >= end) {
        return "시작·종료 시간은 올바른 30분 단위여야 합니다.";
    }

    const setting = db.prepare(`
        SELECT start_time AS startTime, end_time AS endTime
        FROM planner_settings WHERE id = 1
    `).get();

    if (!setting ||
        start < minutes(setting.startTime) ||
        end > minutes(setting.endTime, true)) {
        return "AI 추천 시간대를 벗어났습니다.";
    }

    const task = db.prepare(`
        SELECT
            a.id,
            a.start_at AS startAt,
            a.due_at AS dueAt,
            s.estimated_minutes AS estimatedMinutes
        FROM astra_assignments a
        JOIN astra_task_settings s
          ON s.astra_assignment_id = a.id
        WHERE a.id = ?
    `).get(id);

    if (!task) return "과제가 없거나 예상 시간이 미설정입니다.";
    if (!task.dueAt) return "과제의 마감일이 없습니다.";

    const eventStart = `${date}T${startTime}`;
    const eventEnd = `${date}T${endTime}`;

    if (eventEnd > task.dueAt ||
        (task.startAt && eventStart < task.startAt)) {
        return "과제 마감일 또는 시청 가능 기간을 벗어났습니다.";
    }

    // 고정 수업과 충돌 확인
    const classConflict = db.prepare(`
        SELECT id FROM timetable_classes
        WHERE day_of_week = ?
          AND start_time < ?
          AND end_time > ?
        LIMIT 1
    `).get(dayNumber(date), endTime, startTime);

    if (classConflict) return "기존 수업과 시간이 겹칩니다.";

    // 알바 및 불가능 시간과 충돌 확인
    const unavailableConflict = db.prepare(`
        SELECT id FROM unavailable_times
        WHERE day_of_week = ?
          AND start_time < ?
          AND end_time > ?
          AND (repeat_weekly = 1 OR date = ?)
        LIMIT 1
    `).get(dayNumber(date), endTime, startTime, date);

    if (unavailableConflict) {
        return "알바 또는 불가능 시간과 겹칩니다.";
    }

    return null;
}

// 일정들 사이의 중복 및 총 소요 시간 검사
function validateEvents(events, weekStart) {
    if (!Array.isArray(events) || events.length > 500) {
        return "events는 최대 500개의 배열이어야 합니다.";
    }

    const durations = new Map();
    const intervals = [];

    for (const e of events) {
        if (!e || typeof e !== "object") {
            return "일정 데이터 형식이 잘못되었습니다.";
        }

        const error = checkEvent(e, weekStart);
        if (error) return `${e.title || e.assignmentId}: ${error}`;

        const id = Number(e.assignmentId);
        const length = minutes(e.endTime, true) -
                       minutes(e.startTime);

        durations.set(id, (durations.get(id) || 0) + length);
        intervals.push(e);
    }

    // AI 일정끼리 겹치는지 확인
    intervals.sort((a, b) =>
        (a.date + a.startTime).localeCompare(b.date + b.startTime)
    );

    for (let i = 1; i < intervals.length; i++) {
        const prev = intervals[i - 1];
        const curr = intervals[i];

        if (prev.date === curr.date &&
            prev.endTime > curr.startTime) {
            return "AI 일정끼리 시간이 겹칩니다.";
        }
    }

    // 과제별 예상 소요 시간을 초과하지 않도록 확인
    for (const [id, total] of durations) {
        const row = db.prepare(`
            SELECT estimated_minutes AS estimatedMinutes
            FROM astra_task_settings
            WHERE astra_assignment_id = ?
        `).get(id);

        const limit = Math.ceil(row.estimatedMinutes / 30) * 30;

// 다른 주에 이미 저장된 동일 과제의 일정 조회
const previousEvents = db.prepare(`
    SELECT
        e.start_time AS startTime,
        e.end_time AS endTime
    FROM saved_plan_events e
    JOIN saved_plans p ON p.id = e.plan_id
    WHERE e.assignment_id = ?
      AND p.week_start <> ?
`).all(id, weekStart);

// 다른 주에 배치된 시간 합산
let previousMinutes = 0;

for (const event of previousEvents) {
    previousMinutes +=
        minutes(event.endTime, true) -
        minutes(event.startTime);
}

// 이번 주와 다른 주의 배치 시간 합산 검증
        if (total + previousMinutes > limit) {
            return `과제 ${id}의 전체 배치 시간이 예상 소요 시간을 초과합니다.`;
        }

    } // 과제별 검사 for문 종료

    return null;
} // validateEvents 함수 종료

// 계획표 저장 (같은 주는 새 계획으로 교체)
router.post("/save", (req, res) => {
    const { weekStart, goal, events } = req.body || {};

    if (!validWeek(weekStart)) {
        return res.status(400).json({
            message: "월요일 날짜를 입력해 주세요."
        });
    }

    if (!["major", "complete", "deadline"].includes(goal)) {
        return res.status(400).json({
            message: "올바른 학습 목표가 아닙니다."
        });
    }

    try {
        const error = validateEvents(events, weekStart);
        if (error) return res.status(400).json({ message: error });

        const save = db.transaction(() => {
            db.prepare(`
                DELETE FROM saved_plans WHERE week_start = ?
            `).run(weekStart);

            const result = db.prepare(`
                INSERT INTO saved_plans (week_start, goal)
                VALUES (?, ?)
            `).run(weekStart, goal);

            const planId = Number(result.lastInsertRowid);

            const insert = db.prepare(`
                INSERT INTO saved_plan_events
                    (plan_id, assignment_id, date, start_time, end_time)
                VALUES (?, ?, ?, ?, ?)
            `);

            for (const e of events) {
                insert.run(
                    planId, Number(e.assignmentId),
                    e.date, e.startTime, e.endTime
                );
            }

            return planId;
        });

        const planId = save();

        res.json({
            message: "AI 계획표가 저장되었습니다.",
            planId,
            weekStart,
            goal,
            events: getEvents(planId)
        });
    } catch (error) {
        console.error("계획표 저장 오류:", error);
        res.status(500).json({
            message: "계획표를 저장하지 못했습니다."
        });
    }
});

// 저장된 계획표 조회
router.get("/saved", (req, res) => {
    const { weekStart } = req.query;

    if (!validWeek(weekStart)) {
        return res.status(400).json({
            message: "월요일 날짜를 입력해 주세요."
        });
    }

    try {
        const plan = db.prepare(`
            SELECT id AS planId, week_start AS weekStart,
                   goal, created_at AS createdAt
            FROM saved_plans
            WHERE week_start = ?
        `).get(weekStart);

        if (!plan) {
            return res.json({
                weekStart,
                plan: null
            });
        }

        res.json({
            weekStart,
            plan: {
                ...plan,
                events: getEvents(plan.planId)
            }
        });
    } catch (error) {
        console.error("계획표 조회 오류:", error);
        res.status(500).json({
            message: "계획표를 불러오지 못했습니다."
        });
    }
});

// 저장된 일정 수정
router.put("/events/:id", (req, res) => {
    const id = Number(req.params.id);
    const { date, startTime, endTime } = req.body || {};

    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ message: "올바른 일정 ID가 아닙니다." });
    }

    try {
        const old = db.prepare(`
            SELECT e.*, p.week_start AS weekStart
            FROM saved_plan_events e
            JOIN saved_plans p ON p.id = e.plan_id
            WHERE e.id = ?
        `).get(id);

        if (!old) {
            return res.status(404).json({ message: "일정이 없습니다." });
        }

        const candidate = {
            assignmentId: old.assignment_id,
            date,
            startTime,
            endTime
        };

        // 수정할 일정 외의 기존 일정도 함께 검증
        const others = getEvents(old.plan_id)
            .filter(e => e.id !== id);

        const error = validateEvents(
            [...others, candidate],
            old.weekStart
        );

        if (error) {
            return res.status(400).json({ message: error });
        }

        db.prepare(`
            UPDATE saved_plan_events
            SET date = ?, start_time = ?, end_time = ?
            WHERE id = ?
        `).run(date, startTime, endTime, id);

        res.json({
            message: "일정이 수정되었습니다.",
            event: { id, ...candidate }
        });
    } catch (error) {
        console.error("일정 수정 오류:", error);
        res.status(500).json({ message: "일정 수정 실패" });
    }
});

// 저장된 일정 삭제
router.delete("/events/:id", (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ message: "올바른 일정 ID가 아닙니다." });
    }

    try {
        const result = db.prepare(`
            DELETE FROM saved_plan_events WHERE id = ?
        `).run(id);

        if (!result.changes) {
            return res.status(404).json({ message: "일정이 없습니다." });
        }

        res.json({ message: "일정이 삭제되었습니다." });
    } catch (error) {
        console.error("일정 삭제 오류:", error);
        res.status(500).json({ message: "일정 삭제 실패" });
    }
});

module.exports = router;
