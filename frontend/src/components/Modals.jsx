

import {
  ValidatedForm,
  validateSchedule,
  validateTask,
  validateGrade,
} from "./FormValidation";


import React from "react";

export function Modals(props) {
  const {
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
  } = props;

  const timeOptions = [...hours, "14:30"];

  const isUnavailable = modalType === "unavailable";
  const isEditing = editingScheduleId !== null;

  // 기존 시간표 선택 시 나타나는 요일 및 시간
  const selectedStart = selectedSchedule
    ? timeOptions[selectedSchedule.start] || ""
    : "";

  const selectedEnd = selectedSchedule
    ? timeOptions[
        selectedSchedule.start + selectedSchedule.duration
      ] || ""
    : "";

  const updateField = (field, value) => {
    setClassForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <>
      <style>{`
        /* WEEKLY용 추가/수정 팝업 */
        .weekly-edit-modal {
          width: 480px;
          max-width: calc(100vw - 32px);
          min-height: 600px;
          background: #ffffff;
          border-radius: 20px;
          padding: 48px 33px 32px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          font-family: "Noto Sans KR", sans-serif;
          box-shadow: 0 18px 45px rgba(0,0,0,0.15);
          max-height: 92vh;
          overflow-y: auto;
        }

        .weekly-edit-title {
          margin: 0 0 52px;
          text-align: center;
          color: #000000;
          font-size: 30px;
          font-weight: 900;
          line-height: 1.4;
        }

        .weekly-edit-form {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 17px;
        }

        .weekly-edit-input {
          width: 100%;
          height: 80px;
          min-height: 80px;
          border-radius: 20px;
          border: 1px solid #e4e4e7;
          background: #f4f4f5;
          padding: 0 22px;
          box-sizing: border-box;
          outline: none;
          color: #000000;
          font-size: 23px;
          font-weight: 400;
          font-family: inherit;
        }

        .weekly-edit-input::placeholder {
          color: #444444;
          opacity: 1;
        }

        .weekly-edit-input:focus,
        .weekly-edit-select:focus {
          border-color: #2563eb;
        }

        .weekly-edit-row {
          width: 100%;
          display: flex;
          gap: 8px;
        }

        .weekly-edit-select {
          min-width: 0;
          height: 80px;
          border-radius: 20px;
          border: 1px solid #e4e4e7;
          background: #f4f4f5;
          padding: 0 12px;
          color: #000000;
          font-size: 18px;
          font-weight: 500;
          font-family: inherit;
          outline: none;
          cursor: pointer;
        }

        .weekly-day-select {
          width: 140px;
          flex-shrink: 0;
        }

        .weekly-time-selects {
          flex: 1;
          min-width: 0;
          height: 80px;
          display: flex;
          align-items: center;
          gap: 3px;
          background: #f4f4f5;
          border-radius: 20px;
          border: 1px solid #e4e4e7;
          padding: 0 7px;
          box-sizing: border-box;
        }

        .weekly-time-selects select {
          width: 50%;
          min-width: 0;
          height: 100%;
          background: transparent;
          border: none;
          font-size: 15px;
          color: #000000;
          outline: none;
          cursor: pointer;
        }

        .weekly-time-selects span {
          font-size: 18px;
          font-weight: 700;
        }

        .weekly-repeat-box {
          height: 80px;
          min-height: 80px;
          background: #f4f4f5;
          border: 1px solid #e4e4e7;
          border-radius: 20px;
          padding: 0 22px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          font-size: 19px;
          cursor: pointer;
          box-sizing: border-box;
        }

        .weekly-repeat-box input {
          width: 22px;
          height: 22px;
          accent-color: #2563eb;
          cursor: pointer;
        }

        .weekly-edit-date-label {
          font-size: 13px;
          color: #666666;
          margin-bottom: -9px;
        }

        .weekly-edit-error {
          color: #dc2626;
          background: #fef2f2;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          line-height: 1.5;
        }

        .weekly-edit-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 8px;
          margin-top: auto;
          padding-top: 28px;
        }

        .weekly-edit-cancel {
          width: 104px;
          height: 56px;
          border: none;
          border-radius: 20px;
          background: #d4d4d8;
          color: #000000;
          font-size: 20px;
          cursor: pointer;
        }

        .weekly-edit-save {
          width: 132px;
          height: 56px;
          border: none;
          border-radius: 20px;
          background: #2563eb;
          color: #ffffff;
          font-size: 20px;
          cursor: pointer;
        }

        .weekly-edit-cancel:hover {
          background: #a1a1aa;
        }

        .weekly-edit-save:hover {
          background: #1d4ed8;
        }

        .weekly-detail-modal {
          width: 420px;
          max-width: calc(100vw - 32px);
          padding: 28px;
          border-radius: 20px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          gap: 18px;
          box-sizing: border-box;
        }

        .weekly-detail-modal h2 {
          margin: 0;
          font-size: 25px;
          font-weight: 800;
        }

        .weekly-detail-modal p {
          margin: 0;
          color: #57534e;
          font-size: 15px;
          line-height: 1.7;
        }

        .weekly-detail-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .weekly-detail-actions button {
          padding: 11px 18px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
        }

        .weekly-detail-delete {
          background: #fee2e2;
          color: #dc2626;
        }

        .weekly-detail-edit {
          background: #2563eb;
          color: #ffffff;
        }

        .weekly-detail-close {
          background: #e4e4e7;
          color: #262626;
        }

        @media (max-width: 520px) {
          .weekly-edit-modal {
            min-height: 0;
            padding: 28px 20px;
          }

          .weekly-edit-title {
            margin-bottom: 28px;
            font-size: 25px;
          }

          .weekly-edit-input {
            font-size: 19px;
          }

          .weekly-day-select {
            width: 115px;
          }

          .weekly-time-selects select {
            font-size: 12px;
          }
        }
      `}</style>

      {/* 기존 시간표 카드 상세 팝업 */}
      {selectedSchedule && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedSchedule(null)}
        >
          <div
            className="weekly-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{selectedSchedule.title}</h2>

            <p>
              {days[selectedSchedule.day]}
              {" · "}
              {selectedStart} ~ {selectedEnd}
              {selectedSchedule.room && (
                <> · {selectedSchedule.room}</>
              )}
            </p>

            {selectedSchedule.repeat === false ? (
              <p>
                적용 날짜: {selectedSchedule.date}
                <br />
                일회성 일정
              </p>
            ) : (
              <p>매주 반복</p>
            )}

            <div className="weekly-detail-actions">
              <button
                type="button"
                className="weekly-detail-delete"
                onClick={() => {
                  if (window.confirm("이 일정을 삭제할까요?")) {
                    deleteSchedule(selectedSchedule.id);
                  }
                }}
              >
                삭제
              </button>

              <button
                type="button"
                className="weekly-detail-close"
                onClick={() => setSelectedSchedule(null)}
              >
                닫기
              </button>

              <button
                type="button"
                className="weekly-detail-edit"
                onClick={() => openEditSchedule(selectedSchedule)}
              >
                수정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수업 추가 / 불가능 시간 추가 / 수정 */}
      {showAddModal && (
        <div
          className="modal-overlay"
          onClick={closeScheduleModal}
        >
          <div
            className="weekly-edit-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h1 className="weekly-edit-title">
              {isUnavailable
                ? isEditing
                  ? "불가능 시간 수정"
                  : "불가능 시간 추가"
                : isEditing
                ? "수업 수정"
                : "수업 추가"}
            </h1>

            <Validatedform
              onSubmit={handleClassSubmit}
              className="weekly-edit-form"
              validate={() =>
    validateSchedule(
      classForm,
      modalType === "unavailable"
    )
  }
            >
              {/* 수업명 또는 일정 이름 */}
              <input
                className="weekly-edit-input"
                type="text"
                placeholder={
                  isUnavailable ? "일정 이름" : "과목명"
                }
                value={classForm.subject}
                onChange={(e) =>
                  updateField("subject", e.target.value)
                }
                required
              />

              {/* 수업일 때만 담당 교수 표시 */}
              {!isUnavailable && (
                <input
                  className="weekly-edit-input"
                  type="text"
                  placeholder="담당 교수"
                  value={classForm.professor}
                  onChange={(e) =>
                    updateField("professor", e.target.value)
                  }
                />
              )}

              {/* 요일 및 시작/종료시간 */}
              <div className="weekly-edit-row">
                <select
                  className="weekly-edit-select weekly-day-select"
                  value={classForm.weekday}
                  disabled={
                    isUnavailable && !classForm.repeat
                  }
                  onChange={(e) =>
                    updateField("weekday", e.target.value)
                  }
                >
                  {weekdaysKorean.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>

                <div className="weekly-time-selects">
                  <select
                    aria-label="시작시간"
                    value={classForm.startTime}
                    onChange={(e) =>
                      updateField("startTime", e.target.value)
                    }
                  >
                    {hours.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>

                  <span>~</span>

                  <select
                    aria-label="종료시간"
                    value={classForm.endTime}
                    onChange={(e) =>
                      updateField("endTime", e.target.value)
                    }
                  >
                    {timeOptions.slice(1).map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 불가능 시간만 반복 여부 설정 */}
              {isUnavailable && (
                <>
                  <label className="weekly-repeat-box">
                    <span>반복 설정(매주 반복)</span>
                    <input
                      type="checkbox"
                      checked={classForm.repeat}
                      onChange={(e) =>
                        updateField("repeat", e.target.checked)
                      }
                    />
                  </label>

                  {!classForm.repeat && (
                    <>
                      <label className="weekly-edit-date-label">
                        일회성 일정 날짜
                      </label>

                      <input
                        type="date"
                        className="weekly-edit-input"
                        value={classForm.date || ""}
                        onChange={(e) =>
                          updateField("date", e.target.value)
                        }
                        required
                      />
                    </>
                  )}
                </>
              )}

              {/* 시간 중복 오류 */}
              {scheduleError && (
                <div
                  className="weekly-edit-error"
                  role="alert"
                >
                  {scheduleError}
                </div>
              )}

              <div className="weekly-edit-actions">
                <button
                  type="button"
                  className="weekly-edit-cancel"
                  onClick={closeScheduleModal}
                >
                  취소
                </button>

                <button
                  type="submit"
                  className="weekly-edit-save"
                >
                  저장
                </button>
              </div>
            </Validatedform>
          </div>
        </div>
      )}

      {/* PLANNER 과제 추가 - 기존 기능 유지 */}
      {showTaskModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowTaskModal(false)}
        >
          <div
            className="figma-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h1 className="figma-modal-title">
              새 과제 추가
            </h1>

            <Validatedform
              onSubmit={handleAddTask}
              className="figma-modal-form"
              validate={() => validateTask(taskForm)}
            >
              <div className="figma-input-container">
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      title: e.target.value,
                    })
                  }
                  placeholder="과제명을 입력하세요"
                  required
                  className="figma-text-input"
                />
              </div>

              <div className="figma-input-container">
                <input
                  type="date"
                  value={taskForm.date}
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      date: e.target.value,
                    })
                  }
                  required
                  className="figma-text-input"
                />
              </div>

              <div className="figma-btn-row">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="figma-cancel-btn"
                >
                  취소
                </button>

                <button
                  type="submit"
                  className="figma-submit-btn"
                >
                  [저장]
                </button>
              </div>
            </Validatedform>
          </div>
        </div>
      )}

      {/* GRADES 성적 등록 및 수정 - 기존 기능 유지 */}
      {showGradeModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowGradeModal(false)}
        >
          <div
            className="figma-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h1 className="figma-modal-title">
              {editingGradeId !== null
                ? "성적 수정"
                : "성적 등록"}
            </h1>

            <Validatedform
              onSubmit={handleGradeSubmit}
              className="figma-modal-form"
              validate={() =>
    validateGrade(gradeForm, gradeToPoint)
  }
            >
              <div className="figma-input-container">
                <select
                  value={gradeForm.semester}
                  onChange={(e) =>
                    setGradeForm({
                      ...gradeForm,
                      semester: e.target.value,
                    })
                  }
                  className="figma-select-input"
                >
                  <option value="2026 1학기">
                    2026 1학기
                  </option>
                  <option value="2026 2학기">
                    2026 2학기
                  </option>
                </select>
              </div>

              <div className="figma-input-container">
                <input
                  type="text"
                  value={gradeForm.subject}
                  onChange={(e) =>
                    setGradeForm({
                      ...gradeForm,
                      subject: e.target.value,
                    })
                  }
                  placeholder="과목명 (예: 운영체제)"
                  required
                  className="figma-text-input"
                />
              </div>

              <div className="figma-row-inputs">
                <div className="figma-small-box">
                  <select
                    value={gradeForm.credit}
                    onChange={(e) =>
                      setGradeForm({
                        ...gradeForm,
                        credit: e.target.value,
                      })
                    }
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
                    onChange={(e) =>
                      setGradeForm({
                        ...gradeForm,
                        grade: e.target.value,
                      })
                    }
                    className="figma-select-input"
                  >
                    {Object.keys(gradeToPoint).map((grade) => (
                      <option
                        key={grade}
                        value={grade}
                      >
                        {grade} (
                        {gradeToPoint[grade].toFixed(1)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="figma-btn-row">
                <button
                  type="button"
                  onClick={() => setShowGradeModal(false)}
                  className="figma-cancel-btn"
                >
                  취소
                </button>

                <button
                  type="submit"
                  className="figma-submit-btn"
                >
                  [저장]
                </button>
              </div>
            </Validatedform>
          </div>
        </div>
      )}
    </>
  );
}
