import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { Users, UserPlus, Shield, Mail, Trash2, Save, Info } from "lucide-react";

import { canManageOrganizationUsers, getOrganizationContextOrRedirect } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { apiRequest } from "@/lib/api-server";

type UsersPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

const MANAGEABLE_ROLES = ["admin", "member", "client"] as const;
const MANAGEABLE_ROLE_SET = new Set<string>(MANAGEABLE_ROLES);

async function createUserDirect(formData: FormData) {
  "use server";
  const debugId = randomUUID();
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const rawRoleKey = String(formData.get("role") ?? "member").trim().toLowerCase();
  const roleKey = MANAGEABLE_ROLE_SET.has(rawRoleKey) ? rawRoleKey : "member";
  const path = `/o/${orgSlug}/dashboard/users`;

  if (!email || !password) redirect(`${path}?error=${encodeURIComponent("Email and password are required.")}`);

  const { error } = await apiRequest("/api/v1/users", {
    method: "POST",
    orgSlug,
    body: { email, password, full_name: fullName || null, role_key: roleKey },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent(`User created: ${email}`)}`);
}

async function updateMemberRole(formData: FormData) {
  "use server";
  const tenantId = String(formData.get("organization_id") ?? "").trim();
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const membershipId = String(formData.get("member_id") ?? "").trim();
  const roleKey = String(formData.get("role") ?? "member").trim().toLowerCase();
  const path = `/o/${orgSlug}/dashboard/users`;

  const { error } = await apiRequest(`/api/v1/auth/assign-role`, {
    method: "POST",
    orgSlug,
    body: { user_id: String(formData.get("user_id")), role_key: roleKey },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Role updated.")}`);
}

async function removeMember(formData: FormData) {
  "use server";
  const tenantId = String(formData.get("organization_id") ?? "").trim();
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const membershipId = String(formData.get("member_id") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/users`;
  const supabase = await createClient();

  const { error } = await supabase.from("user_tenant_roles").update({ is_active: false }).eq("id", membershipId);
  if (error) redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Member removed.")}`);
}

export default async function UsersPage({ params, searchParams }: UsersPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const org = await getOrganizationContextOrRedirect(orgSlug);
  const canManage = canManageOrganizationUsers(org.role);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const currentUserRes = await supabase.from("users").select("id").eq("auth_user_id", user?.id).maybeSingle();
  const currentAppUserId = currentUserRes.data?.id ?? "";

  const [{ data: members, error: membersError }, { data: roleRows }] = await Promise.all([
    supabase
      .from("user_tenant_roles")
      .select("id,tenant_id,user_id,role_id,is_active,created_at,roles!user_tenant_roles_role_id_fkey(key,label),users!user_tenant_roles_user_id_fkey(email,full_name)")
      .eq("tenant_id", org.organization_id)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    supabase.from("roles").select("id,key,label").order("created_at", { ascending: true }),
  ]);

  if (membersError) return <p className="p-6 text-red-600">{membersError.message}</p>;

  const memberRows = members ?? [];
  const roles = roleRows ?? [];
  const selectableRoles = MANAGEABLE_ROLES.filter((key) => roles.some(r => r.key === key));
  
  const resolveUser = (v: any) => (Array.isArray(v) ? v[0] : v) || {};
  const resolveRole = (v: any) => (Array.isArray(v) ? v[0] : v) || {};

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-main">Team Members</h1>
          <p className="text-muted">Manage access and permissions for {org.organization_name}.</p>
        </div>
        <div className="flex gap-3">
          <Badge variant="outline" className="h-10 px-4 flex gap-2 items-center bg-white">
            <Users className="h-4 w-4 text-violet-500" />
            <span className="text-main font-bold">{memberRows.length} Total</span>
          </Badge>
        </div>
      </header>

      {query.error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm flex gap-2 items-center"><Info className="h-4 w-4" />{query.error}</div>}
      {query.success && <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-sm flex gap-2 items-center"><Info className="h-4 w-4" />{query.success}</div>}

      <div className="grid gap-8 lg:grid-cols-3">
        {canManage && (
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-violet-100 rounded-lg text-violet-600"><UserPlus className="h-5 w-5" /></div>
                <h3 className="font-bold text-main">Add Member</h3>
              </div>
              <form action={createUserDirect} className="space-y-4">
                <input type="hidden" name="organization_slug" value={orgSlug} />
                <Input label="Email Address" name="email" type="email" required placeholder="name@company.com" />
                <Input label="Full Name" name="full_name" placeholder="John Doe" />
                <Input label="Temporary Password" name="password" type="password" required />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-main">System Role</label>
                  <select name="role" defaultValue="member" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500">
                    {selectableRoles.map((r) => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                  </select>
                </div>
                <Button type="submit" className="w-full py-4 mt-2">Invite User</Button>
              </form>
            </Card>
          </div>
        )}

        <div className={canManage ? "lg:col-span-2" : "lg:col-span-3"}>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-soft bg-slate-50/50">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted">Member</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted">Role</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soft">
                  {memberRows.map((member) => {
                    const u = resolveUser(member.users);
                    const r = resolveRole(member.roles);
                    const isSelf = member.user_id === currentAppUserId;
                    
                    return (
                      <tr key={member.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-violet-100 flex items-center justify-center text-sm font-bold text-violet-700">
                              {u.email?.[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-main truncate">{u.full_name || "New User"}</p>
                              <p className="text-xs text-muted truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={r.key === "owner" ? "secondary" : "default"}>{r.label || r.key}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isSelf ? (
                            <span className="text-[10px] font-black uppercase text-violet-500 bg-violet-50 px-2 py-1 rounded-md">You</span>
                          ) : canManage ? (
                            <div className="flex items-center justify-end gap-2">
                              <form action={updateMemberRole} className="flex gap-2">
                                <input type="hidden" name="organization_id" value={org.organization_id} />
                                <input type="hidden" name="organization_slug" value={orgSlug} />
                                <input type="hidden" name="member_id" value={member.id} />
                                <input type="hidden" name="user_id" value={member.user_id} />
                                <select name="role" defaultValue={r.key} className="h-8 rounded-lg border border-soft bg-white px-2 text-[10px] font-bold focus:ring-1 focus:ring-violet-500">
                                  {selectableRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                                </select>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" type="submit"><Save className="h-3.5 w-3.5" /></Button>
                              </form>
                              <form action={removeMember}>
                                <input type="hidden" name="organization_id" value={org.organization_id} />
                                <input type="hidden" name="organization_slug" value={orgSlug} />
                                <input type="hidden" name="member_id" value={member.id} />
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50" type="submit"><Trash2 className="h-3.5 w-3.5" /></Button>
                              </form>
                            </div>
                          ) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
