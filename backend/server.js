const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = 3000;

// backend 폴더 안에 데이터베이스 파일 생성
const db = new Database(path.join(__dirname, "grades.db"));

db.exec(`
    CREATE TABLE IF NOT EXISTS exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_name TEXT NOT NULL,
        my_score REAL NOT NULL,
        max_score REAL NOT NULL,
        average REAL NOT NULL,
        standard_deviation REAL NOT NULL
    )
`);

const insertExam = db.prepare(`
    INSERT INTO exams (
        subject_name,
        my_score,
        max_score,
        average,
        standard_deviation
    )
    VALUES (?, ?, ?, ?, ?)
`);

const getExams = db.prepare(`
    SELECT
        id,
        subject_name AS subjectName,
        my_score AS myScore,
        max_score AS maxScore,
        average,
        standard_deviation AS standardDeviation
    FROM exams
    ORDER BY id
`);

app.use(express.json());

app.get("/", (req, res) => {
    res.send("성적 관리 서버가 실행 중입니다!");
});

// 성적 저장
app.post("/api/exams", (req, res) => {
    const { subjectName, myScore, maxScore, average, standardDeviation } = req.body;

    if (typeof subjectName !== "string" || subjectName.trim() === "") {
        return res.status(400).json({
            message: "과목명을 입력해 주세요."
        });
    }

    if (
        !Number.isFinite(myScore) ||
        !Number.isFinite(maxScore) ||
        !Number.isFinite(average) ||
        !Number.isFinite(standardDeviation)
    ) {
        return res.status(400).json({
            message: "점수, 만점, 평균, 표준편차를 숫자로 입력해 주세요."
        });
    }

    if (
        maxScore <= 0 ||
        myScore < 0 || myScore > maxScore ||
        average < 0 || average > maxScore ||
        standardDeviation < 0
    ) {
        return res.status(400).json({
            message: "점수 범위를 확인해 주세요."
        });
    }

    const cleanSubjectName = subjectName.trim();

    const result = insertExam.run(
        cleanSubjectName,
        myScore,
        maxScore,
        average,
        standardDeviation
    );

    const exam = {
        id: Number(result.lastInsertRowid),
        subjectName: cleanSubjectName,
        myScore,
        maxScore,
        average,
        standardDeviation
    };

    res.status(201).json({
        message: "성적이 저장되었습니다.",
        exam
    });
});

// 저장된 성적 목록 조회
app.get("/api/exams", (req, res) => {
    res.json(getExams.all());
});

app.listen(PORT, () => {
    console.log(`서버 주소: http://localhost:${PORT}`);
});