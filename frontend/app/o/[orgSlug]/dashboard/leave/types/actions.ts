"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-server";

export async function createTypeAction(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/leave/types`;

  const { error } = await apiRequest("/api/v1/leave-types", {
    method: "POST",
    orgSlug,
    body: {
      name: formData.get("name"),
      description: formData.get("description") || null,
      days_per_year: parseFloat(String(formData.get("days_per_year") || "0")),
      requires_approval: formData.get("requires_approval") === "true",
      is_active: true,
      sort_order: parseInt(String(formData.get("sort_order") || "0")),
      color: formData.get("color") || null,
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Leave type created.")}`);
}

export async function updateTypeAction(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const typeId = String(formData.get("type_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/leave/types`;

  const { error } = await apiRequest(`/api/v1/leave-types/${encodeURIComponent(typeId)}`, {
    method: "PATCH",
    orgSlug,
    body: {
      name: formData.get("name"),
      description: formData.get("description") || null,
      days_per_year: parseFloat(String(formData.get("days_per_year") || "0")),
      requires_approval: formData.get("requires_approval") === "true",
      is_active: formData.get("is_active") === "true",
      sort_order: parseInt(String(formData.get("sort_order") || "0")),
      color: formData.get("color") || null,
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Leave type updated.")}`);
}

export async function deleteTypeAction(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const typeId = String(formData.get("type_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/leave/types`;

  const { error } = await apiRequest(`/api/v1/leave-types/${encodeURIComponent(typeId)}`, {
    method: "DELETE",
    orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Leave type deleted.")}`);
}
