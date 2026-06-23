import { Outlet } from 'react-router-dom'
import TopBar from './TopBar.jsx'
import ReportTabs from './ReportTabs.jsx'
import RightPanel from './RightPanel.jsx'
import { reportMeta } from '../data/mockData.js'
import { useJob } from '../context/JobContext.jsx'

const PHASE_LABEL = {
  starting: 'Starting analysis…',
  polling: 'Analyzing — this can take a minute or two…',
  completed: 'Analysis complete',
  failed: 'Analysis failed — showing sample data',
}

export default function ReportLayout() {
  const { job, phase, uploadingImage } = useJob()

  // Any time we're actively producing a report — a fresh /analyze poll cycle
  // or a synchronous image-upload evaluation — hide the sidebar/main/right
  // columns entirely behind a single blank, waving panel instead of leaving
  // stale mock data or a half-finished previous job on screen. TopBar and
  // ReportTabs (the actual page header) are untouched.
  const isProcessing = uploadingImage || phase === 'starting' || phase === 'polling'

  // Only fall back to the static mock domain/name when there is truly no
  // job yet (e.g. landed on this route directly). Once a real job exists —
  // including an image-only job, which has no company/URL to resolve — show
  // something derived from that job instead of silently reverting to the
  // "Banking Domain / US Bank Report" placeholder.
  const domain = job?.business_category?.category
    ? `${job.business_category.category} Domain`
    : job?.company
      ? `${job.company} Domain`
      : job
        ? 'Image Upload'
        : reportMeta.domain
  const name = job?.company
    ? `${job.company} Report`
    : job
      ? 'Uploaded Images Report'
      : reportMeta.reportName

  return (
    <div className="report-shell">
      <TopBar />
      <ReportTabs />
      <div className="report-meta">
        <span className="report-meta-domain">{isProcessing ? 'Analyzing…' : domain}</span>
        {!isProcessing && <span className="report-meta-name">{name}</span>}
        {phase !== 'idle' && (
          <span className="report-meta-status">
            {uploadingImage ? 'Evaluating uploaded image(s)…' : PHASE_LABEL[phase] || phase}
          </span>
        )}
      </div>
      <div className="report-columns">
        {isProcessing ? (
          <div className="report-blank-wave">
            <span className="he-waiting-wave" />
          </div>
        ) : (
          <>
            <Outlet />
            <RightPanel />
          </>
        )}
      </div>
    </div>
  )
}
