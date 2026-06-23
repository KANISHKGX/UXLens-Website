import { useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { homeContent } from '../data/mockData.js'
import { Logo, PaperclipIcon, MicIcon, SendIcon } from '../components/Icons.jsx'
import { useJob } from '../context/JobContext.jsx'

export default function Home() {
  const navigate = useNavigate()
  const { startAnalysis, analyzeFromImages, phase, error } = useJob()
  const [prompt, setPrompt] = useState(homeContent.placeholder)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  const reset = () => setPrompt('')

  const generateReport = async () => {
    if (!prompt.trim() || submitting) return
    setSubmitting(true)
    const result = await startAnalysis(prompt, { maxFlows: 5 })
    setSubmitting(false)
    if (result) navigate('/report/heuristic')
  }

  const triggerAddFiles = () => fileInputRef.current?.click()

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    navigate('/report/heuristic')
    await analyzeFromImages(files)
  }

  return (
    <div className="home">
      <aside className="home-sidebar">
        <div className="home-logo">
          <Logo size={30} />
        </div>
        <nav className="home-nav">
          {homeContent.sidebar.map((s, i) => (
            <Link key={s.id} to={s.to} className={'home-nav-link' + (i === 0 ? ' active' : '')}>
              {s.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="home-main">
        <header className="home-head">
          <h1>{homeContent.title}</h1>
          <p>{homeContent.subtitle}</p>
        </header>

        <div className="home-card">
          <div className="home-prompt-wrap">
            <textarea
              className="home-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  generateReport()
                }
              }}
              rows={3}
            />
            <button
              className="home-prompt-send"
              aria-label="Send"
              onClick={generateReport}
              disabled={submitting || !prompt.trim()}
            >
              <SendIcon size={16} color="#666" />
            </button>
          </div>
          <div className="home-prompt-tools">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button type="button" className="home-tool-pill" onClick={triggerAddFiles}>
              <PaperclipIcon /> Add Files
            </button>
            <span className="home-tool-pill">⌁ Import Prototype</span>
            <span className="home-tool-pill"><MicIcon /> Voice Command</span>
          </div>
        </div>

        {error && phase === 'failed' && (
          <p className="home-error">{error}</p>
        )}

        <div className="home-actions">
          <button className="home-generate" onClick={generateReport} disabled={submitting}>
            {submitting ? 'Starting…' : 'Generate Report'}
          </button>
          <button className="home-clear" onClick={reset} disabled={submitting}>
            Clear
          </button>
        </div>
      </main>
    </div>
  )
}
