import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
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

  const paramsObj = new URLSearchParams();
  if (query.search) paramsObj.set("search", query.search);
  if (query.status) paramsObj.set("status", query.status);

  const { data: candidates, error: candidatesError } = await apiRequest<Candidate[]>(
    `/api/v1/candidates?${paramsObj.toString()}`, { orgSlug }
  );

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
