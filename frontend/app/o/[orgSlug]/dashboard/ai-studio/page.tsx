import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { apiRequest } from "@/lib/api-server";
import AiStudioContent from "./AiStudioContent";

type PageProps = {
  params: Promise<{ orgSlug: string }>;
};

export default async function AiStudioPage({ params }: PageProps) {
  const { orgSlug } = await params;
  await getOrganizationContextOrRedirect(orgSlug);

  const permissionsResponse = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });

  const perm = permissionsResponse.data?.modules.find((m) => m.key === "ai-studio")?.permissions ?? {
    can_view: true,
    can_create: true,
    can_edit: true,
    can_delete: true,
  };

  if (!perm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view AI Studio.</p>;
  }

  return <AiStudioContent />;
}
