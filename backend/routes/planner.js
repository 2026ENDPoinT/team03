
const express = require("express");
const db = require("../db");

const router = express.Router();

// 시간을 분 단위로 변환 (예: 10:30 -> 630)
function toMinutes(time) {
    if (typeof time !== "string") return null;

    const match = /^(\d{2}):(\d{2})$/.exec(time);
    if (!match) return null;

    const hour = Number(match[1]);
    const minute = Number(match[2]);

    if (hour === 24 && minute === 0) return 1440;
    if (hour < 0 || hour > 23) return null;
    if (minute !== 0 && minute !== 30) return null;

    return hour * 60 + minute;
}

// 분을 HH:mm 형식으로 변환
function toTime(minutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;

    return String(hour).padStart(2, "0") + ":" +
           String(minute).padStart(2, "0");
}

// YYYY-MM-DD 날짜 유효성 검사
function isValidDate(value) {
    if (typeof value !== "string") return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const date = new Date(value + "T00:00:00Z");

    return !Number.isNaN(date.getTime()) &&
           date.toISOString().slice(0, 10) === value;
}

// 주 시작일을 기준으로 날짜 계산 (월요일부터 일요일)
function addDays(dateString, days) {
    const date = new Date(dateString + "T00:00:00Z");
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

// 빈 시간 계산
function findAvailableSlots(start, end, busyTimes) {
    const intervals = [];

    // 추천 시간대 안에 포함되는 바쁜 시간만 수집
    for (const item of busyTimes) {
        const busyStart = toMinutes(item.startTime);
        const busyEnd = toMinutes(item.endTime);

        if (busyStart === null || busyEnd === null) continue;
        if (busyStart >= busyEnd) continue;

        const clippedStart = Math.max(start, busyStart);
        const clippedEnd = Math.min(end, busyEnd);

        if (clippedStart < clippedEnd) {
            intervals.push({
                start: clippedStart,
                end: clippedEnd
            });
        }
    }

    // 시작 시간 순서로 정렬
    intervals.sort((a, b) => a.start - b.start);

    // 겹치는 일정 합치기
    const merged = [];

    for (const item of intervals) {
        const last = merged[merged.length - 1];

        if (last && item.start <= last.end) {
            last.end = Math.max(last.end, item.end);
        } else {
            merged.push({ ...item });
        }
    }

    // 바쁜 시간 사이의 빈 구간 추출
    const availableSlots = [];
    let cursor = start;

    for (const item of merged) {
        if (cursor < item.start) {
            availableSlots.push({
                startTime: toTime(cursor),
                endTime: toTime(item.start),
                durationMinutes: item.start - cursor
            });
        }

        cursor = Math.max(cursor, item.end);
    }

    // 마지막 일정 이후 남은 시간
    if (cursor < end) {
        availableSlots.push({
            startTime: toTime(cursor),
            endTime: toTime(end),
            durationMinutes: end - cursor
        });
    }

    return availableSlots;
}

// GET /api/planner/available-slots?weekStart=2026-11-16
router.get("/available-slots", (req, res) => {
    const { weekStart } = req.query;

    if (!isValidDate(weekStart)) {
        return res.status(400).json({
            message: "weekStart는 YYYY-MM-DD 형식이어야 합니다."
        });
    }

    // 월요일인지 확인 (UTC 기준)
    const monday = new Date(weekStart + "T00:00:00Z");

    if (monday.getUTCDay() !== 1) {
        return res.status(400).json({
            message: "weekStart에는 월요일 날짜를 입력해야 합니다."
        });
    }

    try {
        // 사용자가 저장한 AI 추천 시간대
        const settings = db.prepare(`
            SELECT
                start_time AS startTime,
                end_time AS endTime
            FROM planner_settings
            WHERE id = 1
        `).get();

        if (!settings) {
            return res.status(500).json({
                message: "AI 추천 시간대 설정이 없습니다."
            });
        }

        const start = toMinutes(settings.startTime);
        const end = toMinutes(settings.endTime);

        if (start === null || end === null || start >= end) {
            return res.status(500).json({
                message: "저장된 추천 시간대가 올바르지 않습니다."
            });
        }

        // 매주 반복되는 수업
        const classes = db.prepare(`
            SELECT
                day_of_week AS dayOfWeek,
                start_time AS startTime,
                end_time AS endTime
            FROM timetable_classes
        `).all();

        // 알바, 약속, 공부 불가능 시간
        const unavailableTimes = db.prepare(`
            SELECT
                day_of_week AS dayOfWeek,
                start_time AS startTime,
                end_time AS endTime,
                repeat_weekly AS repeatWeekly,
                date
            FROM unavailable_times
        `).all();

        const days = [];

        for (let day = 1; day <= 7; day++) {
            const date = addDays(weekStart, day - 1);
            const busyTimes = [];

            // 해당 요일의 수업 제외
            for (const item of classes) {
                if (item.dayOfWeek === day) {
                    busyTimes.push(item);
                }
            }

            // 해당 날짜에 적용되는 불가능 시간 제외
            for (const item of unavailableTimes) {
                const isWeekly =
                    item.repeatWeekly === 1 &&
                    item.dayOfWeek === day;

                const isSpecificDate =
                    item.repeatWeekly === 0 &&
                    item.date === date &&
                    item.dayOfWeek === day;

                if (isWeekly || isSpecificDate) {
                    busyTimes.push(item);
                }
            }

            const availableSlots =
                findAvailableSlots(start, end, busyTimes);

            days.push({
                date,
                dayOfWeek: day,
                availableSlots,
                totalAvailableMinutes: availableSlots.reduce(
                    (sum, slot) => sum + slot.durationMinutes, 0
                )
            });
        }

        res.json({
            weekStart,
            recommendationStart: settings.startTime,
            recommendationEnd: settings.endTime,
            days
        });

    } catch (error) {
        console.error("빈 시간 계산 오류:", error);

        res.status(500).json({
            message: "빈 시간을 계산하지 못했습니다."
        });
    }
});


module.exports = router;

/* ==========================================
   4단계: 목표별 자동 계획표 생성
   ========================================== */

const GOALS = ["major", "complete", "deadline"];

// 목표별 우선순위에 따라 계획표 생성
function makePlan(goal, tasks, baseSlots, majorCourseIds) {

    // 목표별 계획표가 서로 영향을 주지 않도록 복사
    const slots = baseSlots.map(slot => ({ ...slot }));
    const events = [];
    const unscheduled = [];

    // 목표별 과제 정렬
    const sorted = [...tasks].sort((a, b) => {

        // 전공 집중형: 전공과목 우선
        if (goal === "major") {
            const ma = majorCourseIds.has(a.courseId) ? 0 : 1;
            const mb = majorCourseIds.has(b.courseId) ? 0 : 1;

            if (ma !== mb) return ma - mb;
        }

        // 최대 완료형: 짧은 과제 우선
        if (goal === "complete") {
            if (a.estimatedMinutes !== b.estimatedMinutes) {
                return a.estimatedMinutes - b.estimatedMinutes;
            }
        }

        // 마감 방어형 및 동률: 마감일 빠른 순서
        return a.dueAt.localeCompare(b.dueAt) || a.id - b.id;
    });

    // 정렬된 과제를 빈 시간에 배치
    for (const task of sorted) {

        // 30분 단위로 올림
        let remaining = Math.ceil(task.estimatedMinutes / 30) * 30;
        const planned = [];

        for (const slot of slots) {

            if (remaining === 0) break;
            if (slot.used) continue;

            const slotStart = `${slot.date}T${slot.startTime}`;
            const slotEnd = `${slot.date}T${slot.endTime}`;

            // 영상 시청 시작일 이전에는 배치하지 않음
            if (task.startAt && slotStart < task.startAt) {
                continue;
            }

            // 과제 마감일 이후에는 배치하지 않음
            if (slotEnd > task.dueAt) {
                continue;
            }

            slot.used = true;
            remaining -= 30;
            planned.push(slot);
        }

        // 마감 전까지 완료할 시간이 부족하면 배치 취소
        if (remaining > 0) {

            for (const slot of planned) {
                slot.used = false;
            }

            unscheduled.push({
                assignmentId: task.id,
                title: task.assignmentName,
                reason: "마감 전 이용 가능한 시간이 부족합니다."
            });

            continue;
        }

        // 연속된 30분 구간을 하나의 일정으로 합침
        for (const slot of planned) {

            const last = events[events.length - 1];

            if (
                last &&
                last.assignmentId === task.id &&
                last.date === slot.date &&
                last.endTime === slot.startTime
            ) {
                last.endTime = slot.endTime;
                last.durationMinutes += 30;
            } else {
                events.push({
                    assignmentId: task.id,
                    title: task.assignmentName,
                    subjectName: task.subjectName,
                    activityType: task.activityType,
                    date: slot.date,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    durationMinutes: 30,
                    source: "ai"
                });
            }
        }
    }

    // 날짜와 시간 순서대로 정렬
    events.sort((a, b) =>
        (a.date + a.startTime).localeCompare(b.date + b.startTime)
    );

    return {
        goal,
        events,
        unscheduled,
        completedTaskCount: sorted.length - unscheduled.length,
        scheduledMinutes: events.reduce(
            (sum, event) => sum + event.durationMinutes, 0
        )
    };
}


// POST /api/planner/generate
router.post("/generate", (req, res) => {

    const {
        weekStart,
        majorCourseIds = []
    } = req.body || {};

    // 월요일 날짜인지 검사
    if (
        !isValidDate(weekStart) ||
        new Date(weekStart + "T00:00:00Z").getUTCDay() !== 1
    ) {
        return res.status(400).json({
            message: "weekStart에는 월요일 날짜(YYYY-MM-DD)를 입력하세요."
        });
    }

    // 전공과목 ID 배열 검사
    if (
        !Array.isArray(majorCourseIds) ||
        majorCourseIds.some(id => typeof id !== "string")
    ) {
        return res.status(400).json({
            message: "majorCourseIds는 과목 ID 문자열 배열이어야 합니다."
        });
    }

    try {

        // AI 추천 시간대 조회
        const setting = db.prepare(`
            SELECT
                start_time AS startTime,
                end_time AS endTime
            FROM planner_settings
            WHERE id = 1
        `).get();

        if (!setting) {
            return res.status(500).json({
                message: "추천 시간대 설정이 없습니다."
            });
        }

        const start = toMinutes(setting.startTime);
        const end = toMinutes(setting.endTime);

        if (start === null || end === null || start >= end) {
            return res.status(500).json({
                message: "추천 시간대 설정이 잘못되었습니다."
            });
        }

        // 기존 수업 조회
        const classes = db.prepare(`
            SELECT
                day_of_week AS dayOfWeek,
                start_time AS startTime,
                end_time AS endTime
            FROM timetable_classes
        `).all();

        // 알바 및 불가능 시간 조회
        const unavailable = db.prepare(`
            SELECT
                day_of_week AS dayOfWeek,
                start_time AS startTime,
                end_time AS endTime,
                repeat_weekly AS repeatWeekly,
                date
            FROM unavailable_times
        `).all();

        // ASTRA 과제와 예상 소요 시간 조회
        const rawTasks = db.prepare(`
            SELECT
                a.id,
                a.course_id AS courseId,
                a.subject_name AS subjectName,
                a.assignment_name AS assignmentName,
                a.activity_type AS activityType,
                a.due_at AS dueAt,
                a.start_at AS startAt,
                s.estimated_minutes AS estimatedMinutes
            FROM astra_assignments a
            LEFT JOIN astra_task_settings s
                ON s.astra_assignment_id = a.id
        `).all();

        
        // 다른 주에 이미 저장된 AI 과제 일정 조회
        const previouslySaved = db.prepare(`
            SELECT
                e.assignment_id AS assignmentId,
                e.start_time AS startTime,
                e.end_time AS endTime
            FROM saved_plan_events e
            JOIN saved_plans p ON p.id = e.plan_id
            WHERE p.week_start <> ?
        `).all(weekStart);

        // 과제별로 이미 배치된 총 시간을 계산
        const reservedMinutes = new Map();

        for (const event of previouslySaved) {
            const duration =
                toMinutes(event.endTime) -
                toMinutes(event.startTime);

            if (!Number.isFinite(duration) || duration <= 0) {
                continue;
            }

            const previous =
                reservedMinutes.get(event.assignmentId) || 0;

            reservedMinutes.set(
                event.assignmentId,
                previous + duration
            );
        }


        const weekEnd = addDays(weekStart, 7) + "T00:00";

        // 현재 한국 시간
        const nowKst = new Date(
            Date.now() + 9 * 60 * 60000
        ).toISOString().slice(0, 16);

        const excluded = [];
        const tasks = [];

        // 계획 생성 대상 과제 분류
        for (const task of rawTasks) {

            let reason = null;

            const originalMinutes = task.estimatedMinutes;

            // 과제의 예상 시간을 30분 단위로 올림
            const requiredMinutes = originalMinutes
                ? Math.ceil(originalMinutes / 30) * 30
                : 0;

            // 다른 주에 이미 배치된 시간
            const usedMinutes =
                reservedMinutes.get(task.id) || 0;

            // 이번 주에 추가로 배치할 시간
            const remainingMinutes =
                Math.max(0, requiredMinutes - usedMinutes);

            if (!originalMinutes) {
                reason = "예상 소요 시간이 설정되지 않았습니다.";
            } else if (!task.dueAt) {
                reason = "마감일을 확인할 수 없습니다.";
            } else if (
                task.dueAt <= weekStart + "T00:00" ||
                (task.startAt && task.startAt >= weekEnd)
            ) {
                reason = "요청한 주에 배치할 수 없는 활동입니다.";
            } else if (remainingMinutes === 0) {
                reason = "다른 주에 이미 전부 배치된 과제입니다.";
            }

            if (reason) {
                excluded.push({
                    assignmentId: task.id,
                    title: task.assignmentName,
                    reason
                });
            } else {
                tasks.push({
                    ...task,
                    estimatedMinutes: remainingMinutes
                });
            }

        }
        // AI 추천 가능 시간 생성
        const baseSlots = [];

        for (let day = 1; day <= 7; day++) {

            const date = addDays(weekStart, day - 1);

            const busy = [
                ...classes.filter(item =>
                    item.dayOfWeek === day
                ),

                ...unavailable.filter(item =>
                    (
                        item.repeatWeekly === 1 &&
                        item.dayOfWeek === day
                    ) ||
                    (
                        item.repeatWeekly === 0 &&
                        item.dayOfWeek === day &&
                        item.date === date
                    )
                )
            ];

            // 3단계 빈 시간 계산 함수 재사용
            const free = findAvailableSlots(start, end, busy);

            // 빈 시간을 30분 단위로 나눔
            for (const range of free) {

                for (
                    let minute = toMinutes(range.startTime);
                    minute + 30 <= toMinutes(range.endTime);
                    minute += 30
                ) {

                    const startTime = toTime(minute);
                    const endTime = toTime(minute + 30);

                    // 이미 지난 시간은 추천하지 않음
                    if (`${date}T${startTime}` < nowKst) {
                        continue;
                    }

                    baseSlots.push({
                        date,
                        startTime,
                        endTime,
                        used: false
                    });
                }
            }
        }

        // 전공과목 목록
        const majorSet = new Set(majorCourseIds);

        // 세 가지 목표의 계획표 생성
        const plans = GOALS.map(goal =>
            makePlan(goal, tasks, baseSlots, majorSet)
        );

        res.json({
            weekStart,
            recommendationStart: setting.startTime,
            recommendationEnd: setting.endTime,
            excluded,
            plans
        });

    } catch (error) {

        console.error("계획표 생성 오류:", error);

        res.status(500).json({
            message: "계획표 생성 중 오류가 발생했습니다."
        });
    }
});
