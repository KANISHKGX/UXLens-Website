import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { addImageFlow, analyze, analyzeImages, extractUrl, getJob } from '../api.js'

const JobContext = createContext(null)

// Terminal job states — stop polling once reached.
const TERMINAL = new Set(['completed', 'failed'])

export function JobProvider({ children }) {
  const [jobId, setJobId] = useState(null)
  const [job, setJob] = useState(null)
  const [phase, setPhase] = useState('idle') // idle | starting | polling | completed | failed
  const [error, setError] = useState('')
  const pollRef = useRef(null)

  const [activeObservation, setActiveObservation] = useState(null)
  const editHandlerRef = useRef(null)

  const registerEditHandler = useCallback((fn) => {
    editHandlerRef.current = fn
  }, [])

  const applyAssistantEdit = useCallback((result) => {
    if (editHandlerRef.current) editHandlerRef.current(result)
  }, [])

  const [uploadingImage, setUploadingImage] = useState(false)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const pollOnce = useCallback(async (id) => {
    try {
      const data = await getJob(id)
      setJob(data)
      if (TERMINAL.has(data.status)) {
        setPhase(data.status)
        stopPolling()
      }
    } catch (err) {
      setError(err.message)
      setPhase('failed')
      stopPolling()
    }
  }, [stopPolling])

  useEffect(() => stopPolling, [stopPolling])

  const startAnalysis = useCallback(async (promptText, options = {}) => {
    setError('')
    setJob(null)
    setJobId(null)
    stopPolling()

    const url = extractUrl(promptText)
    const input = url || (promptText || '').trim()
    if (!input) {
      setError('Enter a company name or a full https:// URL to analyze.')
      setPhase('failed')
      return null
    }

    try {
      setPhase('starting')
      const res = await analyze({
        input,
        devices: options.devices,
        maxFlows: options.maxFlows,
      })

      setJobId(res.job_id)
      setPhase('polling')
      pollRef.current = setInterval(() => pollOnce(res.job_id), 3000)
      pollOnce(res.job_id)
      return { jobId: res.job_id, input }
    } catch (err) {
      setError(err.message)
      setPhase('failed')
      return null
    }
  }, [pollOnce, stopPolling])

  // Home page's "Add Files" button: multiple uploaded screenshots become a
  // full job — one flow per image — with the SAME Overall Summary / per-flow
  // observation+recommendation report shape as a normal URL/company
  // analysis, instead of a separate ad-hoc view.
  const analyzeFromImages = useCallback(async (files) => {
    setError('')
    setJob(null)
    setJobId(null)
    stopPolling()

    if (!files || !files.length) {
      setError('Choose at least one image to upload.')
      setPhase('failed')
      return null
    }

    setUploadingImage(true)
    try {
      const result = await analyzeImages(files)
      setJobId(result.job_id)
      setJob(result)
      setPhase(result.status || 'completed')
      return result
    } catch (err) {
      setError(err.message)
      setPhase('failed')
      return null
    } finally {
      setUploadingImage(false)
    }
  }, [stopPolling])

  // Right-panel chat's "+" upload button: add an uploaded screenshot as
  // another flow on the CURRENT job, so it lands in the same sidebar/center
  // panel as every other flow instead of opening a separate view.
  const addImageToJob = useCallback(async (file) => {
    if (!jobId) return null
    setUploadingImage(true)
    try {
      const result = await addImageFlow(jobId, file)
      setJob(result)
      setPhase(result.status || 'completed')
      return result
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setUploadingImage(false)
    }
  }, [jobId])

  const value = {
    jobId,
    job,
    phase,
    error,
    startAnalysis,
    analyzeFromImages,
    addImageToJob,
    activeObservation,
    setActiveObservation,
    registerEditHandler,
    applyAssistantEdit,
    uploadingImage,
    setUploadingImage,
  }
  return <JobContext.Provider value={value}>{children}</JobContext.Provider>
}

export function useJob() {
  const ctx = useContext(JobContext)
  if (!ctx) throw new Error('useJob must be used within a JobProvider')
  return ctx
}
