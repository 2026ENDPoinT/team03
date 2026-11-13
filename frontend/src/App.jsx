
import React, { useState } from "react";
import "./App.css";
import { LoginScreen } from "./components/LoginScreen";
import { SignupScreen } from "./components/SignupScreen";
import { Dashboard } from "./components/Dashboard";
import { Home } from "./components/Home";
import { Weekly } from "./components/Weekly";
import { Planner } from "./components/Planner";
import { Grades } from "./components/Grades";
import { Modals } from "./components/Modals";

const WEEKDAYS = [
  "일요일", "월요일", "화요일", "수요일",
  "목요일", "금요일", "토요일"
];

const HOURS = [
  "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00"
];

const TIME_OPTIONS = [...HOURS, "14:30"];

const EMPTY_CLASS_FORM = {
  subject: "",
  professor: "",
  weekday: "월요일",
  startTime: "09:00",
  endTime: "10:30",
  repeat: true,
  date: "",
};

// 날짜를 YYYY-MM-DD로 변환
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function App() {
  const [currentView, setCurrentView] = useState("login");
  const [activeMenu, setActiveMenu] = useState("HOME");

  // 로그인 및 회원가입
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

  // WEEKLY 시간표
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const hours = HOURS;
  const weekdaysKorean = WEEKDAYS;

  const [scheduleItems, setScheduleItems] = useState([
    {
      id: 1,
      day: 1,
      start: 4,
      duration: 3,
      title: "자료 구조 과제",
      room: "AI 추천",
      type: "purple",
      repeat: true,
    },
    {
      id: 2,
      day: 2,
      start: 2,
      duration: 3,
      title: "미분적분학",
      room: "홍길동",
      type: "green",
      repeat: true,
    },
    {
      id: 3,
      day: 3,
      start: 4,
      duration: 4,
      title: "불가능 시간",
      room: "알바",
      type: "gray",
      repeat: true,
    },
    {
      id: 4,
      day: 5,
      start: 2,
      duration: 3,
      title: "미분적분학",
      room: "홍길동",
      type: "green",
      repeat: true,
    },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState("class");
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  // 수정 중인 일정 ID
  const [editingScheduleId, setEditingScheduleId] = useState(null);

  // 겹침 등 오류 메시지
  const [scheduleError, setScheduleError] = useState("");

  const [classForm, setClassForm] = useState({
    ...EMPTY_CLASS_FORM,
  });

  // 새 일정 추가 창 열기
  const openAddSchedule = (type) => {
    setModalType(type);
    setEditingScheduleId(null);
    setSelectedSchedule(null);
    setScheduleError("");
    setClassForm({
      ...EMPTY_CLASS_FORM,
      date: formatDate(new Date()),
    });
    setShowAddModal(true);
  };

  // 기존 일정 수정 창 열기
  const openEditSchedule = (item) => {
    const isUnavailable = item.type === "gray";
    const startTime = HOURS[item.start] || "09:00";
    const endTime =
      TIME_OPTIONS[item.start + item.duration] || "14:30";

    setModalType(isUnavailable ? "unavailable" : "class");
    setEditingScheduleId(item.id);
    setSelectedSchedule(null);
    setScheduleError("");

    setClassForm({
      subject: item.title,
      professor: item.room || "",
      weekday: WEEKDAYS[item.day] || "월요일",
      startTime,
      endTime,
      repeat: item.repeat !== false,
      date: item.date || formatDate(new Date()),
    });

    setShowAddModal(true);
  };

  // 추가/수정 창 닫기
  const closeScheduleModal = () => {
    setShowAddModal(false);
    setEditingScheduleId(null);
    setScheduleError("");
  };

  // 일정 삭제
  const deleteSchedule = (id) => {
    setScheduleItems((prev) =>
      prev.filter((item) => item.id !== id)
    );
    setSelectedSchedule(null);
  };

  // 수업 및 불가능 시간 저장
  const handleClassSubmit = (e) => {
    e.preventDefault();
    setScheduleError("");

    if (!classForm.subject.trim()) {
      setScheduleError("일정 이름을 입력해 주세요.");
      return;
    }

    const startIdx = TIME_OPTIONS.indexOf(classForm.startTime);
    const endIdx = TIME_OPTIONS.indexOf(classForm.endTime);

    if (startIdx < 0 || endIdx < 0 || endIdx <= startIdx) {
      setScheduleError("종료시간은 시작시간보다 늦어야 합니다.");
      return;
    }

    if (startIdx >= HOURS.length) {
      setScheduleError("선택할 수 없는 시작시간입니다.");
      return;
    }

    const isUnavailable = modalType === "unavailable";
    const repeat = isUnavailable ? classForm.repeat : true;

    let day = WEEKDAYS.indexOf(classForm.weekday);
    let date = null;

    // 반복하지 않는 불가능 시간은 특정 날짜에만 적용
    if (isUnavailable && !repeat) {
      if (!classForm.date) {
        setScheduleError("일회성 일정의 날짜를 선택해 주세요.");
        return;
      }

      date = classForm.date;

      const parsedDate = new Date(`${date}T12:00:00`);

      if (Number.isNaN(parsedDate.getTime()) ||
          formatDate(parsedDate) !== date) {
        setScheduleError("올바른 날짜를 선택해 주세요.");
        return;
      }

      day = parsedDate.getDay();
    }

    if (day < 0) {
      setScheduleError("요일을 선택해 주세요.");
      return;
    }

    // 기존 일정과 시간이 겹치는지 확인
    const conflictingItem = scheduleItems.find((item) => {
      // 수정하는 자기 자신은 제외
      if (item.id === editingScheduleId) {
        return false;
      }

      if (item.day !== day) {
        return false;
      }

      const itemStart = item.start;
      const itemEnd = item.start + item.duration;

      // [시작, 종료) 구간이 실제로 겹치는 경우
      const timeOverlaps =
        startIdx < itemEnd && itemStart < endIdx;

      if (!timeOverlaps) return false;

      const itemRepeats = item.repeat !== false;

      // 둘 다 일회성이라면 날짜까지 같아야 충돌
      if (!repeat && !itemRepeats) {
        return date === item.date;
      }

      // 반복 일정이 하나라도 있다면 같은 요일에 충돌
      return true;
    });

    if (conflictingItem) {
      const conflictStart =
        TIME_OPTIONS[conflictingItem.start] || "";

      const conflictEnd =
        TIME_OPTIONS[
          conflictingItem.start + conflictingItem.duration
        ] || "";

      setScheduleError(
        `"${conflictingItem.title}" 일정과 시간이 겹칩니다. ` +
        `(${conflictStart}~${conflictEnd})`
      );
      return;
    }

    const newData = {
      day,
      start: startIdx,
      duration: endIdx - startIdx,
      title: classForm.subject.trim(),
      room: isUnavailable
        ? ""
        : classForm.professor.trim(),
      type: isUnavailable ? "gray" : "green",
      repeat,
      date,
    };

    if (editingScheduleId !== null) {
      // 기존 데이터 수정
      setScheduleItems((prev) =>
        prev.map((item) =>
          item.id === editingScheduleId
            ? {
                ...item,
                ...newData,
              }
            : item
        )
      );
    } else {
      // 새 데이터 추가
      setScheduleItems((prev) => [
        ...prev,
        {
          id: Date.now(),
          ...newData,
        },
      ]);
    }

    closeScheduleModal();
  };

  // PLANNER 달력
  const [selectedDate, setSelectedDate] = useState(12);
  const [currentMonth, setCurrentMonth] = useState(11);
  const [currentYear, setCurrentYear] = useState(2026);

  const firstDayOfMonth = new Date(
    currentYear,
    currentMonth - 1,
    1
  ).getDay();

  const daysInMonth = new Date(
    currentYear,
    currentMonth,
    0
  ).getDate();

  const totalSlots =
    firstDayOfMonth + daysInMonth > 35 ? 42 : 35;

  const calendarDays = Array.from(
    { length: totalSlots },
    (_, idx) => {
      const dayNum = idx - firstDayOfMonth + 1;
      return dayNum > 0 && dayNum <= daysInMonth
        ? dayNum
        : null;
    }
  );

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

  const [ddayList, setDdayList] = useState([
    {
      id: 1,
      title: "자료구조 연결리스트 구현",
      dueDate: "2026-11-15",
      dday: "D-3",
    },
    {
      id: 2,
      title: "미분적분학 연습문제 풀이",
      dueDate: "2026-11-19",
      dday: "D-7",
    },
    {
      id: 3,
      title: "창의적 사고 팀 발표 PPT",
      dueDate: "2026-11-24",
      dday: "D-12",
    },
  ]);

  // 선택 날짜의 요일별 수업과 마감 과제
  const selectedFullDate = new Date(
    currentYear,
    currentMonth - 1,
    selectedDate
  );

  const selectedWeekday = selectedFullDate.getDay();
  const selectedDateString = formatDate(selectedFullDate);

  const weeklySchedules = scheduleItems
    .filter((item) => {
      if (item.day !== selectedWeekday) return false;

      return item.repeat !== false ||
        item.date === selectedDateString;
    })
    .map((item) => ({
      id: `schedule-${item.id}`,
      time: HOURS[item.start] || "시간 미정",
      title: item.title,
    }))
    .sort((a, b) => a.time.localeCompare(b.time));

  const selectedDayTasks = ddayList
    .filter((task) => task.dueDate === selectedDateString)
    .map((task) => ({
      id: `task-${task.id}`,
      time: "마감",
      title: task.title,
    }));

  const selectedDaySchedules = [
    ...weeklySchedules,
    ...selectedDayTasks,
  ];

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    date: "2026-11-16",
  });

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!taskForm.title.trim() || !taskForm.date) return;

    const targetDate = new Date(`${taskForm.date}T12:00:00`);
    const baseDate = new Date(2026, 10, 12, 12);

    const diff = Math.round(
      (targetDate - baseDate) / (1000 * 60 * 60 * 24)
    );

    const ddayText =
      diff === 0
        ? "D-Day"
        : diff > 0
        ? `D-${diff}`
        : `D+${Math.abs(diff)}`;

    setDdayList((prev) => [
      ...prev,
      {
        id: Date.now(),
        title: taskForm.title.trim(),
        dueDate: taskForm.date,
        dday: ddayText,
      },
    ]);

    setTaskForm({
      title: "",
      date: "2026-11-16",
    });

    setShowTaskModal(false);
  };

  // GRADES
  const gradeToPoint = {
    "A+": 4.5,
    A0: 4.0,
    "B+": 3.5,
    B0: 3.0,
    "C+": 2.5,
    C0: 2.0,
    "D+": 1.5,
    D0: 1.0,
    F: 0.0,
  };

  const [gradesList, setGradesList] = useState([
    { id: 1, semester: "2026 1학기", subject: "프로그래밍 입문 (1)", credit: 3, grade: "A+" },
    { id: 2, semester: "2026 1학기", subject: "미분적분학", credit: 3, grade: "A+" },
    { id: 3, semester: "2026 2학기", subject: "선형대수학", credit: 3, grade: "B0" },
    { id: 4, semester: "2026 2학기", subject: "자료구조", credit: 3, grade: "A0" },
    { id: 5, semester: "2026 2학기", subject: "프로그래밍 입문 (2)", credit: 3, grade: "A+" },
  ]);

  const [selectedSemester, setSelectedSemester] =
    useState("2026 2학기");

  const [showGradeModal, setShowGradeModal] = useState(false);
  const [editingGradeId, setEditingGradeId] = useState(null);

  const [gradeForm, setGradeForm] = useState({
    semester: "2026 2학기",
    subject: "",
    credit: 3,
    grade: "A+",
  });

  const totalCredits = gradesList.reduce(
    (acc, item) => acc + Number(item.credit),
    0
  );

  const totalWeightedPoints = gradesList.reduce(
    (acc, item) =>
      acc +
      Number(item.credit) *
        (gradeToPoint[item.grade] || 0),
    0
  );

  const cumulativeGPA =
    totalCredits > 0
      ? (totalWeightedPoints / totalCredits).toFixed(2)
      : "0.00";

  const semesterGrades = gradesList.filter(
    (item) => item.semester === selectedSemester
  );

  const semesterCredits = semesterGrades.reduce(
    (acc, item) => acc + Number(item.credit),
    0
  );

  const semesterWeightedPoints = semesterGrades.reduce(
    (acc, item) =>
      acc +
      Number(item.credit) *
        (gradeToPoint[item.grade] || 0),
    0
  );

  const semesterGPA =
    semesterCredits > 0
      ? (semesterWeightedPoints / semesterCredits).toFixed(2)
      : "0.00";

  const semesters = [
    "2025 1학기",
    "2025 2학기",
    "2026 1학기",
    "2026 2학기",
  ];

  const chartData = semesters.map((sem) => {
    if (sem === "2025 1학기") {
      return { semester: sem, gpa: 3.75 };
    }

    if (sem === "2025 2학기") {
      return { semester: sem, gpa: 3.92 };
    }

    const list = gradesList.filter(
      (item) => item.semester === sem
    );

    const creds = list.reduce(
      (sum, item) => sum + Number(item.credit),
      0
    );

    const pts = list.reduce(
      (sum, item) =>
        sum +
        Number(item.credit) *
          (gradeToPoint[item.grade] || 0),
      0
    );

    return {
      semester: sem,
      gpa: creds > 0
        ? Number((pts / creds).toFixed(2))
        : 0,
    };
  });

  const openAddGradeModal = () => {
    setEditingGradeId(null);
    setGradeForm({
      semester: selectedSemester,
      subject: "",
      credit: 3,
      grade: "A+",
    });
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
    if (!gradeForm.subject.trim()) return;

    if (editingGradeId !== null) {
      setGradesList((prev) =>
        prev.map((item) =>
          item.id === editingGradeId
            ? {
                ...gradeForm,
                id: editingGradeId,
                credit: Number(gradeForm.credit),
              }
            : item
        )
      );
    } else {
      setGradesList((prev) => [
        ...prev,
        {
          ...gradeForm,
          id: Date.now(),
          credit: Number(gradeForm.credit),
        },
      ]);
    }

    setShowGradeModal(false);
    setEditingGradeId(null);
  };

  const handleDeleteGrade = (id) => {
    setGradesList((prev) =>
      prev.filter((item) => item.id !== id)
    );
  };

  const departments = [
    { value: "", label: "학과" },
    { value: "computer-science", label: "컴퓨터공학과" },
    { value: "business", label: "경영학과" },
    { value: "design", label: "디자인학과" },
    { value: "mechanical-engineering", label: "기계공학과" },
  ];

  // 기존 HOME 마감 임박 과제 데이터
  const upcomingAssignments = [
    { title: "알고리즘 과제", details: "09:00–10:30 · 홍길동 교수님" },
    { title: "미적분학", details: "11:00–12:30 · 김민수 교수님" },
    { title: "대학영어", details: "14:00–15:30 · 이수진 교수님" },
  ];

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

  return (
    <main className="anima-main">
      <LoginScreen
        {...{
          currentView,
          setCurrentView,
          loginEmail,
          setLoginEmail,
          loginPassword,
          setLoginPassword,
          handleLoginSubmit,
        }}
      />

      <SignupScreen
        {...{
          currentView,
          setCurrentView,
          signupValues,
          setSignupValues,
          handleSignupSubmit,
          departments,
          message,
        }}
      />

      <Dashboard
        {...{
          currentView,
          activeMenu,
          setActiveMenu,
          setCurrentView,
        }}
      >
        <Home
          {...{
            activeMenu,
            setActiveMenu,
            cumulativeGPA,
            totalCredits,
            scheduleItems,
            hours,
            upcomingAssignments,
          }}
        />

        <Weekly
          {...{
            activeMenu,
            days,
            hours,
            scheduleItems,
            setSelectedSchedule,
            openAddSchedule,
          }}
        />

        <Planner
          {...{
            activeMenu,
            currentYear,
            currentMonth,
            handlePrevMonth,
            handleNextMonth,
            calendarDays,
            ddayList,
            selectedDate,
            setSelectedDate,
            selectedDaySchedules,
            todaySchedules: selectedDaySchedules,
            setDdayList,
            setShowTaskModal,
          }}
        />

        <Grades
          {...{
            activeMenu,
            openAddGradeModal,
            cumulativeGPA,
            totalCredits,
            selectedSemester,
            setSelectedSemester,
            semesterGPA,
            semesterCredits,
            chartData,
            gradesList,
            gradeToPoint,
            openEditGradeModal,
            handleDeleteGrade,
          }}
        />
      </Dashboard>

      <Modals
        {...{
          selectedSchedule,
          setSelectedSchedule,
          days,
          hours,
          weekdaysKorean,
          showAddModal,
          modalType,
          editingScheduleId,
          classForm,
          setClassForm,
          scheduleError,
          handleClassSubmit,
          openEditSchedule,
          closeScheduleModal,
          deleteSchedule,
          showTaskModal,
          setShowTaskModal,
          handleAddTask,
          taskForm,
          setTaskForm,
          showGradeModal,
          setShowGradeModal,
          editingGradeId,
          handleGradeSubmit,
          gradeForm,
          setGradeForm,
          gradeToPoint,
        }}
      />
    </main>
  );
}

export default App;
