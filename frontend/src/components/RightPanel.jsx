import { useMemo, useRef, useState } from 'react'
import { evaluatedPages } from '../data/mockData.js'
import { ChevronUp, ChevronDown, SendIcon, CheckIcon, PaperclipIcon } from './Icons.jsx'
import { useJob } from '../context/JobContext.jsx'
import { assistantEdit } from '../api.js'

export default function RightPanel() {
  const { job, activeObservation, applyAssistantEdit, addImageToJob, uploadingImage } = useJob()
  const [open, setOpen] = useState(true)
  const [prompt, setPrompt] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState([]) // [{ role: 'user'|'assistant', text }]
  const [sendError, setSendError] = useState('')
  const fileInputRef = useRef(null)

  // The company/URL the user typed on Home is the one piece of "memory" this
  // panel should carry forward — suggestions and the page list below are
  // phrased around it instead of a generic, unrelated example.
  const subject = job?.company || job?.input_text || 'this site'

  const pages = useMemo(() => {
    const flows = job?.flow_evaluations ? Object.values(job.flow_evaluations) : []
    if (flows.length) {
      return flows.map((f) => ({
        id: f.flow_id,
        label: f.flow_name,
        done: Object.values(f.devices || {}).some((d) => d.status === 'completed'),
      }))
    }
    return evaluatedPages.map((p) => ({ id: p.id, label: p.label, done: p.checked }))
  }, [job])

  const suggestions = useMemo(
    () => [
      `Give me a heuristic evaluation for ${subject}`,
      `Quick UX review of ${subject}'s key pages`,
      `Generate the attention heatmap for ${subject}'s home page`,
    ],
    [subject],
  )

  const send = async () => {
    const text = prompt.trim()
    if (!text || sending) return
    setSendError('')

    // Without an active job/observation there's nothing in the center panel
    // to edit yet — keep the prompt as a plain suggestion instead of failing.
    if (!job?.job_id || !activeObservation) {
      setMessages((m) => [...m, { role: 'user', text }])
      setPrompt('')
      return
    }

    setMessages((m) => [...m, { role: 'user', text }])
    setPrompt('')
    setSending(true)
    try {
      const result = await assistantEdit(job.job_id, {
        instruction: text,
        observation: activeObservation.observation,
        recommendation: activeObservation.recommendation,
      })
      applyAssistantEdit(result)
      setMessages((m) => [...m, { role: 'assistant', text: result.reply || 'Updated the center panel.' }])
    } catch (err) {
      setSendError(err.message)
      setMessages((m) => [...m, { role: 'assistant', text: `Couldn't apply that: ${err.message}` }])
    } finally {
      setSending(false)
    }
  }

  const triggerUpload = () => {
    if (!uploadingImage) fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = '' // allow re-picking the same file(s) later
    if (!files.length) return

    if (!job?.job_id) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: 'Start an analysis first, then I can add an uploaded image as a flow.' },
      ])
      return
    }

    // Each image is added as a new flow on the SAME job — it shows up in the
    // sidebar's User Flows list and renders through the same center panel,
    // never as a separate "Uploaded Image" view.
    for (const file of files) {
      setMessages((m) => [...m, { role: 'user', text: `Uploaded "${file.name}" for evaluation` }])
      try {
        await addImageToJob(file)
        setMessages((m) => [
          ...m,
          { role: 'assistant', text: `Added "${file.name}" as a new flow — see it in User Flows on the left.` },
        ])
      } catch (err) {
        setMessages((m) => [...m, { role: 'assistant', text: `Couldn't evaluate that image: ${err.message}` }])
      }
    }
  }

  return (
    <aside className="right-panel">
      <button className="rp-header" onClick={() => setOpen((o) => !o)}>
        <span>Pages/Images Evaluated</span>
        {open ? <ChevronUp /> : <ChevronDown />}
      </button>

      {open && (
        <ul className="rp-list">
          {pages.map((p) => (
            <li key={p.id} className="rp-check">
              {p.done ? <CheckIcon size={15} color="#1f9d55" /> : <span style={{ width: 15 }} />}
              <span>{p.label}</span>
            </li>
          ))}
        </ul>
      )}

      {messages.length > 0 && (
        <div className="rp-chat">
          {messages.map((m, i) => (
            <div key={i} className={'rp-chat-msg rp-chat-' + m.role}>
              {m.text}
            </div>
          ))}
        </div>
      )}

      <div className="rp-suggestions">
        <p className="rp-suggestions-title">Suggested prompts</p>
        {suggestions.map((s, i) => (
          <button
            key={i}
            className="rp-chip"
            onClick={() => setPrompt(s)}
            title="Use this prompt"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="rp-promptbox">
        <div className="rp-input-row">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button
            className="rp-upload-btn"
            title="Upload an image to evaluate"
            aria-label="Upload image"
            onClick={triggerUpload}
            disabled={uploadingImage}
          >
            <PaperclipIcon size={15} color={uploadingImage ? '#bbb' : '#666'} />
          </button>
          <textarea
            className="rp-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={
              activeObservation
                ? `Ask me to change this observation or recommendation…`
                : `Ask anything about ${subject}…`
            }
            rows={1}
          />
          <button className="rp-send" title="Send" aria-label="Send" onClick={send} disabled={!prompt.trim() || sending}>
            <SendIcon size={15} color="#fff" />
          </button>
        </div>
        {sending && <p className="rp-sending">Applying your edit…</p>}
        {uploadingImage && <p className="rp-sending">Adding uploaded image as a flow…</p>}
      </div>
    </aside>
  )
}
