import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import type { LeaveType } from "@/lib/types";
import TypesContent from "./TypesContent";

type TypesPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function TypesPage({ params, searchParams }: TypesPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  await getOrganizationContextOrRedirect(orgSlug);

  const permsRes = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const leavePerm = permsRes.data?.modules.find((m) => m.key === "leave")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false, can_delete: false,
  };
  if (!leavePerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission.</p>;
  }

  const { data: leaveTypes } = await apiRequest<LeaveType[]>("/api/v1/leave-types", { orgSlug });

  return (
    <TypesContent
      orgSlug={orgSlug}
      leaveTypes={leaveTypes}
      canCreate={leavePerm.can_create}
      canEdit={leavePerm.can_edit}
      canDelete={leavePerm.can_delete}
      error={query.error}
      success={query.success}
    />
  );
}
