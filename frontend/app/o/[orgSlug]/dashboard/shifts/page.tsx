import { apiRequest } from "@/lib/api-server";
import { getPermissions } from "@/lib/api-data";
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

  const [permsRes, { data: shifts, error: shiftsError }, { data: assignments }, { data: users }] = await Promise.all([
    getPermissions(orgSlug),
    apiRequest<Shift[]>("/api/v1/shifts", { orgSlug }),
    apiRequest<UserShiftAssignment[]>("/api/v1/shift-assignments", { orgSlug }),
    apiRequest<User[]>("/api/v1/users", { orgSlug }),
  ]);

  const shiftPerm = permsRes.data?.modules.find((m) => m.key === "shift")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false, can_delete: false,
  };
  if (!shiftPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to manage shifts.</p>;
  }

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
