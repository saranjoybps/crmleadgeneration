import { apiRequest } from "@/lib/api-server";
import { getPermissions } from "@/lib/api-data";
import { Task, Ticket, Milestone } from "@/lib/types";
import CalendarContent from "./CalendarContent";

export default async function CalendarPage({ params }: {
  params: Promise<{ orgSlug: string }>,
}) {
  const { orgSlug } = await params;

  const [permissionsResponse, { data: tasks }, { data: tickets }, { data: milestones }] = await Promise.all([
    getPermissions(orgSlug),
    apiRequest<Task[]>(`/api/v1/tasks`, { orgSlug }),
    apiRequest<Ticket[]>(`/api/v1/tickets`, { orgSlug }),
    apiRequest<Milestone[]>(`/api/v1/milestones`, { orgSlug }),
  ]);

  const calendarPerm = permissionsResponse.data?.modules.find((m) => m.key === "calendar")?.permissions ?? {
    can_view: false,
    can_create: false,
    can_edit: false,
    can_delete: false,
  };
  if (!calendarPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view calendar.</p>;
  }

  return (
    <CalendarContent
      orgSlug={orgSlug}
      tasks={tasks ?? []}
      tickets={tickets ?? []}
      milestones={milestones ?? []}
    />
  );
}
