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

