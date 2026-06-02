from datetime import datetime, timedelta, timezone
from collections import defaultdict

from supabase import Client

from app.core.cache import cached
from app.core.deps import RequestContext


class AnalyticsService:

    @staticmethod
    def _fetch(supabase: Client, ctx: RequestContext, table: str, columns: str = "*", **filters):
        q = supabase.table(table).select(columns).eq("tenant_id", ctx.tenant_id)
        for k, v in filters.items():
            if k == "gte":
                for col, val in v.items():
                    if val:
                        q = q.gte(col, val)
            elif k == "lte":
                for col, val in v.items():
                    if val:
                        q = q.lte(col, val)
            elif k == "not_eq":
                for col, val in v.items():
                    if val:
                        q = q.not_.eq(col, val)
            elif k == "order":
                for col, dir_ in [v] if isinstance(v, str) else v:
                    q = q.order(col, desc=(dir_ == "desc"))
            else:
                if v is not None:
                    q = q.eq(k, v)
        return q.execute().data or []

    @staticmethod
    @cached(ttl=60, key_prefix="analytics")
    def overview(supabase: Client, ctx: RequestContext, months: int = 12):
        now = datetime.now(timezone.utc)
        start_date = (now - timedelta(days=30 * months)).isoformat()

        ticket_trends = AnalyticsService._ticket_trends(supabase, ctx, start_date)
        project_status = AnalyticsService._project_status(supabase, ctx)
        task_completion = AnalyticsService._task_completion(supabase, ctx, start_date)
        attendance_trends = AnalyticsService._attendance_trends(supabase, ctx, months)
        leave_distribution = AnalyticsService._leave_distribution(supabase, ctx)
        time_by_project = AnalyticsService._time_by_project(supabase, ctx, start_date)
        recruitment_funnel = AnalyticsService._recruitment_funnel(supabase, ctx)
        tasks_vs_tickets = AnalyticsService._tasks_vs_tickets(supabase, ctx)

        return {
            "ticket_trends": ticket_trends,
            "project_status": project_status,
            "task_completion": task_completion,
            "attendance_trends": attendance_trends,
            "leave_distribution": leave_distribution,
            "time_by_project": time_by_project,
            "recruitment_funnel": recruitment_funnel,
            "tasks_vs_tickets": tasks_vs_tickets,
        }

    @staticmethod
    def _ticket_trends(supabase: Client, ctx: RequestContext, start_date: str):
        rows = AnalyticsService._fetch(supabase, ctx, "tickets", "created_at, status, updated_at",
                                        gte={"created_at": start_date})
        now = datetime.now(timezone.utc)
        months_data = {}
        for i in range(12):
            d = now.replace(day=1) - timedelta(days=30 * (11 - i))
            months_data[d.strftime("%b")] = {"created": 0, "closed": 0}

        for r in rows:
            created = r.get("created_at", "")
            if created:
                try:
                    dt = datetime.fromisoformat(created)
                    key = dt.strftime("%b")
                    if key in months_data:
                        months_data[key]["created"] += 1
                except ValueError:
                    pass
            if r.get("status") == "closed":
                closed = r.get("updated_at", "")
                if closed:
                    try:
                        dt = datetime.fromisoformat(closed)
                        key = dt.strftime("%b")
                        if key in months_data:
                            months_data[key]["closed"] += 1
                    except ValueError:
                        pass

        return {
            "months": list(months_data.keys()),
            "created": [v["created"] for v in months_data.values()],
            "closed": [v["closed"] for v in months_data.values()],
        }

    @staticmethod
    def _project_status(supabase: Client, ctx: RequestContext):
        rows = AnalyticsService._fetch(supabase, ctx, "projects", "status")
        counts = defaultdict(int)
        for r in rows:
            counts[r.get("status", "unknown")] += 1
        return [{"name": k.replace("_", " ").title(), "value": v} for k, v in counts.items()]

    @staticmethod
    def _task_completion(supabase: Client, ctx: RequestContext, start_date: str):
        projects = AnalyticsService._fetch(supabase, ctx, "projects", "id, name")
        proj_names = {p["id"]: p.get("name", "") for p in projects}

        rows = AnalyticsService._fetch(supabase, ctx, "tasks", "project_id, status",
                                        gte={"created_at": start_date})
        by_project = defaultdict(lambda: {"open": 0, "in_progress": 0, "closed": 0})
        for r in rows:
            pid = r.get("project_id", "")
            status = r.get("status", "")
            if status in ("open", "in_progress", "closed", "review", "hold"):
                if status not in by_project[pid]:
                    by_project[pid][status] = 0
                by_project[pid][status] += 1

        result = []
        for pid, counts in by_project.items():
            result.append({
                "name": proj_names.get(pid, pid[:8]),
                "open": counts.get("open", 0),
                "in_progress": counts.get("in_progress", 0),
                "closed": counts.get("closed", 0),
            })
        return result

    @staticmethod
    def _attendance_trends(supabase: Client, ctx: RequestContext, months: int):
        now = datetime.now(timezone.utc)
        start_date = (now - timedelta(days=30 * months)).strftime("%Y-%m-%d")

        rows = AnalyticsService._fetch(supabase, ctx, "attendance_records", "date, status",
                                        gte={"date": start_date})

        monthly = {}
        for i in range(months):
            d = now.replace(day=1) - timedelta(days=30 * (months - 1 - i))
            monthly[d.strftime("%b")] = {"present": 0, "total": 0}

        for r in rows:
            date_str = r.get("date", "")
            if date_str:
                try:
                    dt = datetime.strptime(date_str[:10], "%Y-%m-%d")
                    key = dt.strftime("%b")
                    if key in monthly:
                        monthly[key]["total"] += 1
                        if r.get("status") == "present":
                            monthly[key]["present"] += 1
                except ValueError:
                    pass

        return {
            "months": list(monthly.keys()),
            "rate": [
                round((v["present"] / v["total"] * 100) if v["total"] > 0 else 0, 1)
                for v in monthly.values()
            ],
        }

    @staticmethod
    def _leave_distribution(supabase: Client, ctx: RequestContext):
        rows = AnalyticsService._fetch(supabase, ctx, "leave_requests", "leave_type_id")
        type_ids = list({r["leave_type_id"] for r in rows if r.get("leave_type_id")})
        type_map = {}
        if type_ids:
            types = supabase.table("leave_types").select("id, name").in_("id", type_ids).execute()
            type_map = {t["id"]: t["name"] for t in (types.data or [])}

        counts = defaultdict(int)
        for r in rows:
            name = type_map.get(r.get("leave_type_id", ""), "Unknown")
            counts[name] += 1
        return [{"name": k, "value": v} for k, v in counts.items()]

    @staticmethod
    def _time_by_project(supabase: Client, ctx: RequestContext, start_date: str):
        time_rows = AnalyticsService._fetch(supabase, ctx, "time_entries", "task_id, duration_minutes",
                                             gte={"started_at": start_date})
        task_ids = list({r["task_id"] for r in time_rows if r.get("task_id")})
        task_project = {}
        if task_ids:
            tasks = supabase.table("tasks").select("id, project_id").in_("id", task_ids).execute()
            task_project = {t["id"]: t.get("project_id") for t in (tasks.data or [])}

        proj_ids = list({pid for pid in task_project.values() if pid})
        proj_names = {}
        if proj_ids:
            projs = supabase.table("projects").select("id, name").in_("id", proj_ids).execute()
            proj_names = {p["id"]: p.get("name", "") for p in (projs.data or [])}

        hours_by_proj = defaultdict(float)
        for r in time_rows:
            pid = task_project.get(r.get("task_id", ""))
            if pid:
                hours_by_proj[pid] += (r.get("duration_minutes", 0) or 0) / 60

        return [
            {"name": proj_names.get(pid, pid[:8]), "hours": round(hours, 1)}
            for pid, hours in sorted(hours_by_proj.items(), key=lambda x: -x[1])
        ]

    @staticmethod
    def _recruitment_funnel(supabase: Client, ctx: RequestContext):
        rows = AnalyticsService._fetch(supabase, ctx, "candidates", "status")
        stages = ["applied", "screening", "interview_scheduled", "technical_round", "hr_round", "selected"]
        counts = {s: 0 for s in stages}
        for r in rows:
            st = r.get("status", "")
            if st in counts:
                counts[st] += 1
        return [{"name": s.replace("_", " ").title(), "value": counts[s]} for s in stages]

    @staticmethod
    def _tasks_vs_tickets(supabase: Client, ctx: RequestContext):
        projects = AnalyticsService._fetch(supabase, ctx, "projects", "id, name")
        proj_names = {p["id"]: p.get("name", "") for p in projects}

        task_counts = defaultdict(int)
        ticket_counts = defaultdict(int)

        tasks = AnalyticsService._fetch(supabase, ctx, "tasks", "project_id")
        for t in tasks:
            pid = t.get("project_id", "")
            if pid:
                task_counts[pid] += 1

        tickets = AnalyticsService._fetch(supabase, ctx, "tickets", "project_id")
        for t in tickets:
            pid = t.get("project_id", "")
            if pid:
                ticket_counts[pid] += 1

        all_pids = set(task_counts.keys()) | set(ticket_counts.keys())
        return [
            {"project": proj_names.get(pid, pid[:8]), "tasks": task_counts.get(pid, 0), "tickets": ticket_counts.get(pid, 0)}
            for pid in sorted(all_pids)
        ]
