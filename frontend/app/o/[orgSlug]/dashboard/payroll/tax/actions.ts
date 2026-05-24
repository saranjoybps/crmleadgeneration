"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-server";

export async function createSlabAction(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/payroll/tax`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_create: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canCreate = permsRes.data?.modules.find((m) => m.key === "payroll")?.permissions.can_create ?? false;
  if (!canCreate) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to create tax slabs.")}`);
  }

  const body: Record<string, unknown> = {
    financial_year: formData.get("financial_year"),
    from_amount: Number(formData.get("from_amount")),
    to_amount: formData.get("to_amount") ? Number(formData.get("to_amount")) : null,
    tax_rate: Number(formData.get("tax_rate")),
    additional_cess: Number(formData.get("additional_cess")),
    is_active: formData.get("is_active") === "on",
  };

  const { error } = await apiRequest("/api/v1/payroll/tax-slabs", {
    method: "POST", orgSlug, body,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Tax slab created.")}`);
}

export async function deleteSlabAction(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const slabId = String(formData.get("slab_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/payroll/tax`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_delete: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canDelete = permsRes.data?.modules.find((m) => m.key === "payroll")?.permissions.can_delete ?? false;
  if (!canDelete) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to delete tax slabs.")}`);
  }

  const { error } = await apiRequest(`/api/v1/payroll/tax-slabs/${encodeURIComponent(slabId)}`, {
    method: "DELETE", orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Tax slab deleted.")}`);
}
