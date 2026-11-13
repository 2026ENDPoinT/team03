const express = require("express");
const cors = require("cors");
const coursesRouter = require("./routes/courses");
const timetableRouter = require("./routes/timetable");
const assignmentsRouter = require("./routes/assignments");
const astraRouter = require("./routes/astra");

const app = express();
const PORT = 3000;
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5176"
  ]
})); // 추가
app.use(express.json());

app.get("/", (req, res) => {
    res.send("성적 및 일정 관리 서버가 실행 중입니다!");
});

app.use("/api", coursesRouter);
app.use("/api/timetable", timetableRouter);
app.use("/api/assignments", assignmentsRouter);
app.use("/api/astra", astraRouter);

app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
        return res.status(400).json({
            message: "요청 JSON 형식이 올바르지 않습니다."
        });
    }

    console.error("서버 오류:", error);
    res.status(500).json({
        message: "서버 오류가 발생했습니다."
    });
});

app.listen(PORT, () => {
    console.log(`서버 주소: http://localhost:${PORT}`);
});