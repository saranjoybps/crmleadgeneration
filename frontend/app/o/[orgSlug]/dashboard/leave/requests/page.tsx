import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { getPermissions } from "@/lib/api-data";
import type { LeaveRequest } from "@/lib/types";
import RequestsContent from "./RequestsContent";

type RequestsPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
    status?: string;
    from?: string;
    to?: string;
    user_id?: string;
  }>;
};

export default async function RequestsPage({ params, searchParams }: RequestsPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const paramsObj = new URLSearchParams();
  if (query.status) paramsObj.set("status", query.status);
  if (query.from) paramsObj.set("from_date", query.from);
  if (query.to) paramsObj.set("to_date", query.to);
  if (query.user_id) paramsObj.set("user_id", query.user_id);

  const queryStr = paramsObj.toString();
  const apiPath = `/api/v1/leave-requests/all${queryStr ? `?${queryStr}` : ""}`;

  const [orgAndPerms, { data: requests, error: reqError }] = await Promise.all([
    Promise.all([getOrganizationContextOrRedirect(orgSlug), getPermissions(orgSlug)]),
    apiRequest<LeaveRequest[]>(apiPath, { orgSlug }),
  ]);

  const permsRes = orgAndPerms[1];
  const leavePerm = permsRes.data?.modules.find((m) => m.key === "leave")?.permissions ?? {
    can_view: false, can_edit: false,
  };
  if (!leavePerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission.</p>;
  }

  return (
    <RequestsContent
      orgSlug={orgSlug}
      requests={requests}
      canEdit={leavePerm.can_edit}
      queryStatus={query.status}
      queryFrom={query.from}
      queryTo={query.to}
      error={query.error}
      success={query.success}
      reqError={reqError ?? undefined}
    />
  );
}
