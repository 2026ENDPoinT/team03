
const express = require("express");
const db = require("../db");

const router = express.Router();

// 기본 설정 생성 (이미 존재하면 유지)
db.prepare(`
    INSERT OR IGNORE INTO planner_settings
        (id, start_time, end_time, hide_outside_range)
    VALUES (1, '09:00', '23:00', 1)
`).run();

// HH:mm 형식을 분 단위로 변환
function timeToMinutes(time, allow24 = false) {
    if (typeof time !== "string") return null;

    const match = time.match(/^(\d{2}):(\d{2})$/);
    if (!match) return null;

    const hour = Number(match[1]);
    const minute = Number(match[2]);

    if (minute !== 0 && minute !== 30) return null;
    if (allow24 && hour === 24 && minute === 0) {
        return 1440;
    }
    if (hour < 0 || hour > 23) return null;

    return hour * 60 + minute;
}

// 설정 조회
router.get("/", (req, res) => {
    try {
        const row = db.prepare(`
            SELECT
                start_time AS startTime,
                end_time AS endTime,
                hide_outside_range AS hideOutsideRange
            FROM planner_settings
            WHERE id = 1
        `).get();

        res.json({
            startTime: row.startTime,
            endTime: row.endTime,
            hideOutsideRange: Boolean(row.hideOutsideRange)
        });
    } catch (error) {
        console.error("설정 조회 오류:", error);
        res.status(500).json({
            message: "설정을 불러오지 못했습니다."
        });
    }
});

// 설정 수정
router.put("/", (req, res) => {
    const { startTime, endTime, hideOutsideRange } = req.body || {};

    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime, true);

    if (start === null || end === null || start >= end) {
        return res.status(400).json({
            message: "올바른 시간 범위를 입력해 주세요."
        });
    }

    if (typeof hideOutsideRange !== "boolean") {
        return res.status(400).json({
            message: "hideOutsideRange는 true 또는 false여야 합니다."
        });
    }

    try {
        db.prepare(`
            UPDATE planner_settings
            SET start_time = ?,
                end_time = ?,
                hide_outside_range = ?
            WHERE id = 1
        `).run(startTime, endTime, hideOutsideRange ? 1 : 0);

        res.json({
            message: "AI 추천 시간대가 저장되었습니다.",
            startTime,
            endTime,
            hideOutsideRange
        });
    } catch (error) {
        console.error("설정 저장 오류:", error);
        res.status(500).json({
            message: "설정을 저장하지 못했습니다."
        });
    }
});

module.exports = router;
