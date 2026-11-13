import React, { useState } from "react";
import "./grades-extra.css";

const INITIAL_ITEMS = [
  { id: 1, name: "중간고사", weight: "30", score: "85" },
  { id: 2, name: "기말고사", weight: "40", score: "" },
  { id: 3, name: "과제", weight: "20", score: "90" },
  { id: 4, name: "출석", weight: "10", score: "100" },
];

export function TargetGradeCalculator({ onBack, courses = [] }) {
  const [subject, setSubject] = useState("");
  const [target, setTarget] = useState("90");
  const [items, setItems] = useState(INITIAL_ITEMS.map((item) => ({ ...item })));
  const [nextId, setNextId] = useState(5);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const updateItem = (id, field, value) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
    setResult(null);
    setError("");
  };
  const addItem = () => {
    setItems((current) => [...current, { id: nextId, name: "퀴즈/실습", weight: "0", score: "" }]);
    setNextId((current) => current + 1);
    setResult(null);
    setError("");
  };
  const deleteItem = (id) => {
    if (items.length <= 1) return setError("평가 항목은 최소 1개 필요해요.");
    setItems((current) => current.filter((item) => item.id !== id));
    setResult(null);
    setError("");
  };

  const calculate = (event) => {
    event.preventDefault();
    const desired = Number(target);
    if (target.trim() === "" || !Number.isFinite(desired) || desired < 0 || desired > 100) return setError("목표 총점은 0~100점 사이로 입력해 주세요.");
    if (!items.length || items.some((item) => !item.name.trim() || item.weight.trim() === "")) return setError("모든 평가 항목의 이름과 반영비율을 입력해 주세요.");
    const weights = items.map((item) => Number(item.weight));
    if (weights.some((weight) => !Number.isFinite(weight) || weight < 0 || weight > 100)) return setError("반영비율은 0~100% 사이여야 해요.");
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    if (Math.abs(totalWeight - 100) > 0.00001) return setError(`반영비율의 합계가 100%여야 해요. (현재 ${totalWeight.toFixed(1)}%)`);
    for (const item of items) {
      if (item.score.trim() !== "") {
        const score = Number(item.score);
        if (!Number.isFinite(score) || score < 0 || score > 100) return setError("입력한 평가 점수는 0~100점 사이여야 해요.");
      }
    }
    const earned = items.reduce((sum, item) => sum + (item.score.trim() === "" ? 0 : Number(item.score) * Number(item.weight) / 100), 0);
    const remaining = items.reduce((sum, item) => sum + (item.score.trim() === "" ? Number(item.weight) : 0), 0);
    const required = remaining > 0 ? (desired - earned) / (remaining / 100) : null;
    const status = remaining === 0 ? (earned >= desired ? "achieved" : "missed") : required > 100 + 1e-8 ? "impossible" : required <= 0 ? "achieved" : "possible";
    setResult({ earned, remaining, required, desired, status, breakdown: items.map((item) => ({ ...item })) });
    setError("");
  };

  const weightSum = items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  const names = [...new Set(courses.map((course) => course.subjectName).filter(Boolean))];
  return (
    <section className="gx-page">
      <div className="gx-section-head"><button className="gx-back" type="button" onClick={onBack}>← 돌아가기</button><h2>목표 성적 계산기</h2></div>
      <div className="gx-detail-grid">
        <form className="gx-panel gx-form" onSubmit={calculate} noValidate>
          <h3>목표 설정 및 과목 정보</h3>
          <label>과목명 (선택)
            <input list="gx-target-subjects" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="예: 컴퓨터구조" />
            <datalist id="gx-target-subjects">{names.map((name) => <option key={name} value={name} />)}</datalist>
          </label>
          <label>목표 최종 총점 (100점 만점)
            <input type="number" min="0" max="100" step="any" value={target} onChange={(event) => { setTarget(event.target.value); setResult(null); setError(""); }} />
          </label>
          <div className="gx-assessment-head"><strong>평가 항목 구성</strong><span>합계: {weightSum.toFixed(1)}%</span><button type="button" className="gx-add" onClick={addItem}>+ 항목 추가</button></div>
          <div className="gx-assessment-list">
            {items.map((item) => (
              <div className="gx-assessment-row" key={item.id}>
                <input aria-label="항목명" value={item.name} onChange={(event) => updateItem(item.id, "name", event.target.value)} placeholder="평가명" />
                <div className="gx-weight"><input aria-label={`${item.name} 반영비율`} type="number" min="0" max="100" step="any" value={item.weight} onChange={(event) => updateItem(item.id, "weight", event.target.value)} /><span>%</span></div>
                <div className="gx-weight"><input aria-label={`${item.name} 점수`} type="number" min="0" max="100" step="any" value={item.score} onChange={(event) => updateItem(item.id, "score", event.target.value)} placeholder="미정" /><span>점</span></div>
                <button type="button" aria-label={`${item.name} 항목 삭제`} className="gx-remove" onClick={() => deleteItem(item.id)}>×</button>
              </div>
            ))}
          </div>
          <p className="gx-help">아직 보지 않은 시험이나 과제의 점수는 빈칸으로 남겨 두세요.</p>
          {error && <p className="gx-error" role="alert">{error}</p>}
          <button className="gx-primary" type="submit">필요 점수 계산하기</button>
        </form>
        <div className="gx-results">
          {result ? (
            <div className="gx-panel">
              <div className="gx-panel-title"><h3>목표 달성 시뮬레이션 결과</h3><small>가중치 합계 100%</small></div>
              <div className="gx-stat-grid gx-stat-grid-three">
                <div className="gx-stat"><span>현재 취득 환산 점수</span><strong>{result.earned.toFixed(1)}점</strong></div>
                <div className="gx-stat"><span>남은 평가 반영비율</span><strong>{result.remaining.toFixed(1)}%</strong></div>
                <div className="gx-stat"><span>남은 항목 평균 필요 점수</span><strong>{result.required === null ? "평가 완료" : `${Math.max(0, result.required).toFixed(1)}점`}</strong></div>
              </div>
              <p className={result.status === "impossible" || result.status === "missed" ? "gx-error" : "gx-note"}>
                {result.status === "impossible" && "남은 항목에서 모두 100점을 받아도 목표 총점에 도달할 수 없어요."}
                {result.status === "missed" && "모든 평가가 완료되었고 목표 총점에 도달하지 못했어요."}
                {result.status === "achieved" && (result.remaining === 0 ? "목표 총점을 달성했어요." : "현재 확보한 환산 점수만으로 목표 총점을 충족했어요.")}
                {result.status === "possible" && `남은 평가에서 평균 ${Math.max(0, result.required).toFixed(1)}점 이상 받으면 목표 총점 ${result.desired}점에 도달할 수 있어요.`}
              </p>
              <h3 className="gx-breakdown-title">항목별 상세 분석</h3>
              <div className="gx-breakdown">
                {result.breakdown.map((item) => (
                  <div key={item.id} className="gx-breakdown-row">
                    <span>{item.name} ({Number(item.weight)}%)</span>
                    <strong>{item.score === "" ? "진행 예정" : `${item.score}점 → 환산 ${(Number(item.score) * Number(item.weight) / 100).toFixed(1)}점`}</strong>
                  </div>
                ))}
              </div>
              <p className="gx-help">점수는 모두 100점 만점으로 환산해서 입력해야 합니다. 실제 A+/A0 등의 학점 기준은 강의계획서와 상대평가 규정에 따라 달라질 수 있어요. 이 계산기는 총점 목표를 위한 시뮬레이션이에요.</p>
            </div>
          ) : (
            <div className="gx-panel gx-placeholder">평가 항목별 반영비율과 점수를 입력하면 현재 환산 점수와 목표 달성에 필요한 남은 점수를 계산해 줘요.</div>
          )}
        </div>
      </div>
    </section>
  );
}
