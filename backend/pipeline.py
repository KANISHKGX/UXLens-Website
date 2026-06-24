"""
Pipeline orchestrator for the UX Attention & Market Intelligence Agent.

Full flow (spec Section 1):
  input (URL or company name)
    -> resolve URL / company
    -> capture homepage screenshot (desktop)
    -> [parallel] company+competitors, branding (logo+colors), business category
    -> discover top 5 user flows + main pages
    -> for each flow's main page, for each device (desktop/tablet/mobile):
         capture screenshot -> GPT-4o vision heuristic evaluation
    -> aggregate Overall Summary (score, category-by-flow, top 5 critical issues)

In-memory job store, same pattern as ../backend/pipeline.py, kept independent
so this backend can run and deploy on its own.
"""

import uuid
import asyncio

from models import (
    IntelligenceJob, JobStatus, StepStatus, Device,
    UserFlow, FlowEvaluation, DeviceEvaluation,
)
from services.screenshot import resolve_input_to_url, capture_device, save_screenshot
from services.intel import get_company_intel, classify_business_category
from services.branding import extract_branding
from services.flows import discover_user_flows
from services.vision import evaluate as vision_evaluate
from services.aggregate import build_overall_summary

_jobs: dict[str, IntelligenceJob] = {}

DEFAULT_DEVICES = [Device.DESKTOP.value, Device.TABLET.value, Device.MOBILE.value]

# A job can fire up to len(flows) * len(devices) (~15) concurrent
# capture_device() + vision_evaluate() pairs via the nested asyncio.gather
# calls below. That's fine on a dev machine with plenty of sockets/file
# descriptors, but on Railway's smaller container it was exhausting
# resources mid-run and surfacing as OpenAI APIConnectionError ("Connection
# error.") on most flow/device pairs at once. Capping concurrency keeps the
# exact same screenshot + vision logic/output — it only changes how many
# run at the same instant — so this doesn't deviate from local behavior,
# it just keeps Railway from falling over under full parallelism.
_DEVICE_CONCURRENCY = asyncio.Semaphore(4)


def create_job(input_text: str) -> IntelligenceJob:
    job_id = str(uuid.uuid4())
    job = IntelligenceJob(job_id=job_id, input_text=input_text)
    _jobs[job_id] = job
    print(f"[{job_id[:8]}] Intelligence job created — input='{input_text}'")
    return job


def get_job(job_id: str) -> IntelligenceJob | None:
    return _jobs.get(job_id)


def list_jobs() -> list[IntelligenceJob]:
    return list(_jobs.values())


def _mark(job: IntelligenceJob, step: str, status: str) -> None:
    job.step_status[step] = status


async def run_pipeline(job_id: str, devices: list[str] | None = None, max_flows: int = 5) -> None:
    job = _jobs.get(job_id)
    if not job:
        return

    devices = devices or DEFAULT_DEVICES
    job.status = JobStatus.RUNNING

    try:
        # ── Resolve input -> base_url + company slug ──────────────────────────
        _mark(job, "resolve", StepStatus.RUNNING.value)
        base_url, company_slug = resolve_input_to_url(job.input_text)
        job.base_url = base_url
        job.company = company_slug
        _mark(job, "resolve", StepStatus.COMPLETED.value)
        print(f"[{job_id[:8]}] Resolved '{job.input_text}' -> {base_url}")

        # ── Capture homepage screenshot (desktop) for branding/category/intel ──
        _mark(job, "homepage_capture", StepStatus.RUNNING.value)
        homepage_bytes = await capture_device(base_url, Device.DESKTOP.value)
        save_screenshot(homepage_bytes, f"{job_id}_homepage_raw.jpg")
        _mark(job, "homepage_capture", StepStatus.COMPLETED.value)

        # ── Steps 1-3 in parallel: company intel, branding, business category ──
        _mark(job, "company_competitors", StepStatus.RUNNING.value)
        _mark(job, "branding", StepStatus.RUNNING.value)

        company_intel = await get_company_intel(base_url, company_slug)
        job.company_intel = company_intel
        _mark(job, "company_competitors", StepStatus.COMPLETED.value)

        branding_task = extract_branding(homepage_bytes, job_id=job_id)
        category_task = classify_business_category(company_intel.company_name, company_intel.domain)
        branding, business_category = await asyncio.gather(branding_task, category_task)

        job.branding = branding
        _mark(job, "branding", StepStatus.COMPLETED.value)

        job.business_category = business_category
        _mark(job, "business_category", StepStatus.COMPLETED.value)
        print(f"[{job_id[:8]}] Company={company_intel.company_name} Category={business_category.category}")

        # ── Step 4a: discover top user flows + main pages ─────────────────────
        _mark(job, "user_flows", StepStatus.RUNNING.value)
        user_flows = await discover_user_flows(base_url, business_category.category, max_flows=max_flows)
        job.user_flows = user_flows
        _mark(job, "user_flows", StepStatus.COMPLETED.value)
        print(f"[{job_id[:8]}] Discovered {len(user_flows)} user flows")

        # ── Step 4b: heuristic evaluation per flow per device, in parallel ────
        _mark(job, "heuristic_evaluation", StepStatus.RUNNING.value)
        await asyncio.gather(
            *[_run_flow(job_id, flow, devices) for flow in user_flows],
            return_exceptions=True,
        )
        _mark(job, "heuristic_evaluation", StepStatus.COMPLETED.value)

        # ── Aggregate Overall Summary ──────────────────────────────────────────
        _mark(job, "overall_summary", StepStatus.RUNNING.value)
        job.overall_summary = build_overall_summary(job)
        _mark(job, "overall_summary", StepStatus.COMPLETED.value)

        job.status = JobStatus.COMPLETED
        print(f"[{job_id[:8]}] Pipeline complete — overall score "
              f"{job.overall_summary.overall_score if job.overall_summary else 'n/a'}")

    except Exception as exc:
        job.status = JobStatus.FAILED
        job.error = str(exc)
        print(f"[{job_id[:8]}] Pipeline FAILED: {exc}")


async def _run_flow(job_id: str, flow: UserFlow, devices: list[str]) -> None:
    job = _jobs[job_id]
    flow_eval = FlowEvaluation(flow_id=flow.id, flow_name=flow.name, main_page=flow.main_page)
    job.flow_evaluations[flow.id] = flow_eval

    await asyncio.gather(
        *[_run_device(job_id, flow, device) for device in devices],
        return_exceptions=True,
    )


async def _run_device(job_id: str, flow: UserFlow, device: str) -> None:
    job = _jobs[job_id]
    flow_eval = job.flow_evaluations[flow.id]
    dev_eval = DeviceEvaluation(device=device, status=StepStatus.RUNNING)
    flow_eval.devices[device] = dev_eval

    try:
        async with _DEVICE_CONCURRENCY:
            url = flow.main_page.url or job.base_url
            print(f"[{job_id[:8]}] [{flow.id}] [{device}] Capturing {url}")
            img = await capture_device(url, device)
            dev_eval.screenshot_path = save_screenshot(img, f"{job_id}_{flow.main_page.key}_{device}_raw.jpg")

            print(f"[{job_id[:8]}] [{flow.id}] [{device}] Vision heuristic evaluation...")
            result = await vision_evaluate(img, device)
            dev_eval.overall_score = result["overall_score"]
            dev_eval.category_scores = result["category_scores"]
            dev_eval.findings = result["findings"]
            dev_eval.visual_quality = result.get("visual_quality")
            dev_eval.status = StepStatus.COMPLETED
            print(f"[{job_id[:8]}] [{flow.id}] [{device}] Done — score {dev_eval.overall_score}")

    except Exception as exc:
        dev_eval.status = StepStatus.FAILED
        dev_eval.error = str(exc)
        print(f"[{job_id[:8]}] [{flow.id}] [{device}] FAILED: {exc}")
