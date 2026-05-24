"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-server";

export async function applyLeaveAction(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/leave`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_create: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canCreate = permsRes.data?.modules.find((m) => m.key === "leave")?.permissions.can_create ?? false;
  if (!canCreate) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to apply for leave.")}`);
  }

  const body: Record<string, unknown> = {
    leave_type_id: formData.get("leave_type_id"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
    half_day: formData.get("half_day") === "true",
    half_day_period: formData.get("half_day_period") || null,
    reason: formData.get("reason") || null,
  };

  const { error } = await apiRequest("/api/v1/leave-requests", {
    method: "POST",
    orgSlug,
    body,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Leave request submitted.")}`);
}

export async function cancelLeaveAction(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const requestId = String(formData.get("request_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/leave`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canEdit = permsRes.data?.modules.find((m) => m.key === "leave")?.permissions.can_edit ?? false;
  if (!canEdit) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to cancel leave.")}`);
  }

  const { error } = await apiRequest(`/api/v1/leave-requests/${encodeURIComponent(requestId)}/cancel`, {
    method: "PATCH",
    orgSlug,
    body: {},
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Leave request cancelled.")}`);
}
