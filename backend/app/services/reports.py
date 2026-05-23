from supabase import Client

from app.core.deps import RequestContext


class ReportService:

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
            elif k == "in_":
                for col, val in v.items():
                    if val:
                        q = q.in_(col, val)
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
    def projects(supabase: Client, ctx: RequestContext, filters: dict | None = None):
        f = filters or {}
        rows = ReportService._fetch(supabase, ctx, "projects", "*, project_members!left(id), tasks!left(id), tickets!left(id)",
                                     status=f.get("status"), department_id=f.get("department_id"))
        seen = {}
        for r in rows:
            pid = r["id"]
            if pid not in seen:
                seen[pid] = {
                    "id": pid,
                    "name": r.get("name"),
                    "status": r.get("status"),
                    "department_id": r.get("department_id"),
                    "created_at": r.get("created_at"),
                    "member_count": 0,
                    "task_count": 0,
                    "ticket_count": 0,
                }
            if r.get("project_members") is not None:
                seen[pid]["member_count"] += 1
            if r.get("tasks") is not None:
                seen[pid]["task_count"] += 1
            if r.get("tickets") is not None:
                seen[pid]["ticket_count"] += 1
        return list(seen.values())

    @staticmethod
    def tickets(supabase: Client, ctx: RequestContext, filters: dict | None = None):
        f = filters or {}
        rows = ReportService._fetch(supabase, ctx, "tickets",
                                     "id, title, type, priority, status, project_id, created_by, start_date, due_date, created_at",
                                     status=f.get("status"), priority=f.get("priority"),
                                     project_id=f.get("project_id"),
                                     gte={"created_at": f.get("from_date")},
                                     lte={"created_at": f.get("to_date")})
        for r in rows:
            if r.get("project_id"):
                p = supabase.table("projects").select("name").eq("id", r["project_id"]).single().execute()
                r["project_name"] = p.data.get("name", "") if p.data else ""
            if r.get("created_by"):
                u = supabase.table("users").select("full_name, email").eq("id", r["created_by"]).single().execute()
                r["created_by_name"] = u.data.get("full_name") or u.data.get("email", "") if u.data else ""
        return rows

    @staticmethod
    def tasks(supabase: Client, ctx: RequestContext, filters: dict | None = None):
        f = filters or {}
        rows = ReportService._fetch(supabase, ctx, "tasks",
                                     "id, title, priority, status, project_id, ticket_id, due_date, created_at",
                                     status=f.get("status"),
                                     project_id=f.get("project_id"),
                                     gte={"created_at": f.get("from_date")},
                                     lte={"created_at": f.get("to_date")})

        assignee_rows = supabase.table("task_assignees").select("task_id, user_id").eq("tenant_id", ctx.tenant_id).execute()
        assignee_map = {}
        for a in assignee_rows.data or []:
            assignee_map.setdefault(a["task_id"], []).append(a["user_id"])

        user_ids = set()
        for tid, uids in assignee_map.items():
            user_ids.update(uids)
        user_map = {}
        if user_ids:
            users = supabase.table("users").select("id, full_name, email").in_("id", list(user_ids)).execute()
            for u in users.data or []:
                user_map[u["id"]] = u.get("full_name") or u.get("email", "")

        for r in rows:
            r["assignees"] = ", ".join([user_map.get(uid, "") for uid in assignee_map.get(r["id"], [])])
            if r.get("project_id"):
                p = supabase.table("projects").select("name").eq("id", r["project_id"]).single().execute()
                r["project_name"] = p.data.get("name", "") if p.data else ""
        return rows

    @staticmethod
    def attendance(supabase: Client, ctx: RequestContext, filters: dict | None = None):
        f = filters or {}
        rows = ReportService._fetch(supabase, ctx, "attendance_records",
                                     "id, user_id, date, shift_id, check_in_time, check_out_time, status, working_minutes",
                                     status=f.get("status"), user_id=f.get("user_id"),
                                     gte={"date": f.get("from_date")},
                                     lte={"date": f.get("to_date")})
        for r in rows:
            if r.get("user_id"):
                u = supabase.table("users").select("full_name, email").eq("id", r["user_id"]).single().execute()
                r["user_id"] = u.data.get("full_name") or u.data.get("email", "") if u.data else ""
        return rows

    @staticmethod
    def leave(supabase: Client, ctx: RequestContext, filters: dict | None = None):
        f = filters or {}
        rows = ReportService._fetch(supabase, ctx, "leave_requests",
                                     "*, leave_types!left(name)",
                                     status=f.get("status"), user_id=f.get("user_id"),
                                     gte={"created_at": f.get("from_date")},
                                     lte={"created_at": f.get("to_date")})
        for r in rows:
            lt = r.get("leave_types")
            r["leave_type_name"] = lt.get("name") if lt else ""
            del r["leave_types"]
            if r.get("user_id"):
                u = supabase.table("users").select("full_name, email").eq("id", r["user_id"]).single().execute()
                r["user_name"] = u.data.get("full_name") or u.data.get("email", "") if u.data else ""
            if r.get("approved_by"):
                u = supabase.table("users").select("full_name, email").eq("id", r["approved_by"]).single().execute()
                r["approved_by_name"] = u.data.get("full_name") or u.data.get("email", "") if u.data else ""
        return rows

    @staticmethod
    def time_entries(supabase: Client, ctx: RequestContext, filters: dict | None = None):
        f = filters or {}
        rows = ReportService._fetch(supabase, ctx, "time_entries",
                                     "id, task_id, user_id, duration_minutes, note, started_at",
                                     user_id=f.get("user_id"),
                                     gte={"started_at": f.get("from_date")},
                                     lte={"started_at": f.get("to_date")})
        for r in rows:
            if r.get("task_id"):
                t = supabase.table("tasks").select("title, project_id").eq("id", r["task_id"]).single().execute()
                if t.data:
                    r["task_title"] = t.data.get("title", "")
                    if t.data.get("project_id"):
                        p = supabase.table("projects").select("name").eq("id", t.data["project_id"]).single().execute()
                        r["project_name"] = p.data.get("name", "") if p.data else ""
            if r.get("user_id"):
                u = supabase.table("users").select("full_name, email").eq("id", r["user_id"]).single().execute()
                r["user_name"] = u.data.get("full_name") or u.data.get("email", "") if u.data else ""
        return rows

    @staticmethod
    def recruitment(supabase: Client, ctx: RequestContext, filters: dict | None = None):
        f = filters or {}
        rows = ReportService._fetch(supabase, ctx, "candidates",
                                     "*, interviews!left(id, interview_type, status, rating, scheduled_at)",
                                     status=f.get("status"),
                                     gte={"created_at": f.get("from_date")},
                                     lte={"created_at": f.get("to_date")})
        seen = {}
        for r in rows:
            cid = r["id"]
            if cid not in seen:
                seen[cid] = {
                    "id": cid,
                    "first_name": r.get("first_name"),
                    "last_name": r.get("last_name"),
                    "email": r.get("email"),
                    "phone": r.get("phone"),
                    "position": r.get("position"),
                    "status": r.get("status"),
                    "source": r.get("source"),
                    "experience_years": r.get("experience_years"),
                    "created_at": r.get("created_at"),
                    "interviews": [],
                }
            if r.get("interviews") is not None:
                seen[cid]["interviews"].append(r["interviews"])
        return list(seen.values())

    @staticmethod
    def users(supabase: Client, ctx: RequestContext, filters: dict | None = None):
        f = filters or {}
        tenant_users = supabase.table("user_tenant_roles").select("user_id").eq("tenant_id", ctx.tenant_id).execute()
        user_ids = list({u["user_id"] for u in tenant_users.data or []})
        if not user_ids:
            return []
        rows = supabase.table("users").select("id, email, full_name, is_active, created_at").in_("id", user_ids).execute()
        rows = rows.data or []
        result = []
        for r in rows:
            depts = supabase.table("user_departments").select("department_id").eq("user_id", r["id"]).execute()
            dept_ids = [d["department_id"] for d in (depts.data or [])]
            dept_names = []
            if dept_ids:
                depts_data = supabase.table("departments").select("name").in_("id", dept_ids).execute()
                dept_names = [d["name"] for d in (depts_data.data or [])]
            roles = supabase.table("user_tenant_roles").select("roles!inner(key, label)").eq("user_id", r["id"]).eq("tenant_id", ctx.tenant_id).execute()
            role_name = ""
            for rr in roles.data or []:
                rl = rr.get("roles")
                if rl:
                    role_name = rl.get("label", "")
                    break
            result.append({
                "id": r["id"],
                "email": r.get("email"),
                "full_name": r.get("full_name"),
                "is_active": r.get("is_active"),
                "role": role_name,
                "departments": ", ".join(dept_names),
                "created_at": r.get("created_at"),
            })
        return result

    @staticmethod
    def payroll_summary(supabase: Client, ctx: RequestContext, filters: dict | None = None):
        f = filters or {}
        rows = ReportService._fetch(supabase, ctx, "employee_salaries",
                                     "id, user_id, effective_from, monthly_ctc, status",
                                     status=f.get("status"))
        user_ids = [r["user_id"] for r in rows if r.get("user_id")]
        user_map = {}
        dept_map = {}
        if user_ids:
            users = supabase.table("users").select("id, email, full_name").in_("id", list(set(user_ids))).execute()
            for u in users.data or []:
                user_map[u["id"]] = u
            user_depts = (
                supabase.table("user_departments")
                .select("user_id, department:departments!inner(name)")
                .in_("user_id", list(set(user_ids)))
                .execute()
            )
            for ud in user_depts.data or []:
                dept_name = ud.get("department", {}).get("name", "")
                if dept_name:
                    dept_map[ud["user_id"]] = dept_name

        result = []
        for r in rows:
            user = user_map.get(r.get("user_id", ""), {})
            m_ctc = float(r.get("monthly_ctc", 0))
            result.append({
                "employee_name": user.get("full_name") or user.get("email", ""),
                "email": user.get("email", ""),
                "department": dept_map.get(r.get("user_id", ""), ""),
                "monthly_ctc": round(m_ctc, 2),
                "annual_ctc": round(m_ctc * 12, 2),
                "effective_from": r.get("effective_from"),
                "status": r.get("status"),
            })
        return result
