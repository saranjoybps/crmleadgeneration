from pydantic import BaseModel, Field


class LeadPreview(BaseModel):
    name: str = Field(..., min_length=1)
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    source: str = Field(..., min_length=1)
    raw_data: dict = Field(default_factory=dict)


class FetchLeadsRequest(BaseModel):
    organization_id: str = Field(..., min_length=1)
    campaign_name: str = Field(..., min_length=1)
    industries: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)
    location: str = ""
    keywords: str = ""
    leads_count: int = Field(default=10, ge=1, le=500)


class FetchLeadsResponse(BaseModel):
    leads_found: int
    leads: list[LeadPreview] = Field(default_factory=list)


class ApproveLeadsRequest(BaseModel):
    organization_id: str = Field(..., min_length=1)
    campaign_name: str = Field(..., min_length=1)
    industries: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)
    location: str = ""
    selected_leads: list[LeadPreview] = Field(default_factory=list)


class ApproveLeadsResponse(BaseModel):
    campaign_id: str
    leads_inserted: int
