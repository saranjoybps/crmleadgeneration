from fastapi import APIRouter, Depends, HTTPException
import requests

from app.core.auth import get_authenticated_user_id
from app.schemas.lead_fetch import ApproveLeadsRequest, ApproveLeadsResponse, FetchLeadsRequest, FetchLeadsResponse
from app.services.lead_service import fetch_leads_preview, store_selected_leads


router = APIRouter(tags=["leads"])


@router.post("/fetch-leads", response_model=FetchLeadsResponse)
def fetch_leads(payload: FetchLeadsRequest, user_id: str = Depends(get_authenticated_user_id)) -> FetchLeadsResponse:
    try:
        leads = fetch_leads_preview(payload, user_id=user_id)
        return FetchLeadsResponse(leads_found=len(leads), leads=leads)
    except requests.HTTPError as error:
        detail = ""
        if error.response is not None:
            detail = error.response.text
        raise HTTPException(status_code=502, detail=f"Apify request failed. {detail}".strip()) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@router.post("/approve-leads", response_model=ApproveLeadsResponse)
def approve_leads(payload: ApproveLeadsRequest, user_id: str = Depends(get_authenticated_user_id)) -> ApproveLeadsResponse:
    try:
        campaign_id, leads_inserted = store_selected_leads(payload, user_id=user_id)
        return ApproveLeadsResponse(campaign_id=campaign_id, leads_inserted=leads_inserted)
    except requests.HTTPError as error:
        detail = ""
        if error.response is not None:
            detail = error.response.text
        raise HTTPException(status_code=502, detail=f"Apify request failed. {detail}".strip()) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
