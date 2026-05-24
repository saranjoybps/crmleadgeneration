"use client";

import { format } from "date-fns";
import { useState } from "react";
import { Plus, Edit, Trash2, Info, Megaphone, Eye, CheckCheck, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { AnnouncementTargetField } from "@/components/AnnouncementTargetField";
import { cn } from "@/lib/utils";
import type { Announcement } from "@/lib/types";
import { createAnnouncement, updateAnnouncement, deleteAnnouncement, markAsRead } from "./actions";

type ModalState = { type: "create" } | { type: "edit"; announcement_id: string } | { type: "delete"; announcement_id: string } | null;

const PRIORITY_STYLES: Record<string, { label: string; class: string }> = {
  low: { label: "Low", class: "bg-slate-100 text-slate-600 border-slate-200" },
  medium: { label: "Medium", class: "bg-blue-50 text-blue-700 border-blue-200" },
  high: { label: "High", class: "bg-amber-50 text-amber-700 border-amber-200" },
  urgent: { label: "Urgent", class: "bg-red-50 text-red-700 border-red-200" },
};

type Props = {
  announcements: Announcement[];
  departments: Array<{ id: string; name: string }>;
  users: Array<{ id: string; full_name: string; email: string }>;
  orgSlug: string;
  perm: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean };
  error?: string;
  success?: string;
};

export function AnnouncementsContent({ announcements, departments, users, orgSlug, perm, error, success }: Props) {
  const [modal, setModal] = useState<ModalState>(null);

  const selectedAnnouncement = (modal?.type === "edit" || modal?.type === "delete")
    ? announcements.find((a) => a.id === modal.announcement_id)
    : undefined;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-main">Announcements</h1>
          <p className="text-muted">Share updates with your team.</p>
        </div>
        {perm.can_create && (
          <Button size="lg" className="gap-2 shadow-lg shadow-violet-200" onClick={() => setModal({ type: "create" })}>
            <Plus className="h-5 w-5" />
            New Announcement
          </Button>
        )}
      </header>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm">
          <Info className="h-5 w-5 text-red-500" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm">
          <Info className="h-5 w-5 text-emerald-500" />
          {success}
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
              <Button variant="outline" onClick={() => setModal({ type: "create" })}>Create Announcement</Button>
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
                        {format(new Date(ann.created_at), "MMM d, yyyy")}
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
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl" onClick={() => setModal({ type: "edit", announcement_id: ann.id })}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {perm.can_delete && (
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl hover:bg-red-50 hover:text-red-600" onClick={() => setModal({ type: "delete", announcement_id: ann.id })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* CREATE MODAL */}
      <Modal isOpen={modal?.type === "create"} onClose={() => setModal(null)} title="New Announcement" size="lg">
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
            <Button variant="outline" type="button" className="flex-1 py-4" onClick={() => setModal(null)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      {selectedAnnouncement && (
        <Modal isOpen={modal?.type === "edit"} onClose={() => setModal(null)} title="Edit Announcement" size="lg">
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
              <Button variant="outline" type="button" className="flex-1 py-4" onClick={() => setModal(null)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE MODAL */}
      {selectedAnnouncement && modal?.type === "delete" && (
        <Modal isOpen={true} onClose={() => setModal(null)} title="Delete Announcement" size="sm">
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
              <Button variant="outline" type="button" className="w-full py-3 border-none text-muted" onClick={() => setModal(null)}>Cancel</Button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
