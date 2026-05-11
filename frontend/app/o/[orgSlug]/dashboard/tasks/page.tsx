import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Plus, Edit, Trash2, Users, Calendar, ArrowRight, Info, CheckSquare, Ticket } from "lucide-react";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { AutoSubmitSelect } from "@/components/AutoSubmitSelect";

type TasksPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string; drawer?: "create" | "edit" | "assignees" | "delete"; task_id?: string; ticket_id?: string }>;
};

type TaskRow = { id: string; title: string; description?: string; status: string; ticket_id: string; created_at: string };
type TicketRow = { id: string; title: string };

const KANBAN_STATUSES = ["open", "in_progress", "review", "hold", "closed"] as const;

function resolveJoinedUserEmail(value: unknown): string {
  if (Array.isArray(value)) return String(value[0]?.email ?? "unknown");
  if (value && typeof value === "object" && "email" in value) return String((value as { email?: string }).email ?? "unknown");
  return "unknown";
}

async function createTask(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const ticketId = String(formData.get("ticket_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const assigneeIds = formData.getAll("assignee_user_ids").map((x) => String(x).trim()).filter(Boolean);
  const path = `/o/${orgSlug}/dashboard/tasks`;

  const { error } = await apiRequest("/api/v1/tasks/ticket/" + encodeURIComponent(ticketId), {
    method: "POST",
    orgSlug,
    body: { title, description: description || null, status: "open", assignee_user_ids: assigneeIds },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Task created.")}`);
}

async function updateTaskStatus(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const taskId = String(formData.get("task_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/tasks`;

  const { error } = await apiRequest(`/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    orgSlug,
    body: { status },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Status updated.")}`);
}

async function updateTask(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const taskId = String(formData.get("task_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/tasks`;

  const { error } = await apiRequest(`/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    orgSlug,
    body: { title: title || undefined, description: description || null, status },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Task updated.")}`);
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

  const [ticketsRes, tasksRes, usersRes] = await Promise.all([
    apiRequest<TicketRow[]>("/api/v1/tickets", { orgSlug }),
    apiRequest<TaskRow[]>("/api/v1/tasks", { orgSlug }),
    (org.role === "owner" || org.role === "admin")
      ? apiRequest<Array<{ user_id: string; users?: unknown }>>("/api/v1/users?limit=200&offset=0", { orgSlug })
      : Promise.resolve({ data: [] as any[], error: null }),
  ]);

  if (tasksRes.error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{tasksRes.error}</div>;

  const tickets = ticketsRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const users = usersRes.data ?? [];
  const ticketTitleById = new Map(tickets.map((t) => [t.id, t.title]));
  const selectedTask = tasks.find((t) => t.id === query.task_id);
  const selectedTicketId = query.ticket_id ?? selectedTask?.ticket_id ?? "";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-slate-100 text-slate-700 border-slate-200";
      case "in_progress": return "bg-violet-100 text-violet-700 border-violet-200";
      case "review": return "bg-amber-100 text-amber-700 border-amber-200";
      case "hold": return "bg-red-100 text-red-700 border-red-200";
      case "closed": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="h-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-main">Task Board</h1>
          <p className="text-muted">Track progress and collaborate on active tasks.</p>
        </div>
        {(org.role === "owner" || org.role === "admin") && (
          <Link href={`/o/${orgSlug}/dashboard/tasks?drawer=create`}>
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              New Task
            </Button>
          </Link>
        )}
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

      <div className="flex-1 overflow-x-auto pb-6">
        <div className="flex gap-6 h-full min-w-[1200px]">
          {KANBAN_STATUSES.map((status) => (
            <div key={status} className="flex w-80 flex-col rounded-3xl bg-slate-50/50 p-4 border border-soft/50">
              <div className="mb-4 flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("border-none px-0 font-bold", status === "in_progress" ? "text-violet-600" : "text-muted")}>
                    {status.replace("_", " ")}
                  </Badge>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
                    {tasks.filter(t => t.status === status).length}
                  </span>
                </div>
                {(org.role === "owner" || org.role === "admin") && (
                  <Link href={`/o/${orgSlug}/dashboard/tasks?drawer=create`}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg"><Plus className="h-4 w-4" /></Button>
                  </Link>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
                {tasks.filter((task) => task.status === status).map((task) => (
                  <div key={task.id} className="group relative rounded-2xl border border-soft bg-white p-4 shadow-sm transition-all hover:border-violet-200 hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/o/${orgSlug}/dashboard/tasks?drawer=edit&task_id=${task.id}`} className="text-sm font-bold text-main hover:text-violet-600 leading-tight">
                        {task.title}
                      </Link>
                      <Link href={`/o/${orgSlug}/dashboard/tasks?drawer=delete&task_id=${task.id}`} className="opacity-0 transition-opacity group-hover:opacity-100">
                        <Trash2 className="h-3.5 w-3.5 text-muted hover:text-red-500" />
                      </Link>
                    </div>
                    
                    <p className="mt-2 line-clamp-2 text-xs text-muted leading-relaxed">
                      {task.description || "No description provided."}
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t border-soft/50 pt-3">
                      <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-medium text-muted">
                        <Ticket className="h-3 w-3" />
                        <span className="truncate max-w-[100px]">{ticketTitleById.get(task.ticket_id) || "General"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {(org.role === "owner" || org.role === "admin" || org.role === "member") && (
                          <form action={updateTaskStatus} className="flex">
                            <input type="hidden" name="organization_slug" value={orgSlug} />
                            <input type="hidden" name="task_id" value={task.id} />
                            <AutoSubmitSelect 
                              name="status" 
                              defaultValue={task.status} 
                              options={KANBAN_STATUSES.map(s => ({ value: s, label: s[0].toUpperCase() }))}
                              className="w-8 h-8 rounded-full border border-soft bg-white text-[10px] appearance-none text-center cursor-pointer hover:bg-slate-50"
                            />
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {tasks.filter((task) => task.status === status).length === 0 && (
                  <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-[11px] font-medium text-slate-400">
                    No tasks here
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CREATE DRAWER */}
      <Drawer
        isOpen={query.drawer === "create"}
        closeHref={`/o/${orgSlug}/dashboard/tasks`}
        title="Create New Task"
      >
        <form action={createTask} className="space-y-8">
          <input type="hidden" name="organization_slug" value={orgSlug} />
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
              rows={6} 
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500" 
              placeholder="Provide more details about this task..."
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold uppercase tracking-wider text-muted">Assign Team Members</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {users.map((row) => (
                <label key={row.user_id} className="flex items-center gap-3 rounded-2xl border border-soft p-3 cursor-pointer transition-colors hover:bg-slate-50 has-[:checked]:border-violet-300 has-[:checked]:bg-violet-50">
                  <input type="checkbox" name="assignee_user_ids" value={row.user_id} className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                  <span className="text-sm font-medium">{resolveJoinedUserEmail(row.users)}</span>
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
      </Drawer>

      {/* EDIT DRAWER */}
      {selectedTask && (
        <Drawer
          isOpen={query.drawer === "edit"}
          closeHref={`/o/${orgSlug}/dashboard/tasks`}
          title="Edit Task"
        >
          <div className="space-y-10">
            <form action={updateTask} className="space-y-6">
              <input type="hidden" name="organization_slug" value={orgSlug} />
              <input type="hidden" name="task_id" value={selectedTask.id} />
              
              <Input label="Title" name="title" defaultValue={selectedTask.title} required />
              
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
                <label className="text-sm font-bold uppercase tracking-wider text-muted">Description</label>
                <textarea 
                  name="description" 
                  defaultValue={selectedTask.description ?? ""}
                  rows={6} 
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-soft">
                <Button type="submit" size="lg">Save Changes</Button>
              </div>
            </form>

            <div className="rounded-3xl border border-soft bg-slate-50 p-6">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted mb-4">Task Info</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-white p-2 border border-soft shadow-sm"><Ticket className="h-4 w-4 text-violet-500" /></div>
                  <div>
                    <p className="text-[10px] font-bold text-muted uppercase">Linked Ticket</p>
                    <p className="text-sm font-bold text-main">{ticketTitleById.get(selectedTask.ticket_id) || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-white p-2 border border-soft shadow-sm"><Calendar className="h-4 w-4 text-violet-500" /></div>
                  <div>
                    <p className="text-[10px] font-bold text-muted uppercase">Created On</p>
                    <p className="text-sm font-bold text-main">May 11, 2026</p>
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <Link href={`/o/${orgSlug}/dashboard/tasks?drawer=delete&task_id=${selectedTask.id}`}>
                  <Button variant="danger" className="w-full gap-2 py-3 bg-white hover:bg-red-50 border-red-100 text-red-600 shadow-none">
                    <Trash2 className="h-4 w-4" />
                    Delete Task
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Drawer>
      )}

      {/* DELETE MODAL (using Drawer for simplicity as in original code, but could be Modal) */}
      {selectedTask && query.drawer === "delete" && (
        <Drawer
          isOpen={true}
          closeHref={`/o/${orgSlug}/dashboard/tasks`}
          title="Delete Task"
        >
          <div className="space-y-8 text-center py-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100 shadow-inner">
              <Trash2 className="h-10 w-10" />
            </div>
            <div>
              <h4 className="text-2xl font-bold text-main tracking-tight">Are you sure?</h4>
              <p className="mt-3 text-muted leading-relaxed px-6">
                You are about to delete <span className="font-bold text-main underline underline-offset-4 decoration-red-200">{selectedTask.title}</span>. This action is permanent.
              </p>
            </div>
            <form action={deleteTask} className="flex flex-col gap-3 pt-6 px-4">
              <input type="hidden" name="organization_slug" value={orgSlug} />
              <input type="hidden" name="task_id" value={selectedTask.id} />
              <Button variant="danger" type="submit" className="py-4 bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200">Delete Permanently</Button>
              <Link href={`/o/${orgSlug}/dashboard/tasks`}>
                <Button variant="outline" className="w-full py-4 border-none text-muted hover:bg-slate-100">Keep this task</Button>
              </Link>
            </form>
          </div>
        </Drawer>
      )}
    </div>
  );
}
