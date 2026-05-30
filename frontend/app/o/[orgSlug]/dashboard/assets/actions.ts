"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-server";

export async function createAsset(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/assets`;
  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_create: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canCreate = permsRes.data?.modules.find((m) => m.key === "assets")?.permissions.can_create ?? false;
  if (!canCreate) redirect(`${path}?error=${encodeURIComponent("Insufficient permissions.")}`);

  const { error } = await apiRequest("/api/v1/assets", {
    method: "POST",
    orgSlug,
    body: {
      name: String(formData.get("name") ?? "").trim(),
      asset_type: String(formData.get("asset_type") ?? "other"),
      asset_tag: String(formData.get("asset_tag") ?? "").trim(),
      serial_number: String(formData.get("serial_number") ?? "").trim() || null,
      brand: String(formData.get("brand") ?? "").trim() || null,
      model: String(formData.get("model") ?? "").trim() || null,
      purchase_date: String(formData.get("purchase_date") ?? "").trim() || null,
      purchase_price: (() => { const v = String(formData.get("purchase_price") ?? "").trim(); return v ? Number(v) : null; })(),
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Asset created.")}`);
}

export async function updateAsset(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const assetId = String(formData.get("asset_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/assets`;
  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canEdit = permsRes.data?.modules.find((m) => m.key === "assets")?.permissions.can_edit ?? false;
  if (!canEdit) redirect(`${path}?error=${encodeURIComponent("Insufficient permissions.")}`);

  const body: Record<string, unknown> = {};
  for (const key of ["name", "asset_type", "asset_tag", "serial_number", "brand", "model", "status", "notes"]) {
    const val = String(formData.get(key) ?? "").trim();
    if (val) body[key] = val;
  }
  const purchaseDate = String(formData.get("purchase_date") ?? "").trim();
  if (purchaseDate) body["purchase_date"] = purchaseDate;
  const purchasePriceVal = String(formData.get("purchase_price") ?? "").trim();
  if (purchasePriceVal) body["purchase_price"] = Number(purchasePriceVal);

  const { error } = await apiRequest(`/api/v1/assets/${encodeURIComponent(assetId)}`, {
    method: "PUT",
    orgSlug,
    body,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Asset updated.")}`);
}

export async function deleteAsset(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const assetId = String(formData.get("asset_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/assets`;
  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_delete: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canDelete = permsRes.data?.modules.find((m) => m.key === "assets")?.permissions.can_delete ?? false;
  if (!canDelete) redirect(`${path}?error=${encodeURIComponent("Insufficient permissions.")}`);

  const { error } = await apiRequest(`/api/v1/assets/${encodeURIComponent(assetId)}`, {
    method: "DELETE",
    orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Asset deleted.")}`);
}

export async function issueAsset(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/assets`;
  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_create: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canCreate = permsRes.data?.modules.find((m) => m.key === "assets")?.permissions.can_create ?? false;
  if (!canCreate) redirect(`${path}?error=${encodeURIComponent("Insufficient permissions.")}`);

  const assetId = String(formData.get("asset_id") ?? "").trim();
  const isOwnDevice = formData.get("is_own_device") === "true";

  const { error } = await apiRequest("/api/v1/assets/assignments", {
    method: "POST",
    orgSlug,
    body: {
      asset_id: assetId || null,
      user_id: String(formData.get("user_id") ?? "").trim(),
      is_own_device: isOwnDevice,
      assignment_date: String(formData.get("assignment_date") ?? "").trim(),
      expected_return_date: String(formData.get("expected_return_date") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Asset issued.")}`);
}

export async function updateAssignment(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const assignmentId = String(formData.get("assignment_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/assets`;
  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canEdit = permsRes.data?.modules.find((m) => m.key === "assets")?.permissions.can_edit ?? false;
  if (!canEdit) redirect(`${path}?error=${encodeURIComponent("Insufficient permissions.")}`);

  const assetId = String(formData.get("asset_id") ?? "").trim();
  const isOwnDevice = formData.get("is_own_device") === "true";
  const body: Record<string, unknown> = {
    asset_id: assetId || null,
    is_own_device: isOwnDevice,
  };
  const assignmentDate = String(formData.get("assignment_date") ?? "").trim();
  if (assignmentDate) body["assignment_date"] = assignmentDate;
  const expectedReturn = String(formData.get("expected_return_date") ?? "").trim();
  body["expected_return_date"] = expectedReturn || null;
  const notes = String(formData.get("notes") ?? "").trim();
  body["notes"] = notes || null;

  const { error } = await apiRequest(`/api/v1/assets/assignments/${encodeURIComponent(assignmentId)}`, {
    method: "PUT",
    orgSlug,
    body,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Assignment updated.")}`);
}

export async function returnAsset(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const assignmentId = String(formData.get("assignment_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/assets`;
  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canEdit = permsRes.data?.modules.find((m) => m.key === "assets")?.permissions.can_edit ?? false;
  if (!canEdit) redirect(`${path}?error=${encodeURIComponent("Insufficient permissions.")}`);

  const { error } = await apiRequest(`/api/v1/assets/assignments/${encodeURIComponent(assignmentId)}`, {
    method: "PUT",
    orgSlug,
    body: {
      status: "returned",
      actual_return_date: String(formData.get("actual_return_date") ?? new Date().toISOString().split("T")[0]).trim(),
      return_condition: String(formData.get("return_condition") ?? "").trim() || null,
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Asset returned.")}`);
}
