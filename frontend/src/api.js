// ---------------------------------------------------------------------------
// UX Lens — backend API client
// Talks to the local UX Intelligence Agent (Intel) backend — OpenAI-only,
// company/URL -> competitors -> branding -> business category -> user flows
// -> multi-device heuristic evaluation -> overall summary. No mock data here;
// every call hits the real API at backend/main.py.
// ---------------------------------------------------------------------------

// In production (Vercel/Netlify), set VITE_API_BASE to the deployed Railway
// backend URL, e.g. https://your-app.up.railway.app — no trailing slash.
// Falls back to localhost for local dev with no env file.
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8100'

async function jsonOrThrow(res) {
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail || JSON.stringify(body)
    } catch (_) {
      /* ignore parse errors */
    }
    throw new Error(`${res.status} ${detail}`)
  }
  return res.json()
}

/** Pull the first http(s) URL out of a free-form prompt string. */
export function extractUrl(text) {
  const match = (text || '').match(/https?:\/\/[^\s,]+/i)
  return match ? match[0].replace(/[).,]+$/, '') : ''
}

/** Best-effort company slug from a URL, e.g. https://www.usbank.com -> usbank */
export function companyFromUrl(url) {
  try {
    const hostname = new URL(url).hostname
    return hostname.replace(/^www\./, '').split('.')[0]
  } catch (_) {
    return 'unknown'
  }
}

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) })
  return jsonOrThrow(res)
}

/**
 * Kick off the full pipeline from a company name OR a URL.
 * devices: subset of ['desktop','tablet','mobile'] or null for all three.
 * maxFlows: 1-5, how many user flows to evaluate.
 */
export async function analyze({ input, devices, maxFlows } = {}) {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input,
      devices: devices && devices.length ? devices : null,
      max_flows: maxFlows || 5,
    }),
  })
  return jsonOrThrow(res)
}

/** Poll for full job status: company intel, branding, category, flows, evaluations, overall summary. */
export async function getJob(jobId) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`)
  return jsonOrThrow(res)
}

/** Dedicated endpoint for the Overall Summary page (also embedded in getJob's response once ready). */
export async function getOverallSummary(jobId) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/overall-summary`)
  return jsonOrThrow(res)
}

/** Screenshot for a given flow + device (desktop | tablet | mobile). */
export function screenshotUrl(jobId, flowId, device) {
  return `${API_BASE}/jobs/${jobId}/flows/${flowId}/${device}/screenshot`
}

/**
 * Right-panel chat prompt: apply a free-text instruction to whichever
 * observation/recommendation is currently open in the center panel.
 * Returns { observation, recommendation, reply }.
 */
export async function assistantEdit(jobId, { instruction, observation, recommendation }) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instruction, observation, recommendation }),
  })
  return jsonOrThrow(res)
}

/**
 * Home page's "Add Files" button: build a full IntelligenceJob — same shape
 * as a company/URL analysis (Overall Summary, per-flow observations and
 * recommendations) — directly from 1-N uploaded screenshots, one flow per
 * image, instead of crawling the top-5 pages. Runs synchronously and
 * returns the completed job.
 */
export async function analyzeImages(files) {
  const form = new FormData()
  for (const file of files) form.append('files', file)
  const res = await fetch(`${API_BASE}/analyze-images`, {
    method: 'POST',
    body: form,
  })
  return jsonOrThrow(res)
}

/**
 * Right-panel "+" upload button: add an uploaded screenshot as another flow
 * on the CURRENT job, so it appears in the same sidebar/center panel as
 * every other flow instead of opening a separate view. Returns the updated
 * full IntelligenceJob.
 */
export async function addImageFlow(jobId, file) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/jobs/${jobId}/add-image-flow`, {
    method: 'POST',
    body: form,
  })
  return jsonOrThrow(res)
}
