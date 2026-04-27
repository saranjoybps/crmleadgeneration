import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canManageOrganizationUsers, getOrganizationContextOrRedirect } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";
import type { OrganizationInvite, OrganizationMember, OrganizationRole } from "@/lib/types";

type UsersPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string; inviteToken?: string }>;
};

async function inviteMember(formData: FormData) {
  "use server";

  const orgId = String(formData.get("organization_id") ?? "").trim();
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "member").trim() as OrganizationRole;

  const path = `/o/${orgSlug}/dashboard/users`;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_organization_invite", {
    p_organization_id: orgId,
    p_email: email,
    p_role: role,
    p_valid_hours: 72,
  });

  if (error) {
    redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  const invite = Array.isArray(data) ? data[0] : null;
  const token = invite?.token ? String(invite.token) : "";
  const inviteToken = token ? `&inviteToken=${encodeURIComponent(token)}` : "";
  redirect(`${path}?success=${encodeURIComponent(`Invite created for ${email}`)}${inviteToken}`);
}

async function updateMemberRole(formData: FormData) {
  "use server";

  const orgId = String(formData.get("organization_id") ?? "").trim();
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const memberId = String(formData.get("member_id") ?? "").trim();
  const role = String(formData.get("role") ?? "member").trim() as OrganizationRole;

  const path = `/o/${orgSlug}/dashboard/users`;
  const supabase = await createClient();

  const { error } = await supabase
    .from("organization_members")
    .update({ role })
    .eq("id", memberId)
    .eq("organization_id", orgId);

  if (error) {
    redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Member role updated.")}`);
}

async function removeMember(formData: FormData) {
  "use server";

  const orgId = String(formData.get("organization_id") ?? "").trim();
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const memberId = String(formData.get("member_id") ?? "").trim();

  const path = `/o/${orgSlug}/dashboard/users`;
  const supabase = await createClient();

  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId)
    .eq("organization_id", orgId);

  if (error) {
    redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Member removed.")}`);
}

async function revokeInvite(formData: FormData) {
  "use server";

  const orgId = String(formData.get("organization_id") ?? "").trim();
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const inviteId = String(formData.get("invite_id") ?? "").trim();

  const path = `/o/${orgSlug}/dashboard/users`;
  const supabase = await createClient();

  const { error } = await supabase
    .from("organization_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("organization_id", orgId)
    .eq("status", "pending");

  if (error) {
    redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Invite revoked.")}`);
}

export default async function UsersPage({ params, searchParams }: UsersPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const org = await getOrganizationContextOrRedirect(orgSlug);
  const canManage = canManageOrganizationUsers(org.role);

  const [{ data: members, error: membersError }, { data: invites, error: invitesError }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("id,organization_id,user_id,email,role,status,created_at")
      .eq("organization_id", org.organization_id)
      .order("created_at", { ascending: true }),
    supabase
      .from("organization_invites")
      .select("id,organization_id,email,role,status,expires_at,created_at")
      .eq("organization_id", org.organization_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  if (membersError) {
    return <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{membersError.message}</p>;
  }

  if (invitesError) {
    return <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{invitesError.message}</p>;
  }

  const memberRows = (members ?? []) as OrganizationMember[];
  const inviteRows = (invites ?? []) as OrganizationInvite[];

  const adminsCount = memberRows.filter((member) => member.role === "admin" || member.role === "owner").length;

  return (
    <section className="space-y-6">
      {query.error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{query.error}</p> : null}
      {query.success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{query.success}</p> : null}
      {query.inviteToken ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Invite link token (share securely): <span className="font-mono">{query.inviteToken}</span>. URL format: <span className="font-mono">/invite/{query.inviteToken}</span>
        </p>
      ) : null}

      <article className="surface-card rounded-2xl border p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-main">Users</h2>
            <p className="mt-1 text-sm text-muted">Manage users and invitations for {org.organization_name}.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="surface-muted rounded-xl border border-soft p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Total Users</p>
            <p className="mt-2 text-2xl font-semibold text-main">{memberRows.length}</p>
          </div>
          <div className="surface-muted rounded-xl border border-soft p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Pending Invites</p>
            <p className="mt-2 text-2xl font-semibold text-main">{inviteRows.length}</p>
          </div>
          <div className="surface-muted rounded-xl border border-soft p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Admins + Owners</p>
            <p className="mt-2 text-2xl font-semibold text-main">{adminsCount}</p>
          </div>
        </div>
      </article>

      {canManage ? (
        <article className="surface-card rounded-2xl border p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-main">Invite User</h3>
          <form action={inviteMember} className="mt-4 grid gap-3 md:grid-cols-[1fr,180px,auto]">
            <input type="hidden" name="organization_id" value={org.organization_id} />
            <input type="hidden" name="organization_slug" value={org.organization_slug} />
            <input
              name="email"
              type="email"
              required
              placeholder="user@company.com"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white"
            />
            <select
              name="role"
              defaultValue="member"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700">
              Send Invite
            </button>
          </form>
        </article>
      ) : null}

      <article className="surface-card overflow-x-auto rounded-2xl border shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="surface-muted">
            <tr className="text-left text-muted">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {memberRows.map((member) => {
              const isSelf = member.user_id === user.id;
              const canEdit = canManage && !isSelf;
              return (
                <tr key={member.id} className="border-t border-soft text-main">
                  <td className="px-4 py-3 font-medium">{member.email}</td>
                  <td className="px-4 py-3 capitalize">{member.role}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">{member.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted">{new Date(member.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={updateMemberRole} className="flex items-center gap-2">
                          <input type="hidden" name="organization_id" value={org.organization_id} />
                          <input type="hidden" name="organization_slug" value={org.organization_slug} />
                          <input type="hidden" name="member_id" value={member.id} />
                          <select
                            name="role"
                            defaultValue={member.role}
                            className="rounded-lg border border-soft bg-transparent px-2 py-1 text-xs text-main"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                            <option value="owner">Owner</option>
                          </select>
                          <button type="submit" className="rounded-md border border-soft px-3 py-1.5 text-xs font-medium text-muted">
                            Save
                          </button>
                        </form>
                        <form action={removeMember}>
                          <input type="hidden" name="organization_id" value={org.organization_id} />
                          <input type="hidden" name="organization_slug" value={org.organization_slug} />
                          <input type="hidden" name="member_id" value={member.id} />
                          <button type="submit" className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700">
                            Remove
                          </button>
                        </form>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </article>

      <article className="surface-card overflow-x-auto rounded-2xl border shadow-sm">
        <div className="border-b border-soft px-4 py-3">
          <h3 className="text-base font-semibold text-main">Pending Invites</h3>
        </div>
        <table className="min-w-full text-sm">
          <thead className="surface-muted">
            <tr className="text-left text-muted">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Expires</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {inviteRows.length === 0 ? (
              <tr className="border-t border-soft text-main">
                <td className="px-4 py-3 text-muted" colSpan={4}>
                  No pending invites.
                </td>
              </tr>
            ) : (
              inviteRows.map((invite) => (
                <tr key={invite.id} className="border-t border-soft text-main">
                  <td className="px-4 py-3 font-medium">{invite.email}</td>
                  <td className="px-4 py-3 capitalize">{invite.role}</td>
                  <td className="px-4 py-3 text-muted">{new Date(invite.expires_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <form action={revokeInvite}>
                        <input type="hidden" name="organization_id" value={org.organization_id} />
                        <input type="hidden" name="organization_slug" value={org.organization_slug} />
                        <input type="hidden" name="invite_id" value={invite.id} />
                        <button type="submit" className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700">
                          Revoke
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-muted">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </article>
    </section>
  );
}