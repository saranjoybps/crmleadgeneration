import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import type { AttendanceRecord } from "@/lib/types";
import HistoryContent from "./HistoryContent";

type HistoryPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
    from?: string;
    to?: string;
    status?: string;
    user_id?: string;
    all?: string;
  }>;
};

export default async function HistoryPage({ params, searchParams }: HistoryPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  await getOrganizationContextOrRedirect(orgSlug);

  const permsRes = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_edit: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const attPerm = permsRes.data?.modules.find((m) => m.key === "attendance")?.permissions ?? {
    can_view: false, can_edit: false, can_delete: false,
  };
  if (!attPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view attendance records.</p>;
  }

  const showAll = query.all === "true" && (permsRes.data?.modules.find((m) => m.key === "users")?.permissions.can_view ?? false);
  const canViewAllUsers = permsRes.data?.modules.find((m) => m.key === "users")?.permissions.can_view ?? false;

  const paramsObj = new URLSearchParams();
  if (query.from) paramsObj.set("from_date", query.from);
  if (query.to) paramsObj.set("to_date", query.to);
  if (query.status) paramsObj.set("status", query.status);
  if (query.user_id) paramsObj.set("user_id", query.user_id);

  const apiPath = showAll
    ? `/api/v1/attendance/records/all?${paramsObj.toString()}`
    : `/api/v1/attendance/records?${paramsObj.toString()}`;

  const { data: records, error: recordsError } = await apiRequest<AttendanceRecord[]>(apiPath, { orgSlug });

  return (
    <HistoryContent
      orgSlug={orgSlug}
      records={records}
      showAll={showAll}
      canEdit={attPerm.can_edit}
      canDelete={attPerm.can_delete}
      canViewAllUsers={canViewAllUsers}
      queryFrom={query.from}
      queryTo={query.to}
      queryStatus={query.status}
      error={query.error}
      success={query.success}
      recordsError={recordsError ?? undefined}
    />
  );
}
