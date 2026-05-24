import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import VaultContent from "./VaultContent";
import type { CredentialRow, UserRow } from "./VaultContent";

type VaultPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    category?: string;
    modal?: "create" | "detail" | "delete" | "share";
    credential_id?: string;
    reveal?: "1";
    error?: string;
    success?: string;
  }>;
};

export default async function VaultPage({ params, searchParams }: VaultPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  await getOrganizationContextOrRedirect(orgSlug);

  const permsRes = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const vaultPerm = permsRes.data?.modules.find((m) => m.key === "vault")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false, can_delete: false,
  };
  if (!vaultPerm.can_view) return <p className="p-6 text-red-600">You do not have permission to view vault credentials.</p>;

  const queryParams = new URLSearchParams();
  if (query.q) queryParams.set("q", query.q);
  if (query.status) queryParams.set("status", query.status);
  if (query.category) queryParams.set("category", query.category);

  const [credentialsRes, usersRes] = await Promise.all([
    apiRequest<CredentialRow[]>(`/api/v1/vault?${queryParams.toString()}`, { orgSlug }),
    apiRequest<UserRow[]>("/api/v1/users?limit=200&offset=0", { orgSlug }),
  ]);

  const credentials = credentialsRes.data ?? [];
  const users = usersRes.data ?? [];
  const selected = credentials.find((c) => c.id === query.credential_id);
  const detailRes = selected && query.reveal === "1"
    ? await apiRequest<CredentialRow>(`/api/v1/vault/${encodeURIComponent(selected.id)}`, { orgSlug, headers: { "X-Reveal-Password": "true" } })
    : null;
  const selectedDetail = (detailRes?.data as CredentialRow | null) ?? selected ?? null;
  const sharesRes = query.modal === "share" && selected
    ? await apiRequest<Array<{ user_id: string; access: "grant" | "deny"; user?: { id: string; email: string; full_name?: string } }>>(`/api/v1/vault/${encodeURIComponent(selected.id)}/shares`, { orgSlug })
    : null;
  const shares = sharesRes?.data ?? [];
  const shareMap = new Map(shares.map((s) => [s.user_id, s.access]));

  return (
    <VaultContent
      orgSlug={orgSlug}
      query={query}
      credentials={credentials}
      users={users}
      vaultPerm={vaultPerm}
      selected={selected}
      selectedDetail={selectedDetail}
      shares={shares}
      shareMap={shareMap}
    />
  );
}
