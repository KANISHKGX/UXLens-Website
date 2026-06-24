import { useEffect, useMemo, useState } from 'react'
import {
  heuristicFooter,
  observations as mockObservations,
} from '../data/mockData.js'
import MockBankPage from '../components/MockBankPage.jsx'
import OverallSummaryView from '../components/OverallSummaryView.jsx'
import {
  ChevronDown,
  ChevronUp,
  EditIcon,
  ChatIcon,
  BulbIcon,
  ClockIcon,
  DesktopIcon,
  TabletIcon,
  MobileIcon,
  ArrowLeft,
  ArrowRight,
} from '../components/Icons.jsx'
import { useJob } from '../context/JobContext.jsx'
import { screenshotUrl } from '../api.js'

const severityClass = { Low: 'sev-low', Medium: 'sev-med', High: 'sev-high' }

// Fixed category order from the spec (Section 2). Only categories that actually
// have at least one observation are shown in the sidebar.
const CATEGORY_ORDER = [
  'Home Page Effectiveness',
  'Search',
  'Forms & Data Entry',
  'Navigation & IA',
  'Help, Feedback & Error Tolerance',
  'Page Layout & Visual Design',
  'Writing & Content Quality',
  'Task Orientation',
]

const DEVICES = [
  { id: 'desktop', label: 'Desktop', Icon: DesktopIcon },
  { id: 'mobile', label: 'Mobile', Icon: MobileIcon },
  { id: 'tablet', label: 'Tab', Icon: TabletIcon },
]

// Backend findings carry no pixel bounding boxes (vision.py returns text-only
// category/severity/observation/recommendation), so the pins below are spaced
// out illustratively across the screenshot rather than pointing at exact
// coordinates. They still map 1:1 to the real findings list and are clickable.
const PIN_POSITIONS = [
  { x: 20, y: 22 },
  { x: 78, y: 20 },
  { x: 50, y: 45 },
  { x: 22, y: 68 },
  { x: 80, y: 66 },
  { x: 50, y: 85 },
]

/** Turn a DeviceEvaluation's findings[] into the same card shape the UI already renders. */
function buildObservationsFromFindings(findings) {
  if (!findings || !findings.length) return null
  return findings.map((f, i) => ({
    id: `obs-${i + 1}`,
    index: i + 1,
    category: f.category,
    principle: f.principle || f.category,
    vimm: 'Visual',
    severity: f.severity || 'Medium',
    observation: [f.observation],
    recommendation: [f.recommendation],
  }))
}

/** Editable list of short text lines. Edit mode is controlled by the parent
 * so the pencil button can live in the card header instead of floating
 * unpositioned (that mismatch was why "editing" looked broken before). */
function EditableList({ items, editing, onChange }) {
  return editing ? (
    <div className="he-edit-list">
      {items.map((t, i) => (
        <textarea
          key={i}
          className="he-edit-line"
          value={t}
          rows={2}
          onChange={(e) => {
            const next = items.slice()
            next[i] = e.target.value
            onChange(next)
          }}
        />
      ))}
    </div>
  ) : (
    <ol className="he-card-list">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ol>
  )
}

/** Loading placeholder shown in the center panel while a real analysis (or
 * an image upload being turned into a flow) is in progress, instead of
 * mock/sample data. Per design: keep the surrounding header bar exactly as
 * it is, and render a blank panel with a vertical shimmer wave underneath —
 * no step list, no copy — then reveal the real panels once data lands. */
function WaitingView() {
  return (
    <div className="he-waiting-blank">
      <span className="he-waiting-wave" />
    </div>
  )
}

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function HeuristicEvaluation({ initialView = 'observation' }) {
  const { job, phase, setActiveObservation, registerEditHandler, uploadingImage } = useJob()
  const [mainView, setMainView] = useState(initialView) // 'observation' | 'overall'
  const [expanded, setExpanded] = useState({})
  const [activeObs, setActiveObs] = useState(null)
  const [activeFlowIndex, setActiveFlowIndex] = useState(0)
  const [activeDevice, setActiveDevice] = useState('desktop')
  const [deviceMenuOpen, setDeviceMenuOpen] = useState(false)
  const [editingField, setEditingField] = useState(null) // 'observation' | 'recommendation' | null
  const [editedText, setEditedText] = useState({}) // { [obsId]: { observation: [...], recommendation: [...] } }
  const [historyOpen, setHistoryOpen] = useState(false)
  const [visited, setVisited] = useState([])

  const flows = useMemo(() => {
    if (!job || !job.flow_evaluations) return []
    return Object.values(job.flow_evaluations)
  }, [job])

  // Clamp in case the job shrinks (e.g. a new analysis with fewer flows starts).
  const safeFlowIndex = flows.length ? activeFlowIndex % flows.length : 0
  const activeFlow = flows[safeFlowIndex] || null
  const activeDeviceEval = activeFlow ? activeFlow.devices?.[activeDevice] : null
  const deviceReady = activeDeviceEval && activeDeviceEval.status === 'completed'

  // While a real analysis is running and the currently-selected flow/device
  // isn't ready yet, show the creative waiting view instead of mock data.
  const isGenerating = !!job && (phase === 'starting' || phase === 'polling') && !deviceReady

  const liveObservations = useMemo(
    () => (deviceReady ? buildObservationsFromFindings(activeDeviceEval.findings) : null),
    [deviceReady, activeDeviceEval],
  )

  const observations = liveObservations || mockObservations

  // Group observations by the fixed category order; only categories with
  // findings are rendered (Section 2 requirement).
  const categories = useMemo(() => {
    return CATEGORY_ORDER.map((label) => ({
      label,
      items: observations.filter(
        (o) => (o.category || '').toLowerCase() === label.toLowerCase(),
      ),
    })).filter((c) => c.items.length > 0)
  }, [observations])

  useEffect(() => {
    if (!activeObs && categories.length) {
      setActiveObs(categories[0].items[0].id)
      setExpanded({ [categories[0].label]: true })
    }
  }, [categories, activeObs])

  const obs = observations.find((o) => o.id === activeObs) || observations[0]
  const currentCategory = categories.find((c) => c.items.some((o) => o.id === obs.id))
  const liveText = editedText[obs.id] || {}
  const observationLines = liveText.observation || obs.observation
  const recommendationLines = liveText.recommendation || obs.recommendation

  const setLines = (field) => (next) =>
    setEditedText((prev) => ({ ...prev, [obs.id]: { ...prev[obs.id], [field]: next } }))

  // Publish the observation currently on screen to JobContext so the
  // RightPanel chat prompt knows what it's editing, and register a handler
  // that applies the assistant's revised text back into this component's
  // local edited-text state. Re-registered whenever obs/lines change so the
  // handler always closes over the right id.
  useEffect(() => {
    setActiveObservation({
      id: obs.id,
      category: obs.category,
      observation: observationLines,
      recommendation: recommendationLines,
    })
    registerEditHandler((result) => {
      setEditedText((prev) => ({
        ...prev,
        [obs.id]: { observation: result.observation, recommendation: result.recommendation },
      }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obs.id, observationLines, recommendationLines])

  // Record visit history (capped at 12, no consecutive duplicates) so
  // "View History" has something real to show and jump back to.
  useEffect(() => {
    if (!obs || !activeFlow) return
    setVisited((prev) => {
      const entry = {
        obsId: obs.id,
        category: obs.category,
        flowIndex: safeFlowIndex,
        flowName: activeFlow.flow_name,
        device: activeDevice,
        time: timeNow(),
      }
      if (prev[0] && prev[0].obsId === entry.obsId && prev[0].flowIndex === entry.flowIndex && prev[0].device === entry.device) {
        return prev
      }
      return [entry, ...prev].slice(0, 12)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obs?.id, activeFlow?.flow_id, activeDevice])

  const selectObservation = (id) => {
    setActiveObs(id)
    setEditingField(null)
    setMainView('observation')
  }

  const selectCategory = (label, items) => {
    setExpanded({ [label]: true })
    setEditingField(null)
    setMainView('observation')
    if (items.length) setActiveObs(items[0].id)
  }

  const selectFlow = (index) => {
    setActiveFlowIndex(index)
    setActiveObs(null)
    setExpanded({})
    setEditingField(null)
    setMainView('observation')
  }

  const stepFlow = (delta) => {
    if (!flows.length) return
    selectFlow((safeFlowIndex + delta + flows.length) % flows.length)
  }

  const jumpToHistory = (entry) => {
    setActiveFlowIndex(entry.flowIndex)
    setActiveDevice(entry.device)
    setExpanded({ [entry.category]: true })
    setActiveObs(entry.obsId)
    setEditingField(null)
    setHistoryOpen(false)
    setMainView('observation')
  }

  const mockPins = [
    { n: 1, x: 78, y: 30 },
    { n: 2, x: 26, y: 55 },
    { n: 3, x: 79, y: 56 },
  ]

  return (
    <>
      {/* Left category sidebar — kept identical across Heuristic Evaluation
          and Overall Summary by always rendering here, regardless of mainView. */}
      <aside className="he-sidebar">
        <button
          className={'he-sb-item he-sb-overall' + (mainView === 'overall' ? ' active' : '')}
          onClick={() => setMainView('overall')}
        >
          <span>Overall Summary</span>
        </button>

        {categories.map((cat) => {
          const isOpen = expanded[cat.label]
          return (
            <div key={cat.label} className="he-sb-group">
              <button
                className={'he-sb-item' + (isOpen && mainView === 'observation' ? ' active' : '')}
                onClick={() => selectCategory(cat.label, cat.items)}
              >
                <span>{cat.label}</span>
                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {isOpen && (
                <div className="he-sb-children">
                  {cat.items.map((o, i) => (
                    <button
                      key={o.id}
                      className={'he-sb-child' + (mainView === 'observation' && activeObs === o.id ? ' active' : '')}
                      onClick={() => selectObservation(o.id)}
                    >
                      {`Observation ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {flows.length > 0 && (
          <div className="he-sb-flows">
            <p className="he-sb-flows-title">User Flows ({flows.length})</p>
            {flows.map((f, i) => {
              const devEval = f.devices?.[activeDevice]
              return (
                <button
                  key={f.flow_id}
                  className={'he-sb-flow' + (mainView === 'observation' && i === safeFlowIndex ? ' active' : '')}
                  onClick={() => selectFlow(i)}
                >
                  <span className={'he-sb-flow-dot status-' + (devEval?.status || 'pending')} />
                  <span className="he-sb-flow-name">{f.flow_name}</span>
                </button>
              )
            })}
          </div>
        )}

        <div className="he-sb-footer">
          {heuristicFooter.map((f) => (
            <div key={f.id} className="he-sb-foot-group">
              <button
                className="he-sb-foot-item"
                onClick={() => {
                  if (f.id === 'history') setHistoryOpen((o) => !o)
                }}
              >
                <span>{f.label}</span>
                {f.icon === 'bulb' ? <BulbIcon /> : <ClockIcon />}
              </button>
              {f.id === 'history' && historyOpen && (
                <div className="he-history-list">
                  {visited.length === 0 ? (
                    <p className="he-history-empty">No history yet — browse a few observations.</p>
                  ) : (
                    visited.map((v, i) => (
                      <button key={i} className="he-history-item" onClick={() => jumpToHistory(v)}>
                        <span className="he-history-cat">{v.category}</span>
                        <span className="he-history-meta">{v.flowName} · {v.device} · {v.time}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {uploadingImage ? (
        <section className="he-main">
          <div className="he-main-head">
            <span className="he-counter"><strong>Evaluating uploaded image…</strong></span>
          </div>
          <WaitingView />
        </section>
      ) : mainView === 'overall' ? (
        <OverallSummaryView />
      ) : (
        /* Middle content */
        <section className="he-main">
          <div className="he-main-head">
            <span className="he-counter">
              {String(obs.index).padStart(2, '0')}/{String(observations.length).padStart(2, '0')}{' '}
              <strong>Observation Spotted</strong>
            </span>

            <div className="he-head-actions">
              <div className="he-device-toggle">
                <button
                  className="he-device-trigger"
                  onClick={() => setDeviceMenuOpen((o) => !o)}
                  aria-label="Choose device view"
                >
                  {DEVICES.find((d) => d.id === activeDevice).Icon({ size: 16, color: '#1a73e8' })}
                </button>
                {deviceMenuOpen && (
                  <div className="he-device-menu">
                    {DEVICES.map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        className={'he-device-opt' + (activeDevice === id ? ' active' : '')}
                        onClick={() => {
                          setActiveDevice(id)
                          setDeviceMenuOpen(false)
                          setActiveObs(null)
                          setExpanded({})
                          setEditingField(null)
                        }}
                      >
                        <Icon size={15} color={activeDevice === id ? '#1a73e8' : '#555'} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <ChatIcon />
            </div>
          </div>

          {isGenerating ? (
            <WaitingView />
          ) : (
            <>
              {phase === 'failed' && (
                <p className="he-status">Analysis failed — showing sample data below.</p>
              )}

              {flows.length > 0 && (
                <p className="he-flow-context">
                  Flow {safeFlowIndex + 1} of {flows.length}: <strong>{activeFlow.flow_name}</strong>
                </p>
              )}

              <div className="he-screenshot">
                {flows.length > 1 && (
                  <button className="he-img-arrow left" onClick={() => stepFlow(-1)} aria-label="Previous flow">
                    <ArrowLeft size={18} />
                  </button>
                )}

                {deviceReady && activeDeviceEval.screenshot_path ? (
                  <>
                    <img
                      className="he-real-screenshot"
                      src={screenshotUrl(job.job_id, activeFlow.flow_id, activeDevice)}
                      alt={`${activeFlow.flow_name} screenshot`}
                    />
                    {currentCategory && (
                      <div className="he-issue-pins">
                        {currentCategory.items.map((o, i) => {
                          const pos = PIN_POSITIONS[i % PIN_POSITIONS.length]
                          return (
                            <button
                              key={o.id}
                              className={'he-issue-pin' + (o.id === obs.id ? ' active' : '')}
                              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                              onClick={() => selectObservation(o.id)}
                              title={o.observation[0]}
                            >
                              {i + 1}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </>
                ) : job && deviceReady ? (
                  // Real evaluation came back but the screenshot capture failed on the
                  // backend (e.g. screenshot service down/blocked) — say so plainly
                  // instead of silently showing the unrelated US Bank demo mock, which
                  // reads as a wrong/mixed-up result for whatever site was analyzed.
                  <div className="he-screenshot-unavailable">
                    <p>Screenshot unavailable for this page/device.</p>
                    <p className="he-screenshot-unavailable-sub">
                      The evaluation text below is real, but the capture service couldn't
                      render this page. Try again or pick another device.
                    </p>
                  </div>
                ) : (
                  <MockBankPage pins={mockPins} />
                )}

                {flows.length > 1 && (
                  <button className="he-img-arrow right" onClick={() => stepFlow(1)} aria-label="Next flow">
                    <ArrowRight size={18} />
                  </button>
                )}

                <span className="he-device-badge">
                  {DEVICES.find((d) => d.id === activeDevice).label} view
                </span>
              </div>

              <div className="he-attrs">
                <div className="he-attr">
                  <span className="he-attr-k">Category</span>
                  <span className="he-attr-v">{obs.category}</span>
                </div>
                <div className="he-attr">
                  <span className="he-attr-k">Heuristic Principle</span>
                  <span className="he-attr-v">{obs.principle}</span>
                </div>
                <div className="he-attr">
                  <span className="he-attr-k">VIMM Impact</span>
                  <span className="he-attr-v">{obs.vimm}</span>
                </div>
                <div className="he-attr">
                  <span className="he-attr-k">Severity</span>
                  <span className={'he-badge ' + severityClass[obs.severity]}>{obs.severity}</span>
                </div>
              </div>

              <div className="he-cards">
                <div className="he-card">
                  <div className="he-card-head">
                    <span>Observation</span>
                    <button
                      className={'he-edit-trigger' + (editingField === 'observation' ? ' active' : '')}
                      onClick={() => setEditingField((f) => (f === 'observation' ? null : 'observation'))}
                      aria-label="Edit observation"
                    >
                      <EditIcon size={14} color={editingField === 'observation' ? '#fff' : '#1a73e8'} />
                      <span>{editingField === 'observation' ? 'Done' : 'Edit'}</span>
                    </button>
                  </div>
                  <EditableList
                    items={observationLines}
                    editing={editingField === 'observation'}
                    onChange={setLines('observation')}
                  />
                </div>
                <div className="he-card">
                  <div className="he-card-head">
                    <span>Recommendation</span>
                    <button
                      className={'he-edit-trigger' + (editingField === 'recommendation' ? ' active' : '')}
                      onClick={() => setEditingField((f) => (f === 'recommendation' ? null : 'recommendation'))}
                      aria-label="Edit recommendation"
                    >
                      <EditIcon size={14} color={editingField === 'recommendation' ? '#fff' : '#1a73e8'} />
                      <span>{editingField === 'recommendation' ? 'Done' : 'Edit'}</span>
                    </button>
                  </div>
                  <EditableList
                    items={recommendationLines}
                    editing={editingField === 'recommendation'}
                    onChange={setLines('recommendation')}
                  />
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </>
  )
}
