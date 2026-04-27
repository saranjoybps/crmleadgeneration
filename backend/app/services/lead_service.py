from datetime import datetime, timezone
from typing import Any

from app.core.supabase_client import get_supabase_client
from app.schemas.lead_fetch import ApproveLeadsRequest, FetchLeadsRequest, LeadPreview
from app.services.apify_service import fetch_from_apify


def _to_nullable_string(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text if text else None


def normalize_google_maps(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": _to_nullable_string(item.get("title") or item.get("displayName") or item.get("name")) or "Unknown",
        "phone": _to_nullable_string(item.get("phone") or item.get("phoneUnformatted")),
        "email": _to_nullable_string(item.get("email")),
        "website": _to_nullable_string(item.get("website") or item.get("websiteUrl") or item.get("url")),
        "source": "google_maps",
        "raw_data": item,
    }


def normalize_instagram(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": _to_nullable_string(item.get("fullName") or item.get("username") or item.get("name")) or "Unknown",
        "phone": _to_nullable_string(item.get("businessPhoneNumber") or item.get("phone")),
        "email": _to_nullable_string(item.get("businessEmail") or item.get("email")),
        "website": _to_nullable_string(item.get("externalUrl") or item.get("website")),
        "source": "instagram",
        "raw_data": item,
    }


def normalize_leads(source: str, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for item in items:
        if source == "google_maps":
            normalized.append(normalize_google_maps(item))
        elif source == "instagram":
            normalized.append(normalize_instagram(item))
    return normalized


def dedupe_leads(leads: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[str, str]] = set()
    deduped: list[dict[str, Any]] = []
    for lead in leads:
        key = (
            (lead.get("name") or "").strip().lower(),
            (lead.get("phone") or "").strip().lower(),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(lead)
    return deduped


def assert_org_membership(*, user_id: str, organization_id: str) -> None:
    supabase = get_supabase_client()
    membership = (
        supabase.table("organization_members")
        .select("id")
        .eq("organization_id", organization_id)
        .eq("user_id", user_id)
        .eq("status", "active")
        .limit(1)
        .execute()
    )
    if not membership.data:
        raise RuntimeError("User does not have access to this organization.")


def fetch_leads_preview(payload: FetchLeadsRequest, *, user_id: str) -> list[dict[str, Any]]:
    assert_org_membership(user_id=user_id, organization_id=payload.organization_id)

    all_normalized: list[dict[str, Any]] = []
    for source in payload.sources:
        raw_items = fetch_from_apify(
            source,
            keywords=payload.keywords,
            location=payload.location,
            leads_count=payload.leads_count,
        )
        all_normalized.extend(normalize_leads(source, raw_items))

    return dedupe_leads(all_normalized)


def store_selected_leads(payload: ApproveLeadsRequest, *, user_id: str) -> tuple[str, int]:
    assert_org_membership(user_id=user_id, organization_id=payload.organization_id)

    if not payload.selected_leads:
        raise RuntimeError("Please select at least one lead before approval.")

    supabase = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()

    campaign_row = {
        "organization_id": payload.organization_id,
        "name": payload.campaign_name,
        "industries": payload.industries,
        "sources": payload.sources,
        "location": payload.location,
        "created_by": user_id,
        "created_at": now_iso,
    }

    campaign_result = supabase.table("campaigns").insert(campaign_row).execute()
    if not campaign_result.data:
        raise RuntimeError("Failed to create campaign.")

    campaign_id = campaign_result.data[0]["id"]
    selected_leads = [lead.model_dump() if isinstance(lead, LeadPreview) else lead for lead in payload.selected_leads]
    unique_leads = dedupe_leads(selected_leads)

    if unique_leads:
        leads_rows = [
            {
                "campaign_id": campaign_id,
                "name": lead["name"],
                "phone": lead.get("phone"),
                "email": lead.get("email"),
                "website": lead.get("website"),
                "source": lead["source"],
                "raw_data": lead.get("raw_data", {}),
                "created_at": now_iso,
            }
            for lead in unique_leads
        ]
        supabase.table("leads").insert(leads_rows).execute()

    return campaign_id, len(unique_leads)
