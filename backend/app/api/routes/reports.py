from fastapi import APIRouter, Depends, Query

from app.api.utils import response
from app.core.deps import RequestContext, require_module_permission
from app.core.supabase_client import get_supabase_client
from app.schemas.reports import ReportFilter
from app.services.reports import ReportService

router = APIRouter(prefix="/reports", tags=["reports"])

REPORT_HANDLERS = {
    "projects": ReportService.projects,
    "tickets": ReportService.tickets,
    "tasks": ReportService.tasks,
    "attendance": ReportService.attendance,
    "leave": ReportService.leave,
    "time-entries": ReportService.time_entries,
    "recruitment": ReportService.recruitment,
    "users": ReportService.users,
}


@router.get("/{report_key}")
def get_report(
    report_key: str,
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
    status: str | None = Query(default=None),
    department_id: str | None = Query(default=None),
    project_id: str | None = Query(default=None),
    user_id: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    ctx: RequestContext = Depends(require_module_permission("reports", "view")),
):
    if report_key not in REPORT_HANDLERS:
        return response(None, error=f"Unknown report: {report_key}")

    supabase = get_supabase_client(access_token=ctx.access_token)
    filters = {
        "from_date": from_date,
        "to_date": to_date,
        "status": status,
        "department_id": department_id,
        "project_id": project_id,
        "user_id": user_id,
        "priority": priority,
    }
    data = REPORT_HANDLERS[report_key](supabase, ctx, filters)
    return response(data)
