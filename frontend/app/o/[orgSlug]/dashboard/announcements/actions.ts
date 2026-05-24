"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-server";

export async function createAnnouncement(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const priority = String(formData.get("priority") ?? "medium").trim();
  const targetType = String(formData.get("target_type") ?? "all").trim();
  const targetIds = formData.getAll("target_ids").map((v) => String(v));
  const path = `/o/${orgSlug}/dashboard/announcements`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_create: boolean } }> }>("/api/v1/auth/permissions", {
    orgSlug, cache: "no-store",
  });
  const canCreate = permsRes.data?.modules.find((m) => m.key === "announcement")?.permissions.can_create ?? false;
  if (!canCreate) redirect(`${path}?error=${encodeURIComponent("Insufficient permissions.")}`);

  const { error } = await apiRequest("/api/v1/announcements", {
    method: "POST",
    orgSlug,
    body: { title, content, priority, target_type: targetType, target_ids: targetIds.length ? targetIds : null },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Announcement created.")}`);
}

export async function updateAnnouncement(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const announcementId = String(formData.get("announcement_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const priority = String(formData.get("priority") ?? "medium").trim();
  const targetType = String(formData.get("target_type") ?? "all").trim();
  const targetIds = formData.getAll("target_ids").map((v) => String(v));
  const path = `/o/${orgSlug}/dashboard/announcements`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>("/api/v1/auth/permissions", {
    orgSlug, cache: "no-store",
  });
  const canEdit = permsRes.data?.modules.find((m) => m.key === "announcement")?.permissions.can_edit ?? false;
  if (!canEdit) redirect(`${path}?error=${encodeURIComponent("Insufficient permissions.")}`);

  const { error } = await apiRequest(`/api/v1/announcements/${encodeURIComponent(announcementId)}`, {
    method: "PATCH",
    orgSlug,
    body: { title, content, priority, target_type: targetType, target_ids: targetIds.length ? targetIds : null },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Announcement updated.")}`);
}

export async function deleteAnnouncement(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const announcementId = String(formData.get("announcement_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/announcements`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_delete: boolean } }> }>("/api/v1/auth/permissions", {
    orgSlug, cache: "no-store",
  });
  const canDelete = permsRes.data?.modules.find((m) => m.key === "announcement")?.permissions.can_delete ?? false;
  if (!canDelete) redirect(`${path}?error=${encodeURIComponent("Insufficient permissions.")}`);

  const { error } = await apiRequest(`/api/v1/announcements/${encodeURIComponent(announcementId)}`, {
    method: "DELETE",
    orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Announcement deleted.")}`);
}

export async function markAsRead(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const announcementId = String(formData.get("announcement_id") ?? "").trim();

  await apiRequest(`/api/v1/announcements/${encodeURIComponent(announcementId)}/read`, {
    method: "POST",
    orgSlug,
  });

  revalidatePath(`/o/${orgSlug}/dashboard/announcements`);
}
