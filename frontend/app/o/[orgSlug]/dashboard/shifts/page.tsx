import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import type { Shift, UserShiftAssignment, User } from "@/lib/types";
import ShiftsContent from "./ShiftsContent";

export default async function ShiftsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { orgSlug } = await params;
  const query = await searchParams;
  await getOrganizationContextOrRedirect(orgSlug);

  const permsRes = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const shiftPerm = permsRes.data?.modules.find((m) => m.key === "shift")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false, can_delete: false,
  };
  if (!shiftPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to manage shifts.</p>;
  }

  const { data: shifts, error: shiftsError } = await apiRequest<Shift[]>("/api/v1/shifts", { orgSlug });
  const { data: assignments } = await apiRequest<UserShiftAssignment[]>("/api/v1/shift-assignments", { orgSlug });
  const { data: users } = await apiRequest<User[]>("/api/v1/users", { orgSlug });

  return (
    <ShiftsContent
      orgSlug={orgSlug}
      query={query}
      shifts={shifts}
      assignments={assignments}
      users={users}
      shiftPerm={shiftPerm}
      shiftsError={shiftsError}
    />
  );
}
