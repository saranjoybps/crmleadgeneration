from datetime import datetime, timedelta, timezone
from collections import defaultdict

from supabase import Client
from postgrest.exceptions import APIError

from app.core.deps import RequestContext
from app.services.access_scope import AccessScopeService


class DashboardService:

    @staticmethod
    def get_summary(supabase: Client, ctx: RequestContext):
        allowed_project_ids = AccessScopeService.get_accessible_project_ids(supabase, ctx)
        now = datetime.now(timezone.utc)
        today = now.date()
        month_start = today.replace(day=1)

        project_id_list = list(allowed_project_ids) if allowed_project_ids is not None else None

        def count(table, **filters):
            q = supabase.table(table).select("id", count="exact").eq("tenant_id", ctx.tenant_id)
            for k, v in filters.items():
                if k == "not_eq":
                    for col, val in v.items():
                        q = q.not_.eq(col, val)
                elif k == "in_":
                    for col, vals in v.items():
                        q = q.in_(col, vals)
                elif k == "gte":
                    for col, val in v.items():
                        q = q.gte(col, val)
                elif k == "lte":
                    for col, val in v.items():
                        q = q.lte(col, val)
                elif k == "lt":
                    for col, val in v.items():
                        q = q.lt(col, val)
                else:
                    q = q.eq(k, v)
            return q.execute().count or 0

        def fetch_all(table, columns="*", **filters):
            q = supabase.table(table).select(columns).eq("tenant_id", ctx.tenant_id)
            for k, v in filters.items():
                if k == "not_eq":
                    for col, val in v.items():
                        q = q.not_.eq(col, val)
                elif k == "gte":
                    for col, val in v.items():
                        q = q.gte(col, val)
                elif k == "lte":
                    for col, val in v.items():
                        q = q.lte(col, val)
                elif k == "lt":
                    for col, val in v.items():
                        q = q.lt(col, val)
                elif k == "order":
                    for col, dir_ in [v] if isinstance(v, str) else v:
                        q = q.order(col, desc=(dir_ == "desc"))
                elif k == "limit":
                    q = q.limit(v)
                else:
                    q = q.eq(k, v)
            return q.execute().data or []

        def _apply_project_scope(base_filters=None, additional_filters=None):
            f = {"tenant_id": ctx.tenant_id}
            if additional_filters:
                f.update(additional_filters)
            if project_id_list is not None:
                if not project_id_list:
                    return 0, []
                f["in_"] = {"project_id": project_id_list}
            return None, f

        # --- Existing counts (with project scope) ---
        if project_id_list is not None:
            projects_count = len(project_id_list)
            _, tix_f = _apply_project_scope(additional_filters={"status": "open"})
            open_tickets = count("tickets", **tix_f) if project_id_list else 0

            _, tasks_f = _apply_project_scope(additional_filters={"not_eq": {"status": "closed"}})
            pending_tasks = count("tasks", **tasks_f) if project_id_list else 0
        else:
            projects_count = count("projects")
            open_tickets = count("tickets", status="open")
            pending_tasks = count("tasks", not_eq={"status": "closed"})

        team_members = count("user_tenant_roles", is_active=True)
        pending_todos = count("todos", user_id=ctx.app_user_id, is_completed=False)

        # --- Attendance today ---
        attendance_today = {"present": 0, "absent": 0, "late": 0, "on_leave": 0, "total": 0}
        try:
            today_records = fetch_all("attendance_records", "status", date=today.isoformat())
            for r in today_records:
                st = r.get("status", "absent")
                if st in attendance_today:
                    attendance_today[st] += 1
                attendance_today["total"] += 1
        except APIError:
            pass

        # --- Unread announcements ---
        unread_count = 0
        try:
            all_ann = fetch_all("announcements", "id")
            ann_ids = [a["id"] for a in all_ann]
            if ann_ids:
                read_rows = (
                    supabase.table("announcement_reads")
                    .select("announcement_id")
                    .eq("user_id", ctx.app_user_id)
                    .in_("announcement_id", ann_ids)
                    .execute()
                )
                read_ids = {r["announcement_id"] for r in (read_rows.data or [])}
                unread_count = len(ann_ids) - len(read_ids)
        except APIError:
            pass

        # --- Pending leave requests ---
        pending_leave = 0
        try:
            pending_leave = count("leave_requests", status="pending")
        except APIError:
            pass

        # --- New candidates this month ---
        new_candidates = 0
        try:
            new_candidates = count("candidates", gte={"created_at": month_start.isoformat()})
        except APIError:
            pass

        # --- Overdue tasks ---
        overdue_tasks = 0
        try:
            _, ot_f = _apply_project_scope(additional_filters={
                "lt": {"due_date": now.isoformat()},
                "not_eq": {"status": "closed"},
            })
            if project_id_list is None or project_id_list:
                overdue_tasks = count("tasks", **ot_f)
        except APIError:
            pass

        # --- Upcoming deadlines (tasks + tickets due within 7 days) ---
        upcoming_deadlines = []
        week_from_now = (now + timedelta(days=7)).isoformat()
        try:
            _, task_f = _apply_project_scope(additional_filters={
                "gte": {"due_date": now.isoformat()},
                "lte": {"due_date": week_from_now},
                "not_eq": {"status": "closed"},
                "order": ("due_date", "asc"),
                "limit": 5,
            })
            if project_id_list is None or project_id_list:
                tasks_due = supabase.table("tasks").select("id, title, due_date, project_id").eq("tenant_id", ctx.tenant_id)
                if project_id_list:
                    tasks_due = tasks_due.in_("project_id", project_id_list)
                tasks_due = tasks_due.gte("due_date", now.isoformat()).lte("due_date", week_from_now).not_.eq("status", "closed").order("due_date").limit(5).execute()
                for t in tasks_due.data or []:
                    proj_name = ""
                    try:
                        p = supabase.table("projects").select("name").eq("id", t["project_id"]).single().execute()
                        proj_name = p.data.get("name", "") if p.data else ""
                    except APIError:
                        pass
                    upcoming_deadlines.append({
                        "id": t["id"],
                        "title": t["title"],
                        "type": "task",
                        "due_date": t["due_date"],
                        "project_name": proj_name,
                    })

            tickets_due = supabase.table("tickets").select("id, title, due_date, project_id").eq("tenant_id", ctx.tenant_id).eq("status", "open").gte("due_date", now.isoformat()).lte("due_date", week_from_now).order("due_date").limit(5).execute()
            for t in tickets_due.data or []:
                proj_name = ""
                try:
                    p = supabase.table("projects").select("name").eq("id", t["project_id"]).single().execute()
                    proj_name = p.data.get("name", "") if p.data else ""
                except APIError:
                    pass
                upcoming_deadlines.append({
                    "id": t["id"],
                    "title": t["title"],
                    "type": "ticket",
                    "due_date": t["due_date"],
                    "project_name": proj_name,
                })

            upcoming_deadlines.sort(key=lambda x: x.get("due_date", ""))
            upcoming_deadlines = upcoming_deadlines[:5]
        except APIError:
            pass

        # --- Recent activity ---
        recent_activity = []
        try:
            def _fetch_recent(table, module, columns, date_col="created_at", extra=None):
                q = supabase.table(table).select(columns).eq("tenant_id", ctx.tenant_id).order(date_col, desc=True).limit(5)
                rows = q.execute().data or []
                result = []
                for r in rows:
                    item = {
                        "module": module,
                        "title": r.get("title") or r.get("name") or r.get("first_name", "") + " " + r.get("last_name", ""),
                        "action": "created",
                        "timestamp": r.get(date_col, ""),
                        "user_name": "",
                    }
                    if extra:
                        item.update(extra(r) if callable(extra) else extra)
                    result.append(item)
                return result

            recent_activity.extend(_fetch_recent("tickets", "ticket", "id, title, created_at"))
            recent_activity.extend(_fetch_recent("tasks", "task", "id, title, created_at"))
            try:
                cand_rows = supabase.table("candidates").select("id, first_name, last_name, created_at").eq("tenant_id", ctx.tenant_id).order("created_at", desc=True).limit(5).execute()
                for c in cand_rows.data or []:
                    recent_activity.append({
                        "module": "recruitment",
                        "title": f"{c.get('first_name','')} {c.get('last_name','')}",
                        "action": "applied",
                        "timestamp": c.get("created_at", ""),
                        "user_name": "",
                    })
            except APIError:
                pass
            try:
                leave_rows = supabase.table("leave_requests").select("id, created_at, status").eq("tenant_id", ctx.tenant_id).order("created_at", desc=True).limit(5).execute()
                for lr in leave_rows.data or []:
                    recent_activity.append({
                        "module": "leave",
                        "title": f"Leave request {lr.get('status','')}",
                        "action": "submitted",
                        "timestamp": lr.get("created_at", ""),
                        "user_name": "",
                    })
            except APIError:
                pass

            recent_activity.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            recent_activity = recent_activity[:10]
        except APIError:
            pass

        # --- Breakdowns ---
        def _breakdown(table, status_col="status"):
            rows = fetch_all(table, status_col)
            counts = defaultdict(int)
            for r in rows:
                counts[r.get(status_col, "unknown")] += 1
            return [{"name": k.replace("_", " ").title(), "value": v} for k, v in counts.items()]

        project_breakdown = []
        try:
            proj_rows = fetch_all("projects", "status")
            p_counts = defaultdict(int)
            for r in proj_rows:
                p_counts[r.get("status", "unknown")] += 1
            project_breakdown = [{"name": k.replace("_", " ").title(), "value": v} for k, v in p_counts.items()]
        except APIError:
            pass

        ticket_breakdown = []
        try:
            ticket_breakdown = _breakdown("tickets")
        except APIError:
            pass

        task_breakdown = []
        try:
            task_breakdown = _breakdown("tasks")
        except APIError:
            pass

        # --- Monthly trends (last 12 months) ---
        monthly_trends = {"months": [], "tickets_created": [], "tickets_closed": [], "tasks_completed": []}
        try:
            twelve_months_ago = (now - timedelta(days=365)).isoformat()
            for table, date_col in [("tickets", "created_at"), ("tickets", "updated_at"), ("tasks", "updated_at")]:
                pass

            all_tickets = supabase.table("tickets").select("created_at, status, updated_at").eq("tenant_id", ctx.tenant_id).gte("created_at", twelve_months_ago).execute()
            tix_data = all_tickets.data or []

            all_tasks = supabase.table("tasks").select("status, updated_at").eq("tenant_id", ctx.tenant_id).gte("updated_at", twelve_months_ago).execute()
            task_data = all_tasks.data or []

            month_labels = []
            for i in range(11, -1, -1):
                d = (now.replace(day=1) - timedelta(days=30 * i))
                month_labels.append(d.strftime("%b"))

            tix_created = [0] * 12
            tix_closed = [0] * 12
            tasks_done = [0] * 12

            for i in range(12):
                m_start = (now.replace(day=1) - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                m_end = (m_start.replace(month=m_start.month + 1) if m_start.month < 12 else m_start.replace(year=m_start.year + 1, month=1)) - timedelta(seconds=1)

                month_idx = 11 - i

                for t in tix_data:
                    created = t.get("created_at", "")
                    if created and m_start.isoformat() <= created <= m_end.isoformat():
                        tix_created[month_idx] += 1
                    closed = t.get("updated_at", "")
                    if closed and t.get("status") == "closed" and m_start.isoformat() <= closed <= m_end.isoformat():
                        tix_closed[month_idx] += 1

                for t in task_data:
                    updated = t.get("updated_at", "")
                    if updated and t.get("status") == "closed" and m_start.isoformat() <= updated <= m_end.isoformat():
                        tasks_done[month_idx] += 1

            monthly_trends = {
                "months": month_labels,
                "tickets_created": tix_created,
                "tickets_closed": tix_closed,
                "tasks_completed": tasks_done,
            }
        except APIError:
            pass

        # --- Total logged hours ---
        logged_hours = 0
        try:
            total_minutes = supabase.table("time_entries").select("duration_minutes").eq("tenant_id", ctx.tenant_id).execute()
            logged_hours = sum(r["duration_minutes"] for r in (total_minutes.data or [])) / 60
        except APIError:
            pass

        return {
            "active_projects": projects_count or 0,
            "open_tickets": open_tickets or 0,
            "pending_tasks": pending_tasks or 0,
            "team_members": team_members or 0,
            "pending_todos": pending_todos or 0,
            "attendance_today": attendance_today,
            "unread_announcements": unread_count,
            "pending_leave_requests": pending_leave,
            "new_candidates_this_month": new_candidates,
            "overdue_tasks": overdue_tasks,
            "upcoming_deadlines": upcoming_deadlines,
            "recent_activity": recent_activity,
            "ticket_breakdown": ticket_breakdown,
            "task_breakdown": task_breakdown,
            "project_status_breakdown": project_breakdown,
            "monthly_trends": monthly_trends,
            "total_logged_hours": round(logged_hours, 1),
        }
