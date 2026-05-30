"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { apiRequest } from "@/lib/api-server";

export async function createMilestone(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/roadmap`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_create: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canCreate = permsRes.data?.modules.find((m) => m.key === "roadmap")?.permissions.can_create ?? false;
  if (!canCreate) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to create milestones.")}`);
  }

  const { error } = await apiRequest("/api/v1/milestones", {
    method: "POST",
    orgSlug,
    body: { project_id: projectId, name, description: description || null, due_date: dueDate, status: "pending" },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Milestone created.")}`);
}

export async function updateMilestone(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const milestoneId = String(formData.get("milestone_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/roadmap`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canEdit = permsRes.data?.modules.find((m) => m.key === "roadmap")?.permissions.can_edit ?? false;
  if (!canEdit) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to update milestones.")}`);
  }

  const { error } = await apiRequest(`/api/v1/milestones/${encodeURIComponent(milestoneId)}`, {
    method: "PATCH",
    orgSlug,
    body: { name, description: description || null, due_date: dueDate, status },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Milestone updated.")}`);
}

export async function deleteMilestone(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const milestoneId = String(formData.get("milestone_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/roadmap`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_delete: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canDelete = permsRes.data?.modules.find((m) => m.key === "roadmap")?.permissions.can_delete ?? false;
  if (!canDelete) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to delete milestones.")}`);
  }

  const { error } = await apiRequest(`/api/v1/milestones/${encodeURIComponent(milestoneId)}`, {
    method: "DELETE",
    orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Milestone deleted.")}`);
}
