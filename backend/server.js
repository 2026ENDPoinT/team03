const express = require("express");

const app = express();
const PORT = 3000;

app.use(express.json());

// 임시 저장 공간: 서버를 종료하면 데이터가 사라짐
const exams = [];

app.get("/", (req, res) => {
    res.send("성적 관리 서버가 실행 중입니다!");
});

// 성적 저장
app.post("/api/exams", (req, res) => {
    const { subjectName, myScore, maxScore, average, standardDeviation } = req.body;

    // 과목명 확인
    if (typeof subjectName !== "string" || subjectName.trim() === "") {
        return res.status(400).json({
            message: "과목명을 입력해 주세요."
        });
    }

    // 숫자가 올바르게 들어왔는지 확인
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

    // 숫자의 범위 확인
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

    const exam = {
        id: exams.length + 1,
        subjectName: subjectName.trim(),
        myScore,
        maxScore,
        average,
        standardDeviation
    };

    exams.push(exam);

    res.status(201).json({
        message: "성적이 저장되었습니다.",
        exam
    });
});

// 저장된 성적 목록 조회
app.get("/api/exams", (req, res) => {
    res.json(exams);
});

app.listen(PORT, () => {
    console.log(`서버 주소: http://localhost:${PORT}`);
});