import { apiRequest } from "@/lib/api-server";
import { getPermissions } from "@/lib/api-data";
import type { Candidate } from "@/lib/types";

import { CandidatesContent } from "./CandidatesContent";

type CandidatesPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
    search?: string;
    status?: string;
  }>;
};

export default async function CandidatesPage({ params, searchParams }: CandidatesPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;

  const paramsObj = new URLSearchParams();
  if (query.search) paramsObj.set("search", query.search);
  if (query.status) paramsObj.set("status", query.status);

  const [permsRes, { data: candidates, error: candidatesError }] = await Promise.all([
    getPermissions(orgSlug),
    apiRequest<Candidate[]>(`/api/v1/candidates?${paramsObj.toString()}`, { orgSlug }),
  ]);

  const recPerm = permsRes.data?.modules.find((m) => m.key === "recruitment")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false, can_delete: false,
  };
  if (!recPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view candidates.</p>;
  }

  return (
    <CandidatesContent
      orgSlug={orgSlug}
      query={query}
      candidates={candidates ?? undefined}
      candidatesError={candidatesError ?? undefined}
      recPerm={recPerm}
    />
  );
}
