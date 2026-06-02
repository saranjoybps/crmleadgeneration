import { apiRequest } from "@/lib/api-server";
import { getPermissions } from "@/lib/api-data";
import { AnnouncementsContent } from "./AnnouncementsContent";
import type { Announcement } from "@/lib/types";

type PageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function AnnouncementsPage({ params, searchParams }: PageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;

  const [permissionsResponse, announcementsRes, departmentsRes, usersRes] = await Promise.all([
    getPermissions(orgSlug),
    apiRequest<Announcement[]>("/api/v1/announcements", { orgSlug }),
    apiRequest<Array<{ id: string; name: string }>>("/api/v1/departments", { orgSlug }),
    apiRequest<Array<{ id: string; full_name: string; email: string }>>("/api/v1/users", { orgSlug }),
  ]);

  const perm = permissionsResponse.data?.modules.find((m) => m.key === "announcement")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false, can_delete: false,
  };
  if (!perm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view announcements.</p>;
  }

  const announcements = announcementsRes.data ?? [];
  const departments = departmentsRes.data ?? [];
  const users = usersRes.data ?? [];

  return (
    <AnnouncementsContent
      announcements={announcements}
      departments={departments}
      users={users}
      orgSlug={orgSlug}
      perm={perm}
      error={query.error}
      success={query.success}
    />
  );
}
