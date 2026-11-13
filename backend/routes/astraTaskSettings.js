
const express = require("express");
const db = require("../db");

const router = express.Router();

// ASTRA 과제별 예상 소요 시간 저장 테이블
// 기존 ASTRA 과제 데이터는 수정하지 않는다.
db.exec(`
    CREATE TABLE IF NOT EXISTS astra_task_settings (
        astra_assignment_id INTEGER PRIMARY KEY,
        estimated_minutes INTEGER NOT NULL
            CHECK (estimated_minutes > 0),
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (astra_assignment_id)
            REFERENCES astra_assignments(id)
            ON DELETE CASCADE
    )
`);

// ASTRA 과제 목록 + 예상 소요 시간 조회
router.get("/", (req, res) => {
    try {
        const tasks = db.prepare(`
            SELECT
                a.id AS astraAssignmentId,
                a.subject_name AS subjectName,
                a.assignment_name AS assignmentName,
                a.activity_type AS activityType,
                a.due_at AS dueAt,
                s.estimated_minutes AS estimatedMinutes
            FROM astra_assignments a
            LEFT JOIN astra_task_settings s
                ON a.id = s.astra_assignment_id
            ORDER BY (a.due_at IS NULL), a.due_at, a.id
        `).all();

        res.json(tasks);
    } catch (error) {
        console.error("소요 시간 조회 오류:", error);
        res.status(500).json({
            message: "과제 정보를 불러오지 못했습니다."
        });
    }
});

// 특정 ASTRA 과제의 예상 소요 시간 저장 및 수정
router.put("/:id", (req, res) => {
    const id = Number(req.params.id);
    const { estimatedMinutes } = req.body || {};

    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({
            message: "올바른 과제 ID가 아닙니다."
        });
    }

    if (!Number.isInteger(estimatedMinutes) ||
        estimatedMinutes <= 0 ||
        estimatedMinutes > 1440) {
        return res.status(400).json({
            message: "예상 소요 시간은 1~1440분 사이여야 합니다."
        });
    }

    try {
        const task = db.prepare(`
            SELECT id
            FROM astra_assignments
            WHERE id = ?
        `).get(id);

        if (!task) {
            return res.status(404).json({
                message: "해당 ASTRA 과제를 찾을 수 없습니다."
            });
        }

        db.prepare(`
            INSERT INTO astra_task_settings
                (astra_assignment_id, estimated_minutes)
            VALUES (?, ?)
            ON CONFLICT(astra_assignment_id)
            DO UPDATE SET
                estimated_minutes = excluded.estimated_minutes,
                updated_at = CURRENT_TIMESTAMP
        `).run(id, estimatedMinutes);

        res.json({
            message: "예상 소요 시간이 저장되었습니다.",
            astraAssignmentId: id,
            estimatedMinutes
        });
    } catch (error) {
        console.error("소요 시간 저장 오류:", error);
        res.status(500).json({
            message: "소요 시간을 저장하지 못했습니다."
        });
    }
});

module.exports = router;
