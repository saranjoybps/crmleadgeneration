export type AppRole = "owner" | "admin" | "member" | "client";
export type OrganizationRole = AppRole;

export type OrganizationContext = {
  organization_id: string;
  organization_slug: string;
  organization_name: string;
  role: AppRole;
  departments: { id: string; name: string }[];
};

export type User = {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department_id?: string;
  department_name?: string;
};

export type Department = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tenant_id: string;
  created_at: string;
  member_count?: number;
};

export type DepartmentMember = {
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
  joined_at?: string | null;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  email: string;
  role: OrganizationRole;
  status: "active" | "invited" | "suspended";
  created_at: string;
};

export type OrganizationInvite = {
  id: string;
  organization_id: string;
  email: string;
  role: OrganizationRole;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  created_at: string;
};

export type Project = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: "active" | "on_hold" | "completed" | "archived";
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Milestone = {
  id: string;
  tenant_id: string;
  project_id: string;
  name: string;
  description: string | null;
  due_date: string;
  status: "pending" | "completed" | "cancelled";
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Ticket = {
  id: string;
  tenant_id: string;
  project_id: string;
  milestone_id: string | null;
  title: string;
  description: string | null;
  type: "feature" | "bug" | "improvement" | "recommendation" | "other";
  status: "open" | "in_progress" | "review" | "hold" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  start_date: string | null;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskDependencyType = "FS" | "SS" | "FF" | "SF";

export type TaskDependency = {
  id: string;
  tenant_id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: TaskDependencyType;
  created_at: string;
  depends_on?: Task;
};

export type Task = {
  id: string;
  tenant_id: string;
  project_id: string;
  ticket_id?: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "review" | "hold" | "closed";
  start_date: string | null;
  due_date: string | null;
  parent_task_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  task_assignees?: Array<{
    user_id: string;
    users?: Partial<User>;
  }>;
  subtasks?: Task[];
  dependencies?: TaskDependency[];
};

export type AttendanceStatus = "present" | "late" | "half_day" | "absent" | "overtime" | "on_leave";

export type Shift = {
  id: string;
  tenant_id: string;
  name: string;
  start_time: string;
  end_time: string;
  grace_period_minutes: number;
  late_threshold_minutes: number;
  half_day_after_minutes: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type UserShiftAssignment = {
  id: string;
  tenant_id: string;
  user_id: string;
  shift_id: string;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
  shift?: Shift;
};

export type AttendanceRecord = {
  id: string;
  tenant_id: string;
  user_id: string;
  date: string;
  shift_id: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  status: AttendanceStatus;
  working_minutes: number | null;
  late_minutes: number | null;
  overtime_minutes: number | null;
  check_in_note: string | null;
  check_out_note: string | null;
  corrected_by: string | null;
  correction_reason: string | null;
  created_at: string;
  updated_at: string;
  shift?: Shift;
  user?: Partial<User>;
};

export type CandidateStatus = "applied" | "screening" | "interview_scheduled" | "technical_round" | "hr_round" | "selected" | "rejected" | "on_hold";

export type Candidate = {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  position: string;
  source: string | null;
  current_company: string | null;
  experience_years: number | null;
  expected_salary: number | null;
  location: string | null;
  resume_url: string | null;
  status: CandidateStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Interview = {
  id: string;
  tenant_id: string;
  candidate_id: string;
  interviewer_id: string;
  scheduled_at: string;
  duration_minutes: number;
  interview_type: string;
  round_number: number;
  status: string;
  feedback: string | null;
  rating: number | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  interviewer?: Partial<User>;
};

export type StatusLogEntry = {
  id: string;
  candidate_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string;
  note: string | null;
  created_at: string;
  changed_by_user?: Partial<User>;
};

export type Announcement = {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high" | "urgent";
  target_type: "all" | "department" | "user";
  created_by: string;
  created_at: string;
  updated_at: string;
  targets?: Array<{ id: string; target_type: string; target_id: string }>;
  read_count?: number;
  is_read?: boolean;
};

export type DashboardSummary = {
  active_projects: number;
  open_tickets: number;
  pending_tasks: number;
  team_members: number;
  pending_todos: number;
  attendance_today: { present: number; absent: number; late: number; on_leave: number; total: number };
  unread_announcements: number;
  pending_leave_requests: number;
  new_candidates_this_month: number;
  overdue_tasks: number;
  total_logged_hours: number;
  upcoming_deadlines: Array<{ id: string; title: string; type: string; due_date: string; project_name: string }>;
  recent_activity: Array<{ module: string; title: string; action: string; timestamp: string; user_name: string }>;
  ticket_breakdown: Array<{ name: string; value: number }>;
  task_breakdown: Array<{ name: string; value: number }>;
  project_status_breakdown: Array<{ name: string; value: number }>;
  monthly_trends: {
    months: string[];
    tickets_created: number[];
    tickets_closed: number[];
    tasks_completed: number[];
  };
};

export type ReportDefinition = {
  key: string;
  label: string;
  description: string;
  icon: string;
  filters?: Array<{ key: string; label: string; type: "date" | "select" | "text" }>;
};

export type AnalyticsOverview = {
  ticket_trends: { months: string[]; created: number[]; closed: number[] };
  project_status: Array<{ name: string; value: number }>;
  task_completion: Array<{ name: string; open: number; in_progress: number; closed: number }>;
  attendance_trends: { months: string[]; rate: number[] };
  leave_distribution: Array<{ name: string; value: number }>;
  time_by_project: Array<{ name: string; hours: number }>;
  recruitment_funnel: Array<{ name: string; value: number }>;
  tasks_vs_tickets: Array<{ project: string; tasks: number; tickets: number }>;
};

export type Todo = {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentType = {
  id: string;
  tenant_id: string | null;
  name: string;
  key: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

export type DocumentTemplate = {
  id: string;
  tenant_id: string;
  name: string;
  document_type_id: string | null;
  content: string;
  variables: Array<{ key: string; label: string; type: string }>;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  document_type?: Partial<DocumentType>;
};

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export type LeaveType = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  days_per_year: number;
  requires_approval: boolean;
  is_active: boolean;
  is_paid: boolean;
  sort_order: number;
  color: string | null;
  created_at: string;
  updated_at: string;
};

export type LeaveBalance = {
  leave_type_id: string;
  leave_type: Partial<LeaveType>;
  year: number;
  total_days: number;
  used_days: number;
  pending_days: number;
  available_days: number;
};

export type LeaveRequest = {
  id: string;
  tenant_id: string;
  user_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  half_day: boolean;
  half_day_period: "morning" | "afternoon" | null;
  reason: string | null;
  status: LeaveStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  leave_type?: Partial<LeaveType>;
  user?: Partial<User>;
};

export type AllLeaveBalances = {
  year: number;
  leave_types: LeaveType[];
  members: Array<{
    user_id: string;
    email: string;
    full_name: string;
    balances: LeaveBalance[];
  }>;
};

export type GeneratedDocument = {
  id: string;
  tenant_id: string;
  template_id: string | null;
  document_type_id: string | null;
  employee_id: string;
  title: string;
  content_data: Record<string, string>;
  generated_by: string;
  generated_at: string;
  created_at: string;
  updated_at: string;
  template?: Partial<DocumentTemplate>;
  document_type?: Partial<DocumentType>;
  employee?: Partial<User>;
  generated_by_user?: Partial<User>;
};

// ---- Payroll ----

export type SalaryComponent = {
  id: string;
  tenant_id: string;
  name: string;
  type: "earning" | "deduction";
  calculation_type: "fixed" | "percentage";
  default_value: number;
  percentage_of: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type EmployeeSalaryComponent = {
  id: string;
  tenant_id: string;
  employee_salary_id: string;
  component_id: string;
  amount: number;
  created_at: string;
  component?: SalaryComponent;
};

export type EmployeeSalary = {
  id: string;
  tenant_id: string;
  user_id: string;
  effective_from: string;
  effective_to: string | null;
  monthly_ctc: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
  user?: Partial<User>;
  components?: EmployeeSalaryComponent[];
};

export type PayrollSettings = {
  id: string;
  tenant_id: string;
  pay_period_type: "monthly" | "bi-weekly";
  pay_day: number;
  currency: string;
  enable_tax: boolean;
  enable_pf: boolean;
  enable_esi: boolean;
  pf_employee_share: number;
  pf_employer_share: number;
  pf_wage_limit: number;
  esi_employee_share: number;
  esi_employer_share: number;
  esi_wage_limit: number;
  updated_at: string;
};

export type TaxSlab = {
  id: string;
  tenant_id: string;
  financial_year: string;
  from_amount: number;
  to_amount: number | null;
  tax_rate: number;
  additional_cess: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AssetStatus = "available" | "assigned" | "maintenance" | "retired";
export type AssetType = "laptop" | "id_card" | "gift" | "other";
export type AssignmentStatus = "active" | "returned";

export type Asset = {
  id: string;
  tenant_id: string;
  name: string;
  asset_type: AssetType;
  asset_tag: string;
  serial_number: string | null;
  brand: string | null;
  model: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  status: AssetStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type AssetAssignment = {
  id: string;
  tenant_id: string;
  asset_id: string | null;
  user_id: string;
  assigned_by: string;
  is_own_device: boolean;
  assignment_date: string;
  expected_return_date: string | null;
  actual_return_date: string | null;
  return_condition: string | null;
  status: AssignmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  asset?: Asset | null;
  assigned_to?: Partial<User> | null;
  assigned_by_user?: Partial<User> | null;
};

export type PayrollSummary = {
  total_employees: number;
  active_salaries: number;
  monthly_payroll_cost: number;
  average_ctc: number;
  department_breakdown: Array<{
    department: string;
    employee_count: number;
    monthly_cost: number;
  }>;
};

