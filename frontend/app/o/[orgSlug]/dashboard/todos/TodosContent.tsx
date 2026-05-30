"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Edit, Trash2, Calendar, Info, CheckCircle2, Circle, Clock } from "lucide-react";

import { format } from "date-fns";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { Todo } from "@/lib/types";
import { createTodo, updateTodo, toggleTodo, deleteTodo } from "./actions";

type ModalState = { type: "create" } | { type: "edit"; todo_id: string } | { type: "delete"; todo_id: string } | null;

type TodosContentProps = {
  orgSlug: string;
  query: { error?: string; success?: string; filter?: string };
  todos: Todo[] | null;
  todosPerm: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean };
  filter: string;
};

export default function TodosContent({ orgSlug, query, todos, todosPerm, filter }: TodosContentProps) {
  const [modal, setModal] = useState<ModalState>(null);

  const selectedTodo = useMemo(() => {
    if (modal?.type === "edit" || modal?.type === "delete") {
      return todos?.find((t) => t.id === modal.todo_id) ?? null;
    }
    return null;
  }, [modal, todos]);

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
            <Button size="lg" className="gap-2 shadow-lg shadow-violet-200" onClick={() => setModal({ type: "create" })}>
              <Plus className="h-5 w-5" />
              Add Todo
            </Button>
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
              <Button variant="outline" onClick={() => setModal({ type: "create" })}>Add your first todo</Button>
            )}
          </Card>
        ) : (
          todos?.map((todo) => (
            <Card key={todo.id} className={cn("group p-4 transition-all hover:border-violet-300", todo.is_completed && "bg-slate-50/50 opacity-75")}>
              <div className="flex items-center gap-4">
                {todosPerm.can_edit ? (
                  <form action={toggleTodo}>
                    <input type="hidden" name="organization_slug" value={orgSlug} />
                    <input type="hidden" name="todo_id" value={todo.id} />
                    <input type="hidden" name="is_completed" value={String(todo.is_completed)} />
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
                        {format(new Date(todo.due_date.slice(0,10) + "T00:00:00"), "MMM d, yyyy")}
                      </div>
                    )}
                  </div>
                  {todo.description && (
                    <p className="mt-1 text-sm text-muted line-clamp-1">{todo.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {todosPerm.can_edit && (
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl" onClick={() => setModal({ type: "edit", todo_id: todo.id })}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {todosPerm.can_delete && (
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl hover:bg-red-50 hover:text-red-600" onClick={() => setModal({ type: "delete", todo_id: todo.id })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* CREATE MODAL */}
      <Modal
        isOpen={modal?.type === "create"}
        onClose={() => setModal(null)}
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
            <div className="flex-1">
              <Button variant="outline" type="button" className="w-full py-4" onClick={() => setModal(null)}>Cancel</Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      {selectedTodo && (
        <Modal
          isOpen={modal?.type === "edit"}
          onClose={() => setModal(null)}
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
                defaultValue={selectedTodo.due_date?.slice(0,10) ?? ""}
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
              <div className="flex-1">
                <Button variant="outline" type="button" className="w-full py-4" onClick={() => setModal(null)}>Cancel</Button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE MODAL */}
      {selectedTodo && modal?.type === "delete" && (
        <Modal
          isOpen={true}
          onClose={() => setModal(null)}
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
              <Button variant="outline" className="w-full py-3 border-none text-muted" onClick={() => setModal(null)}>Cancel</Button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
