import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Eye, EyeOff, KeyRound, Plus, Search, Share2, Trash2 } from "lucide-react";

import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";

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

type CredentialRow = {
  id: string;
  label: string;
  username?: string;
  email_id?: string;
  notes?: string;
  login_url?: string;
  category?: string;
  tags: string[];
  status: "active" | "archived" | "disabled";
  created_by?: string;
  created_at: string;
  updated_at: string;
  password?: string | null;
  password_masked: string;
};

type UserRow = { id: string; email: string; full_name?: string };

async function createCredential(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "");
  const path = `/o/${orgSlug}/dashboard/vault`;

  const permRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_create: boolean } }> }>("/api/v1/auth/permissions", { orgSlug });
  const canCreate = permRes.data?.modules.find((m) => m.key === "vault")?.permissions.can_create;
  if (!canCreate) redirect(`${path}?error=${encodeURIComponent("You do not have permission to create credentials.")}`);

  const body = {
    label: String(formData.get("label") ?? ""),
    username: String(formData.get("username") ?? "") || null,
    email_id: String(formData.get("email_id") ?? "") || null,
    password: String(formData.get("password") ?? ""),
    notes: String(formData.get("notes") ?? "") || null,
    login_url: String(formData.get("login_url") ?? "") || null,
    category: String(formData.get("category") ?? "") || null,
    tags: String(formData.get("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    status: String(formData.get("status") ?? "active"),
  };
  const { error } = await apiRequest("/api/v1/vault", { method: "POST", orgSlug, body });
  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Credential created.")}`);
}

async function updateCredential(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "");
  const credentialId = String(formData.get("credential_id") ?? "");
  const path = `/o/${orgSlug}/dashboard/vault`;

  const permRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>("/api/v1/auth/permissions", { orgSlug });
  const canEdit = permRes.data?.modules.find((m) => m.key === "vault")?.permissions.can_edit;
  if (!canEdit) redirect(`${path}?error=${encodeURIComponent("You do not have permission to update credentials.")}`);

  const body = {
    label: String(formData.get("label") ?? ""),
    username: String(formData.get("username") ?? "") || null,
    email_id: String(formData.get("email_id") ?? "") || null,
    password: String(formData.get("password") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || null,
    login_url: String(formData.get("login_url") ?? "") || null,
    category: String(formData.get("category") ?? "") || null,
    tags: String(formData.get("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    status: String(formData.get("status") ?? "active"),
  };
  const { error } = await apiRequest(`/api/v1/vault/${encodeURIComponent(credentialId)}`, { method: "PATCH", orgSlug, body });
  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Credential updated.")}`);
}

async function deleteCredential(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "");
  const credentialId = String(formData.get("credential_id") ?? "");
  const path = `/o/${orgSlug}/dashboard/vault`;

  const permRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_delete: boolean } }> }>("/api/v1/auth/permissions", { orgSlug });
  const canDelete = permRes.data?.modules.find((m) => m.key === "vault")?.permissions.can_delete;
  if (!canDelete) redirect(`${path}?error=${encodeURIComponent("You do not have permission to delete credentials.")}`);

  const { error } = await apiRequest(`/api/v1/vault/${encodeURIComponent(credentialId)}`, { method: "DELETE", orgSlug });
  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Credential deleted.")}`);
}

async function updateShare(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "");
  const credentialId = String(formData.get("credential_id") ?? "");
  const path = `/o/${orgSlug}/dashboard/vault?modal=share&credential_id=${credentialId}`;

  const permRes = await apiRequest<{ modules: Array<{ key: string; permissions: { can_edit: boolean } }> }>("/api/v1/auth/permissions", { orgSlug });
  const canEdit = permRes.data?.modules.find((m) => m.key === "vault")?.permissions.can_edit;
  if (!canEdit) redirect(`${path}&error=${encodeURIComponent("You do not have permission to share credentials.")}`);

  const body = {
    user_id: String(formData.get("user_id") ?? ""),
    access: String(formData.get("access") ?? "grant"),
  };
  const { error } = await apiRequest(`/api/v1/vault/${encodeURIComponent(credentialId)}/shares`, { method: "POST", orgSlug, body });
  if (error) redirect(`${path}&error=${encodeURIComponent(error)}`);
  revalidatePath(`/o/${orgSlug}/dashboard/vault`);
  redirect(`${path}&success=${encodeURIComponent("Share updated.")}`);
}

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-main">Vault</h1>
          <p className="text-muted">Store and share credentials securely.</p>
        </div>
        {vaultPerm.can_create && <Link href={`/o/${orgSlug}/dashboard/vault?modal=create`}><Button><Plus className="h-4 w-4" /> Add Credential</Button></Link>}
      </div>

      <form method="GET" className="grid gap-3 md:grid-cols-4">
        <div className="md:col-span-2">
          <Input name="q" defaultValue={query.q ?? ""} placeholder="Search label, username, email, URL" />
        </div>
        <select name="status" defaultValue={query.status ?? ""} className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="disabled">Disabled</option>
        </select>
        <div className="flex gap-2">
          <Input name="category" defaultValue={query.category ?? ""} placeholder="Category" />
          <Button type="submit" variant="outline"><Search className="h-4 w-4" /></Button>
        </div>
      </form>

      {query.error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{query.error}</div>}
      {query.success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{query.success}</div>}

      <div className="rounded-2xl border border-soft bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-soft bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-3">Title</th><th className="px-4 py-3">Username</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {credentials.map((row) => (
              <tr key={row.id} className="border-b border-soft last:border-b-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold"><Link href={`/o/${orgSlug}/dashboard/vault?modal=detail&credential_id=${row.id}`}>{row.label}</Link></td>
                <td className="px-4 py-3">{row.username || "-"}</td>
                <td className="px-4 py-3">{row.email_id || "-"}</td>
                <td className="px-4 py-3">{row.category || "-"}</td>
                <td className="px-4 py-3"><Badge variant="outline">{row.status}</Badge></td>
                <td className="px-4 py-3">{new Date(row.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {credentials.length === 0 && <tr><td className="px-4 py-6 text-center text-muted" colSpan={6}>No credentials found.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal isOpen={query.modal === "create"} closeHref={`/o/${orgSlug}/dashboard/vault`} title="Add Credential" size="lg">
        <form action={createCredential} className="space-y-4">
          <input type="hidden" name="organization_slug" value={orgSlug} />
          <Input label="Label / Title" name="label" required />
          <div className="grid gap-3 md:grid-cols-2"><Input label="Username" name="username" /><Input label="Email ID" name="email_id" /></div>
          <Input label="Password" name="password" type="password" required />
          <Input label="URL / Login URL" name="login_url" />
          <div className="grid gap-3 md:grid-cols-2"><Input label="Category" name="category" /><Input label="Tags (comma separated)" name="tags" /></div>
          <select name="status" defaultValue="active" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"><option value="active">Active</option><option value="archived">Archived</option><option value="disabled">Disabled</option></select>
          <textarea name="notes" rows={4} placeholder="Notes" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
          <Button type="submit">Create Credential</Button>
        </form>
      </Modal>

      {selectedDetail && (
        <Modal isOpen={query.modal === "detail"} closeHref={`/o/${orgSlug}/dashboard/vault`} title="Credential Details" size="lg">
          <form action={updateCredential} className="space-y-4">
            <input type="hidden" name="organization_slug" value={orgSlug} />
            <input type="hidden" name="credential_id" value={selectedDetail.id} />
            <Input label="Label / Title" name="label" defaultValue={selectedDetail.label} required />
            <div className="grid gap-3 md:grid-cols-2"><Input label="Username" name="username" defaultValue={selectedDetail.username || ""} /><Input label="Email ID" name="email_id" defaultValue={selectedDetail.email_id || ""} /></div>
            <div className="rounded-xl border border-soft p-3">
              <p className="text-xs font-semibold text-muted">Password</p>
              <p className="font-mono text-sm">{selectedDetail.password || selectedDetail.password_masked}</p>
              <div className="mt-2 flex gap-2">
                <Link href={`/o/${orgSlug}/dashboard/vault?modal=detail&credential_id=${selectedDetail.id}&reveal=1`}><Button variant="outline" type="button"><Eye className="h-4 w-4" /> Unmask</Button></Link>
                <Link href={`/o/${orgSlug}/dashboard/vault?modal=detail&credential_id=${selectedDetail.id}`}><Button variant="outline" type="button"><EyeOff className="h-4 w-4" /> Mask</Button></Link>
              </div>
            </div>
            <Input label="Set New Password (optional)" name="password" type="password" />
            <Input label="URL / Login URL" name="login_url" defaultValue={selectedDetail.login_url || ""} />
            <div className="grid gap-3 md:grid-cols-2"><Input label="Category" name="category" defaultValue={selectedDetail.category || ""} /><Input label="Tags (comma separated)" name="tags" defaultValue={(selectedDetail.tags || []).join(", ")} /></div>
            <select name="status" defaultValue={selectedDetail.status} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"><option value="active">Active</option><option value="archived">Archived</option><option value="disabled">Disabled</option></select>
            <textarea name="notes" rows={4} defaultValue={selectedDetail.notes || ""} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
            <div className="flex flex-wrap gap-2">
              {vaultPerm.can_edit && <Button type="submit"><KeyRound className="h-4 w-4" /> Save</Button>}
              {vaultPerm.can_edit && <Link href={`/o/${orgSlug}/dashboard/vault?modal=share&credential_id=${selectedDetail.id}`}><Button type="button" variant="outline"><Share2 className="h-4 w-4" /> Share</Button></Link>}
              {vaultPerm.can_delete && <Link href={`/o/${orgSlug}/dashboard/vault?modal=delete&credential_id=${selectedDetail.id}`}><Button type="button" variant="danger"><Trash2 className="h-4 w-4" /> Delete</Button></Link>}
            </div>
          </form>
        </Modal>
      )}

      {selected && query.modal === "delete" && (
        <Modal isOpen closeHref={`/o/${orgSlug}/dashboard/vault`} title="Delete Credential" size="sm">
          <form action={deleteCredential} className="space-y-4">
            <input type="hidden" name="organization_slug" value={orgSlug} />
            <input type="hidden" name="credential_id" value={selected.id} />
            <p className="text-sm text-muted">Delete <span className="font-semibold text-main">{selected.label}</span>? This cannot be undone.</p>
            <Button type="submit" variant="danger">Delete</Button>
          </form>
        </Modal>
      )}

      {selected && query.modal === "share" && (
        <Modal isOpen closeHref={`/o/${orgSlug}/dashboard/vault?modal=detail&credential_id=${selected.id}`} title="Share Credential" size="lg">
          <div className="space-y-3">
            {users.map((user) => (
              <form key={user.id} action={updateShare} className="flex items-center justify-between rounded-xl border border-soft p-3">
                <input type="hidden" name="organization_slug" value={orgSlug} />
                <input type="hidden" name="credential_id" value={selected.id} />
                <input type="hidden" name="user_id" value={user.id} />
                <div>
                  <p className="text-sm font-semibold text-main">{user.full_name || user.email}</p>
                  <p className="text-xs text-muted">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{shareMap.get(user.id) || "none"}</Badge>
                  <button name="access" value="grant" className="rounded-lg border border-emerald-300 px-2 py-1 text-xs text-emerald-700">Grant</button>
                  <button name="access" value="deny" className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700">Deny</button>
                </div>
              </form>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
