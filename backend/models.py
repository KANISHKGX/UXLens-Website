"""
Data models for the UX Attention & Market Intelligence Agent (separate backend).

Mirrors the conventions of the existing ../backend (pydantic, enum-based status),
but extends the shape to cover: company/competitor intel, brand identity (logo +
colors), business category classification, multi-device heuristic evaluation per
user flow, and the Overall Summary aggregate.
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


# ── Shared enums ────────────────────────────────────────────────────────────────

class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class StepStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class Device(str, Enum):
    DESKTOP = "desktop"
    TABLET = "tablet"
    MOBILE = "mobile"


DEVICE_VIEWPORTS: dict[str, tuple[int, int]] = {
    Device.DESKTOP.value: (1280, 800),
    Device.TABLET.value: (768, 1024),
    Device.MOBILE.value: (390, 844),
}

# Fixed 4.1–4.8 heuristic categories (matches the website_OC frontend's CATEGORY_ORDER)
HEURISTIC_CATEGORIES = [
    "Home Page Effectiveness",   # 4.1
    "Search",                    # 4.2
    "Forms & Data Entry",        # 4.3
    "Navigation & IA",           # 4.4
    "Help, Feedback & Error Tolerance",  # 4.5
    "Page Layout & Visual Design",       # 4.6
    "Writing & Content Quality",         # 4.7
    "Task Orientation",                  # 4.8
]

BUSINESS_CATEGORIES = [
    "Ecommerce", "Hospitality", "Insurance", "Banking", "Healthcare",
    "SaaS", "Education", "Travel", "Media & Entertainment", "Real Estate",
    "Government", "Other",
]


# ── Step 1: company + competitors ───────────────────────────────────────────────

class Competitor(BaseModel):
    name: str
    domain: str = ""
    reason: str = ""


class CompanyIntel(BaseModel):
    company_name: str
    domain: str
    competitors: list[Competitor] = Field(default_factory=list)


# ── Step 2: branding (logo + colors) ────────────────────────────────────────────

class BrandIdentity(BaseModel):
    logo_url: str = ""
    logo_description: str = ""
    primary_color: str = "#000000"
    secondary_color: str = "#ffffff"
    palette: list[str] = Field(default_factory=list)


# ── Step 3: business category ───────────────────────────────────────────────────

class BusinessCategoryResult(BaseModel):
    category: str
    confidence: float = 0.0
    rationale: str = ""


# ── Step 4: user flows + main pages ─────────────────────────────────────────────

class MainPage(BaseModel):
    key: str
    label: str
    path: str
    url: str = ""


class UserFlow(BaseModel):
    id: str
    name: str
    main_page: MainPage


# ── Heuristic evaluation (per main page, per device) ────────────────────────────

class CategoryScore(BaseModel):
    category: str
    score: int = Field(..., ge=0, le=100)
    findings: list[str] = Field(default_factory=list)


class Finding(BaseModel):
    category: str
    severity: str = "Medium"       # Low | Medium | High
    principle: str = ""
    observation: str = ""
    recommendation: str = ""


class VisualQuality(BaseModel):
    """Attention Insight page's left-panel sub-metrics — distinct from the
    4.1-4.8 heuristic categories above. Scored directly by GPT-4o Vision from
    the screenshot (0-100, higher is better)."""
    text_readability: int = 0
    focus: int = 0
    spacing: int = 0
    image_clarity: int = 0
    accessibility: int = 0
    contrast: int = 0


class DeviceEvaluation(BaseModel):
    device: str
    status: StepStatus = StepStatus.PENDING
    screenshot_path: str = ""
    overall_score: int = 0
    category_scores: list[CategoryScore] = Field(default_factory=list)
    findings: list[Finding] = Field(default_factory=list)
    visual_quality: Optional[VisualQuality] = None
    error: Optional[str] = None


class FlowEvaluation(BaseModel):
    flow_id: str
    flow_name: str
    main_page: MainPage
    devices: dict[str, DeviceEvaluation] = Field(default_factory=dict)


# ── Overall Summary aggregate ────────────────────────────────────────────────────

class FlowCategoryBreakdown(BaseModel):
    flow_id: str
    flow_name: str
    categories: list[CategoryScore] = Field(default_factory=list)
    flow_score: int = 0


class CriticalIssue(BaseModel):
    flow_name: str
    category: str
    severity: str
    observation: str
    recommendation: str


class OverallSummary(BaseModel):
    overall_score: int = 0
    grade: str = ""
    total_findings: int = 0
    by_severity: dict[str, int] = Field(default_factory=dict)
    by_flow: list[FlowCategoryBreakdown] = Field(default_factory=list)
    by_category: list[CategoryScore] = Field(default_factory=list)
    top_critical_issues: list[CriticalIssue] = Field(default_factory=list)


# ── Top-level job ────────────────────────────────────────────────────────────────

class IntelligenceJob(BaseModel):
    job_id: str
    input_text: str                 # raw user input — URL or company name
    company: str = ""
    base_url: str = ""
    status: JobStatus = JobStatus.PENDING
    error: Optional[str] = None

    company_intel: Optional[CompanyIntel] = None
    branding: Optional[BrandIdentity] = None
    business_category: Optional[BusinessCategoryResult] = None

    user_flows: list[UserFlow] = Field(default_factory=list)
    flow_evaluations: dict[str, FlowEvaluation] = Field(default_factory=dict)  # keyed by flow_id

    overall_summary: Optional[OverallSummary] = None

    step_status: dict[str, str] = Field(default_factory=dict)  # progress markers for polling UI


class AnalyzeRequest(BaseModel):
    input: str = Field(..., min_length=1, description="Company name OR full URL")
    devices: list[str] | None = Field(default=None, description="Subset of desktop/tablet/mobile. None = all 3.")
    max_flows: int = Field(default=5, ge=1, le=5)


class AnalyzeResponse(BaseModel):
    job_id: str
    status: JobStatus
    message: str


class AssistantEditRequest(BaseModel):
    """Right-panel chat prompt applied to whichever observation is currently
    open in the center panel."""
    instruction: str = Field(..., min_length=1)
    observation: list[str] = Field(default_factory=list)
    recommendation: list[str] = Field(default_factory=list)


class AssistantEditResponse(BaseModel):
    observation: list[str]
    recommendation: list[str]
    reply: str
