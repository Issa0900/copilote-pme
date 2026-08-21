from fastapi import APIRouter

from app.constants import OBJECTIVE_CHOICES, OBJECTIVE_LABELS, REVENUE_RANGE_CHOICES

router = APIRouter(prefix="/meta", tags=["meta"])


@router.get("/company-options")
def get_company_options():
    return {
        "objectives": [
            {"value": value, "label": OBJECTIVE_LABELS[value]}
            for value in OBJECTIVE_CHOICES
        ],
        "revenue_ranges": REVENUE_RANGE_CHOICES,
    }
