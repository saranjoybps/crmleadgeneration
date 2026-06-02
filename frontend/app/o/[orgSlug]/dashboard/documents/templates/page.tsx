import { apiRequest } from "@/lib/api-server";
import { getPermissions } from "@/lib/api-data";
import TemplatesContent from "./TemplatesContent";
import type { DocumentTemplate } from "@/lib/types";

type TemplatesPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
    search?: string;
    document_type_id?: string;
  }>;
};

function buildUrl(base: string, params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  const qstr = qs.toString();
  return qstr ? `${base}?${qstr}` : base;
}

export default async function TemplatesPage({ params, searchParams }: TemplatesPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;

  const templatesPath = buildUrl("/api/v1/document-templates", {
    search: query.search,
    document_type_id: query.document_type_id,
  });

  const [permissionsRes, templatesRes, typesRes] = await Promise.all([
    getPermissions(orgSlug),
    apiRequest<DocumentTemplate[]>(templatesPath, { orgSlug }),
    apiRequest<Array<{ id: string; name: string; key: string }>>("/api/v1/document-types", { orgSlug }),
  ]);

  const docPerm = permissionsRes.data?.modules.find((m) => m.key === "documents")?.permissions;
  const canView = docPerm?.can_view ?? false;
  const canCreate = docPerm?.can_create ?? false;
  const canEdit = docPerm?.can_edit ?? false;
  const canDelete = docPerm?.can_delete ?? false;

  if (!canView) {
    return <p className="p-6 text-red-600">You do not have permission to view document templates.</p>;
  }

  const templates = templatesRes.data ?? [];
  const docTypes = typesRes.data ?? [];
  const baseUrl = `/o/${orgSlug}/dashboard/documents/templates`;

  return (
    <TemplatesContent
      orgSlug={orgSlug}
      templates={templates}
      docTypes={docTypes}
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
      baseUrl={baseUrl}
      search={query.search ?? ""}
      document_type_id={query.document_type_id ?? ""}
      error={query.error ?? ""}
      success={query.success ?? ""}
    />
  );
}
