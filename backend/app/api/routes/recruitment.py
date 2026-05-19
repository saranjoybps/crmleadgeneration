from fastapi import APIRouter, Depends, Query

from app.api.utils import response
from app.core.deps import RequestContext, require_module_permission
from app.core.supabase_client import get_supabase_client
from app.schemas.recruitment import (
    CandidateCreate,
    CandidateUpdate,
    CandidateStatusChange,
    InterviewCreate,
    InterviewUpdate,
)
from app.services.recruitment import RecruitmentService

router = APIRouter(prefix="", tags=["recruitment"])


@router.get("/candidates")
def list_candidates(
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    position: str | None = Query(default=None),
    ctx: RequestContext = Depends(require_module_permission("recruitment", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    candidates = RecruitmentService.list_candidates(
        supabase, ctx, search=search, status=status, position=position
    )
    return response(candidates)


@router.post("/candidates")
def create_candidate(
    payload: CandidateCreate,
    ctx: RequestContext = Depends(require_module_permission("recruitment", "create")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    candidate = RecruitmentService.create_candidate(supabase, payload, ctx)
    return response(candidate)


@router.get("/candidates/{candidate_id}")
def get_candidate(
    candidate_id: str,
    ctx: RequestContext = Depends(require_module_permission("recruitment", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    candidate = RecruitmentService.get_candidate(supabase, candidate_id, ctx)
    return response(candidate)


@router.patch("/candidates/{candidate_id}")
def update_candidate(
    candidate_id: str,
    payload: CandidateUpdate,
    ctx: RequestContext = Depends(require_module_permission("recruitment", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    candidate = RecruitmentService.update_candidate(supabase, candidate_id, payload, ctx)
    return response(candidate)


@router.delete("/candidates/{candidate_id}")
def delete_candidate(
    candidate_id: str,
    ctx: RequestContext = Depends(require_module_permission("recruitment", "delete")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    candidate = RecruitmentService.delete_candidate(supabase, candidate_id, ctx)
    return response(candidate)


@router.patch("/candidates/{candidate_id}/status")
def change_candidate_status(
    candidate_id: str,
    payload: CandidateStatusChange,
    ctx: RequestContext = Depends(require_module_permission("recruitment", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    candidate = RecruitmentService.change_status(supabase, candidate_id, payload, ctx)
    return response(candidate)


@router.get("/candidates/{candidate_id}/status-log")
def get_status_log(
    candidate_id: str,
    ctx: RequestContext = Depends(require_module_permission("recruitment", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    log = RecruitmentService.get_status_log(supabase, candidate_id, ctx)
    return response(log)


@router.get("/candidates/{candidate_id}/interviews")
def list_interviews(
    candidate_id: str,
    ctx: RequestContext = Depends(require_module_permission("recruitment", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    interviews = RecruitmentService.list_interviews(supabase, candidate_id, ctx)
    return response(interviews)


@router.post("/candidates/{candidate_id}/interviews")
def create_interview(
    candidate_id: str,
    payload: InterviewCreate,
    ctx: RequestContext = Depends(require_module_permission("recruitment", "create")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    interview = RecruitmentService.create_interview(supabase, candidate_id, payload, ctx)
    return response(interview)


@router.patch("/interviews/{interview_id}")
def update_interview(
    interview_id: str,
    payload: InterviewUpdate,
    ctx: RequestContext = Depends(require_module_permission("recruitment", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    interview = RecruitmentService.update_interview(supabase, interview_id, payload, ctx)
    return response(interview)


@router.delete("/interviews/{interview_id}")
def delete_interview(
    interview_id: str,
    ctx: RequestContext = Depends(require_module_permission("recruitment", "delete")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    interview = RecruitmentService.delete_interview(supabase, interview_id, ctx)
    return response(interview)
