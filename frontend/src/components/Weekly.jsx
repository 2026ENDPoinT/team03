
import React from "react";

export function Weekly(props) {
  const {
    activeMenu,
    days = [],
    hours = [],
    scheduleItems = [],
    setSelectedSchedule,
    openAddSchedule,
  } = props;

  if (activeMenu !== "WEEKLY") {
    return null;
  }

  return (
    <div className="weekly-container">
      <div className="weekly-header">
        <h1>주간 시간표</h1>

        <div className="weekly-btn-group">
          <button
            type="button"
            className="weekly-action-btn"
            onClick={() => openAddSchedule("unavailable")}
          >
            + 불가능 시간
          </button>

          <button
            type="button"
            className="weekly-action-btn primary"
            onClick={() => openAddSchedule("class")}
          >
            + 수업 추가
          </button>
        </div>
      </div>

      <div className="figma-timetable-wrapper">
        {/* 요일 헤더 */}
        <div className="figma-header-row">
          <div className="figma-time-title">TIME</div>

          {days.map((day, idx) => (
            <div
              key={day}
              className={`figma-day-pill ${
                idx === 0 ? "sun" : ""
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 시간표 본문 */}
        <div className="figma-body-row">
          {/* 시간 표시 */}
          <div className="figma-time-col">
            {hours.map((time) => (
              <div
                key={time}
                className="figma-time-cell"
              >
                {time}
              </div>
            ))}
          </div>

          {/* 시간표 격자 */}
          <div className="figma-grid-area">
            {hours.map((_, rowIndex) => (
              <div
                key={rowIndex}
                className="figma-grid-row"
              >
                {days.map((_, colIndex) => (
                  <div
                    key={colIndex}
                    className="figma-grid-box"
                  />
                ))}
              </div>
            ))}

            {/* 등록된 일정 카드 */}
            {scheduleItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`figma-card ${item.type}`}
                style={{
                  left: `calc(14.285714% * ${item.day} + 4px)`,
                  top: `${item.start * 40}px`,
                  height: `${item.duration * 40}px`,
                  zIndex: 2,
                  overflow: "hidden",
                  fontFamily: "inherit",
                }}
                onClick={() => setSelectedSchedule(item)}
                title={`${item.title} - 클릭하여 수정 또는 삭제`}
              >
                <span className="card-main">
                  {item.title}
                </span>

                {item.room && (
                  <span className="card-sub">
                    {item.room}
                  </span>
                )}

                {item.repeat === false && (
                  <span
                    className="card-sub"
                    style={{ fontSize: "10px" }}
                  >
                    {item.date}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
