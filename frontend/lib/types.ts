export type AppRole = "owner" | "admin" | "member" | "client";
export type OrganizationRole = AppRole;

export type OrganizationContext = {
  organization_id: string;
  organization_slug: string;
  organization_name: string;
  role: AppRole;
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
  ticket_id: string;
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

export type AttendanceStatus = "present" | "late" | "half_day" | "absent" | "overtime";

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

