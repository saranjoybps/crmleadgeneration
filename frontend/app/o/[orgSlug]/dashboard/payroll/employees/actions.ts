"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-server";

export async function createSalaryAction(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/payroll/employees`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_create: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canCreate = permsRes.data?.modules.find((m) => m.key === "payroll")?.permissions.can_create ?? false;
  if (!canCreate) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to create salary records.")}`);
  }

  const components: Array<{ component_id: string; amount: number }> = [];
  const entries = Array.from(formData.entries());
  for (let i = 0; i < entries.length; i++) {
    const [key, val] = entries[i];
    if (key.startsWith("comp_") && key.endsWith("_id")) {
      const idx = key.replace("comp_", "").replace("_id", "");
      const amountKey = `comp_${idx}_amount`;
      const amount = formData.get(amountKey);
      if (amount) {
        components.push({ component_id: String(val), amount: Number(amount) });
      }
    }
  }

  const body: Record<string, unknown> = {
    user_id: formData.get("user_id"),
    effective_from: formData.get("effective_from"),
    monthly_ctc: formData.get("monthly_ctc"),
    components,
  };

  const { error } = await apiRequest("/api/v1/payroll/employees", {
    method: "POST", orgSlug, body,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Employee salary created.")}`);
}

export async function deleteSalaryAction(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const salaryId = String(formData.get("salary_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/payroll/employees`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_delete: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canDelete = permsRes.data?.modules.find((m) => m.key === "payroll")?.permissions.can_delete ?? false;
  if (!canDelete) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to delete salary records.")}`);
  }

  const { error } = await apiRequest(`/api/v1/payroll/employees/${encodeURIComponent(salaryId)}`, {
    method: "DELETE", orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Employee salary deleted.")}`);
}

export async function updateSalaryAction(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const salaryId = String(formData.get("salary_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/payroll/employees`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canEdit = permsRes.data?.modules.find((m) => m.key === "payroll")?.permissions.can_edit ?? false;
  if (!canEdit) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to update salary records.")}`);
  }

  const body: Record<string, unknown> = {};
  const effective_from = formData.get("effective_from");
  if (effective_from) body.effective_from = effective_from;
  const monthly_ctc = formData.get("monthly_ctc");
  if (monthly_ctc) body.monthly_ctc = Number(monthly_ctc);
  const status = formData.get("status");
  if (status) body.status = status;

  const { error } = await apiRequest(`/api/v1/payroll/employees/${encodeURIComponent(salaryId)}`, {
    method: "PATCH", orgSlug, body,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Salary record updated.")}`);
}

export async function createComponentAction(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/payroll/employees`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_create: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canCreate = permsRes.data?.modules.find((m) => m.key === "payroll")?.permissions.can_create ?? false;
  if (!canCreate) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to create components.")}`);
  }

  const body: Record<string, unknown> = {
    name: formData.get("name"),
    type: formData.get("type"),
    calculation_type: formData.get("calculation_type"),
    default_value: Number(formData.get("default_value")) || 0,
    sort_order: Number(formData.get("sort_order")) || 0,
    is_active: true,
  };

  const { error } = await apiRequest("/api/v1/payroll/components", {
    method: "POST", orgSlug, body,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Component created.")}`);
}

export async function deleteComponentAction(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const componentId = String(formData.get("component_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/payroll/employees`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_delete: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canDelete = permsRes.data?.modules.find((m) => m.key === "payroll")?.permissions.can_delete ?? false;
  if (!canDelete) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to delete components.")}`);
  }

  const { error } = await apiRequest(`/api/v1/payroll/components/${encodeURIComponent(componentId)}`, {
    method: "DELETE", orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Component deleted.")}`);
}
