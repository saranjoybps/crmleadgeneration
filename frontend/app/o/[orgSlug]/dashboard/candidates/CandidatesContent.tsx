"use client";

import { format } from "date-fns";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, Info, Eye, Trash2, ExternalLink, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { Candidate, CandidateStatus } from "@/lib/types";

import { createCandidate, deleteCandidate } from "./actions";

type ModalState = { type: "create" } | { type: "delete"; candidate_id: string } | null;

type CandidatesContentProps = {
  orgSlug: string;
  query: {
    error?: string;
    success?: string;
    search?: string;
    status?: string;
  };
  candidates: Candidate[] | undefined;
  candidatesError: string | undefined;
  recPerm: {
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
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

export function CandidatesContent({ orgSlug, query, candidates, candidatesError, recPerm }: CandidatesContentProps) {
  const [modal, setModal] = useState<ModalState>(null);

  const selectedCandidate = useMemo(() => {
    if (modal?.type !== "delete") return undefined;
    return candidates?.find((c) => c.id === modal.candidate_id);
  }, [modal, candidates]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-main">Candidates</h1>
          <p className="text-muted">Manage recruitment and candidate pipeline.</p>
        </div>
        {recPerm.can_create && (
          <Button size="lg" className="gap-2 shadow-lg shadow-violet-200" onClick={() => setModal({ type: "create" })}>
            <Plus className="h-5 w-5" />
            Add Candidate
          </Button>
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

      {candidatesError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{candidatesError}</div>
      )}

      <Card className="p-4">
        <form className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                name="search"
                defaultValue={query.search}
                placeholder="Name, email, position..."
                className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1 block">Status</label>
            <select name="status" defaultValue={query.status}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-violet-500">
              <option value="">All</option>
              <option value="applied">Applied</option>
              <option value="screening">Screening</option>
              <option value="interview_scheduled">Interview Scheduled</option>
              <option value="technical_round">Technical Round</option>
              <option value="hr_round">HR Round</option>
              <option value="selected">Selected</option>
              <option value="rejected">Rejected</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
          <Button type="submit" size="sm" className="gap-2">
            <Search className="h-4 w-4" />
            Filter
          </Button>
          <Link href={`/o/${orgSlug}/dashboard/candidates`}>
            <Button variant="ghost" size="sm">Clear</Button>
          </Link>
        </form>
      </Card>

      <Card className="p-6">
        {candidates && candidates.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-soft text-left text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Position</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Experience</th>
                  <th className="pb-3 pr-4">Date Added</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => (
                  <tr key={candidate.id} className="border-b border-soft/50 last:border-0 hover:bg-slate-50/50">
                    <td className="py-3 pr-4 font-medium">
                      <Link href={`/o/${orgSlug}/dashboard/candidates/${candidate.id}`} className="hover:text-violet-600 transition-colors">
                        {candidate.first_name} {candidate.last_name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-muted">{candidate.email}</td>
                    <td className="py-3 pr-4 text-muted">{candidate.position}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={STATUS_BADGE[candidate.status]?.variant}>
                        {STATUS_BADGE[candidate.status]?.label}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-muted">
                      {candidate.experience_years ? `${candidate.experience_years}y` : "-"}
                    </td>
                    <td className="py-3 pr-4 text-muted">
                      {format(new Date(candidate.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/o/${orgSlug}/dashboard/candidates/${candidate.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        {recPerm.can_delete && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl hover:bg-red-50 hover:text-red-600" onClick={() => setModal({ type: "delete", candidate_id: candidate.id })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 text-center text-muted">
            <UserPlus className="h-10 w-10 mb-3 text-slate-300" />
            <p className="text-lg font-medium">No candidates found</p>
            <p className="text-sm mt-1 mb-4">
              {query.search || query.status ? "Try different filters." : "Start by adding a new candidate."}
            </p>
            {recPerm.can_create && !query.search && !query.status && (
              <Button variant="outline" onClick={() => setModal({ type: "create" })}>Add your first candidate</Button>
            )}
          </div>
        )}
      </Card>

      <Modal isOpen={modal?.type === "create"} onClose={() => setModal(null)} title="Add Candidate">
        <form action={createCandidate} className="space-y-6">
          <input type="hidden" name="organization_slug" value={orgSlug} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" name="first_name" required placeholder="John" />
            <Input label="Last Name" name="last_name" required placeholder="Doe" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" name="email" type="email" required placeholder="john@example.com" />
            <Input label="Phone" name="phone" placeholder="+1 234 567 890" />
          </div>
          <Input label="Position Applied For" name="position" required placeholder="Software Engineer" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Source" name="source" placeholder="LinkedIn, Referral, etc." />
            <Input label="Current Company" name="current_company" placeholder="Acme Corp" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Experience (years)" name="experience_years" type="number" placeholder="5" />
            <Input label="Expected Salary" name="expected_salary" type="number" step="0.01" placeholder="75000" />
            <Input label="Location" name="location" placeholder="New York, NY" />
          </div>
          <Input label="Resume URL" name="resume_url" placeholder="https://drive.google.com/..." />
          <div className="space-y-1.5">
            <label className="text-sm font-bold uppercase tracking-wider text-muted">Notes</label>
            <textarea name="notes" rows={3}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500"
              placeholder="Additional details..." />
          </div>
          <div className="flex gap-3 pt-6 border-t border-soft">
            <Button type="submit" className="flex-1 py-4">Add Candidate</Button>
            <Button variant="outline" type="button" className="flex-1 py-4" onClick={() => setModal(null)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {selectedCandidate && modal?.type === "delete" && (
        <Modal isOpen={true} onClose={() => setModal(null)} title="Delete Candidate" size="sm">
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100 shadow-inner">
              <Trash2 className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-main tracking-tight">Delete Candidate?</h4>
              <p className="mt-2 text-xs text-muted">
                Delete {selectedCandidate.first_name} {selectedCandidate.last_name}?
              </p>
            </div>
            <form action={deleteCandidate} className="flex flex-col gap-2 px-2">
              <input type="hidden" name="organization_slug" value={orgSlug} />
              <input type="hidden" name="candidate_id" value={selectedCandidate.id} />
              <Button variant="danger" type="submit" className="py-3">Delete</Button>
              <Button variant="outline" className="w-full py-3 border-none text-muted" onClick={() => setModal(null)}>Cancel</Button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
