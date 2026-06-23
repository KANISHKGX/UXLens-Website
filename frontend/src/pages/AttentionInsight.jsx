import { useMemo, useState } from 'react'
import { attentionScores, heatSpots } from '../data/mockData.js'
import MockBankPage from '../components/MockBankPage.jsx'
import { ArrowLeft, ArrowRight, ArchitectureIcon, CTAIcon, NavigationIcon } from '../components/Icons.jsx'
import ScoreRing from '../components/ScoreRing.jsx'
import { useJob } from '../context/JobContext.jsx'
import { screenshotUrl } from '../api.js'

// Mirrors backend VisualQuality (models.py) — the 6 sub-metrics GPT-4o Vision
// scores directly from each screenshot's pixels, independent of the 4.1-4.8
// heuristic categories used elsewhere in the app.
const VISUAL_QUALITY_FIELDS = [
  { key: 'text_readability', label: 'Text readability' },
  { key: 'focus', label: 'Focus' },
  { key: 'spacing', label: 'Spacing' },
  { key: 'image_clarity', label: 'Image clarity' },
  { key: 'accessibility', label: 'Accessibility' },
  { key: 'contrast', label: 'Contrast' },
]

// The three attention cards below the heatmap viewer — each pinned to a real
// heuristic category so the card identity stays stable while its score/
// finding legitimately changes as the user scrolls between pages/images.
const ATTENTION_CARDS = [
  { id: 'ia', title: 'Information Architecture', category: 'Home Page Effectiveness', Icon: ArchitectureIcon },
  { id: 'cta', title: 'Clear and Engaging CTAs', category: 'Page Layout & Visual Design', Icon: CTAIcon },
  { id: 'nav', title: 'Intuitive Navigation', category: 'Navigation & IA', Icon: NavigationIcon },
]

function heatColor(intensity) {
  // green (cool) -> yellow -> red (hot) — used only for the illustrative
  // mock overlay shown when there's no live job yet.
  if (intensity > 0.8) return 'rgba(255,40,40,0.78)'
  if (intensity > 0.6) return 'rgba(255,140,0,0.7)'
  if (intensity > 0.4) return 'rgba(255,214,0,0.62)'
  return 'rgba(70,200,90,0.5)'
}

// Score semantics are the inverse of heat semantics: high score = good = green.
function scoreColor(value) {
  if (value >= 75) return '#1f9d55'
  if (value >= 55) return '#e08a1f'
  return '#d23f3f'
}
function scoreStatus(value) {
  if (value >= 75) return 'Good'
  if (value >= 55) return 'Improvement required'
  return 'Needs attention'
}
function clarityLabel(value) {
  if (value >= 75) return 'Optimal Clarity'
  if (value >= 55) return 'Moderate Clarity'
  return 'Low Clarity'
}
function focusLabel(value) {
  if (value >= 75) return 'Strong Focus'
  if (value >= 55) return 'Moderate Focus'
  return 'Weak Focus'
}

function avgCategoryScore(views, categoryName) {
  const scores = views
    .map((v) => v.evaluation.category_scores?.find((c) => c.category === categoryName)?.score)
    .filter((s) => typeof s === 'number')
  if (!scores.length) return null
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

// Combined/overall average of a single visual_quality sub-metric across every
// page uploaded/fetched so far, not just the page currently in view.
function avgVisualQuality(views, fieldKey) {
  const scores = views
    .map((v) => v.evaluation.visual_quality?.[fieldKey])
    .filter((s) => typeof s === 'number')
  if (!scores.length) return null
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

export default function AttentionInsight() {
  const { job } = useJob()
  const [view, setView] = useState(0)

  const flows = useMemo(() => (job?.flow_evaluations ? Object.values(job.flow_evaluations) : []), [job])

  // One device per flow (desktop preferred) — every fetched/uploaded page
  // gets exactly one screenshot in the scroller.
  const liveViews = useMemo(
    () =>
      flows
        .map((flow) => {
          const device = ['desktop', 'tablet', 'mobile'].find((d) => flow.devices?.[d]?.status === 'completed')
          return device ? { flow, device, evaluation: flow.devices[device] } : null
        })
        .filter(Boolean),
    [flows],
  )

  const hasLive = liveViews.length > 0
  const views = hasLive ? liveViews.map((v) => v.flow.flow_name) : ['Home page', 'Mortgage landing', 'Account login']
  const activeIndex = ((view % views.length) + views.length) % views.length
  const activeView = hasLive ? liveViews[activeIndex] : null

  // ---------------------------------------------------------------------
  // Left panel — combined scores across ALL fetched/uploaded pages, not
  // just whichever one is currently in view.
  // ---------------------------------------------------------------------
  const combinedOverall = hasLive
    ? Math.round(liveViews.reduce((sum, v) => sum + v.evaluation.overall_score, 0) / liveViews.length)
    : null
  const combinedNav = hasLive ? avgCategoryScore(liveViews, 'Navigation & IA') : null
  const combinedLayout = hasLive ? avgCategoryScore(liveViews, 'Page Layout & Visual Design') : null

  const clarityScore = hasLive ? combinedOverall : 71
  const focusScore = hasLive
    ? Math.round(((combinedNav ?? combinedOverall) + (combinedLayout ?? combinedOverall)) / 2)
    : 66
  const improvementRequired = hasLive ? Math.max(0, 100 - clarityScore) : 30

  const combinedBars = hasLive
    ? VISUAL_QUALITY_FIELDS.map(({ key, label }) => ({
        label,
        value: avgVisualQuality(liveViews, key) ?? combinedOverall,
      }))
    : attentionScores.scales

  // ---------------------------------------------------------------------
  // Heatmap viewer — real screenshots when live, with the previous/next
  // page peeking out behind the active one as a scroll affordance.
  // ---------------------------------------------------------------------
  const prevView = hasLive ? liveViews[(activeIndex - 1 + liveViews.length) % liveViews.length] : null
  const nextView = hasLive ? liveViews[(activeIndex + 1) % liveViews.length] : null

  const heatBackground = heatSpots
    .map((s) => `radial-gradient(circle at ${s.x}% ${s.y}%, ${heatColor(s.intensity)} 0%, transparent ${s.r}%)`)
    .join(', ')

  return (
    <>
      {/* Left panel — combined Clarity/Focus scores across all pages */}
      <aside className="ai-legend">
        <div className="ai-score-block">
          <p className="ai-score-title">
            Clarity Score <span className="ai-info-dot">i</span>
          </p>
          <ScoreRing value={clarityScore} />
          <p className="ai-score-sub" style={{ color: scoreColor(clarityScore) }}>
            {clarityLabel(clarityScore)}
          </p>
        </div>

        <div className="ai-score-block">
          <p className="ai-score-title">
            Focus Score <span className="ai-info-dot">i</span>
          </p>
          <ScoreRing value={focusScore} />
          <p className="ai-score-sub" style={{ color: scoreColor(focusScore) }}>
            {focusLabel(focusScore)}
          </p>
        </div>

        <p className="ai-legend-headline ai-vq-headline">
          <strong>{improvementRequired}%</strong> Improvement required
        </p>

        <div className="ai-vq-list">
          {combinedBars.map((s) => (
            <div key={s.label} className="ai-vq-row">
              <span className="ai-vq-value">{s.value}%</span>
              <span className="ai-vq-label">{s.label}</span>
              <span className="ai-vq-track">
                <span className="ai-vq-fill" style={{ width: `${s.value}%`, background: scoreColor(s.value) }} />
              </span>
            </div>
          ))}
        </div>
      </aside>

      {/* Heatmap viewer */}
      <section className="ai-main">
        <div className="ai-viewer">
          <button
            className="ai-nav-arrow left"
            onClick={() => setView((v) => (v - 1 + views.length) % views.length)}
            aria-label="Previous"
            disabled={views.length <= 1}
          >
            <ArrowLeft />
          </button>

          <div className="ai-heatstage">
            {hasLive ? (
              <>
                {liveViews.length > 1 && (
                  <img
                    className="ai-peek ai-peek-prev"
                    src={screenshotUrl(job.job_id, prevView.flow.flow_id, prevView.device)}
                    alt=""
                    aria-hidden="true"
                  />
                )}
                <img
                  className="ai-real-heatmap"
                  src={screenshotUrl(job.job_id, activeView.flow.flow_id, activeView.device)}
                  alt={`${activeView.flow.flow_name} screenshot`}
                />
                {liveViews.length > 1 && (
                  <img
                    className="ai-peek ai-peek-next"
                    src={screenshotUrl(job.job_id, nextView.flow.flow_id, nextView.device)}
                    alt=""
                    aria-hidden="true"
                  />
                )}
                {/* Illustrative attention overlay — backend doesn't emit pixel-region coordinates yet */}
                <div className="ai-heat-overlay" style={{ backgroundImage: heatBackground }} />
              </>
            ) : (
              <>
                <MockBankPage />
                <div className="ai-heat-overlay" style={{ backgroundImage: heatBackground }} />
              </>
            )}
            <span className="ai-view-label">{views[activeIndex]}</span>
          </div>

          <button
            className="ai-nav-arrow right"
            onClick={() => setView((v) => (v + 1) % views.length)}
            aria-label="Next"
            disabled={views.length <= 1}
          >
            <ArrowRight />
          </button>
        </div>

        {/* Per-page attention cards — same three categories every time, but
            the score/finding underneath legitimately changes per page. */}
        <div className="ai-cards">
          {ATTENTION_CARDS.map(({ id, title, category, Icon }) => {
            const liveCategory = activeView?.evaluation.category_scores?.find((c) => c.category === category)
            const fallback = attentionScores.metrics.find((m) => m.id === id)
            const score = liveCategory ? liveCategory.score : fallback.value
            const note = liveCategory?.findings?.[0] || fallback.note
            const color = scoreColor(score)

            return (
              <div key={id} className="ai-card">
                <div className="ai-card-icon">
                  <Icon />
                </div>
                <h4 className="ai-card-title">{title}</h4>
                <p className="ai-card-desc">{note}</p>
                <div className="ai-card-foot">
                  <span className="ai-card-status" style={{ color }}>
                    {scoreStatus(score)}
                  </span>
                  <span className="ai-card-bar">
                    <span className="ai-card-bar-fill" style={{ width: `${score}%`, background: color }} />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}
