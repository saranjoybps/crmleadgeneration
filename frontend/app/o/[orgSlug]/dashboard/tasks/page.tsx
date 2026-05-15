import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Plus, Edit, Trash2, Users, Calendar, ArrowRight, Info, CheckSquare, Ticket, Filter, X, Link2, Unlink } from "lucide-react";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { DepartmentSelector } from "@/components/DepartmentSelector";
import { AutoSubmitSelect } from "@/components/AutoSubmitSelect";
import { KanbanBoard } from "@/components/KanbanBoard";

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

const KANBAN_STATUSES = ["open", "in_progress", "review", "hold", "closed"] as const;

function resolveUserName(user: UserRow): string {
  return user.full_name || user.email || "unknown";
}

async function createTask(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const ticketId = String(formData.get("ticket_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priority = String(formData.get("priority") ?? "medium");
  const startDate = String(formData.get("start_date") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const parentTaskId = String(formData.get("parent_task_id") ?? "").trim();
  const assigneeIds = formData.getAll("assignee_user_ids").map((x) => String(x).trim()).filter(Boolean);
  const path = `/o/${orgSlug}/dashboard/tasks`;

  const { error } = await apiRequest("/api/v1/tasks/ticket/" + encodeURIComponent(ticketId), {
    method: "POST",
    orgSlug,
    body: { 
      title, 
      description: description || null, 
      status: "open", 
      priority, 
      start_date: startDate || null,
      due_date: dueDate || null, 
      parent_task_id: parentTaskId || null, 
      assignee_user_ids: assigneeIds 
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Task created.")}`);
}

async function updateTask(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const taskId = String(formData.get("task_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const priority = String(formData.get("priority") ?? "medium");
  const startDate = String(formData.get("start_date") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/tasks`;

  const { error } = await apiRequest(`/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    orgSlug,
    body: { 
      title: title || undefined, 
      description: description || null, 
      status, 
      priority, 
      start_date: startDate || null,
      due_date: dueDate || null 
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Task updated.")}`);
}

async function addDependency(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const taskId = String(formData.get("task_id") ?? "").trim();
  const dependsOnTaskId = String(formData.get("depends_on_task_id") ?? "").trim();
  const type = String(formData.get("dependency_type") ?? "FS").trim();
  const path = `/o/${orgSlug}/dashboard/tasks?modal=edit&task_id=${taskId}`;

  const { error } = await apiRequest(`/api/v1/tasks/${encodeURIComponent(taskId)}/dependencies`, {
    method: "POST",
    orgSlug,
    body: { depends_on_task_id: dependsOnTaskId, dependency_type: type },
  });

  if (error) redirect(`${path}&error=${encodeURIComponent(error)}`);
  revalidatePath(`/o/${orgSlug}/dashboard/tasks`);
  redirect(`${path}&success=${encodeURIComponent("Dependency added.")}`);
}

async function removeDependency(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const taskId = String(formData.get("task_id") ?? "").trim();
  const dependsOnTaskId = String(formData.get("depends_on_task_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/tasks?modal=edit&task_id=${taskId}`;

  const { error } = await apiRequest(`/api/v1/tasks/${encodeURIComponent(taskId)}/dependencies/${encodeURIComponent(dependsOnTaskId)}`, {
    method: "DELETE",
    orgSlug,
  });

  if (error) redirect(`${path}&error=${encodeURIComponent(error)}`);
  revalidatePath(`/o/${orgSlug}/dashboard/tasks`);
  redirect(`${path}&success=${encodeURIComponent("Dependency removed.")}`);
}

async function updateTaskAssignees(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const taskId = String(formData.get("task_id") ?? "").trim();
  const currentAssigneeIds = String(formData.get("current_assignee_ids") ?? "").split(",").filter(Boolean);
  const newAssigneeIds = formData.getAll("assignee_user_ids").map((x) => String(x).trim()).filter(Boolean);
  const path = `/o/${orgSlug}/dashboard/tasks`;

  const toAdd = newAssigneeIds.filter(id => !currentAssigneeIds.includes(id));
  const toRemove = currentAssigneeIds.filter(id => !newAssigneeIds.includes(id));

  if (toAdd.length === 0 && toRemove.length === 0) {
     redirect(`${path}?success=${encodeURIComponent("No changes made.")}`);
  }
  
  const { error } = await apiRequest(`/api/v1/tasks/${encodeURIComponent(taskId)}/assignees`, {
    method: "POST",
    orgSlug,
    body: { add_user_ids: toAdd, remove_user_ids: toRemove },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Assignees updated.")}`);
}

async function deleteTask(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const taskId = String(formData.get("task_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/tasks`;

  const { error } = await apiRequest(`/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: "DELETE",
    orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Task deleted.")}`);
}

export default async function TasksPage({ params, searchParams }: TasksPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const org = await getOrganizationContextOrRedirect(orgSlug);
  const canManage = org.role === "owner" || org.role === "admin";

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
  const selectedTask = tasks.find((t) => t.id === query.task_id);
  const selectedTicketId = query.ticket_id ?? selectedTask?.ticket_id ?? "";
  const selectedParentId = query.modal === "create" ? (query.task_id ?? "") : "";

  const onStatusChange = async (taskId: string, newStatus: string) => {
    "use server";
    const { error } = await apiRequest(`/api/v1/tasks/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      orgSlug,
      body: { status: newStatus },
    });
    if (!error) revalidatePath(`/o/${orgSlug}/dashboard/tasks`);
  };

  return (
    <div className="h-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-main">Task Board</h1>
          <p className="text-muted">Track progress and collaborate on active tasks.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-soft bg-white p-1.5 shadow-sm">
            <form method="GET" className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 text-xs font-bold text-main border-r border-soft">
                <Filter className="h-3.5 w-3.5 text-violet-500" />
                <span>Filters</span>
              </div>
              
              <AutoSubmitSelect 
                name="project_id"
                defaultValue={query.project_id || ""}
                options={[
                  { value: "", label: "All Projects" },
                  ...projects.map(p => ({ value: p.id, label: p.name }))
                ]}
                className="h-9 rounded-xl border-none bg-transparent px-3 text-xs font-bold text-main focus:ring-0 cursor-pointer"
              />

              <AutoSubmitSelect 
                name="user_id"
                defaultValue={query.user_id || ""}
                options={[
                  { value: "", label: "All Users" },
                  ...users.map((u) => ({ value: u.id, label: resolveUserName(u) }))
                ]}
                className="h-9 rounded-xl border-none bg-transparent px-3 text-xs font-bold text-main focus:ring-0 cursor-pointer"
              />

              <div className="border-l border-soft pl-2">
                <DepartmentSelector
                  orgSlug={orgSlug}
                  value={query.department_id || ""}
                  name="department_id"
                  placeholder="All Departments"
                  showAllOption={true}
                  className="h-9 w-40 text-xs"
                />
              </div>

              {(query.project_id || query.user_id || query.department_id) && (
                <Link 
                  href={`/o/${orgSlug}/dashboard/tasks`}
                  className="flex h-9 items-center justify-center rounded-xl px-3 text-xs font-bold text-muted hover:text-red-500 transition-colors border-l border-soft"
                  title="Clear filters"
                >
                  <X className="h-3.5 w-3.5" />
                </Link>
              )}
            </form>
          </div>

          {canManage && (
            <Link href={`/o/${orgSlug}/dashboard/tasks?modal=create`}>
              <Button size="lg" className="gap-2 shadow-lg shadow-violet-200">
                <Plus className="h-5 w-5" />
                New Task
              </Button>
            </Link>
          )}
        </div>
      </header>

      {query.error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm">
          <Info className="h-5 w-5 text-red-500" />
          {query.error}
        </div>
      )}

      {query.success && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm">
          <Info className="h-5 w-5 text-emerald-500" />
          {query.success}
        </div>
      )}

      <KanbanBoard 
        initialTasks={tasks} 
        orgSlug={orgSlug} 
        canManage={canManage || org.role === "member"} 
        ticketTitleById={ticketTitleById}
        onStatusChange={onStatusChange}
      />

      {/* CREATE MODAL */}
      <Modal
        isOpen={query.modal === "create"}
        closeHref={`/o/${orgSlug}/dashboard/tasks`}
        title="Create New Task"
        size="lg"
      >
        <form action={createTask} className="space-y-6">
          <input type="hidden" name="organization_slug" value={orgSlug} />
          <input type="hidden" name="parent_task_id" value={selectedParentId} />
          
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-bold uppercase tracking-wider text-muted">Priority</label>
              <select name="priority" defaultValue="medium" className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold uppercase tracking-wider text-muted">Start Date</label>
              <input type="date" name="start_date" className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold uppercase tracking-wider text-muted">Due Date</label>
              <input type="date" name="due_date" className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold uppercase tracking-wider text-muted">Link to Ticket</label>
            <select name="ticket_id" required defaultValue={selectedTicketId} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500">
              <option value="">Select a ticket...</option>
              {tickets.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
          
          <Input label="Task Title" name="title" required placeholder="What needs to be done?" />
          
          <div className="space-y-1.5">
            <label className="text-sm font-bold uppercase tracking-wider text-muted">Description</label>
            <textarea 
              name="description" 
              rows={4} 
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500" 
              placeholder="Provide more details about this task..."
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold uppercase tracking-wider text-muted">Assign Team Members</label>
            <div className="grid gap-2 sm:grid-cols-2 max-h-[200px] overflow-y-auto p-1">
              {users.map((row) => (
                <label key={row.id} className="flex items-center gap-3 rounded-xl border border-soft p-3 cursor-pointer transition-colors hover:bg-slate-50 has-[:checked]:border-violet-300 has-[:checked]:bg-violet-50">
                  <input type="checkbox" name="assignee_user_ids" value={row.id} className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                  <span className="text-xs font-medium">{resolveUserName(row)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-soft">
            <Button type="submit" className="flex-1 py-4">Create Task</Button>
            <Link href={`/o/${orgSlug}/dashboard/tasks`} className="flex-1">
              <Button variant="outline" type="button" className="w-full py-4">Cancel</Button>
            </Link>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      {selectedTask && (
        <Modal
          isOpen={query.modal === "edit"}
          closeHref={`/o/${orgSlug}/dashboard/tasks`}
          title="Edit Task"
          size="lg"
        >
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <form action={updateTask} className="space-y-6">
                <input type="hidden" name="organization_slug" value={orgSlug} />
                <input type="hidden" name="task_id" value={selectedTask.id} />
                
                <Input label="Title" name="title" defaultValue={selectedTask.title} required />
                
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold uppercase tracking-wider text-muted">Status</label>
                    <select 
                      name="status" 
                      defaultValue={selectedTask.status}
                      className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                    >
                      {KANBAN_STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ").toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold uppercase tracking-wider text-muted">Priority</label>
                    <select name="priority" defaultValue={selectedTask.priority} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold uppercase tracking-wider text-muted">Start Date</label>
                    <input type="date" name="start_date" defaultValue={selectedTask.start_date ? selectedTask.start_date.split('T')[0] : ""} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold uppercase tracking-wider text-muted">Due Date</label>
                    <input type="date" name="due_date" defaultValue={selectedTask.due_date ? selectedTask.due_date.split('T')[0] : ""} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold uppercase tracking-wider text-muted">Description</label>
                  <textarea 
                    name="description" 
                    defaultValue={selectedTask.description ?? ""}
                    rows={6} 
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-soft">
                  <Button type="submit">Save Changes</Button>
                </div>
              </form>

              {/* Dependency Editor */}
              <div className="space-y-4 pt-6 border-t border-soft">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-main">Dependencies</h4>
                </div>
                
                <div className="space-y-2">
                  {(selectedTask.dependencies || []).map(dep => {
                    const dependsOnTask = tasks.find(t => t.id === dep.depends_on_task_id);
                    return (
                      <div key={dep.id} className="flex items-center justify-between rounded-xl border border-soft p-3 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                          <Link2 className="h-3.5 w-3.5 text-violet-500" />
                          <span className="text-xs font-medium">{dependsOnTask?.title || "Unknown Task"}</span>
                          <Badge variant="outline" className="text-[9px] uppercase">{dep.dependency_type}</Badge>
                        </div>
                        <form action={removeDependency}>
                          <input type="hidden" name="organization_slug" value={orgSlug} />
                          <input type="hidden" name="task_id" value={selectedTask.id} />
                          <input type="hidden" name="depends_on_task_id" value={dep.depends_on_task_id} />
                          <button type="submit" className="text-muted hover:text-red-500 transition-colors">
                            <Unlink className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    );
                  })}
                  
                  {canManage && (
                    <form action={addDependency} className="flex gap-2 items-end pt-2">
                      <input type="hidden" name="organization_slug" value={orgSlug} />
                      <input type="hidden" name="task_id" value={selectedTask.id} />
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Add Predecessor</label>
                        <select name="depends_on_task_id" required className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs focus:ring-2 focus:ring-violet-500">
                          <option value="">Select task...</option>
                          {tasks.filter(t => t.id !== selectedTask.id && t.project_id === selectedTask.project_id).map(t => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-20 space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Type</label>
                        <select name="dependency_type" className="h-10 w-full rounded-xl border border-slate-300 bg-white px-2 text-xs focus:ring-2 focus:ring-violet-500">
                          <option value="FS">FS</option>
                          <option value="SS">SS</option>
                          <option value="FF">FF</option>
                          <option value="SF">SF</option>
                        </select>
                      </div>
                      <Button type="submit" variant="outline" className="h-10 px-3"><Plus className="h-4 w-4" /></Button>
                    </form>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-soft">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-main">Sub-tasks</h4>
                  <Link href={`/o/${orgSlug}/dashboard/tasks?modal=create&task_id=${selectedTask.id}&ticket_id=${selectedTask.ticket_id}`}>
                    <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-violet-600">
                      <Plus className="h-3 w-3" /> Add Sub-task
                    </Button>
                  </Link>
                </div>
                <div className="space-y-2">
                  {(selectedTask.subtasks || []).map(sub => (
                    <div key={sub.id} className="flex items-center justify-between rounded-xl border border-soft p-3 bg-slate-50/50">
                      <span className="text-sm font-medium">{sub.title}</span>
                      <Badge variant="outline" className="text-[10px]">{sub.status}</Badge>
                    </div>
                  ))}
                  {(selectedTask.subtasks || []).length === 0 && (
                    <p className="text-xs text-muted italic">No sub-tasks yet.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <div className="rounded-2xl border border-soft bg-slate-50 p-5 space-y-6">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-3">Assignees</h4>
                  <form action={updateTaskAssignees} className="space-y-3">
                    <input type="hidden" name="organization_slug" value={orgSlug} />
                    <input type="hidden" name="task_id" value={selectedTask.id} />
                    <input type="hidden" name="current_assignee_ids" value={(selectedTask.task_assignees || []).map(a => a.user_id).join(",")} />
                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                      {users.map((row) => {
                        const isAssigned = (selectedTask.task_assignees || []).some(a => a.user_id === row.id);
                        return (
                          <label key={row.id} className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              name="assignee_user_ids" 
                              value={row.id} 
                              defaultChecked={isAssigned}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500" 
                            />
                            <span className="text-[11px] font-medium text-main group-hover:text-violet-600">{resolveUserName(row)}</span>
                          </label>
                        );
                      })}
                    </div>
                    {canManage && <Button type="submit" variant="ghost" size="sm" className="w-full h-8 text-[10px] uppercase font-bold tracking-widest bg-white border border-soft">Update Assignees</Button>}
                  </form>
                </div>

                <div className="pt-4 border-t border-soft/50">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-3">Info</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-3.5 w-3.5 text-violet-400" />
                      <p className="text-[11px] font-medium text-main truncate">{ticketTitleById.get(selectedTask.ticket_id) || "N/A"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-violet-400" />
                      <p className="text-[11px] font-medium text-main">Created {new Date(selectedTask.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {canManage && (
                  <div className="pt-4 border-t border-soft/50">
                    <Link href={`/o/${orgSlug}/dashboard/tasks?modal=delete&task_id=${selectedTask.id}`}>
                      <Button variant="danger" className="w-full gap-2 py-2.5 text-[11px] font-bold bg-white hover:bg-red-50 border-red-100 text-red-600 shadow-none">
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete Task
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE MODAL */}
      {selectedTask && query.modal === "delete" && (
        <Modal
          isOpen={true}
          closeHref={`/o/${orgSlug}/dashboard/tasks`}
          title="Delete Task"
          size="sm"
        >
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100 shadow-inner">
              <Trash2 className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-main tracking-tight">Are you sure?</h4>
              <p className="mt-2 text-xs text-muted leading-relaxed px-4">
                You are about to delete <span className="font-bold text-main">{selectedTask.title}</span>. This action is permanent.
              </p>
            </div>
            <form action={deleteTask} className="flex flex-col gap-2 pt-4 px-2">
              <input type="hidden" name="organization_slug" value={orgSlug} />
              <input type="hidden" name="task_id" value={selectedTask.id} />
              <Button variant="danger" type="submit" className="py-3 bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-100">Delete Permanently</Button>
              <Link href={`/o/${orgSlug}/dashboard/tasks`}>
                <Button variant="outline" className="w-full py-3 border-none text-muted hover:bg-slate-100">Keep this task</Button>
              </Link>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
