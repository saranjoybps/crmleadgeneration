import { notFound } from "next/navigation";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
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
  await getOrganizationContextOrRedirect(orgSlug);

  const permsRes = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const recPerm = permsRes.data?.modules.find((m) => m.key === "recruitment")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false, can_delete: false,
  };
  if (!recPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view candidates.</p>;
  }

  const { data: candidate, error: candError } = await apiRequest<Candidate>(
    `/api/v1/candidates/${candidateId}`, { orgSlug }
  );
  if (candError || !candidate) notFound();

  const { data: interviews } = await apiRequest<Interview[]>(
    `/api/v1/candidates/${candidateId}/interviews`, { orgSlug }
  );
  const { data: statusLog } = await apiRequest<StatusLogEntry[]>(
    `/api/v1/candidates/${candidateId}/status-log`, { orgSlug }
  );
  const { data: users } = await apiRequest<User[]>("/api/v1/users", { orgSlug });

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
