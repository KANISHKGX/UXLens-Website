"""
FastAPI application — UX Attention & Market Intelligence Agent (Intel backend)

A separate backend from ../backend. Implements the full original spec:
company/URL resolution, competitor discovery, branding extraction, business
category classification, user-flow discovery, multi-device heuristic
evaluation, and the Overall Summary aggregate. Uses OpenAI/ChatGPT only.

Run with: uvicorn main:app --reload --port 8100
"""

import uuid
from pathlib import Path
from fastapi import FastAPI, BackgroundTasks, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from config import settings
from models import (
    AnalyzeRequest,
    AnalyzeResponse,
    AssistantEditRequest,
    AssistantEditResponse,
    JobStatus,
    IntelligenceJob,
    MainPage,
    UserFlow,
    FlowEvaluation,
    DeviceEvaluation,
    StepStatus,
    BusinessCategoryResult,
)
from pipeline import create_job, get_job, list_jobs, run_pipeline
from services import assistant, vision, storage, intel
from services.aggregate import build_overall_summary

settings.ensure_dirs()

app = FastAPI(
    title="UX Intelligence Agent (Intel Backend)",
    description="Company-name-only autonomous UX & market intelligence pipeline (OpenAI)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

import os
os.makedirs(settings.screenshots_dir, exist_ok=True)
os.makedirs(settings.heatmaps_dir, exist_ok=True)
app.mount("/screenshots", StaticFiles(directory=settings.screenshots_dir), name="screenshots")
app.mount("/heatmaps", StaticFiles(directory=settings.heatmaps_dir), name="heatmaps")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "UX Intelligence Agent (Intel Backend)", "version": "1.0.0"}


@app.post("/analyze", response_model=AnalyzeResponse, status_code=202)
async def start_analysis(request: AnalyzeRequest, background_tasks: BackgroundTasks):
    """
    Kick off the full pipeline from just a company name OR a URL.
    Poll /jobs/{job_id} for progress, and /jobs/{job_id}/overall-summary once complete.
    """
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured. Add it to .env.")

    job = create_job(request.input.strip())
    background_tasks.add_task(run_pipeline, job.job_id, request.devices, request.max_flows)

    return AnalyzeResponse(
        job_id=job.job_id,
        status=JobStatus.PENDING,
        message=f"Analysis started for '{request.input}'.",
    )


@app.get("/jobs/{job_id}", response_model=IntelligenceJob)
async def get_job_status(job_id: str):
    """Poll for full job status: company intel, branding, category, flows, evaluations, overall summary."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    return job


@app.get("/jobs")
async def list_all_jobs():
    jobs = list_jobs()
    return {
        "total": len(jobs),
        "jobs": [
            {"job_id": j.job_id, "input": j.input_text, "company": j.company, "status": j.status}
            for j in reversed(jobs)
        ],
    }


@app.get("/jobs/{job_id}/overall-summary")
async def get_overall_summary(job_id: str):
    """Dedicated endpoint for the frontend's Overall Summary page."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if not job.overall_summary:
        raise HTTPException(status_code=425, detail=f"Job is still {job.status.value} — overall summary not ready.")
    return job.overall_summary


@app.post("/jobs/{job_id}/assistant", response_model=AssistantEditResponse)
async def assistant_edit(job_id: str, request: AssistantEditRequest):
    """Right-panel chat prompt: apply a free-text instruction to whichever
    observation/recommendation the user currently has open in the center
    panel, and return the revised text so the UI can update in place."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured. Add it to .env.")
    try:
        result = await assistant.apply_edit(
            observation=request.observation,
            recommendation=request.recommendation,
            instruction=request.instruction,
        )
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return AssistantEditResponse(**result)


async def _attach_image_flow(job: IntelligenceJob, index: int, filename: str | None, image_bytes: bytes) -> None:
    """Evaluate one uploaded screenshot with the same GPT-4o Vision heuristic
    pipeline used for a discovered page, then append it to `job` as a real
    UserFlow + FlowEvaluation — identical in shape to a flow the crawler
    would have discovered, so the frontend renders it through the exact same
    sidebar/center-panel/Overall-Summary code path as a normal URL analysis."""
    result = await vision.evaluate(image_bytes, "desktop")

    flow_id = f"upload-{uuid.uuid4().hex[:8]}"
    label = (filename or f"Uploaded Page {index + 1}").rsplit(".", 1)[0] or f"Uploaded Page {index + 1}"
    saved_path = storage.upload_image(image_bytes, f"{job.job_id}_{flow_id}_desktop_screenshot.jpg")

    main_page = MainPage(key=flow_id, label=label, path="", url="")
    user_flow = UserFlow(id=flow_id, name=label, main_page=main_page)
    device_eval = DeviceEvaluation(
        device="desktop",
        status=StepStatus.COMPLETED,
        screenshot_path=saved_path,
        overall_score=result["overall_score"],
        category_scores=result["category_scores"],
        findings=result["findings"],
        visual_quality=result.get("visual_quality"),
    )
    flow_eval = FlowEvaluation(flow_id=flow_id, flow_name=label, main_page=main_page, devices={"desktop": device_eval})

    job.user_flows.append(user_flow)
    job.flow_evaluations[flow_id] = flow_eval


@app.post("/analyze-images", response_model=IntelligenceJob)
async def analyze_uploaded_images(files: list[UploadFile] = File(...)):
    """Home page's "Add Files" button: build a complete job — same shape and
    same Overall Summary / per-flow Observation+Recommendation report as a
    normal company/URL analysis — directly from 1-5 uploaded screenshots,
    one flow per image, instead of crawling the top-5 pages."""
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured. Add it to .env.")
    if not files:
        raise HTTPException(status_code=400, detail="Upload at least one image.")

    names = ", ".join(f.filename or "image" for f in files)
    job = create_job(f"{len(files)} uploaded image(s): {names}")
    # UploadFile.read() can only be consumed once, and we need each image's
    # bytes twice: once to identify the real company/category, once to run
    # the per-flow heuristic evaluation. Read everything upfront.
    file_bytes_list = [await f.read() for f in files]

    # No company/URL was resolved for an image-only job — instead of a
    # generic "Uploaded Images" placeholder, look at the first screenshot's
    # logo/branding/content to identify the real company (e.g. "Amazon") and
    # business category (e.g. "Ecommerce") so the report header matches what
    # a normal company/URL analysis would show.
    job.company = "Uploaded Images" if len(files) > 1 else "Uploaded Image"
    try:
        identity = await intel.identify_from_screenshot(file_bytes_list[0])
        job.company = identity["company_name"]
        job.business_category = BusinessCategoryResult(
            category=identity["category"],
            confidence=identity["confidence"],
            rationale=identity["rationale"],
        )
    except Exception as exc:  # noqa: BLE001 - identification is best-effort
        print(f"[main] identify_from_screenshot failed: {exc} — keeping placeholder label")

    job.status = JobStatus.RUNNING
    try:
        for i, image_bytes in enumerate(file_bytes_list):
            await _attach_image_flow(job, i, files[i].filename, image_bytes)
    except Exception as exc:  # noqa: BLE001 - surface vision/LLM errors to the UI
        job.status = JobStatus.FAILED
        job.error = str(exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    job.status = JobStatus.COMPLETED
    job.overall_summary = build_overall_summary(job)
    return job


@app.post("/jobs/{job_id}/add-image-flow", response_model=IntelligenceJob)
async def add_image_flow(job_id: str, file: UploadFile = File(...)):
    """Right-panel chat's '+' upload button: add an uploaded screenshot as
    another flow on the CURRENT job, so it shows up in the same sidebar and
    center panel as every other flow instead of opening a separate
    'Uploaded Image' view."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured. Add it to .env.")

    image_bytes = await file.read()
    # If this job has no real identified company yet (e.g. it started as a
    # generic image-only job, or is its very first flow), use this
    # screenshot to identify the real company/category too.
    if job.company in ("", "Uploaded Images", "Uploaded Image") or not job.business_category:
        try:
            identity = await intel.identify_from_screenshot(image_bytes)
            job.company = identity["company_name"]
            job.business_category = BusinessCategoryResult(
                category=identity["category"],
                confidence=identity["confidence"],
                rationale=identity["rationale"],
            )
        except Exception as exc:  # noqa: BLE001 - identification is best-effort
            print(f"[main] identify_from_screenshot failed: {exc} — keeping existing label")

    try:
        await _attach_image_flow(job, len(job.user_flows), file.filename, image_bytes)
    except Exception as exc:  # noqa: BLE001 - surface vision/LLM errors to the UI
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    job.status = JobStatus.COMPLETED
    job.overall_summary = build_overall_summary(job)
    return job


@app.get("/jobs/{job_id}/flows/{flow_id}/{device}/screenshot")
async def download_flow_screenshot(job_id: str, flow_id: str, device: str):
    """Download a specific flow's screenshot for a given device."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    flow_eval = job.flow_evaluations.get(flow_id)
    if not flow_eval:
        raise HTTPException(status_code=404, detail=f"Flow '{flow_id}' not found.")
    dev_eval = flow_eval.devices.get(device)
    if not dev_eval or not dev_eval.screenshot_path:
        raise HTTPException(status_code=404, detail="Screenshot not available.")
    path = Path(dev_eval.screenshot_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Screenshot file not found on disk.")
    return FileResponse(str(path), media_type="image/jpeg",
                         filename=f"{job.company}_{flow_id}_{device}.jpg")
