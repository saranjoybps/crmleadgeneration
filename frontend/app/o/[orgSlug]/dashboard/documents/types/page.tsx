import { apiRequest } from "@/lib/api-server";
import { getPermissions } from "@/lib/api-data";
import TypesContent from "./TypesContent";
import type { DocumentType } from "@/lib/types";

type DocumentTypesPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function DocumentTypesPage({ params, searchParams }: DocumentTypesPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;

  const [permissionsRes, typesRes] = await Promise.all([
    getPermissions(orgSlug),
    apiRequest<DocumentType[]>("/api/v1/document-types", { orgSlug }),
  ]);

  const docPerm = permissionsRes.data?.modules.find((m) => m.key === "documents")?.permissions;
  const canView = docPerm?.can_view ?? false;
  const canCreate = docPerm?.can_create ?? false;
  const canDelete = docPerm?.can_delete ?? false;

  if (!canView) {
    return <p className="p-6 text-red-600">You do not have permission to view document types.</p>;
  }

  const types = typesRes.data ?? [];
  const baseUrl = `/o/${orgSlug}/dashboard/documents/types`;

  return (
    <TypesContent
      orgSlug={orgSlug}
      types={types}
      canCreate={canCreate}
      canDelete={canDelete}
      baseUrl={baseUrl}
      error={query.error ?? ""}
      success={query.success ?? ""}
    />
  );
}
