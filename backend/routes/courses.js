const express = require("express");
const db = require("../db");

const router = express.Router();

// 성적 등급을 평점으로 변환
const gradePoints = {
    "A+": 4.5,
    "A0": 4.0,
    "B+": 3.5,
    "B0": 3.0,
    "C+": 2.5,
    "C0": 2.0,
    "D+": 1.5,
    "D0": 1.0,
    "F": 0.0
};

// 성적 등급을 평점으로 변환
const insertCourse = db.prepare(`
    INSERT INTO courses (subject_name, semester, credits, grade)
    VALUES (?, ?, ?, ?)
`);

// 과목 목록 조회
const getCourses = db.prepare(`
    SELECT
        id,
        subject_name AS subjectName,
        semester,
        credits,
        grade
    FROM courses
    ORDER BY semester, id
`);

// 과목 성적 저장
router.post("/courses", (req, res) => {
    const { subjectName, semester, credits, grade } = req.body;

    if (typeof subjectName !== "string" || subjectName.trim() === "") {
        return res.status(400).json({
            message: "과목명을 입력해 주세요."
        });
    }

    if (typeof semester !== "string" || semester.trim() === "") {
        return res.status(400).json({
            message: "수강 학기를 입력해 주세요. 예: 2026-1"
        });
    }

    if (!Number.isFinite(credits) || credits <= 0) {
        return res.status(400).json({
            message: "학점 수는 0보다 큰 숫자로 입력해 주세요."
        });
    }

    if (typeof grade !== "string" || !Object.hasOwn(gradePoints, grade)) {
        return res.status(400).json({
            message: "올바른 성적 등급을 입력해 주세요."
        });
    }

    const cleanSubjectName = subjectName.trim();
    const cleanSemester = semester.trim();

    try {
        const result = insertCourse.run(
            cleanSubjectName,
            cleanSemester,
            credits,
            grade
        );

        res.status(201).json({
            message: "과목 성적이 저장되었습니다.",
            course: {
                id: Number(result.lastInsertRowid),
                subjectName: cleanSubjectName,
                semester: cleanSemester,
                credits,
                grade,
                gradePoint: gradePoints[grade]
            }
        });
    } catch (error) {
        console.error("과목 저장 오류:", error);
        res.status(500).json({
            message: "과목 성적을 저장하지 못했습니다."
        });
    }
});

// 저장된 과목 목록 조회
router.get("/courses", (req, res) => {
    try {
        const courses = getCourses.all().map((course) => ({
            ...course,
            gradePoint: gradePoints[course.grade]
        }));

        res.json(courses);
    } catch (error) {
        console.error("과목 조회 오류:", error);
        res.status(500).json({
            message: "과목 목록을 불러오지 못했습니다."
        });
    }
});

// 과목 성적 수정
router.put("/courses/:id", (req, res) => {
    const id = Number(req.params.id);
    const { subjectName, semester, credits, grade } = req.body;

    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "올바른 과목 ID가 아닙니다." });
    if (typeof subjectName !== "string" || subjectName.trim() === "") return res.status(400).json({ message: "과목명을 입력해 주세요." });
    if (typeof semester !== "string" || semester.trim() === "") return res.status(400).json({ message: "수강 학기를 입력해 주세요. 예: 2026-1" });
    if (!Number.isFinite(credits) || credits <= 0) return res.status(400).json({ message: "학점 수는 0보다 큰 숫자로 입력해 주세요." });
    if (typeof grade !== "string" || !Object.hasOwn(gradePoints, grade)) return res.status(400).json({ message: "올바른 성적 등급을 입력해 주세요." });

    try {
        const cleanSubjectName = subjectName.trim();
        const cleanSemester = semester.trim();
        const result = db.prepare(`
            UPDATE courses SET subject_name = ?, semester = ?, credits = ?, grade = ? WHERE id = ?
        `).run(cleanSubjectName, cleanSemester, credits, grade, id);
        if (result.changes === 0) return res.status(404).json({ message: "해당 과목 성적을 찾을 수 없습니다." });
        res.json({ message: "과목 성적이 수정되었습니다.", course: { id, subjectName: cleanSubjectName, semester: cleanSemester, credits, grade, gradePoint: gradePoints[grade] } });
    } catch (error) {
        console.error("과목 성적 수정 오류:", error);
        res.status(500).json({ message: "과목 성적을 수정하지 못했습니다." });
    }
});

// 과목 성적 삭제
router.delete("/courses/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "올바른 과목 ID가 아닙니다." });
    try {
        const result = db.prepare("DELETE FROM courses WHERE id = ?").run(id);
        if (result.changes === 0) return res.status(404).json({ message: "해당 과목 성적을 찾을 수 없습니다." });
        res.json({ message: "과목 성적이 삭제되었습니다." });
    } catch (error) {
        console.error("과목 성적 삭제 오류:", error);
        res.status(500).json({ message: "과목 성적을 삭제하지 못했습니다." });
    }
});
// 전체 및 학기별 GPA 조회
router.get("/gpa", (req, res) => {
    try {
        const courses = getCourses.all();

        function calculateGpa(courseList) {
            const totalCredits = courseList.reduce(
                (sum, course) => sum + course.credits,
                0
            );

            if (totalCredits === 0) {
                return {
                    totalCredits: 0,
                    gpa: null
                };
            }

            const weightedPoints = courseList.reduce(
                (sum, course) =>
                    sum + course.credits * gradePoints[course.grade],
                0
            );

            return {
                totalCredits,
                gpa: Number((weightedPoints / totalCredits).toFixed(2))
            };
        }

        const coursesBySemester = {};

        for (const course of courses) {
            if (!coursesBySemester[course.semester]) {
                coursesBySemester[course.semester] = [];
            }

            coursesBySemester[course.semester].push(course);
        }

        const semesterGpas = Object.fromEntries(
            Object.entries(coursesBySemester).map(
                ([semester, semesterCourses]) => [
                    semester,
                    calculateGpa(semesterCourses)
                ]
            )
        );

        res.json({
            cumulative: calculateGpa(courses),
            semesters: semesterGpas
        });
    } catch (error) {
        console.error("GPA 계산 오류:", error);
        res.status(500).json({
            message: "GPA를 계산하지 못했습니다."
        });
    }
});

module.exports = router;