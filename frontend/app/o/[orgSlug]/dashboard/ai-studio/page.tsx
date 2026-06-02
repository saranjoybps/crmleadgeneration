import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { getPermissions } from "@/lib/api-data";
import AiStudioContent from "./AiStudioContent";

type PageProps = {
  params: Promise<{ orgSlug: string }>;
};

export default async function AiStudioPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const [, permissionsResponse] = await Promise.all([
    getOrganizationContextOrRedirect(orgSlug),
    getPermissions(orgSlug),
  ]);

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
