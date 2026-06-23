import { useMemo } from 'react'
import { overallSummary as mockSummary, userFlows as mockUserFlows } from '../data/mockData.js'
import { useJob } from '../context/JobContext.jsx'

// Content-only — no sidebar of its own. Rendered inside HeuristicEvaluation's
// he-main panel when the sidebar's "Overall Summary" item is active, so the
// left category/flow rail stays consistent across both views instead of
// jumping to a separate page with no sidebar (which used to leave the left
// column empty and the content squeezed/overlapping into the 232px slot).
//
// Backed by IntelligenceJob.overall_summary from the Intel backend's
// aggregate step (services/aggregate.py): overall_score, grade, by_severity,
// by_flow (per-flow category breakdown), top_critical_issues. Falls back to
// mock data until that step has run.
export default function OverallSummaryView() {
  const { job } = useJob()
  const live = job?.overall_summary || null

  const score = live ? live.overall_score : mockSummary.score
  const grade = live ? live.grade : mockSummary.grade
  const bySeverity = live ? live.by_severity : mockSummary.bySeverity
  const totalFindings = live ? live.total_findings : mockSummary.totalObservations
  const topIssues = live ? live.top_critical_issues.slice(0, 5) : null

  // "Category Scores" section — one averaged score per heuristic category
  // across every flow in the job (distinct from the per-flow breakdown table
  // below and from the severity bar chart above).
  const categoryScores = useMemo(() => {
    if (live?.by_category?.length) {
      return live.by_category.map((c) => ({ label: c.category, score: c.score }))
    }
    return mockSummary.byCategory
  }, [live])

  // "User Flow Scores" section — one bar per user flow.
  const flowScores = useMemo(() => {
    if (live?.by_flow?.length) {
      return live.by_flow.map((f) => ({ label: f.flow_name, score: f.flow_score }))
    }
    return mockUserFlows.map((f) => ({
      label: f.name,
      score: Math.round(f.categories.reduce((sum, c) => sum + c.score, 0) / f.categories.length),
    }))
  }, [live])

  // Professional, muted blue-gray tone — distinct from the severity card's
  // red/orange/yellow palette.
  const CATEGORY_BAR_COLOR = '#3a5a86'
  const FLOW_BAR_COLOR = '#2f7d6b'

  return (
    <section className="os-main">
      <div className="os-head">
        <div className="os-score-card">
          <span className="os-score-num">{score}</span>
          <span className="os-score-grade">{grade}</span>
          <p className="os-score-label">Overall UX Score</p>
        </div>
        <div className="os-severity-card">
          <p className="os-severity-title">Findings by Severity</p>
          {Object.entries(bySeverity).map(([sev, count]) => {
            const pct = totalFindings ? Math.round((count / totalFindings) * 100) : 0
            return (
              <div key={sev} className="os-sev-row">
                <span className="os-sev-label">{sev}</span>
                <span className="os-sev-track">
                  <span
                    className={'os-sev-bar sev-' + sev.toLowerCase()}
                    style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                  />
                </span>
                <span className="os-sev-count">{count}</span>
              </div>
            )
          })}
          <p className="os-sev-total">{totalFindings} total observations</p>
        </div>
      </div>

      <h3 className="os-section-title">Category Scores</h3>
      <div className="ai-vq-list os-vq-list">
        {categoryScores.map((c) => (
          <div key={c.label} className="ai-vq-row">
            <span className="ai-vq-value">{c.score}%</span>
            <span className="ai-vq-label">{c.label}</span>
            <span className="ai-vq-track">
              <span
                className="ai-vq-fill"
                style={{ width: `${Math.max(c.score, 3)}%`, background: CATEGORY_BAR_COLOR }}
              />
            </span>
          </div>
        ))}
      </div>

      <h3 className="os-section-title">User Flow Scores</h3>
      <div className="ai-vq-list os-vq-list">
        {flowScores.map((f) => (
          <div key={f.label} className="ai-vq-row">
            <span className="ai-vq-value">{f.score}%</span>
            <span className="ai-vq-label">{f.label}</span>
            <span className="ai-vq-track">
              <span
                className="ai-vq-fill"
                style={{ width: `${Math.max(f.score, 3)}%`, background: FLOW_BAR_COLOR }}
              />
            </span>
          </div>
        ))}
      </div>

      <h3 className="os-section-title">Top 5 critical issues</h3>
      <ol className="os-issues">
        {topIssues
          ? topIssues.map((issue, i) => (
              <li key={i} className="os-issue">
                <span className={'os-issue-sev sev-' + issue.severity.toLowerCase()}>
                  {issue.severity}
                </span>
                <span className="os-issue-cat">{issue.category} — {issue.flow_name}</span>
                <p className="os-issue-text">{issue.observation}</p>
              </li>
            ))
          : mockSummary.topIssues?.map((issue) => (
              <li key={issue.id} className="os-issue">
                <span className={'os-issue-sev sev-' + issue.severity.toLowerCase()}>
                  {issue.severity}
                </span>
                <span className="os-issue-cat">{issue.category}</span>
                <p className="os-issue-text">{issue.text}</p>
              </li>
            ))}
      </ol>
    </section>
  )
}
