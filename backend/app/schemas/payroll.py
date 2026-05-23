from datetime import date, datetime
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class SalaryComponentBase(BaseModel):
    name: str
    type: str = "earning"
    calculation_type: str = "fixed"
    default_value: Decimal = Field(default=0, max_digits=12, decimal_places=2)
    percentage_of: str | None = None
    is_active: bool = True
    sort_order: int = 0


class SalaryComponentCreate(SalaryComponentBase):
    pass


class SalaryComponentUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    calculation_type: str | None = None
    default_value: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)
    percentage_of: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class SalaryComponent(SalaryComponentBase):
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class EmployeeSalaryComponentCreate(BaseModel):
    component_id: str
    amount: Decimal = Field(default=0, max_digits=12, decimal_places=2)


class EmployeeSalaryCreate(BaseModel):
    user_id: str
    effective_from: date
    monthly_ctc: Decimal = Field(default=0, max_digits=12, decimal_places=2)
    components: list[EmployeeSalaryComponentCreate] = []


class EmployeeSalaryUpdate(BaseModel):
    effective_from: date | None = None
    effective_to: date | None = None
    monthly_ctc: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)
    status: str | None = None


class EmployeeSalaryComponent(BaseModel):
    id: UUID
    tenant_id: UUID
    employee_salary_id: UUID
    component_id: UUID
    amount: Decimal
    created_at: datetime
    component: SalaryComponent | None = None
    model_config = ConfigDict(from_attributes=True)


class EmployeeSalary(BaseModel):
    id: UUID
    tenant_id: UUID
    user_id: UUID
    effective_from: date
    effective_to: date | None = None
    monthly_ctc: Decimal
    status: str
    created_at: datetime
    updated_at: datetime
    user: dict | None = None
    components: list[EmployeeSalaryComponent] | None = None
    model_config = ConfigDict(from_attributes=True)


class PayrollSettings(BaseModel):
    id: UUID
    tenant_id: UUID
    pay_period_type: str = "monthly"
    pay_day: int = 1
    currency: str = "INR"
    enable_tax: bool = True
    enable_pf: bool = True
    enable_esi: bool = False
    pf_employee_share: Decimal = Field(default=12, max_digits=5, decimal_places=2)
    pf_employer_share: Decimal = Field(default=12, max_digits=5, decimal_places=2)
    pf_wage_limit: Decimal = Field(default=15000, max_digits=12, decimal_places=2)
    esi_employee_share: Decimal = Field(default=0.75, max_digits=5, decimal_places=2)
    esi_employer_share: Decimal = Field(default=3.25, max_digits=5, decimal_places=2)
    esi_wage_limit: Decimal = Field(default=21000, max_digits=12, decimal_places=2)
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PayrollSettingsUpdate(BaseModel):
    pay_period_type: str | None = None
    pay_day: int | None = None
    currency: str | None = None
    enable_tax: bool | None = None
    enable_pf: bool | None = None
    enable_esi: bool | None = None
    pf_employee_share: Decimal | None = Field(default=None, max_digits=5, decimal_places=2)
    pf_employer_share: Decimal | None = Field(default=None, max_digits=5, decimal_places=2)
    pf_wage_limit: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)
    esi_employee_share: Decimal | None = Field(default=None, max_digits=5, decimal_places=2)
    esi_employer_share: Decimal | None = Field(default=None, max_digits=5, decimal_places=2)
    esi_wage_limit: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)


class TaxSlabBase(BaseModel):
    financial_year: str
    from_amount: Decimal = Field(default=0, max_digits=12, decimal_places=2)
    to_amount: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)
    tax_rate: Decimal = Field(default=0, max_digits=5, decimal_places=2)
    additional_cess: Decimal = Field(default=0, max_digits=5, decimal_places=2)
    is_active: bool = True


class TaxSlabCreate(TaxSlabBase):
    pass


class TaxSlabUpdate(BaseModel):
    financial_year: str | None = None
    from_amount: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)
    to_amount: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)
    tax_rate: Decimal | None = Field(default=None, max_digits=5, decimal_places=2)
    additional_cess: Decimal | None = Field(default=None, max_digits=5, decimal_places=2)
    is_active: bool | None = None


class TaxSlab(TaxSlabBase):
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PayrollSummary(BaseModel):
    total_employees: int
    active_salaries: int
    monthly_payroll_cost: Decimal
    average_ctc: Decimal
    department_breakdown: list[dict] = []
