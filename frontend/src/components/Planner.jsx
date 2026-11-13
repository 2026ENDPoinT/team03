
import React from "react";

export function Planner(props) {
  const {
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
    setDdayList,
    setShowTaskModal,
  } = props;

  if (activeMenu !== "PLANNER") {
    return null;
  }

  return (
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
        {/* 왼쪽 달력 */}
        <div className="planner-calendar-card">
          <div className="calendar-nav">
            <button
              type="button"
              onClick={handlePrevMonth}
            >
              &lt;
            </button>

            <span>
              {currentYear}년 {currentMonth}월
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
            >
              &gt;
            </button>
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

              const hasTask =
                day &&
                ddayList.some(
                  (task) => task.dueDate === dateStr
                );

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!day}
                  onClick={() =>
                    day && setSelectedDate(day)
                  }
                  className={`calendar-day-cell ${
                    !day ? "empty" : ""
                  } ${
                    day === selectedDate
                      ? "selected"
                      : ""
                  } ${
                    idx % 7 === 0
                      ? "sun-text"
                      : idx % 7 === 6
                      ? "sat-text"
                      : ""
                  }`}
                >
                  {day}

                  {hasTask && (
                    <span className="calendar-dot" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 오른쪽 일정 및 D-Day */}
        <div className="planner-right-col">
          {/* 선택한 날짜의 일정 */}
          <div className="planner-side-card today-box">
            <h2>
              오늘 일정 ({currentMonth}월 {selectedDate}일)
            </h2>

            <div className="today-schedule-list">
              {selectedDaySchedules.length === 0 ? (
                <div className="planner-empty-message">
                  등록된 일정이 없습니다.
                </div>
              ) : (
                selectedDaySchedules.map((item) => (
                  <div
                    key={item.id}
                    className="today-schedule-pill"
                  >
                    <span className="pill-time">
                      {item.time}
                    </span>

                    <span className="pill-title">
                      {item.title}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* D-Day */}
          <div className="planner-side-card dday-box">
            <h2>D-Day</h2>

            <div className="dday-list">
              {ddayList.map((task) => (
                <div
                  key={task.id}
                  className="dday-item-row"
                >
                  <span className="dday-badge">
                    {task.dday}
                  </span>

                  <div className="dday-info">
                    <span className="dday-title">
                      {task.title}
                    </span>

                    <span className="dday-date">
                      {task.dueDate} 마감
                    </span>
                  </div>

                  <button
                    type="button"
                    className="dday-del-btn"
                    onClick={() =>
                      setDdayList((prev) =>
                        prev.filter(
                          (t) => t.id !== task.id
                        )
                      )
                    }
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
  );
}
