
import React, { useEffect, useState } from "react";

const STORAGE_KEY = "hackathon-class-records-v1";

// 서버 시간 대신 기기의 날짜 사용
function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function Home(props) {
  const {
    activeMenu,
    setActiveMenu,
    cumulativeGPA,
    totalCredits,
    scheduleItems = [],
    hours = [],
  } = props;

  const [todayKey, setTodayKey] = useState(getTodayKey);
  const todayWeekday = new Date().getDay();

  // 날짜별, 수업별 메모와 체크리스트
  const [classRecords, setClassRecords] = useState(loadRecords);

  // 팝업
  const [selectedClass, setSelectedClass] = useState(null);
  const [activeTab, setActiveTab] = useState("memo");
  const [draftMemo, setDraftMemo] = useState("");
  const [draftChecklist, setDraftChecklist] = useState([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");

  // HOME에 표시할 오늘 수업
  const todaysClasses = scheduleItems
    .filter((item) => item.day === todayWeekday)
    .sort((a, b) => a.start - b.start)
    .map((item) => {
      const startTime = hours[item.start] || "시간 미정";
      const endTime =
        hours[item.start + item.duration] || "";

      return {
        ...item,
        details:
          `${startTime}${endTime ? `–${endTime}` : ""}` +
          (item.room ? ` · ${item.room}` : ""),
      };
    });

  // 브라우저에 저장
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(classRecords)
    );
  }, [classRecords]);

  // HOME으로 돌아왔을 때 날짜 갱신
  useEffect(() => {
    if (activeMenu === "HOME") {
      setTodayKey(getTodayKey());
    }
  }, [activeMenu]);

  // 오늘 날짜에 해당하는 기록 키
  const getRecordKey = (classId) => {
    return `${todayKey}-${classId}`;
  };

  // 오늘의 할 일 목록 생성
  const todayTodos = todaysClasses.flatMap((cls) => {
    const record = classRecords[getRecordKey(cls.id)];

    if (!record || !record.checklist) {
      return [];
    }

    return record.checklist.map((item) => ({
      ...item,
      classId: cls.id,
      classTitle: cls.title,
    }));
  });

  // 팝업 열기
  const openClassModal = (cls) => {
    const record = classRecords[getRecordKey(cls.id)];

    setSelectedClass(cls);
    setActiveTab("memo");
    setDraftMemo(record?.memo || "");
    setDraftChecklist(
      record?.checklist
        ? record.checklist.map((item) => ({ ...item }))
        : []
    );
    setNewChecklistItem("");
  };

  const closeClassModal = () => {
    setSelectedClass(null);
    setNewChecklistItem("");
  };

  // 메모 및 체크리스트 저장
  const saveClassRecord = () => {
    if (!selectedClass) return;

    const recordKey = getRecordKey(selectedClass.id);

    setClassRecords((prev) => ({
      ...prev,
      [recordKey]: {
        memo: draftMemo,
        checklist: draftChecklist,
      },
    }));

    closeClassModal();
  };

  // 팝업에서 할 일 추가
  const addChecklistItem = () => {
    const text = newChecklistItem.trim();

    if (!text) return;

    setDraftChecklist((prev) => [
      ...prev,
      {
        id: Date.now(),
        text,
        checked: false,
      },
    ]);

    setNewChecklistItem("");
  };

  // 팝업에서 체크
  const toggleDraftItem = (itemId) => {
    setDraftChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, checked: !item.checked }
          : item
      )
    );
  };

  // 팝업에서 삭제
  const deleteDraftItem = (itemId) => {
    setDraftChecklist((prev) =>
      prev.filter((item) => item.id !== itemId)
    );
  };

  // HOME의 오늘의 할 일에서 체크
  const toggleHomeTodo = (classId, itemId) => {
    const recordKey = getRecordKey(classId);

    setClassRecords((prev) => {
      const record = prev[recordKey];
      if (!record) return prev;

      return {
        ...prev,
        [recordKey]: {
          ...record,
          checklist: record.checklist.map((item) =>
            item.id === itemId
              ? { ...item, checked: !item.checked }
              : item
          ),
        },
      };
    });
  };

  // ESC로 팝업 닫기
  useEffect(() => {
    if (!selectedClass) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        closeClassModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedClass]);

  const assignments = [
    {
      id: 1,
      dday: "D-day",
      title: "선형대수학",
      details: "영상 시청",
    },
    {
      id: 2,
      dday: "D-3",
      title: "현대문화론",
      details: "보고서 제출",
    },
    {
      id: 3,
      dday: "D-9",
      title: "과학기술과 사회",
      details: "토론 #1",
    },
  ];

  if (activeMenu !== "HOME") {
    return null;
  }

  return (
    <>
      <style>{`
        .home-todo-empty {
          background: #ffffff;
          border-radius: 10px;
          padding: 20px 12px;
          color: #78716c;
          font-size: 14px;
          text-align: center;
        }

        .home-todo-class {
          color: #78716c;
          font-size: 11px;
          margin-left: auto;
          flex-shrink: 0;
        }

        .home-todo-text {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .home-todo-text.checked {
          text-decoration: line-through;
          color: #a3a3a3;
        }

        .class-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          padding: 20px;
          box-sizing: border-box;
        }

        .class-modal {
          width: 600px;
          max-width: 100%;
          height: 520px;
          max-height: 90vh;
          background: #ffffff;
          border: 1px solid #d4d4d8;
          border-radius: 20px;
          padding: 24px 32px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          font-family: "Noto Sans KR", sans-serif;
          color: #262626;
          box-shadow: 0 15px 45px rgba(0, 0, 0, 0.12);
        }

        .class-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .class-modal-title {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          line-height: 36px;
        }

        .class-modal-info {
          margin-top: 4px;
          font-size: 12px;
          line-height: 20px;
          color: #78716c;
        }

        .class-modal-close {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 8px;
          background: #ffffff;
          color: #262626;
          font-size: 24px;
          cursor: pointer;
          flex-shrink: 0;
        }

        .class-modal-tabs {
          margin-top: 22px;
          width: 100%;
          height: 48px;
          background: #f4f4f5;
          border-radius: 10px;
          padding: 4px;
          box-sizing: border-box;
          display: flex;
          flex-shrink: 0;
        }

        .class-modal-tab {
          flex: 1;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: #78716c;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
        }

        .class-modal-tab.active {
          background: #262626;
          color: #ffffff;
        }

        .class-modal-body {
          margin-top: 20px;
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }

        .class-modal-label {
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 12px;
        }

        .class-modal-memo {
          width: 100%;
          flex: 1;
          min-height: 0;
          border: 1px solid #d4d4d8;
          background: #f4f4f5;
          border-radius: 10px;
          padding: 18px 20px;
          box-sizing: border-box;
          font-family: inherit;
          font-size: 16px;
          line-height: 2;
          resize: none;
          outline: none;
        }

        .class-modal-hint {
          font-size: 12px;
          color: #78716c;
          margin-top: 8px;
        }

        .class-modal-checklist {
          flex: 1;
          min-height: 0;
          background: #f4f4f5;
          border: 1px solid #d4d4d8;
          border-radius: 10px;
          padding: 14px;
          overflow-y: auto;
          box-sizing: border-box;
        }

        .class-modal-checklist-row {
          background: #ffffff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          margin-bottom: 8px;
        }

        .class-modal-checklist-row input {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .class-modal-checklist-text {
          flex: 1;
          font-size: 14px;
          overflow-wrap: anywhere;
        }

        .class-modal-checklist-text.checked {
          text-decoration: line-through;
          color: #a3a3a3;
        }

        .class-modal-delete {
          border: none;
          background: transparent;
          color: #a1a1aa;
          font-size: 18px;
          cursor: pointer;
        }

        .class-modal-empty {
          text-align: center;
          color: #78716c;
          font-size: 14px;
          margin-top: 30px;
        }

        .class-modal-add-row {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }

        .class-modal-add-input {
          flex: 1;
          min-width: 0;
          border: 1px solid #d4d4d8;
          border-radius: 8px;
          padding: 10px;
          font-size: 14px;
        }

        .class-modal-add-button {
          background: #262626;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0 16px;
          cursor: pointer;
        }

        .class-modal-footer {
          margin-top: 20px;
          padding-top: 22px;
          border-top: 1px solid #d4d4d8;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          flex-shrink: 0;
        }

        .class-modal-cancel,
        .class-modal-save {
          width: 96px;
          height: 40px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
        }

        .class-modal-cancel {
          background: #ffffff;
          border: 1px solid #d4d4d8;
        }

        .class-modal-save {
          background: #262626;
          color: #ffffff;
          border: none;
        }

        .deadline-widget {
          background: #e2e8f0;
          border-radius: 20px;
          padding: 24px 20px 30px;
          display: flex;
          flex-direction: column;
          gap: 26px;
          min-width: 0;
          box-sizing: border-box;
        }

        .deadline-widget h2 {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          color: #000000;
        }

        .deadline-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .deadline-card {
          width: 100%;
          min-height: 64px;
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 12px;
          border: none;
          border-radius: 11px;
          background: #ffffff;
          text-align: left;
          cursor: pointer;
        }

        .deadline-badge {
          width: 49px;
          height: 38px;
          flex-shrink: 0;
          background: #a8cdfb;
          border-radius: 4px;
          color: white;
          font-size: 21px;
          font-weight: 800;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .deadline-badge.today {
          font-size: 13px;
        }

        .deadline-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .deadline-title {
          font-size: 17px;
          font-weight: 700;
        }

        .deadline-details {
          font-size: 12px;
          color: #777777;
        }
      `}</style>

      {/* 상단 인사말 */}
      <header className="home-header">
        <h1>
          안녕하세요!
          <br />
          오늘의 학습 현황입니다.
        </h1>
      </header>

      {/* 학점 카드 */}
      <div className="home-stats-row">
        <div className="stat-box">
          <h2>예상 학점</h2>
          <p className="stat-value">
            {cumulativeGPA} / 4.5
          </p>
        </div>

        <div className="stat-box">
          <h2>석차</h2>
          <p className="stat-value">3 / 42명</p>
        </div>

        <div className="stat-box">
          <h2>이수학점</h2>
          <p className="stat-value">
            {totalCredits} 학점
          </p>
        </div>
      </div>

      <div className="home-widgets-row">
        {/* 오늘 수업 */}
        <section className="widget-box">
          <div className="widget-header">
            <div>
              <h2>오늘 수업</h2>
              <p className="widget-sub">
                과목별 메모와 할 일을 확인하세요.
              </p>
            </div>

            <button
              type="button"
              className="widget-pill-btn"
              onClick={() => setActiveMenu("WEEKLY")}
            >
              수업 시간표
            </button>
          </div>

          <div className="widget-list">
            {todaysClasses.length === 0 ? (
              <div className="home-todo-empty">
                오늘 등록된 수업이 없습니다.
              </div>
            ) : (
              todaysClasses.map((cls) => (
                <button
                  key={cls.id}
                  type="button"
                  className="item-card"
                  onClick={() => openClassModal(cls)}
                >
                  <div className="item-card-info">
                    <span className="item-title">
                      {cls.title}
                    </span>
                    <span className="item-details">
                      {cls.details}
                    </span>
                  </div>
                  <span className="item-arrow">›</span>
                </button>
              ))
            )}
          </div>
        </section>

        {/* 오늘의 할 일 - 과목 체크리스트와 연동 */}
        <section className="widget-box">
          <div className="widget-header">
            <div>
              <h2>오늘의 할 일</h2>
              <p className="widget-sub">
                오늘 수업의 체크리스트입니다.
              </p>
            </div>

            <button
              type="button"
              className="widget-pill-btn"
              onClick={() => setActiveMenu("PLANNER")}
            >
              플래너 열기
            </button>
          </div>

          <div className="widget-list">
            {todayTodos.length === 0 ? (
              <div className="home-todo-empty">
                오늘 등록된 할 일이 없습니다.
              </div>
            ) : (
              todayTodos.map((todo) => (
                <label
                  key={`${todo.classId}-${todo.id}`}
                  className="todo-item"
                >
                  <input
                    type="checkbox"
                    checked={todo.checked}
                    onChange={() =>
                      toggleHomeTodo(todo.classId, todo.id)
                    }
                  />

                  <span
                    className={`home-todo-text ${
                      todo.checked ? "checked" : ""
                    }`}
                  >
                    {todo.text}
                  </span>

                  <span className="home-todo-class">
                    {todo.classTitle}
                  </span>
                </label>
              ))
            )}
          </div>
        </section>

        {/* 마감 임박 과제 */}
        <section className="deadline-widget">
          <h2>마감 임박 과제</h2>

          <div className="deadline-list">
            {assignments.map((item) => (
              <button
                key={item.id}
                type="button"
                className="deadline-card"
                onClick={() => setActiveMenu("PLANNER")}
              >
                <span
                  className={`deadline-badge ${
                    item.dday === "D-day" ? "today" : ""
                  }`}
                >
                  {item.dday}
                </span>

                <div className="deadline-info">
                  <span className="deadline-title">
                    {item.title}
                  </span>
                  <span className="deadline-details">
                    {item.details}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* 과목 메모 및 체크리스트 팝업 */}
      {selectedClass && (
        <div
          className="class-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeClassModal();
            }
          }}
        >
          <div
            className="class-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="class-modal-title"
          >
            <div className="class-modal-header">
              <div>
                <h2
                  id="class-modal-title"
                  className="class-modal-title"
                >
                  {selectedClass.title}
                </h2>

                <div className="class-modal-info">
                  {selectedClass.details}
                </div>
              </div>

              <button
                type="button"
                className="class-modal-close"
                onClick={closeClassModal}
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            <div className="class-modal-tabs">
              <button
                type="button"
                className={`class-modal-tab ${
                  activeTab === "memo" ? "active" : ""
                }`}
                onClick={() => setActiveTab("memo")}
              >
                메모
              </button>

              <button
                type="button"
                className={`class-modal-tab ${
                  activeTab === "checklist" ? "active" : ""
                }`}
                onClick={() => setActiveTab("checklist")}
              >
                체크리스트
              </button>
            </div>

            {activeTab === "memo" && (
              <div className="class-modal-body">
                <label
                  className="class-modal-label"
                  htmlFor="class-memo"
                >
                  강의 메모
                </label>

                <textarea
                  id="class-memo"
                  className="class-modal-memo"
                  value={draftMemo}
                  onChange={(e) =>
                    setDraftMemo(e.target.value)
                  }
                  placeholder="수업 내용을 자유롭게 기록하세요."
                />

                <div className="class-modal-hint">
                  수업 내용과 과제 일정을 자유롭게 기록하세요.
                </div>
              </div>
            )}

            {activeTab === "checklist" && (
              <div className="class-modal-body">
                <div className="class-modal-label">
                  강의 체크리스트
                </div>

                <div className="class-modal-checklist">
                  {draftChecklist.length === 0 ? (
                    <p className="class-modal-empty">
                      등록된 할 일이 없습니다.
                    </p>
                  ) : (
                    draftChecklist.map((item) => (
                      <div
                        key={item.id}
                        className="class-modal-checklist-row"
                      >
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() =>
                            toggleDraftItem(item.id)
                          }
                        />

                        <span
                          className={`class-modal-checklist-text ${
                            item.checked ? "checked" : ""
                          }`}
                        >
                          {item.text}
                        </span>

                        <button
                          type="button"
                          className="class-modal-delete"
                          onClick={() =>
                            deleteDraftItem(item.id)
                          }
                          aria-label="항목 삭제"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="class-modal-add-row">
                  <input
                    className="class-modal-add-input"
                    type="text"
                    placeholder="새로운 할 일 입력"
                    value={newChecklistItem}
                    onChange={(e) =>
                      setNewChecklistItem(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addChecklistItem();
                      }
                    }}
                  />

                  <button
                    type="button"
                    className="class-modal-add-button"
                    onClick={addChecklistItem}
                  >
                    추가
                  </button>
                </div>
              </div>
            )}

            <div className="class-modal-footer">
              <button
                type="button"
                className="class-modal-cancel"
                onClick={closeClassModal}
              >
                취소
              </button>

              <button
                type="button"
                className="class-modal-save"
                onClick={saveClassRecord}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
