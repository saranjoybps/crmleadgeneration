from pydantic import BaseModel


class AnalyticsFilter(BaseModel):
    months: int = 12
    year: int | None = None
    from_date: str | None = None
    to_date: str | None = None
