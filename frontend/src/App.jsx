import React, { useState } from "react";
import "./App.css";

export function App() {
  const [currentView, setCurrentView] = useState("login");
  const [activeMenu, setActiveMenu] = useState("HOME");

  // 로그인 & 회원가입 상태
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupValues, setSignupValues] = useState({
    email: "",
    name: "",
    password: "",
    studentId: "",
    department: "",
  });
  const [message, setMessage] = useState("");

  // ================= WEEKLY 시간표 상태 =================
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const hours = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00"];
  const [scheduleItems, setScheduleItems] = useState([
    { id: 1, day: 1, start: 4, duration: 3, title: "자료 구조 과제", room: "AI 추천", type: "purple" },
    { id: 2, day: 2, start: 2, duration: 3, title: "미분적분학", room: "홍길동", type: "green" },
    { id: 3, day: 3, start: 4, duration: 4, title: "불가능 시간", room: "알바", type: "gray" },
    { id: 4, day: 5, start: 2, duration: 3, title: "미분적분학", room: "홍길동", type: "green" },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState("class");
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const weekdaysKorean = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  const [classForm, setClassForm] = useState({
    subject: "",
    professor: "",
    weekday: "월요일",
    startTime: "09:00",
    endTime: "10:30",
  });

  // ================= PLANNER 상태 및 동적 달력 계산 =================
  const [selectedDate, setSelectedDate] = useState(12);
  const [currentMonth, setCurrentMonth] = useState(11);
  const [currentYear, setCurrentYear] = useState(2026);

  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const totalSlots = firstDayOfMonth + daysInMonth > 35 ? 42 : 35;

  const calendarDays = Array.from({ length: totalSlots }, (_, idx) => {
    const dayNum = idx - firstDayOfMonth + 1;
    return dayNum > 0 && dayNum <= daysInMonth ? dayNum : null;
  });

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDate(1);
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDate(1);
  };

  const todaySchedules = [
    { time: "09:00", title: "자료구조" },
    { time: "14:00", title: "미분적분학(2)" },
    { time: "16:00", title: "창의적 사고" },
    { time: "19:00", title: "알바" },
  ];

  const [ddayList, setDdayList] = useState([
    { id: 1, title: "자료구조 연결리스트 구현", dueDate: "2026-11-15", dday: "D-3" },
    { id: 2, title: "미분적분학 연습문제 풀이", dueDate: "2026-11-19", dday: "D-7" },
    { id: 3, title: "창의적 사고 팀 발표 PPT", dueDate: "2026-11-24", dday: "D-12" },
  ]);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", date: "2026-11-16" });

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!taskForm.title) return;
    const targetDate = new Date(taskForm.date);
    const baseDate = new Date(2026, 10, 12);
    const diff = Math.round((targetDate - baseDate) / (1000 * 60 * 60 * 24));
    const ddayText = diff === 0 ? "D-Day" : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;

    setDdayList([
      ...ddayList,
      { id: Date.now(), title: taskForm.title, dueDate: taskForm.date, dday: ddayText },
    ]);
    setTaskForm({ title: "", date: "2026-11-16" });
    setShowTaskModal(false);
  };

  // ================= GRADES (성적 관리) 상태 및 자동 계산 =================
  const gradeToPoint = {
    "A+": 4.5,
    "A0": 4.0,
    "B+": 3.5,
    "B0": 3.0,
    "C+": 2.5,
    "C0": 2.0,
    "D+": 1.5,
    "D0": 1.0,
    "F": 0.0,
  };

  const [gradesList, setGradesList] = useState([
    { id: 1, semester: "2026 1학기", subject: "프로그래밍 입문 (1)", credit: 3, grade: "A+" },
    { id: 2, semester: "2026 1학기", subject: "미분적분학", credit: 3, grade: "A+" },
    { id: 3, semester: "2026 2학기", subject: "선형대수학", credit: 3, grade: "B0" },
    { id: 4, semester: "2026 2학기", subject: "자료구조", credit: 3, grade: "A0" },
    { id: 5, semester: "2026 2학기", subject: "프로그래밍 입문 (2)", credit: 3, grade: "A+" },
  ]);

  const [selectedSemester, setSelectedSemester] = useState("2026 2학기");
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [editingGradeId, setEditingGradeId] = useState(null);
  const [gradeForm, setGradeForm] = useState({
    semester: "2026 2학기",
    subject: "",
    credit: 3,
    grade: "A+",
  });

  // 전체 누적 평점 & 취득 학점 계산
  const totalCredits = gradesList.reduce((acc, item) => acc + Number(item.credit), 0);
  const totalWeightedPoints = gradesList.reduce(
    (acc, item) => acc + Number(item.credit) * (gradeToPoint[item.grade] || 0),
    0
  );
  const cumulativeGPA = totalCredits > 0 ? (totalWeightedPoints / totalCredits).toFixed(2) : "0.00";

  // 선택 학기 평점 & 취득 학점 계산
  const semesterGrades = gradesList.filter((item) => item.semester === selectedSemester);
  const semesterCredits = semesterGrades.reduce((acc, item) => acc + Number(item.credit), 0);
  const semesterWeightedPoints = semesterGrades.reduce(
    (acc, item) => acc + Number(item.credit) * (gradeToPoint[item.grade] || 0),
    0
  );
  const semesterGPA = semesterCredits > 0 ? (semesterWeightedPoints / semesterCredits).toFixed(2) : "0.00";

  // 학기별 GPA 차트 데이터 자동 생성
  const semesters = ["2025 1학기", "2025 2학기", "2026 1학기", "2026 2학기"];
  const chartData = semesters.map((sem) => {
    if (sem === "2025 1학기") return { semester: sem, gpa: 3.75 };
    if (sem === "2025 2학기") return { semester: sem, gpa: 3.92 };
    const list = gradesList.filter((g) => g.semester === sem);
    const creds = list.reduce((a, b) => a + Number(b.credit), 0);
    const pts = list.reduce((a, b) => a + Number(b.credit) * (gradeToPoint[b.grade] || 0), 0);
    return {
      semester: sem,
      gpa: creds > 0 ? Number((pts / creds).toFixed(2)) : 0,
    };
  });

  const openAddGradeModal = () => {
    setEditingGradeId(null);
    setGradeForm({ semester: selectedSemester, subject: "", credit: 3, grade: "A+" });
    setShowGradeModal(true);
  };

  const openEditGradeModal = (item) => {
    setEditingGradeId(item.id);
    setGradeForm({
      semester: item.semester,
      subject: item.subject,
      credit: item.credit,
      grade: item.grade,
    });
    setShowGradeModal(true);
  };

  const handleGradeSubmit = (e) => {
    e.preventDefault();
    if (!gradeForm.subject) return;

    if (editingGradeId !== null) {
      setGradesList(
        gradesList.map((item) =>
          item.id === editingGradeId ? { ...gradeForm, id: editingGradeId, credit: Number(gradeForm.credit) } : item
        )
      );
    } else {
      setGradesList([
        ...gradesList,
        { ...gradeForm, id: Date.now(), credit: Number(gradeForm.credit) },
      ]);
    }
    setShowGradeModal(false);
    setEditingGradeId(null);
  };

  const handleDeleteGrade = (id) => {
    setGradesList(gradesList.filter((item) => item.id !== id));
  };

  // 공통 데이터
  const departments = [
    { value: "", label: "학과" },
    { value: "computer-science", label: "컴퓨터공학과" },
    { value: "business", label: "경영학과" },
    { value: "design", label: "디자인학과" },
    { value: "mechanical-engineering", label: "기계공학과" },
  ];

  const todaysClasses = [
    { title: "컴퓨터프로그래밍", details: "09:00–10:30  ·  홍길동 교수님" },
    { title: "미적분학", details: "11:00–12:30  ·  김민수 교수님" },
    { title: "대학영어", details: "14:00–15:30  ·  이수진 교수님" },
  ];

  const upcomingAssignments = [
    { title: "알고리즘 과제", details: "09:00–10:30  ·  홍길동 교수님" },
    { title: "미적분학", details: "11:00–12:30  ·  김민수 교수님" },
    { title: "대학영어", details: "14:00–15:30  ·  이수진 교수님" },
  ];

  const navItems = ["HOME", "WEEKLY", "PLANNER", "GRADES"];

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setCurrentView("dashboard");
    setActiveMenu("HOME");
  };

  const handleSignupSubmit = (e) => {
    e.preventDefault();
    if (
      !signupValues.email ||
      !signupValues.name ||
      !signupValues.password ||
      !signupValues.studentId ||
      !signupValues.department
    ) {
      setMessage("모든 항목을 입력해 주세요.");
      return;
    }
    setMessage("회원가입 완료! 로그인 창으로 이동합니다.");
    setTimeout(() => {
      setCurrentView("login");
      setMessage("");
    }, 1000);
  };

  const handleClassSubmit = (e) => {
    e.preventDefault();
    if (!classForm.subject) return;

    const dayIdx = weekdaysKorean.indexOf(classForm.weekday);
    const targetDay = dayIdx !== -1 ? dayIdx : 1;
    let startIdx = hours.indexOf(classForm.startTime);
    if (startIdx === -1) startIdx = 0;

    let duration = 3;
    const endIdx = hours.indexOf(classForm.endTime);
    if (endIdx > startIdx) duration = endIdx - startIdx;

    setScheduleItems([
      ...scheduleItems,
      {
        id: Date.now(),
        day: targetDay,
        start: startIdx,
        duration: duration > 0 ? duration : 3,
        title: classForm.subject,
        room: classForm.professor || (modalType === "class" ? "교수님" : "개인일정"),
        type: modalType === "class" ? "green" : "gray",
      },
    ]);
    setShowAddModal(false);
    setClassForm({ subject: "", professor: "", weekday: "월요일", startTime: "09:00", endTime: "10:30" });
  };

  return (
    <main className="anima-main">
      {/* 1. 로그인 화면 */}
      {currentView === "login" && (
        <section className="anima-card" aria-labelledby="login-title">
          <h1 id="login-title" className="anima-title">학점 관리</h1>
          <form className="anima-form" onSubmit={handleLoginSubmit} noValidate>
            <label className="anima-label-email">이메일</label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
              className="anima-input-email"
            />
            <label className="anima-label-password">비밀번호</label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
              className="anima-input-password"
            />
            <button type="submit" className="anima-submit-btn">로그인</button>
          </form>
          <p className="anima-footer-text">아직 계정이 없으신가요?</p>
          <button
            type="button"
            className="anima-link-btn"
            style={{ position: "absolute", top: "487px", left: "290px" }}
            onClick={() => setCurrentView("signup")}
          >
            회원가입
          </button>
        </section>
      )}

      {/* 2. 회원가입 화면 */}
      {currentView === "signup" && (
        <section className="anima-signup-card" aria-labelledby="signup-title">
          <h1 id="signup-title" className="anima-signup-title">회원가입</h1>
          <form className="anima-form" onSubmit={handleSignupSubmit} noValidate>
            <div className="signup-input-wrap top-129">
              <input
                type="email"
                value={signupValues.email}
                onChange={(e) => setSignupValues({ ...signupValues, email: e.target.value })}
                placeholder="이메일(ID)"
                className="signup-input"
              />
            </div>
            <div className="signup-input-wrap top-236">
              <input
                type="text"
                value={signupValues.name}
                onChange={(e) => setSignupValues({ ...signupValues, name: e.target.value })}
                placeholder="사용자 이름"
                className="signup-input"
              />
            </div>
            <div className="signup-input-wrap top-347">
              <input
                type="password"
                value={signupValues.password}
                onChange={(e) => setSignupValues({ ...signupValues, password: e.target.value })}
                placeholder="비밀번호"
                className="signup-input"
              />
            </div>
            <div className="signup-half-wrap top-460 left-368">
              <input
                type="text"
                value={signupValues.studentId}
                onChange={(e) => setSignupValues({ ...signupValues, studentId: e.target.value })}
                placeholder="학번"
                className="signup-input"
              />
            </div>
            <div className="signup-half-wrap top-456 left-615">
              <select
                value={signupValues.department}
                onChange={(e) => setSignupValues({ ...signupValues, department: e.target.value })}
                className="signup-input signup-select"
              >
                {departments.map((dept) => (
                  <option key={dept.value} value={dept.value}>{dept.label}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="signup-submit-btn">회원가입</button>
            {message && <p className="signup-message">{message}</p>}
          </form>
          <footer className="signup-footer">
            <span>이미 계정이 있으신가요?</span>
            <button type="button" className="anima-link-btn" onClick={() => setCurrentView("login")}>
              로그인
            </button>
          </footer>
        </section>
      )}

      {/* 3. 대시보드 화면 */}
      {currentView === "dashboard" && (
        <div className="home-wrapper">
          {/* 좌측 사이드바 */}
          <aside className="home-sidebar">
            <h1 className="sidebar-logo">MENU</h1>
            <nav className="sidebar-nav">
              {navItems.map((item) => {
                const isActive = activeMenu === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setActiveMenu(item)}
                    className={`sidebar-nav-btn ${isActive ? "active" : ""}`}
                  >
                    {isActive && <span className="active-indicator" />}
                    {item}
                  </button>
                );
              })}
            </nav>
            <button
              type="button"
              className="sidebar-logout-btn"
              onClick={() => setCurrentView("login")}
            >
              로그아웃
            </button>
          </aside>

          {/* 우측 메인 콘텐츠 */}
          <div className="home-content">
            {/* 3-1. HOME 탭 */}
            {activeMenu === "HOME" && (
              <>
                <header className="home-header">
                  <h1>안녕하세요!<br />오늘의 학습 현황입니다.</h1>
                </header>

                <div className="home-stats-row">
                  <div className="stat-box">
                    <h2>예상 학점</h2>
                    <p className="stat-value">{cumulativeGPA} / 4.5</p>
                  </div>
                  <div className="stat-box">
                    <h2>석차</h2>
                    <p className="stat-value">3 / 42명</p>
                  </div>
                  <div className="stat-box">
                    <h2>이수학점</h2>
                    <p className="stat-value">{totalCredits} 학점</p>
                  </div>
                </div>

                <div className="home-widgets-row">
                  <section className="widget-box">
                    <div className="widget-header">
                      <div>
                        <h2>오늘 수업</h2>
                        <p className="widget-sub">메모와 할 일을 확인하세요.</p>
                      </div>
                      <button type="button" className="widget-pill-btn" onClick={() => setActiveMenu("WEEKLY")}>
                        수업 시간표
                      </button>
                    </div>
                    <div className="widget-list">
                      {todaysClasses.map((cls) => (
                        <button key={cls.title} type="button" className="item-card" onClick={() => setActiveMenu("WEEKLY")}>
                          <div className="item-card-info">
                            <span className="item-title">{cls.title}</span>
                            <span className="item-details">{cls.details}</span>
                          </div>
                          <span className="item-arrow">›</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="widget-box">
                    <div className="widget-header">
                      <div>
                        <h2>오늘의 할 일</h2>
                        <p className="widget-sub">체크리스트를 관리하세요.</p>
                      </div>
                      <button type="button" className="widget-pill-btn" onClick={() => setActiveMenu("PLANNER")}>
                        플래너 열기
                      </button>
                    </div>
                    <div className="widget-list">
                      <label className="todo-item"><input type="checkbox" /><span>컴퓨터프로그래밍 실습 복습</span></label>
                      <label className="todo-item"><input type="checkbox" /><span>미적분학 연습문제 3장 풀기</span></label>
                      <label className="todo-item"><input type="checkbox" /><span>대학영어 발표 자료 준비</span></label>
                    </div>
                  </section>

                  <section className="widget-box">
                    <div className="widget-header">
                      <div>
                        <h2>마감 임박 과제</h2>
                        <p className="widget-sub">메모와 할 일을 확인하세요.</p>
                      </div>
                    </div>
                    <div className="widget-list">
                      {upcomingAssignments.map((item, idx) => (
                        <div key={idx} className="item-card">
                          <div className="item-card-info">
                            <span className="item-title">{item.title}</span>
                            <span className="item-details">{item.details}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </>
            )}

            {/* 3-2. WEEKLY 탭 */}
            {activeMenu === "WEEKLY" && (
              <div className="weekly-container">
                <div className="weekly-header">
                  <h1>주간 시간표</h1>
                  <div className="weekly-btn-group">
                    <button
                      type="button"
                      className="weekly-action-btn"
                      onClick={() => { setModalType("unavailable"); setShowAddModal(true); }}
                    >
                      + 불가능 시간
                    </button>
                    <button
                      type="button"
                      className="weekly-action-btn primary"
                      onClick={() => { setModalType("class"); setShowAddModal(true); }}
                    >
                      + 수업 추가
                    </button>
                  </div>
                </div>

                <div className="figma-timetable-wrapper">
                  <div className="figma-header-row">
                    <div className="figma-time-title">TIME</div>
                    {days.map((day, idx) => (
                      <div key={day} className={`figma-day-pill ${idx === 0 ? "sun" : ""}`}>{day}</div>
                    ))}
                  </div>

                  <div className="figma-body-row">
                    <div className="figma-time-col">
                      {hours.map((time) => (
                        <div key={time} className="figma-time-cell">{time}</div>
                      ))}
                    </div>

                    <div className="figma-grid-area">
                      {hours.map((_, rIdx) => (
                        <div key={rIdx} className="figma-grid-row">
                          {days.map((_, cIdx) => (
                            <div key={cIdx} className="figma-grid-box" />
                          ))}
                        </div>
                      ))}

                      {scheduleItems.map((item) => (
                        <div
                          key={item.id}
                          className={`figma-card ${item.type}`}
                          style={{
                            left: `calc(14.28% * ${item.day} + 4px)`,
                            top: `${item.start * 40}px`,
                            height: `${item.duration * 40}px`,
                          }}
                          onClick={() => setSelectedSchedule(item)}
                        >
                          <span className="card-main">{item.title}</span>
                          <span className="card-sub">{item.room}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3-3. PLANNER 탭 */}
            {activeMenu === "PLANNER" && (
              <div className="planner-container">
                <div className="planner-top-bar">
                  <h1>학습 계획</h1>
                  <button
                    type="button"
                    className="planner-add-btn"
                    onClick={() => setShowTaskModal(true)}
                  >
                    [+] 과제 추가
                  </button>
                </div>

                <div className="planner-board">
                  <div className="planner-calendar-card">
                    <div className="calendar-nav">
                      <button type="button" onClick={handlePrevMonth}>&lt;</button>
                      <span>{currentYear}년 {currentMonth}월</span>
                      <button type="button" onClick={handleNextMonth}>&gt;</button>
                    </div>

                    <div className="calendar-weekdays">
                      <span className="sun">S</span>
                      <span>M</span>
                      <span>T</span>
                      <span>W</span>
                      <span>T</span>
                      <span>F</span>
                      <span className="sat">S</span>
                    </div>

                    <div className="calendar-days-grid">
                      {calendarDays.map((day, idx) => {
                        const dateStr = day
                          ? `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                          : "";
                        const hasTask = day && ddayList.some((task) => task.dueDate === dateStr);

                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={!day}
                            onClick={() => day && setSelectedDate(day)}
                            className={`calendar-day-cell ${!day ? "empty" : ""} ${
                              day === selectedDate ? "selected" : ""
                            } ${idx % 7 === 0 ? "sun-text" : idx % 7 === 6 ? "sat-text" : ""}`}
                          >
                            {day}
                            {hasTask && <span className="calendar-dot" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="planner-right-col">
                    <div className="planner-side-card today-box">
                      <h2>오늘 일정 ({currentMonth}월 {selectedDate}일)</h2>
                      <div className="today-schedule-list">
                        {todaySchedules.map((item, idx) => (
                          <div key={idx} className="today-schedule-pill">
                            <span className="pill-time">{item.time}</span>
                            <span className="pill-title">{item.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="planner-side-card dday-box">
                      <h2>D-Day</h2>
                      <div className="dday-list">
                        {ddayList.map((task) => (
                          <div key={task.id} className="dday-item-row">
                            <span className="dday-badge">{task.dday}</span>
                            <div className="dday-info">
                              <span className="dday-title">{task.title}</span>
                              <span className="dday-date">{task.dueDate} 마감</span>
                            </div>
                            <button
                              type="button"
                              className="dday-del-btn"
                              onClick={() => setDdayList(ddayList.filter((t) => t.id !== task.id))}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3-4. GRADES 탭 (성적 분석 및 목표 가이드) */}
            {activeMenu === "GRADES" && (
              <div className="grades-container">
                <div className="grades-top-bar">
                  <h1>성적 분석 및 목표 가이드</h1>
                  <button
                    type="button"
                    className="grades-add-btn"
                    onClick={openAddGradeModal}
                  >
                    [+] 성적 등록
                  </button>
                </div>

                {/* 상단 요약 카드 2개 */}
                <div className="grades-summary-row">
                  {/* 좌측 카드: 전체 누적 */}
                  <div className="grades-summary-card">
                    <div className="summary-block">
                      <span className="summary-label">전체 누적 평점 평균</span>
                      <div className="summary-value-line">
                        <strong className="summary-big-num">{cumulativeGPA}</strong>
                        <span className="summary-unit">/ 4.5점</span>
                      </div>
                    </div>
                    <div className="summary-divider" />
                    <div className="summary-block">
                      <span className="summary-label">총 취득 학점</span>
                      <div className="summary-value-line">
                        <strong className="summary-big-num">{totalCredits}</strong>
                        <span className="summary-unit">학점</span>
                      </div>
                    </div>
                  </div>

                  {/* 우측 카드: 선택 학기 */}
                  <div className="grades-summary-card">
                    <div className="summary-block">
                      <div className="summary-label-row">
                        <span className="summary-label">선택 학기 평점 평균</span>
                        <select
                          className="semester-mini-select"
                          value={selectedSemester}
                          onChange={(e) => setSelectedSemester(e.target.value)}
                        >
                          <option value="2026 1학기">2026 1학기</option>
                          <option value="2026 2학기">2026 2학기</option>
                        </select>
                      </div>
                      <div className="summary-value-line">
                        <strong className="summary-big-num">{semesterGPA}</strong>
                        <span className="summary-unit">/ 4.5점</span>
                      </div>
                    </div>
                    <div className="summary-divider" />
                    <div className="summary-block">
                      <span className="summary-label">선택 학기 취득 학점</span>
                      <div className="summary-value-line">
                        <strong className="summary-big-num">{semesterCredits}</strong>
                        <span className="summary-unit">학점</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 중단 차트 카드: 학기별 GPA 변화 */}
                <div className="grades-chart-card">
                  <h2>학기별 GPA 변화</h2>
                  <div className="gpa-bar-chart">
                    {chartData.map((d) => {
                      const heightPercent = Math.min(100, Math.round((d.gpa / 4.5) * 100));
                      return (
                        <div key={d.semester} className="gpa-bar-col">
                          <span className="gpa-bar-score">{d.gpa.toFixed(2)}</span>
                          <div className="gpa-bar-track">
                            <div
                              className="gpa-bar-fill"
                              style={{ height: `${heightPercent}%` }}
                            />
                          </div>
                          <span className="gpa-bar-label">{d.semester}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 하단 테이블 카드: 성적 등록 과목 및 관리 */}
                <div className="grades-table-card">
                  <h2>성적 등록 과목 및 관리</h2>
                  <div className="grades-table-header">
                    <span className="col-sem">수강 학기</span>
                    <span className="col-sub">과목명</span>
                    <span className="col-cred">학점</span>
                    <span className="col-grd">성적</span>
                    <span className="col-pt">평점</span>
                    <span className="col-act">관리</span>
                  </div>
                  <div className="grades-table-body">
                    {gradesList.map((item) => (
                      <div key={item.id} className="grades-table-row">
                        <span className="col-sem">{item.semester}</span>
                        <span className="col-sub">{item.subject}</span>
                        <span className="col-cred">{item.credit}</span>
                        <span className="col-grd">{item.grade}</span>
                        <span className="col-pt">{(gradeToPoint[item.grade] || 0).toFixed(1)}</span>
                        <span className="col-act">
                          <button
                            type="button"
                            className="grade-row-btn edit"
                            onClick={() => openEditGradeModal(item)}
                          >
                            [수정]
                          </button>
                          <button
                            type="button"
                            className="grade-row-btn del"
                            onClick={() => handleDeleteGrade(item.id)}
                          >
                            [삭제]
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 일정 상세 확인 모달 */}
      {selectedSchedule && (
        <div className="modal-overlay" onClick={() => setSelectedSchedule(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedSchedule.title}</h2>
            <p style={{ color: "#555", margin: "10px 0" }}>
              {days[selectedSchedule.day]}요일 · {selectedSchedule.room}
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
              <button
                type="button"
                className="modal-cancel-btn"
                style={{ backgroundColor: "#ef4444", color: "white", border: "none" }}
                onClick={() => {
                  setScheduleItems(scheduleItems.filter((i) => i.id !== selectedSchedule.id));
                  setSelectedSchedule(null);
                }}
              >
                삭제
              </button>
              <button type="button" className="modal-save-btn" onClick={() => setSelectedSchedule(null)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수업 추가 모달 */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="figma-modal-card" onClick={(e) => e.stopPropagation()}>
            <h1 className="figma-modal-title">
              {modalType === "class" ? "수업 추가" : "불가능 시간 추가"}
            </h1>
            <form onSubmit={handleClassSubmit} className="figma-modal-form">
              <div className="figma-input-container">
                <input
                  type="text"
                  value={classForm.subject}
                  onChange={(e) => setClassForm({ ...classForm, subject: e.target.value })}
                  placeholder={modalType === "class" ? "과목명" : "일정명 (예: 알바)"}
                  required
                  className="figma-text-input"
                />
              </div>
              <div className="figma-input-container">
                <input
                  type="text"
                  value={classForm.professor}
                  onChange={(e) => setClassForm({ ...classForm, professor: e.target.value })}
                  placeholder={modalType === "class" ? "담당 교수" : "장소 또는 사유"}
                  className="figma-text-input"
                />
              </div>
              <div className="figma-row-inputs">
                <div className="figma-small-box">
                  <select
                    value={classForm.weekday}
                    onChange={(e) => setClassForm({ ...classForm, weekday: e.target.value })}
                    className="figma-select-input"
                  >
                    {weekdaysKorean.map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
                <div className="figma-time-box">
                  <select
                    value={classForm.startTime}
                    onChange={(e) => setClassForm({ ...classForm, startTime: e.target.value })}
                    className="figma-select-time"
                  >
                    {hours.map((h) => (<option key={h} value={h}>{h}</option>))}
                  </select>
                  <span className="time-tilde">~</span>
                  <select
                    value={classForm.endTime}
                    onChange={(e) => setClassForm({ ...classForm, endTime: e.target.value })}
                    className="figma-select-time"
                  >
                    {hours.map((h) => (<option key={h} value={h}>{h}</option>))}
                  </select>
                </div>
              </div>
              <div className="figma-btn-row">
                <button type="button" onClick={() => setShowAddModal(false)} className="figma-cancel-btn">취소</button>
                <button type="submit" className="figma-submit-btn">[저장]</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PLANNER [+] 과제 추가 모달 */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="figma-modal-card" onClick={(e) => e.stopPropagation()}>
            <h1 className="figma-modal-title">새 과제 추가</h1>
            <form onSubmit={handleAddTask} className="figma-modal-form">
              <div className="figma-input-container">
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="과제명을 입력하세요"
                  required
                  className="figma-text-input"
                />
              </div>
              <div className="figma-input-container">
                <input
                  type="date"
                  value={taskForm.date}
                  onChange={(e) => setTaskForm({ ...taskForm, date: e.target.value })}
                  required
                  className="figma-text-input"
                />
              </div>
              <div className="figma-btn-row">
                <button type="button" onClick={() => setShowTaskModal(false)} className="figma-cancel-btn">취소</button>
                <button type="submit" className="figma-submit-btn">[저장]</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GRADES [+] 성적 등록 / 수정 모달 */}
      {showGradeModal && (
        <div className="modal-overlay" onClick={() => setShowGradeModal(false)}>
          <div className="figma-modal-card" onClick={(e) => e.stopPropagation()}>
            <h1 className="figma-modal-title">
              {editingGradeId !== null ? "성적 수정" : "성적 등록"}
            </h1>
            <form onSubmit={handleGradeSubmit} className="figma-modal-form">
              <div className="figma-input-container">
                <select
                  value={gradeForm.semester}
                  onChange={(e) => setGradeForm({ ...gradeForm, semester: e.target.value })}
                  className="figma-select-input"
                >
                  <option value="2026 1학기">2026 1학기</option>
                  <option value="2026 2학기">2026 2학기</option>
                </select>
              </div>
              <div className="figma-input-container">
                <input
                  type="text"
                  value={gradeForm.subject}
                  onChange={(e) => setGradeForm({ ...gradeForm, subject: e.target.value })}
                  placeholder="과목명 (예: 운영체제)"
                  required
                  className="figma-text-input"
                />
              </div>
              <div className="figma-row-inputs">
                <div className="figma-small-box">
                  <select
                    value={gradeForm.credit}
                    onChange={(e) => setGradeForm({ ...gradeForm, credit: e.target.value })}
                    className="figma-select-input"
                  >
                    <option value={1}>1학점</option>
                    <option value={2}>2학점</option>
                    <option value={3}>3학점</option>
                    <option value={4}>4학점</option>
                  </select>
                </div>
                <div className="figma-small-box">
                  <select
                    value={gradeForm.grade}
                    onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })}
                    className="figma-select-input"
                  >
                    {Object.keys(gradeToPoint).map((g) => (
                      <option key={g} value={g}>{g} ({gradeToPoint[g].toFixed(1)})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="figma-btn-row">
                <button type="button" onClick={() => setShowGradeModal(false)} className="figma-cancel-btn">취소</button>
                <button type="submit" className="figma-submit-btn">[저장]</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;