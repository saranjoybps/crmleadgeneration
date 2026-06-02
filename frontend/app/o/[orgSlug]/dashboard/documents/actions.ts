"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-server";

export async function deleteDocument(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const docId = String(formData.get("doc_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/documents`;

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

  const { data, error } = await apiRequest<{ id: string }>("/api/v1/document-templates", {
    method: "POST",
    orgSlug,
    body: {
      name,
      document_type_id: documentTypeId || null,
      content: "<h1>{{employee_name}}</h1>\n<p>Start building your template...</p>",
      variables: [],
    },
  });
  if (error) {
    const path = `/o/${orgSlug}/dashboard/documents/templates`;
    revalidatePath(path);
    redirect(`${path}?error=${encodeURIComponent(error)}`);
  }
  redirect(`/o/${orgSlug}/dashboard/documents/templates/${data?.id}`);
}

export async function deleteTemplate(formData: FormData) {
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const templateId = String(formData.get("template_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/documents/templates`;

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
