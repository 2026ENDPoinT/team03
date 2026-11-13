import React, { useMemo, useState } from "react";
import "./grades-extra.css";

// 표준정규분포 누적확률의 근삿값 (원본 HTML의 계산식을 React로 옮김)
function normalCDF(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804 * Math.exp((-z * z) / 2);
  const tail = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - tail : tail;
}

function NormalCurve({ z }) {
  const width = 640;
  const height = 260;
  const left = 45;
  const right = width - 28;
  const bottom = 218;
  const top = 28;
  const maxDensity = 1 / Math.sqrt(2 * Math.PI);
  const xAt = (value) => left + ((value + 3.5) / 7) * (right - left);
  const yAt = (value) => bottom - (Math.exp((-value * value) / 2) * maxDensity / maxDensity) * (bottom - top);
  const steps = Array.from({ length: 141 }, (_, i) => -3.5 + (7 * i) / 140);
  const curve = steps.map((value, i) => `${i ? "L" : "M"}${xAt(value).toFixed(2)},${yAt(value).toFixed(2)}`).join(" ");
  const fill = `${curve} L${right},${bottom} L${left},${bottom} Z`;
  const position = Math.max(-3.5, Math.min(3.5, z));
  const px = xAt(position);
  const py = yAt(position);

  return (
    <svg className="gx-curve" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`정규분포 곡선. 내 점수 위치는 평균에서 표준편차 ${z.toFixed(2)}배 지점입니다.`}>
      <path d={fill} fill="#dbeafe" opacity="0.62" />
      <path d={curve} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
      <line x1={left} y1={bottom} x2={right} y2={bottom} stroke="#cbd5e1" strokeWidth="2" />
      <line x1={xAt(0)} y1={top} x2={xAt(0)} y2={bottom} stroke="#94a3b8" strokeDasharray="5 5" />
      <text x={xAt(0)} y={246} textAnchor="middle" className="gx-graph-label">평균</text>
      <line x1={px} y1={py} x2={px} y2={bottom} stroke="#1d4ed8" strokeWidth="2" />
      <circle cx={px} cy={py} r="6" fill="#2563eb" stroke="white" strokeWidth="2" />
      <text x={Math.min(right - 25, Math.max(left + 25, px))} y={Math.max(16, py - 14)} textAnchor="middle" className="gx-my-label">내 점수</text>
      {[-3, -2, -1, 1, 2, 3].map((tick) => (
        <text key={tick} x={xAt(tick)} y={246} textAnchor="middle" className="gx-graph-label">{tick}σ</text>
      ))}
    </svg>
  );
}

export function GradeAnalysis({ onBack, courses = [] }) {
  const [form, setForm] = useState({
    subject: "", exam: "기말고사", myScore: "", average: "", median: "", sd: "", count: "",
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const update = (name, value) => {
    setForm((previous) => ({ ...previous, [name]: value }));
    setResult(null);
    setError("");
  };

  const subjects = useMemo(() => [...new Set(courses.map((course) => course.subjectName).filter(Boolean))], [courses]);

  const analyze = (event) => {
    event.preventDefault();
    const myScore = Number(form.myScore);
    const average = Number(form.average);
    const sd = Number(form.sd);
    const count = Number(form.count);
    const median = form.median.trim() === "" ? null : Number(form.median);
    if (!form.subject.trim()) return setError("과목명을 입력해 주세요.");
    if ([form.myScore, form.average, form.sd, form.count].some((value) => value.trim() === "")) return setError("내 점수, 평균, 표준편차, 응시 인원을 모두 입력해 주세요.");
    if (![myScore, average, sd, count].every(Number.isFinite)) return setError("숫자를 정확하게 입력해 주세요.");
    if (myScore < 0 || average < 0 || (median !== null && (!Number.isFinite(median) || median < 0))) return setError("점수와 평균, 중앙값은 0 이상이어야 해요.");
    if (sd <= 0) return setError("표준편차는 0보다 커야 정규분포를 이용할 수 있어요.");
    if (!Number.isInteger(count) || count < 1) return setError("응시 인원은 1명 이상의 정수여야 해요.");
    const z = (myScore - average) / sd;
    const upper = Math.max(0, Math.min(1, 1 - normalCDF(z)));
    // 자신을 포함한 예상 석차. 동점자 및 실제 분포에 따른 오차는 고려하지 않음.
    const rank = Math.min(count, Math.max(1, Math.round(1 + (count - 1) * upper)));
    setResult({ difference: myScore - average, z, upper: upper * 100, rank, count });
  };

  return (
    <section className="gx-page">
      <div className="gx-section-head">
        <button className="gx-back" type="button" onClick={onBack}>← 돌아가기</button>
        <h2>과목별 성적 분석 상세</h2>
      </div>
      <div className="gx-detail-grid">
        <form className="gx-panel gx-form" onSubmit={analyze} noValidate>
          <h3>시험 점수 정보 입력</h3>
          <label>과목명
            <input list="gx-subjects" value={form.subject} placeholder="예: 자료구조" onChange={(event) => update("subject", event.target.value)} />
            <datalist id="gx-subjects">{subjects.map((subject) => <option key={subject} value={subject} />)}</datalist>
          </label>
          <label>시험 종류
            <select value={form.exam} onChange={(event) => update("exam", event.target.value)}><option>중간고사</option><option>기말고사</option><option>퀴즈·기타</option></select>
          </label>
          <div className="gx-two-col">
            <label>내 점수<input type="number" min="0" step="any" value={form.myScore} onChange={(event) => update("myScore", event.target.value)} placeholder="88" /></label>
            <label>전체 평균<input type="number" min="0" step="any" value={form.average} onChange={(event) => update("average", event.target.value)} placeholder="75" /></label>
            <label>중앙값 (선택)<input type="number" min="0" step="any" value={form.median} onChange={(event) => update("median", event.target.value)} placeholder="74" /></label>
            <label>표준편차 (SD)<input type="number" min="0" step="any" value={form.sd} onChange={(event) => update("sd", event.target.value)} placeholder="10" /></label>
          </div>
          <label>응시 인원<input type="number" min="1" step="1" value={form.count} onChange={(event) => update("count", event.target.value)} placeholder="65" /></label>
          {error && <p className="gx-error" role="alert">{error}</p>}
          <button className="gx-primary" type="submit">분석 실행하기</button>
        </form>
        <div className="gx-results">
          {result ? (
            <>
              <div className="gx-stat-grid">
                <div className="gx-stat"><span>평균과의 차이</span><strong>{result.difference >= 0 ? "+" : ""}{result.difference.toFixed(1)}점</strong></div>
                <div className="gx-stat"><span>Z-score (표준점수)</span><strong>{result.z >= 0 ? "+" : ""}{result.z.toFixed(2)}</strong></div>
                <div className="gx-stat"><span>예상 상위 비율</span><strong>{result.upper.toFixed(2)}%</strong></div>
                <div className="gx-stat"><span>예상 등수</span><strong>약 {result.rank}등</strong></div>
              </div>
              <div className="gx-panel">
                <div className="gx-panel-title"><h3>정규분포 상의 내 위치 시각화</h3><small>정규분포 가정 추정치</small></div>
                <NormalCurve z={result.z} />
                <p className="gx-note">입력한 평균과 표준편차를 바탕으로 정규분포를 가정한 추정값입니다. 실제 석차·동점자 수·상대평가 기준과 다를 수 있습니다. 중앙값은 참고 입력값이며 현재 계산식에는 사용되지 않습니다.</p>
              </div>
            </>
          ) : (
            <div className="gx-panel gx-placeholder">시험 점수를 입력하고 <b>분석 실행하기</b>를 누르면 Z-score, 예상 상위 비율, 예상 등수와 정규분포 그래프를 확인할 수 있어요.</div>
          )}
        </div>
      </div>
    </section>
  );
}
