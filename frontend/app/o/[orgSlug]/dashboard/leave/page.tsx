import { apiRequest } from "@/lib/api-server";
import { getPermissions } from "@/lib/api-data";
import type { LeaveBalance, LeaveRequest, LeaveType } from "@/lib/types";
import LeaveContent from "./LeaveContent";

type LeavePageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function LeavePage({ params, searchParams }: LeavePageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;

  const [permsRes, { data: balances }, { data: myRequests }, { data: leaveTypes }] = await Promise.all([
    getPermissions(orgSlug),
    apiRequest<LeaveBalance[]>("/api/v1/leave-balances", { orgSlug }),
    apiRequest<LeaveRequest[]>("/api/v1/leave-requests", { orgSlug }),
    apiRequest<LeaveType[]>("/api/v1/leave-types", { orgSlug }),
  ]);

  const leavePerm = permsRes.data?.modules.find((m) => m.key === "leave")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false,
  };
  if (!leavePerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view leave.</p>;
  }

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
