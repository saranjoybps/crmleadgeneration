"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Calendar, MessageSquare, Plus, Trash2, Info } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { Candidate, CandidateStatus, Interview, StatusLogEntry, User } from "@/lib/types";

import { updateCandidate, changeStatus, scheduleInterview, addFeedback, deleteInterview } from "../actions";

type ModalState = { type: "edit" } | { type: "status" } | { type: "schedule" } | { type: "feedback"; interview_id: string } | { type: "delete-interview"; interview_id: string } | null;

type CandidateDetailContentProps = {
  orgSlug: string;
  candidateId: string;
  candidate: Candidate;
  interviews: Interview[] | null | undefined;
  statusLog: StatusLogEntry[] | null | undefined;
  users: User[] | null | undefined;
  recPerm: {
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  };
  query: {
    error?: string;
    success?: string;
  };
};

const STATUS_BADGE: Record<CandidateStatus, { label: string; variant: "default" | "secondary" | "success" | "warning" | "danger" | "info" | "outline" }> = {
  applied: { label: "Applied", variant: "default" },
  screening: { label: "Screening", variant: "info" },
  interview_scheduled: { label: "Interview Scheduled", variant: "warning" },
  technical_round: { label: "Technical Round", variant: "secondary" },
  hr_round: { label: "HR Round", variant: "secondary" },
  selected: { label: "Selected", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  on_hold: { label: "On Hold", variant: "outline" },
};

const STATUS_OPTIONS: CandidateStatus[] = [
  "applied", "screening", "interview_scheduled", "technical_round",
  "hr_round", "selected", "rejected", "on_hold",
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function renderStars(rating: number | null): string {
  if (!rating) return "";
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

export function CandidateDetailContent({ orgSlug, candidateId, candidate, interviews, statusLog, users, recPerm, query }: CandidateDetailContentProps) {
  const [modal, setModal] = useState<ModalState>(null);

  const selectedInterview = useMemo(() => {
    if (modal?.type !== "feedback" && modal?.type !== "delete-interview") return undefined;
    return interviews?.find((i) => i.id === modal.interview_id);
  }, [modal, interviews]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center gap-4">
        <Link href={`/o/${orgSlug}/dashboard/candidates`}>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-main">
              {candidate.first_name} {candidate.last_name}
            </h1>
            <Badge variant={STATUS_BADGE[candidate.status]?.variant}>
              {STATUS_BADGE[candidate.status]?.label}
            </Badge>
          </div>
          <p className="text-muted mt-1">{candidate.position}</p>
        </div>
        <div className="flex items-center gap-2">
          {recPerm.can_edit && (
            <Button variant="outline" size="sm" onClick={() => setModal({ type: "edit" })}>Edit</Button>
          )}
          {recPerm.can_edit && (
            <Button size="sm" onClick={() => setModal({ type: "status" })}>Change Status</Button>
          )}
        </div>
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">Contact & Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Email</p>
                <p className="text-sm font-medium mt-1">{candidate.email}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Phone</p>
                <p className="text-sm font-medium mt-1">{candidate.phone || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Location</p>
                <p className="text-sm font-medium mt-1">{candidate.location || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Source</p>
                <p className="text-sm font-medium mt-1">{candidate.source || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Current Company</p>
                <p className="text-sm font-medium mt-1">{candidate.current_company || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Experience</p>
                <p className="text-sm font-medium mt-1">{candidate.experience_years ? `${candidate.experience_years} years` : "-"}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Expected Salary</p>
                <p className="text-sm font-medium mt-1">{candidate.expected_salary ? `$${candidate.expected_salary.toLocaleString()}` : "-"}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Added On</p>
                <p className="text-sm font-medium mt-1">{formatDate(candidate.created_at)}</p>
              </div>
            </div>
            {candidate.resume_url && (
              <div className="mt-4 pt-4 border-t border-soft">
                <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Resume</p>
                <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-800">
                  <ExternalLink className="h-4 w-4" />
                  View Resume
                </a>
              </div>
            )}
            {candidate.notes && (
              <div className="mt-4 pt-4 border-t border-soft">
                <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Notes</p>
                <p className="text-sm text-muted whitespace-pre-wrap">{candidate.notes}</p>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Interviews
              </h3>
              {recPerm.can_create && (
                <Button size="sm" className="gap-1" onClick={() => setModal({ type: "schedule" })}>
                  <Plus className="h-3.5 w-3.5" />
                  Schedule
                </Button>
              )}
            </div>
            {interviews && interviews.length > 0 ? (
              <div className="space-y-3">
                {interviews.map((interview) => (
                  <div key={interview.id} className="rounded-xl border border-soft p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="default">{interview.interview_type}</Badge>
                          <Badge variant={interview.status === "completed" ? "success" : interview.status === "cancelled" ? "danger" : "warning"}>
                            {interview.status}
                          </Badge>
                          <span className="text-xs text-muted">Round {interview.round_number}</span>
                        </div>
                        <p className="text-sm font-medium mt-2">
                          {formatDateTime(interview.scheduled_at)} ({interview.duration_minutes} min)
                        </p>
                        <p className="text-xs text-muted mt-1">
                          Interviewer: {interview.interviewer?.full_name || interview.interviewer?.email || "Unknown"}
                        </p>
                        {interview.feedback && (
                          <div className="mt-2 rounded-lg bg-slate-50 p-3">
                            <div className="flex items-center gap-2 text-amber-500 text-sm">
                              {renderStars(interview.rating)}
                            </div>
                            <p className="text-sm text-muted mt-1">{interview.feedback}</p>
                          </div>
                        )}
                        {interview.notes && (
                          <p className="text-xs text-muted mt-1 italic">Note: {interview.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-3">
                        {recPerm.can_edit && interview.status !== "completed" && interview.status !== "cancelled" && (
                          <button onClick={() => setModal({ type: "feedback", interview_id: interview.id })} title="Add feedback">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl">
                              <MessageSquare className="h-3.5 w-3.5" />
                            </Button>
                          </button>
                        )}
                        {recPerm.can_delete && (
                          <button onClick={() => setModal({ type: "delete-interview", interview_id: interview.id })} title="Cancel interview">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl hover:bg-red-50 hover:text-red-600">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted text-center py-6">No interviews scheduled yet.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">Status History</h3>
            {statusLog && statusLog.length > 0 ? (
              <div className="space-y-3">
                {statusLog.map((entry) => (
                  <div key={entry.id} className="relative pl-6 pb-3 border-l-2 border-soft last:pb-0">
                    <div className="absolute left-[-5px] top-1 h-2.5 w-2.5 rounded-full bg-violet-500" />
                    <p className="text-xs font-bold">
                      {entry.from_status ? `${entry.from_status} → ${entry.to_status}` : entry.to_status}
                    </p>
                    <p className="text-[10px] text-muted mt-0.5">
                      {entry.changed_by_user?.full_name || "Unknown"} &middot; {formatDateTime(entry.created_at)}
                    </p>
                    {entry.note && <p className="text-[10px] text-muted italic mt-0.5">{entry.note}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted text-center py-4">No status changes yet.</p>
            )}
          </Card>
        </div>
      </div>

      <Modal isOpen={modal?.type === "edit"} onClose={() => setModal(null)} title="Edit Candidate">
        <form action={updateCandidate} className="space-y-6">
          <input type="hidden" name="organization_slug" value={orgSlug} />
          <input type="hidden" name="candidate_id" value={candidateId} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" name="first_name" defaultValue={candidate.first_name} required />
            <Input label="Last Name" name="last_name" defaultValue={candidate.last_name} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" name="email" type="email" defaultValue={candidate.email} required />
            <Input label="Phone" name="phone" defaultValue={candidate.phone ?? ""} />
          </div>
          <Input label="Position" name="position" defaultValue={candidate.position} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Source" name="source" defaultValue={candidate.source ?? ""} />
            <Input label="Current Company" name="current_company" defaultValue={candidate.current_company ?? ""} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Experience (years)" name="experience_years" type="number" defaultValue={candidate.experience_years ? String(candidate.experience_years) : ""} />
            <Input label="Expected Salary" name="expected_salary" type="number" step="0.01" defaultValue={candidate.expected_salary ? String(candidate.expected_salary) : ""} />
            <Input label="Location" name="location" defaultValue={candidate.location ?? ""} />
          </div>
          <Input label="Resume URL" name="resume_url" defaultValue={candidate.resume_url ?? ""} />
          <div className="space-y-1.5">
            <label className="text-sm font-bold uppercase tracking-wider text-muted">Notes</label>
            <textarea name="notes" rows={3} defaultValue={candidate.notes ?? ""}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="flex gap-3 pt-6 border-t border-soft">
            <Button type="submit" className="flex-1 py-4">Save Changes</Button>
            <Button variant="outline" type="button" className="flex-1 py-4" onClick={() => setModal(null)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modal?.type === "status"} onClose={() => setModal(null)} title="Change Status">
        <form action={changeStatus} className="space-y-6">
          <input type="hidden" name="organization_slug" value={orgSlug} />
          <input type="hidden" name="candidate_id" value={candidateId} />
          <div className="space-y-1.5">
            <label className="text-sm font-bold uppercase tracking-wider text-muted">Current Status</label>
            <div className="h-12 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm">
              <Badge variant={STATUS_BADGE[candidate.status]?.variant}>{STATUS_BADGE[candidate.status]?.label}</Badge>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold uppercase tracking-wider text-muted">New Status</label>
            <select name="status" required
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm focus:ring-2 focus:ring-violet-500">
              {STATUS_OPTIONS.filter((s) => s !== candidate.status).map((s) => (
                <option key={s} value={s}>{STATUS_BADGE[s]?.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold uppercase tracking-wider text-muted">Note (Optional)</label>
            <textarea name="note" rows={2}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500"
              placeholder="Reason for status change..." />
          </div>
          <div className="flex gap-3 pt-6 border-t border-soft">
            <Button type="submit" className="flex-1 py-4">Update Status</Button>
            <Button variant="outline" type="button" className="flex-1 py-4" onClick={() => setModal(null)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modal?.type === "schedule"} onClose={() => setModal(null)} title="Schedule Interview">
        <form action={scheduleInterview} className="space-y-6">
          <input type="hidden" name="organization_slug" value={orgSlug} />
          <input type="hidden" name="candidate_id" value={candidateId} />
          <div className="space-y-1.5">
            <label className="text-sm font-bold uppercase tracking-wider text-muted">Interviewer</label>
            <select name="interviewer_id" required
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm focus:ring-2 focus:ring-violet-500">
              <option value="">Select interviewer...</option>
              {users?.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold uppercase tracking-wider text-muted">Date & Time</label>
            <input type="datetime-local" name="scheduled_at" required
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold uppercase tracking-wider text-muted">Duration (min)</label>
              <input type="number" name="duration" defaultValue="60"
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm focus:ring-2 focus:ring-violet-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold uppercase tracking-wider text-muted">Type</label>
              <select name="interview_type"
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm focus:ring-2 focus:ring-violet-500">
                <option value="screening">Screening</option>
                <option value="technical">Technical</option>
                <option value="hr">HR</option>
                <option value="final">Final</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold uppercase tracking-wider text-muted">Round</label>
              <input type="number" name="round_number" defaultValue="1" min="1"
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold uppercase tracking-wider text-muted">Notes (Optional)</label>
            <textarea name="notes" rows={2}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="flex gap-3 pt-6 border-t border-soft">
            <Button type="submit" className="flex-1 py-4">Schedule Interview</Button>
            <Button variant="outline" type="button" className="flex-1 py-4" onClick={() => setModal(null)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {modal?.type === "feedback" && selectedInterview && (
        <Modal isOpen={true} onClose={() => setModal(null)} title="Interview Feedback">
          <form action={addFeedback} className="space-y-6">
            <input type="hidden" name="organization_slug" value={orgSlug} />
            <input type="hidden" name="candidate_id" value={candidateId} />
            <input type="hidden" name="interview_id" value={selectedInterview.id} />
            <div className="space-y-1.5">
              <label className="text-sm font-bold uppercase tracking-wider text-muted">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((r) => (
                  <label key={r} className="flex cursor-pointer items-center gap-1 rounded-xl border border-soft px-3 py-2 text-lg hover:border-violet-300 has-[:checked]:border-violet-500 has-[:checked]:bg-violet-50">
                    <input type="radio" name="rating" value={r} defaultChecked={selectedInterview.rating === r} className="sr-only" />
                    {r}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold uppercase tracking-wider text-muted">Feedback</label>
              <textarea name="feedback" rows={4} defaultValue={selectedInterview.feedback ?? ""}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500"
                placeholder="Detailed feedback about the interview..." />
            </div>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-soft">
              <input type="checkbox" name="status" value="completed" defaultChecked id="mark_completed"
                className="h-5 w-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
              <label htmlFor="mark_completed" className="text-sm font-bold text-main cursor-pointer">Mark as Completed</label>
            </div>
            <div className="flex gap-3 pt-6 border-t border-soft">
              <Button type="submit" className="flex-1 py-4">Save Feedback</Button>
              <Button variant="outline" type="button" className="flex-1 py-4" onClick={() => setModal(null)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === "delete-interview" && selectedInterview && (
        <Modal isOpen={true} onClose={() => setModal(null)} title="Cancel Interview" size="sm">
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100 shadow-inner">
              <Trash2 className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-main tracking-tight">Cancel Interview?</h4>
              <p className="mt-2 text-xs text-muted">
                Cancel {selectedInterview.interview_type} round on {formatDateTime(selectedInterview.scheduled_at)}?
              </p>
            </div>
            <form action={deleteInterview} className="flex flex-col gap-2 px-2">
              <input type="hidden" name="organization_slug" value={orgSlug} />
              <input type="hidden" name="candidate_id" value={candidateId} />
              <input type="hidden" name="interview_id" value={selectedInterview.id} />
              <Button variant="danger" type="submit" className="py-3">Cancel Interview</Button>
              <Button variant="outline" className="w-full py-3 border-none text-muted" onClick={() => setModal(null)}>Cancel</Button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
