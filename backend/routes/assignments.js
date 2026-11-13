const express = require("express");
const db = require("../db");

const router = express.Router();

function isValidDate(date) {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false;
    }

    const parsed = new Date(`${date}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === date;
}

const getAssignments = db.prepare(`
    SELECT
        id,
        subject_name AS subjectName,
        assignment_name AS assignmentName,
        estimated_minutes AS estimatedMinutes,
        due_date AS dueDate
    FROM assignments
    ORDER BY due_date, id
`);

router.get("/", (req, res) => {
    try {
        res.json(getAssignments.all());
    } catch (error) {
        console.error("과제 조회 오류:", error);
        res.status(500).json({
            message: "과제 목록을 불러오지 못했습니다."
        });
    }
});

router.post("/", (req, res) => {
    const {
        subjectName,
        assignmentName,
        estimatedMinutes,
        dueDate
    } = req.body;

    if (typeof subjectName !== "string" || subjectName.trim() === "") {
        return res.status(400).json({
            message: "과목명을 입력해 주세요."
        });
    }

    if (typeof assignmentName !== "string" || assignmentName.trim() === "") {
        return res.status(400).json({
            message: "과제명을 입력해 주세요."
        });
    }

    if (!Number.isInteger(estimatedMinutes) || estimatedMinutes <= 0) {
        return res.status(400).json({
            message: "소요 시간은 0보다 큰 분 단위 숫자로 입력해 주세요."
        });
    }

    if (!isValidDate(dueDate)) {
        return res.status(400).json({
            message: "마감일은 YYYY-MM-DD 형식으로 입력해 주세요."
        });
    }

    try {
        const cleanSubjectName = subjectName.trim();
        const cleanAssignmentName = assignmentName.trim();

        const result = db.prepare(`
            INSERT INTO assignments
                (subject_name, assignment_name, estimated_minutes, due_date)
            VALUES (?, ?, ?, ?)
        `).run(
            cleanSubjectName,
            cleanAssignmentName,
            estimatedMinutes,
            dueDate
        );

        res.status(201).json({
            message: "과제가 등록되었습니다.",
            assignment: {
                id: Number(result.lastInsertRowid),
                subjectName: cleanSubjectName,
                assignmentName: cleanAssignmentName,
                estimatedMinutes,
                dueDate
            }
        });
    } catch (error) {
        console.error("과제 등록 오류:", error);
        res.status(500).json({
            message: "과제를 등록하지 못했습니다."
        });
    }
});

router.put("/:id", (req, res) => {
    const id = Number(req.params.id);
    const { subjectName, assignmentName, estimatedMinutes, dueDate } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "올바른 과제 ID가 아닙니다." });
    }
    if (typeof subjectName !== "string" || subjectName.trim() === "") {
        return res.status(400).json({ message: "과목명을 입력해 주세요." });
    }
    if (typeof assignmentName !== "string" || assignmentName.trim() === "") {
        return res.status(400).json({ message: "과제명을 입력해 주세요." });
    }
    if (!Number.isInteger(estimatedMinutes) || estimatedMinutes <= 0) {
        return res.status(400).json({ message: "소요 시간은 0보다 큰 분 단위 숫자로 입력해 주세요." });
    }
    if (!isValidDate(dueDate)) {
        return res.status(400).json({ message: "마감일은 YYYY-MM-DD 형식으로 입력해 주세요." });
    }

    try {
        const result = db.prepare(`
            UPDATE assignments
            SET subject_name = ?, assignment_name = ?, estimated_minutes = ?, due_date = ?
            WHERE id = ?
        `).run(subjectName.trim(), assignmentName.trim(), estimatedMinutes, dueDate, id);

        if (result.changes === 0) {
            return res.status(404).json({ message: "해당 과제를 찾을 수 없습니다." });
        }
        res.json({
            message: "과제를 수정했습니다.",
            assignment: { id, subjectName: subjectName.trim(), assignmentName: assignmentName.trim(), estimatedMinutes, dueDate }
        });
    } catch (error) {
        console.error("과제 수정 오류:", error);
        res.status(500).json({ message: "과제를 수정하지 못했습니다." });
    }
});
router.delete("/:id", (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            message: "올바른 과제 ID가 아닙니다."
        });
    }

    try {
        const result = db.prepare(`
            DELETE FROM assignments
            WHERE id = ?
        `).run(id);

        if (result.changes === 0) {
            return res.status(404).json({
                message: "해당 과제를 찾을 수 없습니다."
            });
        }

        res.json({
            message: "과제를 삭제했습니다."
        });
    } catch (error) {
        console.error("과제 삭제 오류:", error);
        res.status(500).json({
            message: "과제를 삭제하지 못했습니다."
        });
    }
});

module.exports = router;