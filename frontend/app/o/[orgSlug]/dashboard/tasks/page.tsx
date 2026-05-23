import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { TasksContent } from "./TasksContent";

type TasksPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ 
    error?: string; 
    success?: string; 
    modal?: "create" | "edit" | "delete"; 
    task_id?: string; 
    ticket_id?: string;
    project_id?: string;
    user_id?: string;
    department_id?: string;
  }>;
};

type TaskRow = { 
  id: string; 
  title: string; 
  description?: string; 
  status: string; 
  priority: "low" | "medium" | "high" | "urgent";
  start_date?: string;
  due_date?: string;
  ticket_id: string; 
  project_id: string;
  parent_task_id?: string;
  subtasks?: Array<{ id: string; title: string; status: string }>;
  dependencies?: Array<{ id: string; depends_on_task_id: string; dependency_type: string }>;
  created_at: string;
  task_assignees?: Array<{
    user_id: string;
    users?: { email: string; full_name?: string; avatar_url?: string }
  }>
};
type TicketRow = { id: string; title: string };
type ProjectRow = { id: string; name: string };
type UserRow = { id: string; email: string; full_name?: string };

export default async function TasksPage({ params, searchParams }: TasksPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  await getOrganizationContextOrRedirect(orgSlug);
  const permissionsResponse = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const tasksPerm = permissionsResponse.data?.modules.find((m) => m.key === "tasks")?.permissions ?? {
    can_view: false,
    can_create: false,
    can_edit: false,
    can_delete: false,
  };
  if (!tasksPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view tasks.</p>;
  }

  const taskQueryParams = new URLSearchParams();
  if (query.project_id) taskQueryParams.append("project_id", query.project_id);
  if (query.user_id) taskQueryParams.append("user_id", query.user_id);
  if (query.department_id) taskQueryParams.append("department_id", query.department_id);

  const [ticketsRes, projectsRes, tasksRes, usersRes] = await Promise.all([
    apiRequest<TicketRow[]>("/api/v1/tickets", { orgSlug }),
    apiRequest<ProjectRow[]>("/api/v1/projects", { orgSlug }),
    apiRequest<TaskRow[]>(`/api/v1/tasks?${taskQueryParams.toString()}`, { orgSlug }),
    apiRequest<UserRow[]>("/api/v1/users?limit=200&offset=0", { orgSlug }),
  ]);

  if (tasksRes.error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{tasksRes.error}</div>;

  const tickets = ticketsRes.data ?? [];
  const projects = projectsRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const users = usersRes.data ?? [];
  const ticketTitleById = new Map(tickets.map((t) => [t.id, t.title]));

  return (
    <TasksContent
      orgSlug={orgSlug}
      query={{
        error: query.error,
        success: query.success,
        project_id: query.project_id,
        user_id: query.user_id,
        department_id: query.department_id,
      }}
      tickets={tickets}
      projects={projects}
      tasks={tasks}
      users={users}
      ticketTitleById={ticketTitleById}
      tasksPerm={tasksPerm}
    />
  );
}
