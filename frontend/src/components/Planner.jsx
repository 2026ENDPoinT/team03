
import React, { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = "http://localhost:3000";
const SYNC_TIMEOUT = 45000;

function getRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.assignments)) return data.assignments;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function datePart(value) {
  if (!value) return "";
  const text = String(value).trim();
  const match = text.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function formatDate(value) {
  if (!value) return "마감일 미정";
  const text = String(value);
  const date = datePart(text);
  if (!date) return text;

  const time = text.match(/[T ](\d{2}:\d{2})/);
  return time ? `${date} ${time[1]}` : date;
}

function calculateDday(value) {
  const date = datePart(value);
  if (!date) return "-";

  const [year, month, day] = date.split("-").map(Number);
  const due = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const diff = Math.round(
    (due.getTime() - today.getTime()) / 86400000
  );

  if (diff === 0) return "D-DAY";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

const TYPE_INFO = {
  assignment: { label: "과제", color: "#4F46E5" },
  discussion: { label: "토론", color: "#0891B2" },
  video: { label: "영상", color: "#059669" },
  manual: { label: "수동", color: "#64748B" },
};

function normalizeAstra(row, index) {
  return {
    id: `astra-${row.id ?? row.sourceKey ?? index}`,
    title: row.assignmentName ?? row.title ?? "제목 없음",
    subjectName: row.subjectName ?? "",
    dueDate: datePart(row.dueAt),
    dueAt: row.dueAt ?? null,
    startAt: row.startAt ?? null,
    activityType: row.activityType ?? "assignment",
    source: "astra",
    dday: calculateDday(row.dueAt),
  };
}

function normalizeManual(row, index) {
  const dueAt =
    row.dueAt ??
    row.dueDate ??
    row.due_date ??
    row.deadline ??
    null;

  return {
    id: `api-manual-${row.id ?? index}`,
    title:
      row.title ??
      row.assignmentName ??
      row.name ??
      "제목 없음",
    subjectName: row.subjectName ?? row.subject_name ?? "",
    dueDate: datePart(dueAt),
    dueAt,
    activityType: "manual",
    source: "manual-api",
    dday: calculateDday(dueAt),
  };
}

async function fetchList(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`${path} 조회 실패 (${response.status})`);
  }
  return getRows(await response.json());
}

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

  const [astraTasks, setAstraTasks] = useState([]);
  const [manualApiTasks, setManualApiTasks] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const pendingSyncRef = useRef(null);

  const refreshTasks = useCallback(async () => {
    setLoading(true);

    const results = await Promise.allSettled([
      fetchList("/api/astra/assignments"),
      fetchList("/api/assignments"),
    ]);

    if (results[0].status === "fulfilled") {
      setAstraTasks(
        results[0].value.map(normalizeAstra)
      );
    }

    if (results[1].status === "fulfilled") {
      setManualApiTasks(
        results[1].value.map(normalizeManual)
      );
    }

    setLoading(false);

    if (results.every((result) => result.status === "rejected")) {
      throw new Error(
        "할일 목록을 불러오지 못했습니다. 백엔드 서버를 확인해 주세요."
      );
    }

    if (results.some((result) => result.status === "rejected")) {
      throw new Error(
        "일부 할일 목록을 불러오지 못했습니다."
      );
    }
  }, []);

  useEffect(() => {
    if (activeMenu !== "PLANNER") return;

    refreshTasks().catch((error) => {
      setSyncMessage(error.message);
    });
  }, [activeMenu, refreshTasks]);

  useEffect(() => {
    return () => {
      if (pendingSyncRef.current) {
        pendingSyncRef.current();
      }
    };
  }, []);

  const handleAstraSync = () => {
    if (syncing || pendingSyncRef.current) return;

    const requestId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `todo-${Date.now()}-${Math.random()}`;

    setSyncing(true);
    setSyncMessage("ASTRA 할일을 동기화하고 있습니다...");

    let finished = false;
    let timer;

    const cleanup = () => {
      if (finished) return false;
      finished = true;

      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);

      pendingSyncRef.current = null;
      return true;
    };

    const onMessage = async (event) => {
      if (event.source !== window) return;
      if (event.origin !== window.location.origin) return;

      const data = event.data;

      if (data?.type !== "ASTRA_TODO_SYNC_RESULT") return;
      if (data.requestId !== requestId) return;
      if (!cleanup()) return;

      const response = data.response;

      if (!response?.ok) {
        setSyncing(false);
        setSyncMessage(
          response?.error?.message ??
          response?.error ??
          response?.message ??
          "ASTRA 할일 동기화에 실패했습니다."
        );
        return;
      }

      try {
        await refreshTasks();

        const result = response.result ?? {};
        const counts = [
          ["추가", result.added],
          ["수정", result.updated],
          ["건너뜀", result.skipped],
        ]
          .filter(([, value]) => typeof value === "number")
          .map(([label, value]) => `${label} ${value}개`)
          .join(", ");

        setSyncMessage(
          counts
            ? `동기화 완료! ${counts}`
            : "ASTRA 할일 동기화가 완료되었습니다."
        );
      } catch (error) {
        setSyncMessage(
          `동기화는 성공했지만 목록 조회에 문제가 있습니다. ${error.message}`
        );
      } finally {
        setSyncing(false);
      }
    };

    window.addEventListener("message", onMessage);

    pendingSyncRef.current = cleanup;

    timer = window.setTimeout(() => {
      if (!cleanup()) return;
      setSyncing(false);
      setSyncMessage(
        "동기화 응답 시간이 초과되었습니다. ASTRA 로그인 및 확장 프로그램을 확인해 주세요."
      );
    }, SYNC_TIMEOUT);

    window.postMessage(
      {
        type: "ASTRA_TODO_SYNC_REQUEST",
        requestId,
      },
      window.location.origin
    );
  };

  if (activeMenu !== "PLANNER") {
    return null;
  }

  // App.jsx에서 관리 중인 기존 수동 D-Day 항목 유지
  const localTasks = (ddayList ?? []).map((task) => ({
    ...task,
    id: `local-${task.id}`,
    originalId: task.id,
    dueAt: task.dueDate,
    activityType: "manual",
    source: "manual-local",
    dday: task.dday ?? calculateDday(task.dueDate),
  }));

  // 로컬 D-Day와 수동 과제 API에 같은 항목이 있는 경우
  // 제목과 날짜를 기준으로 화면 중복을 줄임
  const localKeys = new Set(
    localTasks.map(
      (task) => `${task.title}|${task.dueDate}`
    )
  );

  const filteredManualApi = manualApiTasks.filter(
    (task) =>
      !localKeys.has(`${task.title}|${task.dueDate}`)
  );

  const allTasks = [
    ...localTasks,
    ...filteredManualApi,
    ...astraTasks,
  ].sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  return (
    <div className="planner-container">
      <div className="planner-top-bar">
        <h1>학습 계획</h1>

        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="planner-add-btn"
            onClick={handleAstraSync}
            disabled={syncing}
            style={{
              opacity: syncing ? 0.65 : 1,
              cursor: syncing ? "wait" : "pointer",
            }}
          >
            {syncing
              ? "동기화 중..."
              : "↻ ASTRA 할일 동기화"}
          </button>

          <button
            type="button"
            className="planner-add-btn"
            onClick={() => setShowTaskModal(true)}
          >
            [+] 과제 추가
          </button>
        </div>
      </div>

      {syncMessage && (
        <div
          role="status"
          style={{
            marginBottom: "12px",
            padding: "10px 14px",
            borderRadius: "8px",
            background: "rgba(128,128,128,0.08)",
            fontSize: "13px",
          }}
        >
          {syncMessage}
        </div>
      )}

      <div className="planner-board">
        {/* 왼쪽 달력: 기존 디자인 유지 */}
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
                allTasks.some(
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

          <div className="planner-side-card dday-box">
            <h2>
              D-Day
              <span
                style={{
                  marginLeft: "8px",
                  fontSize: "13px",
                  fontWeight: "normal",
                  opacity: 0.65,
                }}
              >
                {allTasks.length}개
              </span>
            </h2>

            <div className="dday-list">
              {loading && (
                <div className="planner-empty-message">
                  할일 불러오는 중...
                </div>
              )}

              {!loading && allTasks.length === 0 && (
                <div className="planner-empty-message">
                  등록된 할일이 없습니다.
                </div>
              )}

              {allTasks.map((task) => {
                const typeInfo =
                  TYPE_INFO[task.activityType] ??
                  TYPE_INFO.manual;

                return (
                  <div
                    key={task.id}
                    className="dday-item-row"
                  >
                    <span className="dday-badge">
                      {task.dday}
                    </span>

                    <div className="dday-info">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          flexWrap: "wrap",
                          marginBottom: "4px",
                        }}
                      >
                        <span
                          style={{
                            color: typeInfo.color,
                            fontSize: "11px",
                            fontWeight: 700,
                          }}
                        >
                          {typeInfo.label}
                        </span>

                        {task.source === "astra" && (
                          <span
                            style={{
                              fontSize: "11px",
                              opacity: 0.65,
                            }}
                          >
                            ASTRA
                          </span>
                        )}

                        {task.subjectName && (
                          <span
                            style={{
                              fontSize: "11px",
                              opacity: 0.7,
                            }}
                          >
                            {task.subjectName}
                          </span>
                        )}
                      </div>

                      <span className="dday-title">
                        {task.title}
                      </span>

                      <span className="dday-date">
                        {formatDate(task.dueAt)} 마감
                      </span>

                      {task.activityType === "video" &&
                        task.startAt && (
                          <span
                            className="dday-date"
                            style={{ display: "block" }}
                          >
                            시청 시작:{" "}
                            {formatDate(task.startAt)}
                          </span>
                        )}
                    </div>

                    {task.source === "manual-local" && (
                      <button
                        type="button"
                        className="dday-del-btn"
                        onClick={() =>
                          setDdayList((prev) =>
                            prev.filter(
                              (t) => t.id !== task.originalId
                            )
                          )
                        }
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
