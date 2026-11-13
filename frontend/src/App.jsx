import { useState } from 'react'
import './App.css'

const initial = { subject: '', exam: '기말고사', score: '', mean: '', median: '', sd: '', count: '' }

// Approximation of the standard normal upper tail (maximum error about 7.5e-8).
function upperTail(z) {
  const x = Math.abs(z)
  const t = 1 / (1 + 0.2316419 * x)
  const tail = Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI) * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  return z >= 0 ? tail : 1 - tail
}
const signed = (value, digits) => `${value > 0 ? '+' : ''}${value.toFixed(digits)}`

function Distribution({ result }) {
  const { z, score, mean } = result
  // Keep extreme scores visible without misrepresenting the marker's position.
  const extent = Math.max(3.5, Math.abs(z) + 0.5)
  const x = (v) => 40 + (v + extent) / (2 * extent) * 720
  const y = (v) => 250 - Math.exp(-v * v / 2) * 200
  const points = Array.from({ length: 201 }, (_, i) => {
    const v = -extent + 2 * extent * i / 200
    return `${x(v)},${y(v)}`
  }).join(' ')
  return <svg className="chart" viewBox="0 0 800 300" role="img" aria-label={`정규분포 그래프. 평균 ${mean}점, 내 점수 ${score}점, Z-score ${z.toFixed(2)}`}>
    <polygon points={`40,250 ${points} 760,250`} fill="#e8f0ff" />
    <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="3" />
    <line x1="40" y1="250" x2="760" y2="250" stroke="#c8d4e3" strokeWidth="2" />
    <line x1={x(0)} y1="50" x2={x(0)} y2="250" stroke="#94a3b8" strokeDasharray="5 5" />
    <line x1={x(z)} y1={y(z)} x2={x(z)} y2="250" stroke="#2563eb" strokeWidth="2" />
    <circle cx={x(z)} cy={y(z)} r="6" fill="#2563eb" stroke="white" strokeWidth="2" />
    <text x={x(0)} y="277" textAnchor="middle" fill="#64748b" fontSize="14">평균 ({mean})</text>
    <text x={x(z)} y={Math.max(22, y(z) - 15)} textAnchor="middle" fill="#1e40af" fontSize="14" fontWeight="700">내 점수 ({score})</text>
  </svg>
}

function App() {
  const [form, setForm] = useState(initial)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  function change(event) { setForm({ ...form, [event.target.name]: event.target.value }); setError('') }
  function analyze(event) {
    event.preventDefault()
    const score = Number(form.score), mean = Number(form.mean), sd = Number(form.sd), count = Number(form.count)
    if ([form.score, form.mean, form.sd, form.count].some(v => v.trim() === '') || ![score, mean, sd, count].every(Number.isFinite) || sd <= 0 || !Number.isSafeInteger(count) || count < 1) {
      setError('점수와 평균을 입력하고, 표준편차는 0보다 크게, 응시 인원은 1 이상의 정수로 입력해 주세요.')
      return
    }
    const z = (score - mean) / sd
    if (!Number.isFinite(z)) { setError('입력값의 범위를 확인해 주세요.'); return }
    const top = upperTail(z)
    // Expected rank: the student plus the expected number of other students above them.
    const rank = Math.min(count, Math.max(1, Math.round(1 + (count - 1) * top)))
    setResult({ score, mean, z, top, rank, count, subject: form.subject, exam: form.exam })
  }
  return <main className="page">
    <header><div><p className="eyebrow">GRADE INSIGHT</p><h1>성적 분석 및 목표 가이드</h1><p className="subtitle">시험 점수로 나의 위치를 확인해 보세요.</p></div></header>
    <div className="section-heading"><div><span className="heading-icon">↗</span><strong>과목별 성적 분석 상세</strong></div><span>시험 점수 분석</span></div>
    <div className="layout">
      <form className="panel form" onSubmit={analyze}>
        <h2>시험 점수 정보 입력</h2><p className="form-intro">분석할 시험 정보를 입력해 주세요.</p>
        <label>과목명<input name="subject" value={form.subject} onChange={change} placeholder="예: 자료구조" /></label>
        <label>시험 종류<select name="exam" value={form.exam} onChange={change}><option>기말고사</option><option>중간고사</option><option>퀴즈</option><option>기타</option></select></label>
        <div className="fields"><label>내 점수<input name="score" type="number" step="any" value={form.score} onChange={change} placeholder="88" required /></label><label>전체 평균<input name="mean" type="number" step="any" value={form.mean} onChange={change} placeholder="75" required /></label></div>
        <div className="fields"><label>중앙값 <span>(선택)</span><input name="median" type="number" step="any" value={form.median} onChange={change} placeholder="74" /></label><label>표준편차 (SD)<input name="sd" type="number" step="any" min="0.0000001" value={form.sd} onChange={change} placeholder="10" required /></label></div>
        <label>응시 인원<input name="count" type="number" min="1" step="1" value={form.count} onChange={change} placeholder="65" required /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit">분석 실행하기</button>
      </form>
      <section className="results" aria-live="polite">
        {!result ? <div className="panel empty"><div className="empty-icon">⌁</div><h2>나의 성적을 분석해 보세요</h2><p>시험 점수를 입력하고 <b>분석 실행하기</b>를 누르면<br />예상 순위와 정규분포 그래프를 확인할 수 있어요.</p></div> : <>
          <div className="cards">
            <div className="panel card"><span>평균과의 차이</span><strong className="blue">{signed(result.score - result.mean, 1)} 점</strong></div>
            <div className="panel card"><span>Z-score (표준점수)</span><strong>{signed(result.z, 2)}</strong></div>
            <div className="panel card"><span>예상 상위 비율</span><strong className="blue">{(result.top * 100).toFixed(2)}%</strong></div>
            <div className="panel card"><span>예상 등수</span><strong>약 {result.rank}등</strong></div>
          </div>
          <div className="panel graph"><div className="graph-title"><div><h2>정규분포 상의 내 위치</h2><p>{result.subject ? `${result.subject} · ` : ''}{result.exam}</p></div><span className="badge">정규분포 가정 추정치</span></div><Distribution result={result} /><div className="notice">💡 <b>안내:</b> 상위 비율과 등수는 입력한 평균과 표준편차를 바탕으로 점수가 정규분포를 따른다고 가정한 추정치입니다. 예상 등수는 본인을 제외한 {result.count - 1}명 중 나보다 높은 점수를 받을 예상 인원에 1을 더해 계산합니다. 실제 분포와 동점자에 따라 실제 순위는 달라질 수 있습니다. 중앙값은 이 계산에 사용하지 않습니다.</div></div>
        </>}
      </section>
    </div>
  </main>
}
export default App
