import { notFound } from "next/navigation";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { getPermissions } from "@/lib/api-data";
import type { Candidate, Interview, StatusLogEntry, User } from "@/lib/types";

import { CandidateDetailContent } from "./CandidateDetailContent";

type CandidateDetailPageProps = {
  params: Promise<{ orgSlug: string; id: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function CandidateDetailPage({ params, searchParams }: CandidateDetailPageProps) {
  const { orgSlug, id: candidateId } = await params;
  const query = await searchParams;
  const [orgAndPerms, { data: candidate, error: candError }, { data: interviews }, { data: statusLog }, { data: users }] = await Promise.all([
    Promise.all([getOrganizationContextOrRedirect(orgSlug), getPermissions(orgSlug)]),
    apiRequest<Candidate>(`/api/v1/candidates/${candidateId}`, { orgSlug }),
    apiRequest<Interview[]>(`/api/v1/candidates/${candidateId}/interviews`, { orgSlug }),
    apiRequest<StatusLogEntry[]>(`/api/v1/candidates/${candidateId}/status-log`, { orgSlug }),
    apiRequest<User[]>("/api/v1/users", { orgSlug }),
  ]);

  const permsRes = orgAndPerms[1];
  const recPerm = permsRes.data?.modules.find((m) => m.key === "recruitment")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false, can_delete: false,
  };
  if (!recPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view candidates.</p>;
  }

  if (candError || !candidate) notFound();

  return (
    <CandidateDetailContent
      orgSlug={orgSlug}
      candidateId={candidateId}
      candidate={candidate}
      interviews={interviews}
      statusLog={statusLog}
      users={users}
      recPerm={recPerm}
      query={query}
    />
  );
}
