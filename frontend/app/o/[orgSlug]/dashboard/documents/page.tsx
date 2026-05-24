import { apiRequest } from "@/lib/api-server";
import DocumentsContent from "./DocumentsContent";
import type { GeneratedDocument } from "@/lib/types";

type DocumentsPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
    search?: string;
    document_type_id?: string;
    employee_id?: string;
    date_from?: string;
    date_to?: string;
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

export default async function DocumentsPage({ params, searchParams }: DocumentsPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;

  const docsPath = buildUrl("/api/v1/documents", {
    search: query.search,
    document_type_id: query.document_type_id,
    employee_id: query.employee_id,
    date_from: query.date_from,
    date_to: query.date_to,
  });

  const [permissionsRes, docsRes, typesRes] = await Promise.all([
    apiRequest<{ modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }> }>(
      "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
    ),
    apiRequest<GeneratedDocument[]>(docsPath, { orgSlug, cache: "no-store" }),
    apiRequest<Array<{ id: string; name: string; key: string }>>("/api/v1/document-types", {
      orgSlug,
      cache: "no-store",
    }),
  ]);

  const docPerm = permissionsRes.data?.modules.find((m) => m.key === "documents")?.permissions;
  const canView = docPerm?.can_view ?? false;
  const canCreate = docPerm?.can_create ?? false;
  const canDelete = docPerm?.can_delete ?? false;

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64 text-muted">
        <p>You do not have permission to view documents.</p>
      </div>
    );
  }

  const docs = docsRes.data ?? [];
  const docTypes = typesRes.data ?? [];
  const baseUrl = `/o/${orgSlug}/dashboard/documents`;

  return (
    <DocumentsContent
      orgSlug={orgSlug}
      docs={docs}
      docTypes={docTypes}
      canCreate={canCreate}
      canDelete={canDelete}
      baseUrl={baseUrl}
      search={query.search ?? ""}
      document_type_id={query.document_type_id ?? ""}
      date_from={query.date_from ?? ""}
      date_to={query.date_to ?? ""}
      error={query.error ?? ""}
      success={query.success ?? ""}
    />
  );
}
