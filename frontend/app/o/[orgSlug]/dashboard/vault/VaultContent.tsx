"use client";

import { format } from "date-fns";
import { useState, useMemo, useEffect } from "react";
import { KeyRound, Plus, Search, Share2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { apiRequest } from "@/lib/api-client";
import { createCredential, updateCredential, deleteCredential, updateShare } from "./actions";

export type CredentialRow = {
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

export type UserRow = { id: string; email: string; full_name?: string };

type ModalState =
  | { type: "create" }
  | { type: "detail"; credential_id: string }
  | { type: "delete"; credential_id: string }
  | { type: "share"; credential_id: string }
  | null;

type VaultContentProps = {
  orgSlug: string;
  query: {
    q?: string;
    status?: string;
    category?: string;
    error?: string;
    success?: string;
    modal?: "create" | "detail" | "delete" | "share";
    credential_id?: string;
  };
  credentials: CredentialRow[];
  users: UserRow[];
  vaultPerm: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean };
};

export default function VaultContent({
  orgSlug,
  query,
  credentials,
  users,
  vaultPerm,
}: VaultContentProps) {
  const [modal, setModal] = useState<ModalState>(
    query.modal === "create" && vaultPerm.can_create
      ? { type: "create" }
      : query.modal === "detail" && query.credential_id
        ? { type: "detail", credential_id: query.credential_id }
        : query.modal === "delete" && query.credential_id && vaultPerm.can_delete
          ? { type: "delete", credential_id: query.credential_id }
          : query.modal === "share" && query.credential_id && vaultPerm.can_edit
            ? { type: "share", credential_id: query.credential_id }
            : null,
  );

  const [detailData, setDetailData] = useState<CredentialRow | null>(null);
  const [shares, setShares] = useState<Array<{ user_id: string; access: "grant" | "deny"; user?: { id: string; email: string; full_name?: string } }>>([]);

  useEffect(() => {
    const m = modal;
    if (!m || m.type !== "detail") { setDetailData(null); return; }
    const cred = credentials.find((c) => c.id === m.credential_id);
    if (!cred) return;
    apiRequest<CredentialRow>(`/api/v1/vault/${encodeURIComponent(cred.id)}`, {
      orgSlug, headers: { "X-Reveal-Password": "true" },
    }).then((res) => {
      if (res.data) setDetailData(res.data);
    });
  }, [modal && modal.type === "detail" ? modal.credential_id : null]);

  useEffect(() => {
    const m = modal;
    if (!m || m.type !== "share") { setShares([]); return; }
    apiRequest<Array<{ user_id: string; access: "grant" | "deny"; user?: { id: string; email: string; full_name?: string } }>>(
      `/api/v1/vault/${encodeURIComponent(m.credential_id)}/shares`, { orgSlug }
    ).then((res) => {
      if (res.data) setShares(res.data);
    });
  }, [modal && modal.type === "share" ? modal.credential_id : null]);

  const shareMap = useMemo(() => new Map(shares.map((s) => [s.user_id, s.access])), [shares]);

  const selectedCredential = useMemo(() => {
    if (!modal || modal.type === "create") return null;
    return credentials.find((c) => c.id === modal.credential_id) ?? null;
  }, [modal, credentials]);

  const detailCredential = useMemo(() => {
    if (!modal || modal.type !== "detail") return null;
    return detailData ?? selectedCredential;
  }, [modal, detailData, selectedCredential]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-main">Vault</h1>
          <p className="text-muted">Store and share credentials securely.</p>
        </div>
        {vaultPerm.can_create && (
          <Button onClick={() => setModal({ type: "create" })}>
            <Plus className="h-4 w-4" /> Add Credential
          </Button>
        )}
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
                <td className="px-4 py-3 font-semibold">
                  <button type="button" onClick={() => setModal({ type: "detail", credential_id: row.id })} className="text-left">
                    {row.label}
                  </button>
                </td>
                <td className="px-4 py-3">{row.username || "-"}</td>
                <td className="px-4 py-3">{row.email_id || "-"}</td>
                <td className="px-4 py-3">{row.category || "-"}</td>
                <td className="px-4 py-3"><Badge variant="outline">{row.status}</Badge></td>
                <td className="px-4 py-3">{format(new Date(row.updated_at), "MMM d, yyyy")}</td>
              </tr>
            ))}
            {credentials.length === 0 && <tr><td className="px-4 py-6 text-center text-muted" colSpan={6}>No credentials found.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal?.type === "create" && (
        <Modal isOpen onClose={() => setModal(null)} title="Add Credential" size="lg">
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
      )}

      {detailCredential && (
        <Modal isOpen={modal?.type === "detail"} onClose={() => setModal(null)} title="Credential Details" size="lg">
          <form action={updateCredential} className="space-y-4">
            <input type="hidden" name="organization_slug" value={orgSlug} />
            <input type="hidden" name="credential_id" value={detailCredential.id} />
            <Input label="Label / Title" name="label" defaultValue={detailCredential.label} required />
            <div className="grid gap-3 md:grid-cols-2"><Input label="Username" name="username" defaultValue={detailCredential.username || ""} /><Input label="Email ID" name="email_id" defaultValue={detailCredential.email_id || ""} /></div>
            <div className="rounded-xl border border-soft p-3">
              <p className="text-xs font-semibold text-muted">Password</p>
              <p className="font-mono text-sm">{detailCredential.password || detailCredential.password_masked}</p>
            </div>
            <Input label="Set New Password (optional)" name="password" type="password" />
            <Input label="URL / Login URL" name="login_url" defaultValue={detailCredential.login_url || ""} />
            <div className="grid gap-3 md:grid-cols-2"><Input label="Category" name="category" defaultValue={detailCredential.category || ""} /><Input label="Tags (comma separated)" name="tags" defaultValue={(detailCredential.tags || []).join(", ")} /></div>
            <select name="status" defaultValue={detailCredential.status} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"><option value="active">Active</option><option value="archived">Archived</option><option value="disabled">Disabled</option></select>
            <textarea name="notes" rows={4} defaultValue={detailCredential.notes || ""} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
            <div className="flex flex-wrap gap-2">
              {vaultPerm.can_edit && <Button type="submit"><KeyRound className="h-4 w-4" /> Save</Button>}
              {vaultPerm.can_edit && <Button type="button" variant="outline" onClick={() => setModal({ type: "share", credential_id: detailCredential.id })}><Share2 className="h-4 w-4" /> Share</Button>}
              {vaultPerm.can_delete && <Button type="button" variant="danger" onClick={() => setModal({ type: "delete", credential_id: detailCredential.id })}><Trash2 className="h-4 w-4" /> Delete</Button>}
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === "delete" && selectedCredential && (
        <Modal isOpen onClose={() => setModal(null)} title="Delete Credential" size="sm">
          <form action={deleteCredential} className="space-y-4">
            <input type="hidden" name="organization_slug" value={orgSlug} />
            <input type="hidden" name="credential_id" value={selectedCredential.id} />
            <p className="text-sm text-muted">Delete <span className="font-semibold text-main">{selectedCredential.label}</span>? This cannot be undone.</p>
            <Button type="submit" variant="danger">Delete</Button>
          </form>
        </Modal>
      )}

      {modal?.type === "share" && selectedCredential && (
        <Modal isOpen onClose={() => setModal(null)} title="Share Credential" size="lg">
          <div className="space-y-3">
            {users.map((user) => (
              <form key={user.id} action={updateShare} className="flex items-center justify-between rounded-xl border border-soft p-3">
                <input type="hidden" name="organization_slug" value={orgSlug} />
                <input type="hidden" name="credential_id" value={selectedCredential.id} />
                <input type="hidden" name="user_id" value={user.id} />
                <div>
                  <p className="text-sm font-semibold text-main">{user.full_name || user.email}</p>
                  <p className="text-xs text-muted">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{shareMap.get(user.id) || "none"}</Badge>
                  {vaultPerm.can_edit && (
                    <>
                      <button name="access" value="grant" className="rounded-lg border border-emerald-300 px-2 py-1 text-xs text-emerald-700">Grant</button>
                      <button name="access" value="deny" className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700">Deny</button>
                    </>
                  )}
                </div>
              </form>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
