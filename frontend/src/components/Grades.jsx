import React from "react";

export function Grades(props) {
  const { activeMenu, openAddGradeModal, cumulativeGPA, totalCredits, selectedSemester, setSelectedSemester, semesterGPA, semesterCredits, chartData, gradesList, gradeToPoint, openEditGradeModal, handleDeleteGrade } = props;
  return (
    <>
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
    </>
  );
}
