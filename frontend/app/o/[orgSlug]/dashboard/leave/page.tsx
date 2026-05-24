import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import type { LeaveBalance, LeaveRequest, LeaveType } from "@/lib/types";
import LeaveContent from "./LeaveContent";

type LeavePageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function LeavePage({ params, searchParams }: LeavePageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  await getOrganizationContextOrRedirect(orgSlug);

  const permsRes = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const leavePerm = permsRes.data?.modules.find((m) => m.key === "leave")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false,
  };
  if (!leavePerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view leave.</p>;
  }

  const { data: balances } = await apiRequest<LeaveBalance[]>("/api/v1/leave-balances", { orgSlug });
  const { data: myRequests } = await apiRequest<LeaveRequest[]>("/api/v1/leave-requests", { orgSlug });
  const { data: leaveTypes } = await apiRequest<LeaveType[]>("/api/v1/leave-types", { orgSlug, cache: "no-store" });

  return (
    <LeaveContent
      orgSlug={orgSlug}
      balances={balances}
      myRequests={myRequests}
      leaveTypes={leaveTypes}
      canCreate={leavePerm.can_create}
      error={query.error}
      success={query.success}
    />
  );
}
