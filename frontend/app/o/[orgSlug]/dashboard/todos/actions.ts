"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { apiRequest } from "@/lib/api-server";

export async function createTodo(formData: FormData) {
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

export async function updateTodo(formData: FormData) {
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

export async function toggleTodo(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const todoId = String(formData.get("todo_id") ?? "").trim();
  const currentStatus = formData.get("is_completed") === "true";
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

export async function deleteTodo(formData: FormData) {
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
