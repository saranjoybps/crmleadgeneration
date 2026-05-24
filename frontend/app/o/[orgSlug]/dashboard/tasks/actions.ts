"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-server";

export async function createTask(formData: FormData) {
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
  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_create: boolean } }> }>("/api/v1/auth/permissions", {
    orgSlug,
    cache: "no-store",
  });
  const canCreate = permsRes.data?.modules.find((m) => m.key === "tasks")?.permissions.can_create ?? false;
  if (!canCreate) redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to create tasks.")}`);

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

export async function updateTask(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const taskId = String(formData.get("task_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const priority = String(formData.get("priority") ?? "medium");
  const startDate = String(formData.get("start_date") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/tasks`;
  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>("/api/v1/auth/permissions", {
    orgSlug,
    cache: "no-store",
  });
  const canEdit = permsRes.data?.modules.find((m) => m.key === "tasks")?.permissions.can_edit ?? false;
  if (!canEdit) redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to edit tasks.")}`);

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

export async function addDependency(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const taskId = String(formData.get("task_id") ?? "").trim();
  const dependsOnTaskId = String(formData.get("depends_on_task_id") ?? "").trim();
  const type = String(formData.get("dependency_type") ?? "FS").trim();
  const path = `/o/${orgSlug}/dashboard/tasks?modal=edit&task_id=${taskId}`;
  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>("/api/v1/auth/permissions", {
    orgSlug,
    cache: "no-store",
  });
  const canEdit = permsRes.data?.modules.find((m) => m.key === "tasks")?.permissions.can_edit ?? false;
  if (!canEdit) redirect(`${path}&error=${encodeURIComponent("Insufficient permissions to add dependencies.")}`);

  const { error } = await apiRequest(`/api/v1/tasks/${encodeURIComponent(taskId)}/dependencies`, {
    method: "POST",
    orgSlug,
    body: { depends_on_task_id: dependsOnTaskId, dependency_type: type },
  });

  if (error) redirect(`${path}&error=${encodeURIComponent(error)}`);
  revalidatePath(`/o/${orgSlug}/dashboard/tasks`);
  redirect(`${path}&success=${encodeURIComponent("Dependency added.")}`);
}

export async function removeDependency(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const taskId = String(formData.get("task_id") ?? "").trim();
  const dependsOnTaskId = String(formData.get("depends_on_task_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/tasks?modal=edit&task_id=${taskId}`;
  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>("/api/v1/auth/permissions", {
    orgSlug,
    cache: "no-store",
  });
  const canEdit = permsRes.data?.modules.find((m) => m.key === "tasks")?.permissions.can_edit ?? false;
  if (!canEdit) redirect(`${path}&error=${encodeURIComponent("Insufficient permissions to remove dependencies.")}`);

  const { error } = await apiRequest(`/api/v1/tasks/${encodeURIComponent(taskId)}/dependencies/${encodeURIComponent(dependsOnTaskId)}`, {
    method: "DELETE",
    orgSlug,
  });

  if (error) redirect(`${path}&error=${encodeURIComponent(error)}`);
  revalidatePath(`/o/${orgSlug}/dashboard/tasks`);
  redirect(`${path}&success=${encodeURIComponent("Dependency removed.")}`);
}

export async function updateTaskAssignees(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const taskId = String(formData.get("task_id") ?? "").trim();
  const currentAssigneeIds = String(formData.get("current_assignee_ids") ?? "").split(",").filter(Boolean);
  const newAssigneeIds = formData.getAll("assignee_user_ids").map((x) => String(x).trim()).filter(Boolean);
  const path = `/o/${orgSlug}/dashboard/tasks`;
  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>("/api/v1/auth/permissions", {
    orgSlug,
    cache: "no-store",
  });
  const canEdit = permsRes.data?.modules.find((m) => m.key === "tasks")?.permissions.can_edit ?? false;
  if (!canEdit) redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to update assignees.")}`);

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

export async function deleteTask(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const taskId = String(formData.get("task_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/tasks`;
  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_delete: boolean } }> }>("/api/v1/auth/permissions", {
    orgSlug,
    cache: "no-store",
  });
  const canDelete = permsRes.data?.modules.find((m) => m.key === "tasks")?.permissions.can_delete ?? false;
  if (!canDelete) redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to delete tasks.")}`);

  const { error } = await apiRequest(`/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: "DELETE",
    orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Task deleted.")}`);
}

export async function updateTaskStatus(orgSlug: string, taskId: string, newStatus: string) {
  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>("/api/v1/auth/permissions", {
    orgSlug,
    cache: "no-store",
  });
  const canEdit = permsRes.data?.modules.find((m) => m.key === "tasks")?.permissions.can_edit ?? false;
  if (!canEdit) { return; }
  const { error } = await apiRequest(`/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    orgSlug,
    body: { status: newStatus },
  });
  if (!error) revalidatePath(`/o/${orgSlug}/dashboard/tasks`);
}
