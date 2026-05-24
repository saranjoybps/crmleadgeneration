import { apiRequest } from "@/lib/api-server";
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
    apiRequest<{ modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }> }>(
      "/api/v1/auth/permissions", { orgSlug, cache: "no-store" }
    ),
    apiRequest<DocumentType[]>("/api/v1/document-types", { orgSlug, cache: "no-store" }),
  ]);

  const docPerm = permissionsRes.data?.modules.find((m) => m.key === "documents")?.permissions;
  const canCreate = docPerm?.can_create ?? false;
  const canDelete = docPerm?.can_delete ?? false;

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
