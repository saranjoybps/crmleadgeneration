from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from supabase import Client

from app.core.deps import RequestContext
from app.schemas.payroll import (
    EmployeeSalaryCreate,
    EmployeeSalaryUpdate,
    PayrollSettingsUpdate,
    SalaryComponentCreate,
    SalaryComponentUpdate,
    TaxSlabCreate,
    TaxSlabUpdate,
)


class PayrollService:

    @staticmethod
    def _fetch(supabase: Client, ctx: RequestContext, table: str, columns: str = "*", **filters):
        q = supabase.table(table).select(columns).eq("tenant_id", ctx.tenant_id)
        for k, v in filters.items():
            if v is not None:
                if k == "order":
                    for col, dir_ in [v] if isinstance(v, str) else v:
                        q = q.order(col, desc=(dir_ == "desc"))
                elif k == "gte":
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
                else:
                    q = q.eq(k, v)
        return q.execute().data or []

    # ---- Salary Components ----

    @staticmethod
    def list_components(supabase: Client, ctx: RequestContext, active_only: bool = False):
        return PayrollService._fetch(supabase, ctx, "salary_components",
                                     order=[("sort_order", "asc")],
                                     is_active=active_only if active_only else None)

    @staticmethod
    def create_component(supabase: Client, payload: SalaryComponentCreate, ctx: RequestContext):
        created = (
            supabase.table("salary_components")
            .insert({
                "tenant_id": ctx.tenant_id,
                "name": payload.name,
                "type": payload.type,
                "calculation_type": payload.calculation_type,
                "default_value": str(payload.default_value),
                "percentage_of": payload.percentage_of,
                "is_active": payload.is_active,
                "sort_order": payload.sort_order,
            })
            .execute()
        )
        return (created.data or [None])[0]

    @staticmethod
    def update_component(supabase: Client, component_id: str, payload: SalaryComponentUpdate, ctx: RequestContext):
        data = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
        if "default_value" in data:
            data["default_value"] = str(data["default_value"])
        updated = (
            supabase.table("salary_components")
            .update(data)
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", component_id)
            .execute()
        )
        return (updated.data or [None])[0]

    @staticmethod
    def delete_component(supabase: Client, component_id: str, ctx: RequestContext):
        res = (
            supabase.table("salary_components")
            .delete()
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", component_id)
            .execute()
        )
        return (res.data or [None])[0]

    # ---- Employee Salaries ----

    @staticmethod
    def list_employee_salaries(supabase: Client, ctx: RequestContext, status: str | None = None):
        rows = PayrollService._fetch(supabase, ctx, "employee_salaries",
                                     status=status, order=[("effective_from", "desc")])
        user_ids = [r["user_id"] for r in rows if r.get("user_id")]
        user_map = {}
        if user_ids:
            users = supabase.table("users").select("id, email, full_name").in_("id", list(set(user_ids))).execute()
            user_map = {u["id"]: u for u in (users.data or [])}
        salary_ids = [r["id"] for r in rows if r.get("id")]
        comp_map = {}
        if salary_ids:
            comps = supabase.table("employee_salary_components").select("*, component:component_id(*)").in_("employee_salary_id", salary_ids).execute()
            for comp in (comps.data or []):
                comp_map.setdefault(comp["employee_salary_id"], []).append(comp)
        for r in rows:
            r["user"] = user_map.get(r.get("user_id"))
            r["components"] = comp_map.get(r["id"], [])
        return rows

    @staticmethod
    def get_employee_salary(supabase: Client, salary_id: str, ctx: RequestContext):
        row = (
            supabase.table("employee_salaries")
            .select("*")
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", salary_id)
            .single()
            .execute()
        )
        row = row.data if row.data else None
        if not row:
            raise HTTPException(status_code=404, detail="Employee salary not found")
        if row.get("user_id"):
            u = supabase.table("users").select("id, email, full_name").eq("id", row["user_id"]).single().execute()
            if u.data:
                row["user"] = u.data
        comps = (
            supabase.table("employee_salary_components")
            .select("*, component:component_id(*)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("employee_salary_id", row["id"])
            .execute()
        )
        row["components"] = comps.data or []
        return row

    @staticmethod
    def create_employee_salary(supabase: Client, payload: EmployeeSalaryCreate, ctx: RequestContext):
        created = (
            supabase.table("employee_salaries")
            .insert({
                "tenant_id": ctx.tenant_id,
                "user_id": payload.user_id,
                "effective_from": payload.effective_from.isoformat(),
                "monthly_ctc": str(payload.monthly_ctc),
            })
            .execute()
        )
        salary_row = (created.data or [None])[0]
        if not salary_row:
            raise HTTPException(status_code=500, detail="Failed to create employee salary")
        for comp in payload.components:
            supabase.table("employee_salary_components").insert({
                "tenant_id": ctx.tenant_id,
                "employee_salary_id": salary_row["id"],
                "component_id": comp.component_id,
                "amount": str(comp.amount),
            }).execute()
        return PayrollService.get_employee_salary(supabase, salary_row["id"], ctx)

    @staticmethod
    def update_employee_salary(supabase: Client, salary_id: str, payload: EmployeeSalaryUpdate, ctx: RequestContext):
        data = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
        if "effective_from" in data and isinstance(data["effective_from"], date):
            data["effective_from"] = data["effective_from"].isoformat()
        if "monthly_ctc" in data:
            data["monthly_ctc"] = str(data["monthly_ctc"])
        updated = (
            supabase.table("employee_salaries")
            .update(data)
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", salary_id)
            .execute()
        )
        return (updated.data or [None])[0]

    @staticmethod
    def delete_employee_salary(supabase: Client, salary_id: str, ctx: RequestContext):
        res = (
            supabase.table("employee_salaries")
            .delete()
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", salary_id)
            .execute()
        )
        return (res.data or [None])[0]

    @staticmethod
    def update_salary_components(supabase: Client, salary_id: str, components: list[dict], ctx: RequestContext):
        existing = supabase.table("employee_salary_components").select("id").eq("tenant_id", ctx.tenant_id).eq("employee_salary_id", salary_id).execute()
        for old in existing.data or []:
            supabase.table("employee_salary_components").delete().eq("id", old["id"]).execute()
        for comp in components:
            supabase.table("employee_salary_components").insert({
                "tenant_id": ctx.tenant_id,
                "employee_salary_id": salary_id,
                "component_id": comp["component_id"],
                "amount": str(comp["amount"]),
            }).execute()
        return PayrollService.get_employee_salary(supabase, salary_id, ctx)

    # ---- Payroll Settings ----

    @staticmethod
    def get_settings(supabase: Client, ctx: RequestContext):
        res = (
            supabase.table("payroll_settings")
            .select("*")
            .eq("tenant_id", ctx.tenant_id)
            .maybe_single()
            .execute()
        )
        return res.data

    @staticmethod
    def upsert_settings(supabase: Client, payload: PayrollSettingsUpdate, ctx: RequestContext):
        data = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
        for dec_field in ("pf_employee_share", "pf_employer_share", "pf_wage_limit",
                          "esi_employee_share", "esi_employer_share", "esi_wage_limit"):
            if dec_field in data:
                data[dec_field] = str(data[dec_field])
        data["tenant_id"] = ctx.tenant_id
        result = (
            supabase.table("payroll_settings")
            .upsert(data, on_conflict="tenant_id")
            .execute()
        )
        return (result.data or [None])[0]

    # ---- Tax Slabs ----

    @staticmethod
    def list_tax_slabs(supabase: Client, ctx: RequestContext, financial_year: str | None = None):
        return PayrollService._fetch(supabase, ctx, "tax_slabs",
                                     financial_year=financial_year,
                                     order=[("from_amount", "asc")])

    @staticmethod
    def create_tax_slab(supabase: Client, payload: TaxSlabCreate, ctx: RequestContext):
        created = (
            supabase.table("tax_slabs")
            .insert({
                "tenant_id": ctx.tenant_id,
                "financial_year": payload.financial_year,
                "from_amount": str(payload.from_amount),
                "to_amount": str(payload.to_amount) if payload.to_amount else None,
                "tax_rate": str(payload.tax_rate),
                "additional_cess": str(payload.additional_cess),
                "is_active": payload.is_active,
            })
            .execute()
        )
        return (created.data or [None])[0]

    @staticmethod
    def update_tax_slab(supabase: Client, slab_id: str, payload: TaxSlabUpdate, ctx: RequestContext):
        data = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
        for dec_field in ("from_amount", "to_amount", "tax_rate", "additional_cess"):
            if dec_field in data:
                data[dec_field] = str(data[dec_field])
        updated = (
            supabase.table("tax_slabs")
            .update(data)
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", slab_id)
            .execute()
        )
        return (updated.data or [None])[0]

    @staticmethod
    def delete_tax_slab(supabase: Client, slab_id: str, ctx: RequestContext):
        res = (
            supabase.table("tax_slabs")
            .delete()
            .eq("tenant_id", ctx.tenant_id)
            .eq("id", slab_id)
            .execute()
        )
        return (res.data or [None])[0]

    # ---- Dashboard Summary ----

    @staticmethod
    def get_summary(supabase: Client, ctx: RequestContext):
        salaries = PayrollService._fetch(supabase, ctx, "employee_salaries", status="active")
        total_employees = len(salaries)
        monthly_total = sum(float(s.get("monthly_ctc", 0)) for s in salaries)
        avg_annual_ctc = (monthly_total / total_employees) * 12 if total_employees else 0

        user_ids = [s["user_id"] for s in salaries if s.get("user_id")]
        dept_breakdown = {}
        if user_ids:
            user_depts = (
                supabase.table("user_departments")
                .select("user_id, department:departments!inner(name)")
                .in_("user_id", user_ids)
                .execute()
            )
            for ud in user_depts.data or []:
                dept_name = ud.get("department", {}).get("name", "Unknown")
                dept_breakdown.setdefault(dept_name, {"count": 0, "cost": 0.0})
                dept_breakdown[dept_name]["count"] += 1
                salary = next((s for s in salaries if s["user_id"] == ud["user_id"]), None)
                if salary:
                    dept_breakdown[dept_name]["cost"] += float(salary.get("monthly_ctc", 0))

        return {
            "total_employees": total_employees,
            "active_salaries": len(salaries),
            "monthly_payroll_cost": round(monthly_total, 2),
            "average_ctc": round(avg_annual_ctc, 2),
            "department_breakdown": [
                {"department": k, "employee_count": v["count"], "monthly_cost": round(v["cost"], 2)}
                for k, v in dept_breakdown.items()
            ],
        }

    # ---- Salary Calculation ----

    @staticmethod
    def calculate_monthly(supabase: Client, ctx: RequestContext, user_id: str, month: int, year: int):
        from calendar import monthrange
        from datetime import date

        emp = (
            supabase.table("employee_salaries")
            .select("*, user:user_id(*)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("user_id", user_id)
            .eq("status", "active")
            .order("effective_from", desc=True)
            .limit(1)
            .execute()
        )
        if not emp.data:
            raise HTTPException(status_code=404, detail="No active salary found for this employee")
        emp = emp.data[0]
        monthly_ctc = float(emp.get("monthly_ctc", 0))
        employee_name = emp.get("user", {}).get("full_name") or emp.get("user", {}).get("email", "")

        total_days = monthrange(year, month)[1]
        first_day = date(year, month, 1)
        last_day = date(year, month, total_days)

        attendance_rows = (
            supabase.table("attendance_records")
            .select("*")
            .eq("tenant_id", ctx.tenant_id)
            .eq("user_id", user_id)
            .gte("date", first_day.isoformat())
            .lte("date", last_day.isoformat())
            .execute()
        ).data or []

        present_days = 0
        late_days = 0
        half_days = 0
        absent_days = 0
        on_leave_paid = 0
        on_leave_unpaid = 0
        leave_detail = []
        attendance_map = {r["date"]: r for r in attendance_rows}

        approved_leaves = (
            supabase.table("leave_requests")
            .select("*, leave_type:leave_type_id(*)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("user_id", user_id)
            .eq("status", "approved")
            .gte("start_date", first_day.isoformat())
            .lte("start_date", last_day.isoformat())
            .execute()
        ).data or []

        paid_leave_dates = set()
        unpaid_leave_dates = set()
        for lr in approved_leaves:
            lt = lr.get("leave_type", {})
            is_paid = lt.get("is_paid", True)
            sd = date.fromisoformat(str(lr["start_date"]))
            ed = date.fromisoformat(str(lr["end_date"]))
            if lr.get("half_day"):
                dates_set = {sd}
            else:
                dates_set = {sd + __import__("datetime").timedelta(days=i)
                            for i in range((ed - sd).days + 1)}
            for d in dates_set:
                if first_day <= d <= last_day:
                    if is_paid:
                        paid_leave_dates.add(d.isoformat())
                    else:
                        unpaid_leave_dates.add(d.isoformat())

        for d in range(1, total_days + 1):
            ds = date(year, month, d).isoformat()
            if ds in paid_leave_dates:
                on_leave_paid += 1
                leave_detail.append({"date": ds, "type": "paid_leave"})
            elif ds in unpaid_leave_dates:
                on_leave_unpaid += 1
                leave_detail.append({"date": ds, "type": "unpaid_leave"})
            elif ds in attendance_map:
                st = attendance_map[ds].get("status", "absent")
                if st == "present":
                    present_days += 1
                elif st == "late":
                    late_days += 1
                elif st == "half_day" or st == "half-day":
                    half_days += 1
                elif st == "on_leave":
                    on_leave_paid += 1
                    leave_detail.append({"date": ds, "type": "paid_leave"})
                else:
                    absent_days += 1
            else:
                absent_days += 1

        effective_days = present_days + late_days + (half_days * 0.5) + on_leave_paid
        per_day_rate = monthly_ctc / total_days
        gross_pay = round(per_day_rate * effective_days, 2)

        salary_components = (
            supabase.table("employee_salary_components")
            .select("*, component:component_id(*)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("employee_salary_id", emp["id"])
            .execute()
        ).data or []

        deductions = []
        total_deductions = 0
        for sc in salary_components:
            comp = sc.get("component", {})
            if comp.get("type") == "deduction":
                amt = float(sc.get("amount", 0))
                if comp.get("calculation_type") == "percentage":
                    basic = next(
                        (float(s.get("amount", 0)) for s in salary_components
                         if (s.get("component") or {}).get("name") == comp.get("percentage_of")),
                        0
                    )
                    amt = round(basic * amt / 100, 2)
                deductions.append({"name": comp.get("name", ""), "amount": amt})
                total_deductions += amt

        earnings = []
        for sc in salary_components:
            comp = sc.get("component", {})
            if comp.get("type") == "earning":
                amt = float(sc.get("amount", 0))
                earnings.append({"name": comp.get("name", ""), "amount": amt})

        net_pay = round(gross_pay - total_deductions, 2)

        return {
            "employee_id": user_id,
            "employee_name": employee_name,
            "month": month,
            "year": year,
            "monthly_ctc": monthly_ctc,
            "total_calendar_days": total_days,
            "per_day_rate": round(per_day_rate, 2),
            "present_days": present_days,
            "late_days": late_days,
            "half_days": half_days,
            "paid_leave_days": on_leave_paid,
            "unpaid_leave_days": on_leave_unpaid,
            "absent_days": absent_days,
            "effective_days": effective_days,
            "gross_pay": gross_pay,
            "earnings": earnings,
            "deductions": deductions,
            "total_deductions": round(total_deductions, 2),
            "net_pay": net_pay,
        }
