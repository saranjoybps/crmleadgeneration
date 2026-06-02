import { apiRequest } from "@/lib/api-server";
import { getPermissions } from "@/lib/api-data";
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
    error?: string;
    success?: string;
  }>;
};

export default async function VaultPage({ params, searchParams }: VaultPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;

  const queryParams = new URLSearchParams();
  if (query.q) queryParams.set("q", query.q);
  if (query.status) queryParams.set("status", query.status);
  if (query.category) queryParams.set("category", query.category);

  const [permsRes, credentialsRes, usersRes] = await Promise.all([
    getPermissions(orgSlug),
    apiRequest<CredentialRow[]>(`/api/v1/vault?${queryParams.toString()}`, { orgSlug }),
    apiRequest<UserRow[]>("/api/v1/users?limit=200&offset=0", { orgSlug }),
  ]);

  const vaultPerm = permsRes.data?.modules.find((m) => m.key === "vault")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false, can_delete: false,
  };
  const credentials = credentialsRes.data ?? [];
  const users = usersRes.data ?? [];

  if (!vaultPerm.can_view) return <p className="p-6 text-red-600">You do not have permission to view vault credentials.</p>;

  return (
    <VaultContent
      orgSlug={orgSlug}
      query={query}
      credentials={credentials}
      users={users}
      vaultPerm={vaultPerm}
    />
  );
}
