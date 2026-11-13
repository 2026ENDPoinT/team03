import React, { useCallback, useEffect, useMemo, useState } from "react";
import { GradeAnalysis } from "./GradeAnalysis";
import { TargetGradeCalculator } from "./TargetGradeCalculator";
import "./grades-extra.css";

const API_URL = "http://localhost:3000/api";
const GRADE_POINTS = { "A+": 4.5, A0: 4, "B+": 3.5, B0: 3, "C+": 2.5, C0: 2, "D+": 1.5, D0: 1, F: 0 };
const DEFAULT_FORM = { subjectName: "", semester: "2026-2", credits: 3, grade: "A+" };

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
  } catch {
    throw new Error("서버에 연결할 수 없습니다. 백엔드 실행 상태와 CORS 설정을 확인해 주세요.");
  }
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { if (response.ok) throw new Error("서버의 응답 형식이 올바르지 않습니다."); }
  }
  if (!response.ok) throw new Error(data?.message || `요청 실패 (${response.status})`);
  return data;
}

function semesterLabel(value) {
  const match = String(value).match(/^(\d{4})-([12])$/);
  return match ? `${match[1]} ${match[2]}학기` : String(value);
}
function gradePoint(course) {
  if (course.gradePoint !== null && course.gradePoint !== undefined && Number.isFinite(Number(course.gradePoint))) return Number(course.gradePoint);
  return GRADE_POINTS[course.grade] ?? 0;
}
function calculateStats(courses) {
  const attempted = courses.reduce((sum, course) => sum + Number(course.credits || 0), 0);
  const earned = courses.reduce((sum, course) => sum + (course.grade === "F" ? 0 : Number(course.credits || 0)), 0);
  const points = courses.reduce((sum, course) => sum + gradePoint(course) * Number(course.credits || 0), 0);
  return { gpa: attempted ? points / attempted : null, totalCredits: earned };
}
const showGpa = (gpa) => gpa === null || gpa === undefined ? "—" : Number(gpa).toFixed(2);

export function Grades({ activeMenu }) {
  const [courses, setCourses] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("2026-2");
  const [view, setView] = useState("main");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM });

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await request("/courses");
      if (!Array.isArray(data)) throw new Error("과목 목록 응답이 배열이 아닙니다.");
      setCourses(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCourses(); }, [loadCourses]);
  const semesters = useMemo(() => [...new Set(["2026-1", "2026-2", ...courses.map((course) => course.semester)])].sort(), [courses]);
  const cumulative = useMemo(() => calculateStats(courses), [courses]);
  const bySemester = useMemo(() => calculateStats(courses.filter((course) => course.semester === selectedSemester)), [courses, selectedSemester]);
  const chartData = useMemo(() => semesters.map((semester) => ({ semester, gpa: calculateStats(courses.filter((course) => course.semester === semester)).gpa })), [courses, semesters]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...DEFAULT_FORM, semester: selectedSemester });
    setFormError("");
    setShowModal(true);
  };
  const openEdit = (course) => {
    setEditingId(course.id);
    setForm({ subjectName: course.subjectName, semester: course.semester, credits: course.credits, grade: course.grade });
    setFormError("");
    setShowModal(true);
  };
  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingId(null);
    setFormError("");
  };
  const updateForm = (field, value) => {
    setForm((old) => ({ ...old, [field]: value }));
    setFormError("");
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!form.subjectName.trim()) return setFormError("과목명을 입력해 주세요.");
    if (!/^\d{4}-[12]$/.test(form.semester)) return setFormError("올바른 학기를 선택해 주세요.");
    if (!Number.isInteger(Number(form.credits)) || Number(form.credits) <= 0) return setFormError("학점은 1 이상의 정수여야 해요.");
    if (!(form.grade in GRADE_POINTS)) return setFormError("올바른 성적을 선택해 주세요.");
    setSaving(true);
    setFormError("");
    try {
      const payload = { subjectName: form.subjectName.trim(), semester: form.semester, credits: Number(form.credits), grade: form.grade };
      await request(editingId === null ? "/courses" : `/courses/${editingId}`, { method: editingId === null ? "POST" : "PUT", body: JSON.stringify(payload) });
      setShowModal(false);
      setEditingId(null);
      await loadCourses();
    } catch (err) {
      setFormError(err.message);
    } finally { setSaving(false); }
  };
  const remove = async (course) => {
    if (!window.confirm(`"${course.subjectName}" 과목을 삭제할까요?`)) return;
    try {
      await request(`/courses/${course.id}`, { method: "DELETE" });
      await loadCourses();
    } catch (err) { setError(err.message); }
  };

  if (activeMenu !== "GRADES") return null;
  return (
    <div className="grades-container">
      <div className="grades-top-bar">
        <h1>성적 분석 및 목표 가이드</h1>
        <button type="button" className="grades-add-btn" onClick={openAdd}>[+] 성적 등록</button>
      </div>
      {error && <div className="gx-error" role="alert">{error} <button type="button" className="gx-retry" onClick={loadCourses}>다시 시도</button></div>}
      {view === "main" ? (
        <>
          <div className="grades-summary-row">
            <div className="grades-summary-card">
              <div className="summary-block"><span className="summary-label">전체 누적 평점 평균</span><div className="summary-value-line"><strong className="summary-big-num">{showGpa(cumulative.gpa)}</strong><span className="summary-unit">/ 4.5점</span></div></div>
              <div className="summary-divider" />
              <div className="summary-block"><span className="summary-label">총 취득 학점</span><div className="summary-value-line"><strong className="summary-big-num">{cumulative.totalCredits}</strong><span className="summary-unit">학점</span></div></div>
            </div>
            <div className="grades-summary-card">
              <div className="summary-block">
                <div className="summary-label-row"><span className="summary-label">선택 학기 평점 평균</span><select className="semester-mini-select" value={selectedSemester} onChange={(event) => setSelectedSemester(event.target.value)}>{semesters.map((semester) => <option key={semester} value={semester}>{semesterLabel(semester)}</option>)}</select></div>
                <div className="summary-value-line"><strong className="summary-big-num">{showGpa(bySemester.gpa)}</strong><span className="summary-unit">/ 4.5점</span></div>
              </div>
              <div className="summary-divider" />
              <div className="summary-block"><span className="summary-label">선택 학기 취득 학점</span><div className="summary-value-line"><strong className="summary-big-num">{bySemester.totalCredits}</strong><span className="summary-unit">학점</span></div></div>
            </div>
          </div>
          <div className="grades-chart-card">
            <h2>학기별 GPA 변화</h2>
            <div className="gpa-bar-chart">
              {chartData.map(({ semester, gpa }) => (
                <div key={semester} className="gpa-bar-col">
                  <span className="gpa-bar-score">{showGpa(gpa)}</span>
                  <div className="gpa-bar-track"><div className="gpa-bar-fill" style={{ height: `${Math.max(0, Math.min(100, ((gpa ?? 0) / 4.5) * 100))}%` }} /></div>
                  <span className="gpa-bar-label">{semesterLabel(semester)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="gx-action-grid">
            <button className="gx-action" type="button" onClick={() => setView("analysis")}><span className="gx-action-icon">📊</span><span><strong>과목별 성적 분석</strong><small>평균 비교 · Z-score · 예상 등수 · 정규분포</small></span><span aria-hidden="true">→</span></button>
            <button className="gx-action" type="button" onClick={() => setView("calculator")}><span className="gx-action-icon">🎯</span><span><strong>목표 성적 계산기</strong><small>반영비율과 남은 평가의 필요 점수 계산</small></span><span aria-hidden="true">→</span></button>
          </div>
          <div className="grades-table-card">
            <div className="gx-table-heading"><h2>성적 등록 과목 및 관리</h2><small>총 {courses.length}개 과목</small></div>
            <div className="grades-table-header"><span className="col-sem">수강 학기</span><span className="col-sub">과목명</span><span className="col-cred">학점</span><span className="col-grd">성적</span><span className="col-pt">평점</span><span className="col-act">관리</span></div>
            <div className="grades-table-body">
              {loading ? <p className="gx-table-empty">과목 목록을 불러오는 중...</p> : courses.length === 0 ? <p className="gx-table-empty">등록된 과목이 없습니다. [+] 성적 등록으로 시작해 보세요.</p> : courses.map((course) => (
                <div key={course.id} className="grades-table-row">
                  <span className="col-sem">{semesterLabel(course.semester)}</span><span className="col-sub">{course.subjectName}</span><span className="col-cred">{course.credits}</span><span className="col-grd">{course.grade}</span><span className="col-pt">{gradePoint(course).toFixed(1)}</span>
                  <span className="col-act"><button type="button" className="grade-row-btn edit" onClick={() => openEdit(course)}>[수정]</button><button type="button" className="grade-row-btn del" onClick={() => remove(course)}>[삭제]</button></span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : view === "analysis" ? <GradeAnalysis onBack={() => setView("main")} courses={courses} /> : <TargetGradeCalculator onBack={() => setView("main")} courses={courses} />}
      {showModal && (
        <div className="gx-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          <div className="gx-modal" role="dialog" aria-modal="true" aria-label={editingId === null ? "성적 등록" : "성적 수정"}>
            <h2>{editingId === null ? "성적 등록" : "성적 수정"}</h2>
            <form className="gx-form" onSubmit={submit} noValidate>
              <label>수강 학기<select value={form.semester} onChange={(event) => updateForm("semester", event.target.value)}>{semesters.map((semester) => <option key={semester} value={semester}>{semesterLabel(semester)}</option>)}</select></label>
              <label>과목명<input value={form.subjectName} onChange={(event) => updateForm("subjectName", event.target.value)} placeholder="예: 자료구조" /></label>
              <div className="gx-two-col">
                <label>학점<select value={form.credits} onChange={(event) => updateForm("credits", Number(event.target.value))}>{[1, 2, 3, 4].map((credit) => <option key={credit} value={credit}>{credit}학점</option>)}</select></label>
                <label>성적<select value={form.grade} onChange={(event) => updateForm("grade", event.target.value)}>{Object.entries(GRADE_POINTS).map(([grade, point]) => <option key={grade} value={grade}>{grade} ({point.toFixed(1)})</option>)}</select></label>
              </div>
              {formError && <p className="gx-error" role="alert">{formError}</p>}
              <div className="gx-modal-buttons"><button type="button" className="gx-back" disabled={saving} onClick={closeModal}>취소</button><button type="submit" className="gx-primary" disabled={saving}>{saving ? "저장 중..." : "저장"}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
