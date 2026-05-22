import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Plus, Edit, Trash2, Info, Megaphone, Eye, CheckCheck, Calendar, Users } from "lucide-react";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { AnnouncementTargetField } from "@/components/AnnouncementTargetField";
import { cn } from "@/lib/utils";
import type { Announcement } from "@/lib/types";

type PageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
    modal?: "create" | "edit" | "delete";
    announcement_id?: string;
  }>;
};

const PRIORITY_STYLES: Record<string, { label: string; class: string }> = {
  low: { label: "Low", class: "bg-slate-100 text-slate-600 border-slate-200" },
  medium: { label: "Medium", class: "bg-blue-50 text-blue-700 border-blue-200" },
  high: { label: "High", class: "bg-amber-50 text-amber-700 border-amber-200" },
  urgent: { label: "Urgent", class: "bg-red-50 text-red-700 border-red-200" },
};

async function createAnnouncement(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const priority = String(formData.get("priority") ?? "medium").trim();
  const targetType = String(formData.get("target_type") ?? "all").trim();
  const targetIds = formData.getAll("target_ids").map((v) => String(v));
  const path = `/o/${orgSlug}/dashboard/announcements`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_create: boolean } }> }>("/api/v1/auth/permissions", {
    orgSlug, cache: "no-store",
  });
  const canCreate = permsRes.data?.modules.find((m) => m.key === "announcement")?.permissions.can_create ?? false;
  if (!canCreate) redirect(`${path}?error=${encodeURIComponent("Insufficient permissions.")}`);

  const { error } = await apiRequest("/api/v1/announcements", {
    method: "POST",
    orgSlug,
    body: { title, content, priority, target_type: targetType, target_ids: targetIds.length ? targetIds : null },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Announcement created.")}`);
}

async function updateAnnouncement(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const announcementId = String(formData.get("announcement_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const priority = String(formData.get("priority") ?? "medium").trim();
  const targetType = String(formData.get("target_type") ?? "all").trim();
  const targetIds = formData.getAll("target_ids").map((v) => String(v));
  const path = `/o/${orgSlug}/dashboard/announcements`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>("/api/v1/auth/permissions", {
    orgSlug, cache: "no-store",
  });
  const canEdit = permsRes.data?.modules.find((m) => m.key === "announcement")?.permissions.can_edit ?? false;
  if (!canEdit) redirect(`${path}?error=${encodeURIComponent("Insufficient permissions.")}`);

  const { error } = await apiRequest(`/api/v1/announcements/${encodeURIComponent(announcementId)}`, {
    method: "PATCH",
    orgSlug,
    body: { title, content, priority, target_type: targetType, target_ids: targetIds.length ? targetIds : null },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Announcement updated.")}`);
}

async function deleteAnnouncement(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const announcementId = String(formData.get("announcement_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/announcements`;

  const permsRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_delete: boolean } }> }>("/api/v1/auth/permissions", {
    orgSlug, cache: "no-store",
  });
  const canDelete = permsRes.data?.modules.find((m) => m.key === "announcement")?.permissions.can_delete ?? false;
  if (!canDelete) redirect(`${path}?error=${encodeURIComponent("Insufficient permissions.")}`);

  const { error } = await apiRequest(`/api/v1/announcements/${encodeURIComponent(announcementId)}`, {
    method: "DELETE",
    orgSlug,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Announcement deleted.")}`);
}

async function markAsRead(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const announcementId = String(formData.get("announcement_id") ?? "").trim();

  await apiRequest(`/api/v1/announcements/${encodeURIComponent(announcementId)}/read`, {
    method: "POST",
    orgSlug,
  });

  revalidatePath(`/o/${orgSlug}/dashboard/announcements`);
}

export default async function AnnouncementsPage({ params, searchParams }: PageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  await getOrganizationContextOrRedirect(orgSlug);

  const permissionsResponse = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const perm = permissionsResponse.data?.modules.find((m) => m.key === "announcement")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false, can_delete: false,
  };
  if (!perm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view announcements.</p>;
  }

  const [announcementsRes, departmentsRes, usersRes] = await Promise.all([
    apiRequest<Announcement[]>("/api/v1/announcements", { orgSlug }),
    apiRequest<Array<{ id: string; name: string }>>("/api/v1/departments", { orgSlug }),
    apiRequest<Array<{ id: string; full_name: string; email: string }>>("/api/v1/users", { orgSlug }),
  ]);

  const announcements = announcementsRes.data ?? [];
  const departments = departmentsRes.data ?? [];
  const users = usersRes.data ?? [];

  const selectedAnnouncement = announcements.find((a) => a.id === query.announcement_id);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-main">Announcements</h1>
          <p className="text-muted">Share updates with your team.</p>
        </div>
        {perm.can_create && (
          <Link href={`/o/${orgSlug}/dashboard/announcements?modal=create`}>
            <Button size="lg" className="gap-2 shadow-lg shadow-violet-200">
              <Plus className="h-5 w-5" />
              New Announcement
            </Button>
          </Link>
        )}
      </header>

      {query.error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm">
          <Info className="h-5 w-5 text-red-500" />
          {query.error}
        </div>
      )}

      {query.success && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm">
          <Info className="h-5 w-5 text-emerald-500" />
          {query.success}
        </div>
      )}

      <div className="grid gap-4">
        {announcements.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center text-muted border-dashed border-2">
            <div className="rounded-full bg-slate-50 p-4 mb-4">
              <Megaphone className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-lg font-medium">No announcements yet</p>
            <p className="text-sm mt-1 mb-6">Create your first announcement to share with the team.</p>
            {perm.can_create && (
              <Link href={`/o/${orgSlug}/dashboard/announcements?modal=create`}>
                <Button variant="outline">Create Announcement</Button>
              </Link>
            )}
          </Card>
        ) : (
          announcements.map((ann) => {
            const priorityStyle = PRIORITY_STYLES[ann.priority] ?? PRIORITY_STYLES.medium;
            return (
              <Card key={ann.id} className={cn("group p-5 transition-all hover:border-violet-300", !ann.is_read && "border-l-4 border-l-violet-500")}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={cn("text-lg font-bold text-main truncate")}>{ann.title}</h3>
                      <Badge className={cn("text-[10px] font-black uppercase tracking-wider border", priorityStyle.class)}>
                        {priorityStyle.label}
                      </Badge>
                      {!ann.is_read && (
                        <span className="h-2 w-2 rounded-full bg-violet-500 shrink-0" title="Unread" />
                      )}
                    </div>
                    <p className="text-sm text-muted whitespace-pre-wrap line-clamp-2">{ann.content}</p>
                    <div className="flex items-center gap-4 mt-3 text-[11px] font-semibold text-muted">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(ann.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {ann.read_count ?? 0} reads
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {ann.target_type === "all" ? "Everyone" : ann.target_type === "department" ? "Department" : "Specific Users"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!ann.is_read && (
                      <form action={markAsRead}>
                        <input type="hidden" name="organization_slug" value={orgSlug} />
                        <input type="hidden" name="announcement_id" value={ann.id} />
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl" title="Mark as read">
                          <CheckCheck className="h-4 w-4 text-emerald-500" />
                        </Button>
                      </form>
                    )}
                    {perm.can_edit && (
                      <Link href={`/o/${orgSlug}/dashboard/announcements?modal=edit&announcement_id=${ann.id}`}>
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                    {perm.can_delete && (
                      <Link href={`/o/${orgSlug}/dashboard/announcements?modal=delete&announcement_id=${ann.id}`}>
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* CREATE MODAL */}
      <Modal isOpen={query.modal === "create"} closeHref={`/o/${orgSlug}/dashboard/announcements`} title="New Announcement" size="lg">
        <form action={createAnnouncement} className="space-y-6">
          <input type="hidden" name="organization_slug" value={orgSlug} />

          <Input label="Title" name="title" required placeholder="Announcement title" />

          <div className="space-y-1.5">
            <label className="text-sm font-bold uppercase tracking-wider text-muted">Content</label>
            <textarea
              name="content"
              rows={5}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500"
              placeholder="Write your announcement..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold uppercase tracking-wider text-muted">Priority</label>
            <select
              name="priority"
              defaultValue="medium"
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <AnnouncementTargetField departments={departments} users={users} />

          <div className="flex gap-3 pt-6 border-t border-soft">
            <Button type="submit" className="flex-1 py-4">Publish Announcement</Button>
            <Link href={`/o/${orgSlug}/dashboard/announcements`} className="flex-1">
              <Button variant="outline" type="button" className="w-full py-4">Cancel</Button>
            </Link>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      {selectedAnnouncement && (
        <Modal isOpen={query.modal === "edit"} closeHref={`/o/${orgSlug}/dashboard/announcements`} title="Edit Announcement" size="lg">
          <form action={updateAnnouncement} className="space-y-6">
            <input type="hidden" name="organization_slug" value={orgSlug} />
            <input type="hidden" name="announcement_id" value={selectedAnnouncement.id} />

            <Input label="Title" name="title" defaultValue={selectedAnnouncement.title} required />

            <div className="space-y-1.5">
              <label className="text-sm font-bold uppercase tracking-wider text-muted">Content</label>
              <textarea
                name="content"
                rows={5}
                required
                defaultValue={selectedAnnouncement.content}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold uppercase tracking-wider text-muted">Priority</label>
              <select
                name="priority"
                defaultValue={selectedAnnouncement.priority}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <AnnouncementTargetField
              departments={departments}
              users={users}
              initialTargetType={selectedAnnouncement.target_type}
              initialTargetIds={selectedAnnouncement.targets?.map((t) => t.target_id) ?? []}
            />

            <div className="flex gap-3 pt-6 border-t border-soft">
              <Button type="submit" className="flex-1 py-4">Save Changes</Button>
              <Link href={`/o/${orgSlug}/dashboard/announcements`} className="flex-1">
                <Button variant="outline" type="button" className="w-full py-4">Cancel</Button>
              </Link>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE MODAL */}
      {selectedAnnouncement && query.modal === "delete" && (
        <Modal isOpen={true} closeHref={`/o/${orgSlug}/dashboard/announcements`} title="Delete Announcement" size="sm">
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100 shadow-inner">
              <Trash2 className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-main tracking-tight">Delete Announcement?</h4>
              <p className="mt-2 text-xs text-muted leading-relaxed px-4">
                Are you sure you want to delete <span className="font-bold text-main">{selectedAnnouncement.title}</span>?
              </p>
            </div>
            <form action={deleteAnnouncement} className="flex flex-col gap-2 pt-4 px-2">
              <input type="hidden" name="organization_slug" value={orgSlug} />
              <input type="hidden" name="announcement_id" value={selectedAnnouncement.id} />
              <Button variant="danger" type="submit" className="py-3">Delete Permanently</Button>
              <Link href={`/o/${orgSlug}/dashboard/announcements`}>
                <Button variant="outline" className="w-full py-3 border-none text-muted">Cancel</Button>
              </Link>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
