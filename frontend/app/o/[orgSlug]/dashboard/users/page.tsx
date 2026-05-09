import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canManageOrganizationUsers, getOrganizationContextOrRedirect } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";

type UsersPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string; inviteToken?: string }>;
};

const MANAGEABLE_ROLES = ["admin", "member"] as const;
const MANAGEABLE_ROLE_SET = new Set<string>(MANAGEABLE_ROLES);

async function inviteMember(formData: FormData) {
  "use server";

  const tenantId = String(formData.get("organization_id") ?? "").trim();
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const rawRoleKey = String(formData.get("role") ?? "member").trim().toLowerCase();
  const roleKey = MANAGEABLE_ROLE_SET.has(rawRoleKey) ? rawRoleKey : "member";

  const path = `/o/${orgSlug}/dashboard/users`;
  const supabase = await createClient();

  const roleRes = await supabase.from("roles").select("id,key").eq("key", roleKey).maybeSingle();
  if (roleRes.error || !roleRes.data?.id) {
    redirect(`${path}?error=${encodeURIComponent(roleRes.error?.message ?? "Invalid role")}`);
  }

  const { data, error } = await supabase.rpc("create_tenant_invite", {
    p_tenant_id: tenantId,
    p_email: email,
    p_role_id: roleRes.data.id,
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

  const tenantId = String(formData.get("organization_id") ?? "").trim();
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const membershipId = String(formData.get("member_id") ?? "").trim();
  const rawRoleKey = String(formData.get("role") ?? "member").trim().toLowerCase();
  const roleKey = MANAGEABLE_ROLE_SET.has(rawRoleKey) ? rawRoleKey : "member";

  const path = `/o/${orgSlug}/dashboard/users`;
  const supabase = await createClient();

  const roleRes = await supabase.from("roles").select("id,key").eq("key", roleKey).maybeSingle();
  if (roleRes.error || !roleRes.data?.id) {
    redirect(`${path}?error=${encodeURIComponent(roleRes.error?.message ?? "Invalid role")}`);
  }

  const { error } = await supabase
    .from("user_tenant_roles")
    .update({ role_id: roleRes.data.id, is_active: true })
    .eq("id", membershipId)
    .eq("tenant_id", tenantId);

  if (error) {
    redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Member role updated.")}`);
}

async function removeMember(formData: FormData) {
  "use server";

  const tenantId = String(formData.get("organization_id") ?? "").trim();
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const membershipId = String(formData.get("member_id") ?? "").trim();

  const path = `/o/${orgSlug}/dashboard/users`;
  const supabase = await createClient();

  const { error } = await supabase
    .from("user_tenant_roles")
    .update({ is_active: false })
    .eq("id", membershipId)
    .eq("tenant_id", tenantId);

  if (error) {
    redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Member removed.")}`);
}

async function revokeInvite(formData: FormData) {
  "use server";

  const tenantId = String(formData.get("organization_id") ?? "").trim();
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const inviteId = String(formData.get("invite_id") ?? "").trim();

  const path = `/o/${orgSlug}/dashboard/users`;
  const supabase = await createClient();

  const { error } = await supabase
    .from("tenant_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("tenant_id", tenantId)
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

  await supabase.rpc("ensure_app_user");

  const org = await getOrganizationContextOrRedirect(orgSlug);
  const canManage = canManageOrganizationUsers(org.role);

  const currentUserRes = await supabase.from("users").select("id,email").eq("auth_user_id", user.id).maybeSingle();
  const currentAppUserId = currentUserRes.data?.id ?? "";

  const [{ data: members, error: membersError }, { data: invites, error: invitesError }, { data: roleRows, error: rolesError }] = await Promise.all([
    supabase
      .from("user_tenant_roles")
      .select("id,tenant_id,user_id,role_id,is_active,created_at,roles!user_tenant_roles_role_id_fkey(key,label),users!user_tenant_roles_user_id_fkey(email,full_name)")
      .eq("tenant_id", org.organization_id)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("tenant_invites")
      .select("id,tenant_id,email,status,expires_at,created_at,role_id,roles!tenant_invites_role_id_fkey(key,label)")
      .eq("tenant_id", org.organization_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase.from("roles").select("id,key,label").order("created_at", { ascending: true }),
  ]);

  if (membersError) {
    return <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{membersError.message}</p>;
  }

  if (invitesError) {
    return <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{invitesError.message}</p>;
  }
  if (rolesError) {
    return <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{rolesError.message}</p>;
  }
  const memberRows = members ?? [];
  const inviteRows = invites ?? [];
  const roles = roleRows ?? [];
  const roleById = new Map(roles.map((role) => [role.id, role]));
  const roleByKey = new Map(roles.map((role) => [role.key, role]));
  const selectableRoles = MANAGEABLE_ROLES.filter((key) => roleByKey.has(key));
  const fallbackSelectableRoles = selectableRoles.length ? selectableRoles : MANAGEABLE_ROLES;
  const resolveUser = (value: unknown): { email?: string; full_name?: string } =>
    Array.isArray(value) ? (value[0] ?? {}) : ((value as { email?: string; full_name?: string }) ?? {});
  const resolveRole = (value: unknown): { key?: string; label?: string } =>
    Array.isArray(value) ? (value[0] ?? {}) : ((value as { key?: string; label?: string }) ?? {});
  const getRoleForMember = (member: { role_id?: string | null }): { key?: string; label?: string } => {
    const joinedRole = resolveRole((member as { roles?: unknown }).roles);
    if (joinedRole.key || joinedRole.label) return joinedRole;
    if (!member.role_id) return {};
    return roleById.get(member.role_id) ?? {};
  };
  const adminsCount = memberRows.filter((member) => getRoleForMember(member).key === "admin").length;

  return (
    <section className="space-y-6">
      {query.error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{query.error}</p> : null}
      {query.success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{query.success}</p> : null}
      {query.inviteToken ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Invite link token: <span className="font-mono">{query.inviteToken}</span>. URL format: <span className="font-mono">/invite/{query.inviteToken}</span>
        </p>
      ) : null}

      <article className="surface-card rounded-2xl border p-5 shadow-sm">
        <h2 className="text-2xl font-semibold text-main">Users</h2>
        <p className="mt-1 text-sm text-muted">Manage users and invitations for {org.organization_name}.</p>

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
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Admins</p>
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
            <input name="email" type="email" required placeholder="user@company.com" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm" />
            <select name="role" defaultValue="member" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm">
              {fallbackSelectableRoles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <button type="submit" className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">Send Invite</button>
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
              const isSelf = member.user_id === currentAppUserId;
              const canEdit = canManage && !isSelf;
              return (
                <tr key={member.id} className="border-t border-soft text-main">
                  <td className="px-4 py-3 font-medium">{resolveUser(member.users).email ?? "-"}</td>
                  <td className="px-4 py-3 capitalize">{getRoleForMember(member).label ?? getRoleForMember(member).key ?? "-"}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">active</span></td>
                  <td className="px-4 py-3 text-muted">{new Date(member.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={updateMemberRole} className="flex items-center gap-2">
                          <input type="hidden" name="organization_id" value={org.organization_id} />
                          <input type="hidden" name="organization_slug" value={org.organization_slug} />
                          <input type="hidden" name="member_id" value={member.id} />
                          <select name="role" defaultValue={getRoleForMember(member).key ?? "member"} className="rounded-lg border border-soft bg-transparent px-2 py-1 text-xs text-main">
                            {fallbackSelectableRoles.map((role) => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                          <button type="submit" className="rounded-md border border-soft px-3 py-1.5 text-xs font-medium text-muted">Save</button>
                        </form>
                        <form action={removeMember}>
                          <input type="hidden" name="organization_id" value={org.organization_id} />
                          <input type="hidden" name="organization_slug" value={org.organization_slug} />
                          <input type="hidden" name="member_id" value={member.id} />
                          <button type="submit" className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700">Remove</button>
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
        <div className="border-b border-soft px-4 py-3"><h3 className="text-base font-semibold text-main">Pending Invites</h3></div>
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
              <tr className="border-t border-soft text-main"><td className="px-4 py-3 text-muted" colSpan={4}>No pending invites.</td></tr>
            ) : (
              inviteRows.map((invite) => (
                <tr key={invite.id} className="border-t border-soft text-main">
                  <td className="px-4 py-3 font-medium">{invite.email}</td>
                  <td className="px-4 py-3 capitalize">{resolveRole((invite as { roles?: unknown }).roles).label ?? resolveRole((invite as { roles?: unknown }).roles).key ?? (invite.role_id ? roleById.get(invite.role_id)?.label : undefined) ?? (invite.role_id ? roleById.get(invite.role_id)?.key : undefined) ?? "-"}</td>
                  <td className="px-4 py-3 text-muted">{new Date(invite.expires_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <form action={revokeInvite}>
                        <input type="hidden" name="organization_id" value={org.organization_id} />
                        <input type="hidden" name="organization_slug" value={org.organization_slug} />
                        <input type="hidden" name="invite_id" value={invite.id} />
                        <button type="submit" className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700">Revoke</button>
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


