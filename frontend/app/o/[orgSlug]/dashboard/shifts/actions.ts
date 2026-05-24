"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { apiRequest } from "@/lib/api-server";

async function createShift(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const startTime = String(formData.get("start_time") ?? "").trim();
  const endTime = String(formData.get("end_time") ?? "").trim();
  const gracePeriod = parseInt(formData.get("grace_period") as string) || 5;
  const lateThreshold = parseInt(formData.get("late_threshold") as string) || 30;
  const halfDayAfter = parseInt(formData.get("half_day_after") as string) || 240;
  const description = String(formData.get("description") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/shifts`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_create: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canCreate = permsRes.data?.modules.find((m) => m.key === "shift")?.permissions.can_create ?? false;
  if (!canCreate) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to create shifts.")}`);
  }

  const { error } = await apiRequest("/api/v1/shifts", {
    method: "POST",
    orgSlug,
    body: {
      name,
      start_time: startTime,
      end_time: endTime,
      grace_period_minutes: gracePeriod,
      late_threshold_minutes: lateThreshold,
      half_day_after_minutes: halfDayAfter,
      description: description || null,
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Shift created.")}`);
}

async function updateShift(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const shiftId = String(formData.get("shift_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const startTime = String(formData.get("start_time") ?? "").trim();
  const endTime = String(formData.get("end_time") ?? "").trim();
  const gracePeriod = parseInt(formData.get("grace_period") as string) || 5;
  const lateThreshold = parseInt(formData.get("late_threshold") as string) || 30;
  const halfDayAfter = parseInt(formData.get("half_day_after") as string) || 240;
  const description = String(formData.get("description") ?? "").trim();
  const isActive = formData.get("is_active") === "on";
  const path = `/o/${orgSlug}/dashboard/shifts`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canEdit = permsRes.data?.modules.find((m) => m.key === "shift")?.permissions.can_edit ?? false;
  if (!canEdit) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to update shifts.")}`);
  }

  const { error } = await apiRequest(`/api/v1/shifts/${encodeURIComponent(shiftId)}`, {
    method: "PATCH",
    orgSlug,
    body: {
      name: name || undefined,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      grace_period_minutes: gracePeriod,
      late_threshold_minutes: lateThreshold,
      half_day_after_minutes: halfDayAfter,
      description: description || null,
      is_active: isActive,
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Shift updated.")}`);
}

async function deleteShift(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const shiftId = String(formData.get("shift_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/shifts`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_delete: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canDelete = permsRes.data?.modules.find((m) => m.key === "shift")?.permissions.can_delete ?? false;
  if (!canDelete) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to delete shifts.")}`);
  }

  const { error } = await apiRequest(`/api/v1/shifts/${encodeURIComponent(shiftId)}`, {
    method: "DELETE",
    orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Shift deleted.")}`);
}

async function assignShift(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();
  const shiftId = String(formData.get("shift_id") ?? "").trim();
  const effectiveFrom = String(formData.get("effective_from") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/shifts`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_create: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canCreate = permsRes.data?.modules.find((m) => m.key === "shift")?.permissions.can_create ?? false;
  if (!canCreate) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to assign shifts.")}`);
  }

  const { error } = await apiRequest("/api/v1/shift-assignments", {
    method: "POST",
    orgSlug,
    body: {
      user_id: userId,
      shift_id: shiftId,
      effective_from: effectiveFrom || undefined,
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Shift assigned.")}`);
}

async function unassignShift(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const assignmentId = String(formData.get("assignment_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/shifts`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_delete: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canDelete = permsRes.data?.modules.find((m) => m.key === "shift")?.permissions.can_delete ?? false;
  if (!canDelete) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to remove shift assignments.")}`);
  }

  const { error } = await apiRequest(`/api/v1/shift-assignments/${encodeURIComponent(assignmentId)}`, {
    method: "DELETE",
    orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Assignment removed.")}`);
}

async function updateAssignment(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const assignmentId = String(formData.get("assignment_id") ?? "").trim();
  const shiftId = String(formData.get("shift_id") ?? "").trim();
  const effectiveFrom = String(formData.get("effective_from") ?? "").trim();
  const effectiveTo = String(formData.get("effective_to") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/shifts`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canEdit = permsRes.data?.modules.find((m) => m.key === "shift")?.permissions.can_edit ?? false;
  if (!canEdit) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to update shift assignments.")}`);
  }

  const body: Record<string, any> = {};
  if (shiftId) body.shift_id = shiftId;
  if (effectiveFrom) body.effective_from = effectiveFrom;
  if (effectiveTo) body.effective_to = effectiveTo;

  const { error } = await apiRequest(`/api/v1/shift-assignments/${encodeURIComponent(assignmentId)}`, {
    method: "PATCH",
    orgSlug,
    body,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Assignment updated.")}`);
}

export {
  createShift,
  updateShift,
  deleteShift,
  assignShift,
  unassignShift,
  updateAssignment,
};
