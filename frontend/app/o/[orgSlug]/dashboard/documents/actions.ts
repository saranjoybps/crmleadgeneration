"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-server";

export async function deleteDocument(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const docId = String(formData.get("doc_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/documents`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_delete: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canDelete = permsRes.data?.modules.find((m) => m.key === "documents")?.permissions.can_delete ?? false;
  if (!canDelete) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to delete documents.")}`);
  }

  const { error } = await apiRequest(`/api/v1/documents/${docId}`, {
    method: "DELETE",
    orgSlug,
  });
  revalidatePath(path);
  if (error) {
    redirect(`${path}?error=${encodeURIComponent(error)}`);
  }
  redirect(`${path}?success=Document+deleted`);
}

export async function createTemplate(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const documentTypeId = String(formData.get("document_type_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/documents/templates`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_create: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canCreate = permsRes.data?.modules.find((m) => m.key === "documents")?.permissions.can_create ?? false;
  if (!canCreate) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to create templates.")}`);
  }

  const { error } = await apiRequest("/api/v1/document-templates", {
    method: "POST",
    orgSlug,
    body: {
      name,
      document_type_id: documentTypeId || null,
      content: "<h1>{{employee_name}}</h1>\n<p>Start building your template...</p>",
      variables: [],
    },
  });
  revalidatePath(path);
  if (error) {
    redirect(`${path}?error=${encodeURIComponent(error)}`);
  }
  redirect(`${path}?success=Template+created`);
}

export async function deleteTemplate(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const templateId = String(formData.get("template_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/documents/templates`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_delete: boolean } }> }>(
    "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
  );
  const canDelete = permsRes.data?.modules.find((m) => m.key === "documents")?.permissions.can_delete ?? false;
  if (!canDelete) {
    redirect(`${path}?error=${encodeURIComponent("Insufficient permissions to delete templates.")}`);
  }

  const { error } = await apiRequest(`/api/v1/document-templates/${templateId}`, {
    method: "DELETE",
    orgSlug,
  });
  revalidatePath(path);
  if (error) {
    redirect(`${path}?error=${encodeURIComponent(error)}`);
  }
  redirect(`${path}?success=Template+deleted`);
}

export async function createType(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const key = String(formData.get("key") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/documents/types`;

  const { error } = await apiRequest("/api/v1/document-types", {
    method: "POST",
    orgSlug,
    body: { name, key, description: description || null },
  });
  revalidatePath(path);
  if (error) {
    redirect(`${path}?error=${encodeURIComponent(error)}`);
  }
  redirect(`${path}?success=Document+type+created`);
}

export async function deleteType(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const typeId = String(formData.get("type_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/documents/types`;

  const { error } = await apiRequest(`/api/v1/document-types/${typeId}`, {
    method: "DELETE",
    orgSlug,
  });
  revalidatePath(path);
  if (error) {
    redirect(`${path}?error=${encodeURIComponent(error)}`);
  }
  redirect(`${path}?success=Document+type+deleted`);
}
