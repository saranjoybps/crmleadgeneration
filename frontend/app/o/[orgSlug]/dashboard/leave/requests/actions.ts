"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-server";

export async function approveAction(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const requestId = String(formData.get("request_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/leave/requests`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canEdit = permsRes.data?.modules.find((m) => m.key === "leave")?.permissions.can_edit ?? false;
  if (!canEdit) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to approve leave requests.")}`);
  }

  const { error } = await apiRequest(`/api/v1/leave-requests/${encodeURIComponent(requestId)}/approve`, {
    method: "POST",
    orgSlug,
    body: {},
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Leave request approved.")}`);
}

export async function rejectAction(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const requestId = String(formData.get("request_id") ?? "").trim();
  const rejectionReason = String(formData.get("rejection_reason") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/leave/requests`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canEdit = permsRes.data?.modules.find((m) => m.key === "leave")?.permissions.can_edit ?? false;
  if (!canEdit) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to reject leave requests.")}`);
  }

  const { error } = await apiRequest(`/api/v1/leave-requests/${encodeURIComponent(requestId)}/reject`, {
    method: "POST",
    orgSlug,
    body: { rejection_reason: rejectionReason || null },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Leave request rejected.")}`);
}
