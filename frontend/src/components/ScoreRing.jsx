// Small circular score gauge used on the Attention Insight page (Clarity
// Score / Focus Score). Pure CSS conic-gradient ring — no chart library
// needed for a single static value.
export default function ScoreRing({ value = 0, size = 96, color }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  const ringColor = color || (pct >= 75 ? '#1f9d55' : pct >= 55 ? '#e08a1f' : '#d23f3f')

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <div
        className="score-ring-track"
        style={{ background: `conic-gradient(${ringColor} ${pct * 3.6}deg, #eef0f3 0deg)` }}
      />
      <div className="score-ring-hole">
        <span className="score-ring-value">{pct}</span>
      </div>
    </div>
  )
}
