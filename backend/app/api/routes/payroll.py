from decimal import Decimal

from fastapi import APIRouter, Depends, Query

from app.api.utils import response
from app.core.deps import RequestContext, require_module_permission
from app.core.supabase_client import get_supabase_client
from app.schemas.payroll import (
    EmployeeSalaryCreate,
    EmployeeSalaryUpdate,
    PayrollSettingsUpdate,
    SalaryComponentCreate,
    SalaryComponentUpdate,
    TaxSlabCreate,
    TaxSlabUpdate,
)
from app.services.payroll import PayrollService

router = APIRouter(prefix="", tags=["payroll"])


# ---- Salary Components ----

@router.get("/payroll/components")
def list_components(
    active_only: bool = Query(default=False),
    ctx: RequestContext = Depends(require_module_permission("payroll", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    data = PayrollService.list_components(supabase, ctx, active_only=active_only)
    return response(data)


@router.post("/payroll/components")
def create_component(
    payload: SalaryComponentCreate,
    ctx: RequestContext = Depends(require_module_permission("payroll", "create")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    comp = PayrollService.create_component(supabase, payload, ctx)
    return response(comp)


@router.patch("/payroll/components/{component_id}")
def update_component(
    component_id: str,
    payload: SalaryComponentUpdate,
    ctx: RequestContext = Depends(require_module_permission("payroll", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    comp = PayrollService.update_component(supabase, component_id, payload, ctx)
    return response(comp)


@router.delete("/payroll/components/{component_id}")
def delete_component(
    component_id: str,
    ctx: RequestContext = Depends(require_module_permission("payroll", "delete")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    comp = PayrollService.delete_component(supabase, component_id, ctx)
    return response(comp)


# ---- Employee Salaries ----

@router.get("/payroll/employees")
def list_employee_salaries(
    status: str | None = Query(default=None),
    ctx: RequestContext = Depends(require_module_permission("payroll", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    data = PayrollService.list_employee_salaries(supabase, ctx, status=status)
    return response(data)


@router.get("/payroll/employees/{salary_id}")
def get_employee_salary(
    salary_id: str,
    ctx: RequestContext = Depends(require_module_permission("payroll", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    data = PayrollService.get_employee_salary(supabase, salary_id, ctx)
    return response(data)


@router.post("/payroll/employees")
def create_employee_salary(
    payload: EmployeeSalaryCreate,
    ctx: RequestContext = Depends(require_module_permission("payroll", "create")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    data = PayrollService.create_employee_salary(supabase, payload, ctx)
    return response(data)


@router.patch("/payroll/employees/{salary_id}")
def update_employee_salary(
    salary_id: str,
    payload: EmployeeSalaryUpdate,
    ctx: RequestContext = Depends(require_module_permission("payroll", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    data = PayrollService.update_employee_salary(supabase, salary_id, payload, ctx)
    return response(data)


@router.delete("/payroll/employees/{salary_id}")
def delete_employee_salary(
    salary_id: str,
    ctx: RequestContext = Depends(require_module_permission("payroll", "delete")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    data = PayrollService.delete_employee_salary(supabase, salary_id, ctx)
    return response(data)


@router.put("/payroll/employees/{salary_id}/components")
def update_salary_components(
    salary_id: str,
    components: list[dict],
    ctx: RequestContext = Depends(require_module_permission("payroll", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    data = PayrollService.update_salary_components(supabase, salary_id, components, ctx)
    return response(data)


# ---- Payroll Settings ----

@router.get("/payroll/settings")
def get_settings(
    ctx: RequestContext = Depends(require_module_permission("payroll", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    data = PayrollService.get_settings(supabase, ctx)
    return response(data)


@router.put("/payroll/settings")
def upsert_settings(
    payload: PayrollSettingsUpdate,
    ctx: RequestContext = Depends(require_module_permission("payroll", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    data = PayrollService.upsert_settings(supabase, payload, ctx)
    return response(data)


# ---- Tax Slabs ----

@router.get("/payroll/tax-slabs")
def list_tax_slabs(
    financial_year: str | None = Query(default=None),
    ctx: RequestContext = Depends(require_module_permission("payroll", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    data = PayrollService.list_tax_slabs(supabase, ctx, financial_year=financial_year)
    return response(data)


@router.post("/payroll/tax-slabs")
def create_tax_slab(
    payload: TaxSlabCreate,
    ctx: RequestContext = Depends(require_module_permission("payroll", "create")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    slab = PayrollService.create_tax_slab(supabase, payload, ctx)
    return response(slab)


@router.patch("/payroll/tax-slabs/{slab_id}")
def update_tax_slab(
    slab_id: str,
    payload: TaxSlabUpdate,
    ctx: RequestContext = Depends(require_module_permission("payroll", "edit")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    slab = PayrollService.update_tax_slab(supabase, slab_id, payload, ctx)
    return response(slab)


@router.delete("/payroll/tax-slabs/{slab_id}")
def delete_tax_slab(
    slab_id: str,
    ctx: RequestContext = Depends(require_module_permission("payroll", "delete")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    slab = PayrollService.delete_tax_slab(supabase, slab_id, ctx)
    return response(slab)


# ---- Dashboard Summary ----

@router.get("/payroll/summary")
def get_payroll_summary(
    ctx: RequestContext = Depends(require_module_permission("payroll", "view")),
):
    supabase = get_supabase_client(access_token=ctx.access_token)
    data = PayrollService.get_summary(supabase, ctx)
    return response(data)


# ---- Salary Calculation ----

@router.get("/payroll/calculate/{user_id}")
def calculate_salary(
    user_id: str,
    month: int = Query(default=None),
    year: int = Query(default=None),
    ctx: RequestContext = Depends(require_module_permission("payroll", "view")),
):
    from datetime import datetime
    now = datetime.now()
    m = month or now.month
    y = year or now.year
    supabase = get_supabase_client(access_token=ctx.access_token)
    data = PayrollService.calculate_monthly(supabase, ctx, user_id, m, y)
    return response(data)


@router.get("/payroll/calculate")
def calculate_all_salaries(
    month: int = Query(default=None, ge=1, le=12),
    year: int = Query(default=None, ge=2020, le=2100),
    ctx: RequestContext = Depends(require_module_permission("payroll", "view")),
):
    import logging
    logger = logging.getLogger("joycrm.payroll")
    from datetime import datetime
    now = datetime.now()
    m = month or now.month
    y = year or now.year
    supabase = get_supabase_client(access_token=ctx.access_token)
    salaries = PayrollService.list_employee_salaries(supabase, ctx, status="active")
    results = []
    errors = []
    for s in salaries:
        uid = s.get("user_id")
        if uid:
            try:
                calc = PayrollService.calculate_monthly(supabase, ctx, uid, m, y)
                results.append(calc)
            except Exception as exc:
                logger.warning("Payroll calculation failed for user %s: %s", uid, exc)
                errors.append({"user_id": uid, "error": str(exc)})
    return response({"results": results, "errors": errors})
