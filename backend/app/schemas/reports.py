from pydantic import BaseModel


class ReportFilter(BaseModel):
    from_date: str | None = None
    to_date: str | None = None
    status: str | None = None
    department_id: str | None = None
    project_id: str | None = None
    user_id: str | None = None
    priority: str | None = None
