import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Plus, Edit, Trash2, Calendar, Info, CheckCircle2, Circle, Clock } from "lucide-react";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { Todo } from "@/lib/types";

type TodosPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ 
    error?: string; 
    success?: string; 
    modal?: "create" | "edit" | "delete"; 
    todo_id?: string;
    filter?: "all" | "pending" | "completed";
  }>;
};

async function createTodo(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/todos`;
  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_create: boolean } }> }>("/api/v1/auth/permissions", {
    orgSlug,
    cache: "no-store",
  });
  const canCreate = permsRes.data?.modules.find((m) => m.key === "todos")?.permissions.can_create ?? false;
  if (!canCreate) redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to create todos.")}`);

  const { error } = await apiRequest("/api/v1/todos", {
    method: "POST",
    orgSlug,
    body: { 
      title, 
      description: description || null, 
      due_date: dueDate ? new Date(dueDate).toISOString() : null 
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Todo created.")}`);
}

async function updateTodo(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const todoId = String(formData.get("todo_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const isCompleted = formData.get("is_completed") === "on";
  const path = `/o/${orgSlug}/dashboard/todos`;
  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>("/api/v1/auth/permissions", {
    orgSlug,
    cache: "no-store",
  });
  const canEdit = permsRes.data?.modules.find((m) => m.key === "todos")?.permissions.can_edit ?? false;
  if (!canEdit) redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to edit todos.")}`);

  const { error } = await apiRequest(`/api/v1/todos/${encodeURIComponent(todoId)}`, {
    method: "PATCH",
    orgSlug,
    body: { 
      title: title || undefined, 
      description: description || null, 
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      is_completed: isCompleted
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Todo updated.")}`);
}

async function toggleTodo(orgSlug: string, todoId: string, currentStatus: boolean) {
  "use server";
  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>("/api/v1/auth/permissions", {
    orgSlug,
    cache: "no-store",
  });
  const canEdit = permsRes.data?.modules.find((m) => m.key === "todos")?.permissions.can_edit ?? false;
  if (!canEdit) return;
  const { error } = await apiRequest(`/api/v1/todos/${encodeURIComponent(todoId)}`, {
    method: "PATCH",
    orgSlug,
    body: { is_completed: !currentStatus },
  });
  if (!error) revalidatePath(`/o/${orgSlug}/dashboard/todos`);
}

async function deleteTodo(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const todoId = String(formData.get("todo_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/todos`;
  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_delete: boolean } }> }>("/api/v1/auth/permissions", {
    orgSlug,
    cache: "no-store",
  });
  const canDelete = permsRes.data?.modules.find((m) => m.key === "todos")?.permissions.can_delete ?? false;
  if (!canDelete) redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to delete todos.")}`);

  const { error } = await apiRequest(`/api/v1/todos/${encodeURIComponent(todoId)}`, {
    method: "DELETE",
    orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Todo deleted.")}`);
}

export default async function TodosPage({ params, searchParams }: TodosPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  await getOrganizationContextOrRedirect(orgSlug);
  const permissionsResponse = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const todosPerm = permissionsResponse.data?.modules.find((m) => m.key === "todos")?.permissions ?? {
    can_view: false,
    can_create: false,
    can_edit: false,
    can_delete: false,
  };
  if (!todosPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view todos.</p>;
  }

  const filter = query.filter || "all";
  let apiPath = "/api/v1/todos";
  if (filter === "pending") apiPath += "?is_completed=false";
  if (filter === "completed") apiPath += "?is_completed=true";

  const { data: todos, error: todosError } = await apiRequest<Todo[]>(apiPath, { orgSlug });

  if (todosError) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{todosError}</div>;

  const selectedTodo = todos?.find((t) => t.id === query.todo_id);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-main">Personal Todos</h1>
          <p className="text-muted">Manage your daily tasks and personal reminders.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-2xl border border-soft bg-white p-1 shadow-sm">
            <Link href={`/o/${orgSlug}/dashboard/todos?filter=all`}>
              <Button variant={filter === "all" ? "primary" : "ghost"} size="sm" className="rounded-xl px-4 text-xs font-bold">All</Button>
            </Link>
            <Link href={`/o/${orgSlug}/dashboard/todos?filter=pending`}>
              <Button variant={filter === "pending" ? "primary" : "ghost"} size="sm" className="rounded-xl px-4 text-xs font-bold">Pending</Button>
            </Link>
            <Link href={`/o/${orgSlug}/dashboard/todos?filter=completed`}>
              <Button variant={filter === "completed" ? "primary" : "ghost"} size="sm" className="rounded-xl px-4 text-xs font-bold">Completed</Button>
            </Link>
          </div>

          {todosPerm.can_create && (
            <Link href={`/o/${orgSlug}/dashboard/todos?modal=create`}>
              <Button size="lg" className="gap-2 shadow-lg shadow-violet-200">
                <Plus className="h-5 w-5" />
                Add Todo
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

      <div className="grid gap-4">
        {todos?.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center text-muted border-dashed border-2">
            <div className="rounded-full bg-slate-50 p-4 mb-4">
              <Clock className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-lg font-medium">No todos found</p>
            <p className="text-sm mt-1 mb-6">Start by adding a new todo to your list.</p>
            {todosPerm.can_create && (
              <Link href={`/o/${orgSlug}/dashboard/todos?modal=create`}>
                <Button variant="outline">Add your first todo</Button>
              </Link>
            )}
          </Card>
        ) : (
          todos?.map((todo) => (
            <Card key={todo.id} className={cn("group p-4 transition-all hover:border-violet-300", todo.is_completed && "bg-slate-50/50 opacity-75")}>
              <div className="flex items-center gap-4">
                {todosPerm.can_edit ? (
                  <form action={async () => {
                    "use server";
                    await toggleTodo(orgSlug, todo.id, todo.is_completed);
                  }}>
                    <button type="submit" className="focus:outline-none">
                      {todo.is_completed ? (
                        <CheckCircle2 className="h-6 w-6 text-emerald-500 fill-emerald-50" />
                      ) : (
                        <Circle className="h-6 w-6 text-slate-300 hover:text-violet-500" />
                      )}
                    </button>
                  </form>
                ) : (
                  <div>
                    {todo.is_completed ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 fill-emerald-50" />
                    ) : (
                      <Circle className="h-6 w-6 text-slate-300" />
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className={cn("font-bold text-main truncate", todo.is_completed && "line-through text-muted")}>
                      {todo.title}
                    </h3>
                    {todo.due_date && (
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                        <Calendar className="h-3 w-3" />
                        {new Date(todo.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  {todo.description && (
                    <p className="mt-1 text-sm text-muted line-clamp-1">{todo.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {todosPerm.can_edit && (
                    <Link href={`/o/${orgSlug}/dashboard/todos?modal=edit&todo_id=${todo.id}`}>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                  {todosPerm.can_delete && (
                    <Link href={`/o/${orgSlug}/dashboard/todos?modal=delete&todo_id=${todo.id}`}>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* CREATE MODAL */}
      <Modal
        isOpen={query.modal === "create"}
        closeHref={`/o/${orgSlug}/dashboard/todos`}
        title="Add New Todo"
      >
        <form action={createTodo} className="space-y-6">
          <input type="hidden" name="organization_slug" value={orgSlug} />
          
          <Input label="Title" name="title" required placeholder="What needs to be done?" />
          
          <div className="space-y-1.5">
            <label className="text-sm font-bold uppercase tracking-wider text-muted">Description (Optional)</label>
            <textarea 
              name="description" 
              rows={3} 
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500" 
              placeholder="Add more context..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold uppercase tracking-wider text-muted">Due Date (Optional)</label>
            <input 
              type="date" 
              name="due_date" 
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="flex gap-3 pt-6 border-t border-soft">
            <Button type="submit" className="flex-1 py-4">Add Todo</Button>
            <Link href={`/o/${orgSlug}/dashboard/todos`} className="flex-1">
              <Button variant="outline" type="button" className="w-full py-4">Cancel</Button>
            </Link>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      {selectedTodo && (
        <Modal
          isOpen={query.modal === "edit"}
          closeHref={`/o/${orgSlug}/dashboard/todos`}
          title="Edit Todo"
        >
          <form action={updateTodo} className="space-y-6">
            <input type="hidden" name="organization_slug" value={orgSlug} />
            <input type="hidden" name="todo_id" value={selectedTodo.id} />
            
            <Input label="Title" name="title" defaultValue={selectedTodo.title} required />
            
            <div className="space-y-1.5">
              <label className="text-sm font-bold uppercase tracking-wider text-muted">Description (Optional)</label>
              <textarea 
                name="description" 
                defaultValue={selectedTodo.description ?? ""}
                rows={3} 
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold uppercase tracking-wider text-muted">Due Date (Optional)</label>
              <input 
                type="date" 
                name="due_date" 
                defaultValue={selectedTodo.due_date ? new Date(selectedTodo.due_date).toISOString().split('T')[0] : ""}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-soft">
              <input 
                type="checkbox" 
                name="is_completed" 
                id="is_completed"
                defaultChecked={selectedTodo.is_completed}
                className="h-5 w-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500" 
              />
              <label htmlFor="is_completed" className="text-sm font-bold text-main cursor-pointer">Mark as completed</label>
            </div>

            <div className="flex gap-3 pt-6 border-t border-soft">
              <Button type="submit" className="flex-1 py-4">Save Changes</Button>
              <Link href={`/o/${orgSlug}/dashboard/todos`} className="flex-1">
                <Button variant="outline" type="button" className="w-full py-4">Cancel</Button>
              </Link>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE MODAL */}
      {selectedTodo && query.modal === "delete" && (
        <Modal
          isOpen={true}
          closeHref={`/o/${orgSlug}/dashboard/todos`}
          title="Delete Todo"
          size="sm"
        >
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100 shadow-inner">
              <Trash2 className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-main tracking-tight">Delete Todo?</h4>
              <p className="mt-2 text-xs text-muted leading-relaxed px-4">
                Are you sure you want to delete <span className="font-bold text-main">{selectedTodo.title}</span>?
              </p>
            </div>
            <form action={deleteTodo} className="flex flex-col gap-2 pt-4 px-2">
              <input type="hidden" name="organization_slug" value={orgSlug} />
              <input type="hidden" name="todo_id" value={selectedTodo.id} />
              <Button variant="danger" type="submit" className="py-3">Delete Permanently</Button>
              <Link href={`/o/${orgSlug}/dashboard/todos`}>
                <Button variant="outline" className="w-full py-3 border-none text-muted">Cancel</Button>
              </Link>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
