import { useMemo, useState } from 'react'
import { accessibility } from '../data/mockData.js'
import { ArrowLeft, ArrowRight } from '../components/Icons.jsx'
import { useJob } from '../context/JobContext.jsx'
import { screenshotUrl } from '../api.js'

// Each of the 6 checks is pinned to one VisualQuality sub-metric (models.py)
// so every check uses a distinct real signal instead of repeating one score
// six times. These are the same GPT-4o Vision numbers the Attention Insight
// page averages — here they're relabeled to the accessibility-check
// vocabulary this page already used.
const CHECKS = [
  { id: 'color', label: 'Color', field: 'image_clarity' },
  { id: 'contrast', label: 'Color Contrast', field: 'contrast' },
  { id: 'keyboard', label: 'Keyboard', field: 'focus' },
  { id: 'screen-reader', label: 'Screen Reader', field: 'accessibility' },
  { id: 'text-resize', label: 'Text Resizing', field: 'text_readability' },
  { id: 'interactions', label: 'Content Interactions', field: 'spacing' },
]

const sevClassLive = { Low: 'badge-enh', Medium: 'badge-minor', High: 'badge-moderate' }

function avgVisualQuality(views, fieldKey) {
  const scores = views
    .map((v) => v.evaluation.visual_quality?.[fieldKey])
    .filter((s) => typeof s === 'number')
  if (!scores.length) return null
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

function Gauge({ value }) {
  // semicircle gauge, 0..100 mapped to 180deg
  const r = 70
  const cx = 90
  const cy = 90
  const circ = Math.PI * r // half circumference
  const pct = Math.min(100, Math.max(0, value))
  const dash = (pct / 100) * circ

  return (
    <svg width="180" height="104" viewBox="0 0 180 104" className="acc-gauge">
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="#e6e6e6"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="url(#accGrad)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
      />
      <defs>
        <linearGradient id="accGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#34c759" />
          <stop offset="100%" stopColor="#1f9d55" />
        </linearGradient>
      </defs>
      <text x="90" y="78" textAnchor="middle" className="acc-gauge-num">
        {value}%
      </text>
    </svg>
  )
}

const sevClass = { Minor: 'badge-minor', Moderate: 'badge-moderate', Enhancement: 'badge-enh' }

export default function Accessibility() {
  const { job } = useJob()
  const [view, setView] = useState(0)

  const flows = useMemo(() => (job?.flow_evaluations ? Object.values(job.flow_evaluations) : []), [job])

  // One device per flow — every fetched/uploaded page contributes exactly
  // one screenshot + one set of scores, mirroring AttentionInsight.jsx.
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
  const activeIndex = hasLive ? ((view % liveViews.length) + liveViews.length) % liveViews.length : 0
  const activeView = hasLive ? liveViews[activeIndex] : null

  // Left panel — every check is a combined/overall average across ALL
  // fetched/uploaded pages so far, not just the page currently shown.
  const liveChecks = hasLive
    ? CHECKS.map((c) => ({
        id: c.id,
        label: c.label,
        score: avgVisualQuality(liveViews, c.field) ?? 0,
      }))
    : null
  const checks = liveChecks || accessibility.checks
  const score = liveChecks
    ? Math.round(liveChecks.reduce((sum, c) => sum + c.score, 0) / liveChecks.length)
    : accessibility.score
  const pagesScanned = hasLive ? liveViews.length : accessibility.pagesScanned

  // Center panel — real screenshot only, no heatmap/pins/heuristic cards.
  const pageName = hasLive ? activeView.flow.flow_name : accessibility.pageName

  // Comments — real Finding[] for the active page when live, mock otherwise.
  const liveComments = activeView?.evaluation.findings?.length
    ? activeView.evaluation.findings.map((f, i) => ({
        id: `${activeView.flow.flow_id}-${i}`,
        level: f.principle || f.category || 'WCAG',
        severity: f.severity || 'Medium',
        text: f.recommendation || f.observation,
      }))
    : null
  const comments = liveComments || accessibility.comments

  return (
    <>
      {/* Left score column — combined/overall across every page */}
      <aside className="acc-side">
        <h3 className="acc-title">Accessibility score</h3>
        <Gauge value={score} />
        <p className="acc-scanned">{pagesScanned} Pages Scanned</p>
        <ul className="acc-checks">
          {checks.map((c) => (
            <li key={c.id} className="acc-check">
              <span className="acc-check-label">{c.label}</span>
              <span className={'acc-check-score ' + (c.score < 90 ? 'warn' : 'ok')}>{c.score}%</span>
            </li>
          ))}
        </ul>
      </aside>

      {/* Middle content — page alone, no heatmap/pins/heuristic overlay */}
      <section className="acc-main">
        <h3 className="acc-page-name">Page Name</h3>
        <p className="acc-page-sub">{pageName}</p>

        {hasLive ? (
          <div className="he-screenshot" style={{ position: 'relative' }}>
            <img
              className="he-real-screenshot"
              src={screenshotUrl(job.job_id, activeView.flow.flow_id, activeView.device)}
              alt={`${activeView.flow.flow_name} screenshot`}
            />
            {liveViews.length > 1 && (
              <>
                <button
                  className="he-img-arrow left"
                  onClick={() => setView((v) => (v - 1 + liveViews.length) % liveViews.length)}
                  aria-label="Previous page"
                >
                  <ArrowLeft />
                </button>
                <button
                  className="he-img-arrow right"
                  onClick={() => setView((v) => (v + 1) % liveViews.length)}
                  aria-label="Next page"
                >
                  <ArrowRight />
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="acc-preview">
            <div className="acc-preview-inner">
              <div className="acc-preview-bar" />
              <div className="acc-preview-grid">
                <div className="acc-preview-photo" />
                <div className="acc-preview-lines">
                  <span /><span /><span /><span />
                  <div className="acc-preview-btn" />
                </div>
              </div>
              <div className="acc-preview-callout">⚠ Low contrast text</div>
            </div>
          </div>
        )}

        <h4 className="acc-comments-title">List of comments with recommendation</h4>
        <ul className="acc-comments">
          {comments.map((c) =>
            hasLive ? (
              <li key={c.id} className="acc-comment">
                <div className="acc-comment-head">
                  <span className="acc-level">{c.level}</span>
                  <span className={'acc-sev ' + (sevClassLive[c.severity] || 'badge-minor')}>{c.severity}</span>
                </div>
                <p>{c.text}</p>
              </li>
            ) : (
              <li key={c.id} className="acc-comment">
                <div className="acc-comment-head">
                  <span className="acc-level">WCAG {c.level}</span>
                  <span className={'acc-sev ' + (sevClass[c.severity] || 'badge-minor')}>{c.severity}</span>
                </div>
                <p>{c.text}</p>
              </li>
            ),
          )}
        </ul>
      </section>
    </>
  )
}
