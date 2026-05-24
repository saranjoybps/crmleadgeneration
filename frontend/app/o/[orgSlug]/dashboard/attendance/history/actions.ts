"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-server";

export async function deleteRecord(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const recordId = String(formData.get("record_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/attendance/history`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_delete: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canDelete = permsRes.data?.modules.find((m) => m.key === "attendance")?.permissions.can_delete ?? false;
  if (!canDelete) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to delete records.")}`);
  }

  const { error } = await apiRequest(`/api/v1/attendance/records/${encodeURIComponent(recordId)}`, {
    method: "DELETE",
    orgSlug,
  });
  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Record deleted.")}`);
}

export async function editRecord(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const recordId = String(formData.get("record_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/attendance/history`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canEdit = permsRes.data?.modules.find((m) => m.key === "attendance")?.permissions.can_edit ?? false;
  if (!canEdit) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to edit records.")}`);
  }

  const body: Record<string, unknown> = {};
  const checkIn = formData.get("check_in_time");
  if (checkIn) body.check_in_time = checkIn;
  const checkOut = formData.get("check_out_time");
  if (checkOut) body.check_out_time = checkOut;
  const status = formData.get("status");
  if (status) body.status = status;
  const correctionReason = formData.get("correction_reason");
  if (correctionReason) body.correction_reason = correctionReason;

  const { error } = await apiRequest(`/api/v1/attendance/records/${encodeURIComponent(recordId)}`, {
    method: "PATCH",
    orgSlug,
    body,
  });
  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Record updated.")}`);
}
