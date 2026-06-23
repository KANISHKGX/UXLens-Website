"""
Overall Summary aggregation (spec Section 2 / 7 "need to develop" gap).

Combines every FlowEvaluation's per-device DeviceEvaluation results into:
  - a single overall score
  - the 4.1-4.8 category scores broken down BY user flow (matches the
    website_OC frontend's `userFlows` mock shape exactly, so the frontend can
    swap mock -> live data with no shape changes)
  - the top 5 critical issues across all flows/devices, ranked by severity
"""

from models import (
    IntelligenceJob, OverallSummary, FlowCategoryBreakdown, CriticalIssue, CategoryScore,
    HEURISTIC_CATEGORIES,
)

SEVERITY_WEIGHT = {"High": 3, "Medium": 2, "Low": 1}


def _grade_for(score: int) -> str:
    if score >= 90:
        return "A"
    if score >= 80:
        return "B+"
    if score >= 70:
        return "B"
    if score >= 60:
        return "C+"
    if score >= 50:
        return "C"
    return "D"


def build_overall_summary(job: IntelligenceJob) -> OverallSummary:
    by_flow: list[FlowCategoryBreakdown] = []
    all_findings = []
    flow_scores = []

    for flow in job.user_flows:
        flow_eval = job.flow_evaluations.get(flow.id)
        if not flow_eval or not flow_eval.devices:
            continue

        # Average each category's score across the devices that completed.
        completed_devices = [d for d in flow_eval.devices.values() if d.status.value == "completed"]
        if not completed_devices:
            continue

        cat_totals: dict[str, list[int]] = {}
        for dev in completed_devices:
            for cs in dev.category_scores:
                cat_totals.setdefault(cs.category, []).append(cs.score)
            for f in dev.findings:
                all_findings.append((flow.name, f))

        categories = [
            CategoryScore(category=cat, score=round(sum(scores) / len(scores)))
            for cat, scores in cat_totals.items()
        ]
        flow_score = round(sum(c.score for c in categories) / len(categories)) if categories else 0
        flow_scores.append(flow_score)

        by_flow.append(FlowCategoryBreakdown(
            flow_id=flow.id,
            flow_name=flow.name,
            categories=categories,
            flow_score=flow_score,
        ))

    overall_score = round(sum(flow_scores) / len(flow_scores)) if flow_scores else 0

    # Aggregate category scores across ALL flows (not broken down per-flow) —
    # this drives the Overall Summary's standalone "Category Scores" bar chart.
    cat_agg: dict[str, list[int]] = {}
    for fb in by_flow:
        for c in fb.categories:
            cat_agg.setdefault(c.category, []).append(c.score)
    by_category = [
        CategoryScore(category=cat, score=round(sum(scores) / len(scores)))
        for cat, scores in cat_agg.items()
    ]
    by_category.sort(
        key=lambda c: HEURISTIC_CATEGORIES.index(c.category) if c.category in HEURISTIC_CATEGORIES else 99
    )

    by_severity = {"High": 0, "Medium": 0, "Low": 0}
    for _, f in all_findings:
        by_severity[f.severity] = by_severity.get(f.severity, 0) + 1

    ranked = sorted(all_findings, key=lambda pair: SEVERITY_WEIGHT.get(pair[1].severity, 0), reverse=True)
    top5 = [
        CriticalIssue(
            flow_name=flow_name,
            category=f.category,
            severity=f.severity,
            observation=f.observation,
            recommendation=f.recommendation,
        )
        for flow_name, f in ranked[:5]
    ]

    return OverallSummary(
        overall_score=overall_score,
        grade=_grade_for(overall_score),
        total_findings=len(all_findings),
        by_severity=by_severity,
        by_flow=by_flow,
        by_category=by_category,
        top_critical_issues=top5,
    )
