import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { Task, Ticket } from "@/lib/types";
import CalendarContent from "./CalendarContent";

export default async function CalendarPage({ params }: {
  params: Promise<{ orgSlug: string }>,
}) {
  const { orgSlug } = await params;
  await getOrganizationContextOrRedirect(orgSlug);
  const permissionsResponse = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const calendarPerm = permissionsResponse.data?.modules.find((m) => m.key === "calendar")?.permissions ?? {
    can_view: false,
    can_create: false,
    can_edit: false,
    can_delete: false,
  };
  if (!calendarPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view calendar.</p>;
  }

  const { data: tasks } = await apiRequest<Task[]>(`/api/v1/tasks`, { orgSlug });
  const { data: tickets } = await apiRequest<Ticket[]>(`/api/v1/tickets`, { orgSlug });

  return (
    <CalendarContent
      orgSlug={orgSlug}
      tasks={tasks ?? []}
      tickets={tickets ?? []}
    />
  );
}
