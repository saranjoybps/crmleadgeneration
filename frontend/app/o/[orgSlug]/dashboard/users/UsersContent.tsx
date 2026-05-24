"use client";

import { useState } from "react";
import { Users, UserPlus, Shield, Save, Info, Edit2, X, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { createUserDirect, updateMemberRole, updateUserDetails, removeMember } from "./actions";

const EXCLUDED_ASSIGNABLE_ROLE_KEYS = new Set(["owner"]);

type UsersContentProps = {
  orgSlug: string;
  orgOrganizationId: string;
  orgOrganizationName: string;
  currentAppUserId: string;
  usersPerm: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean };
  initialError: string | null;
  initialSuccess: string | null;
  initialEditingUserId: string | null;
  memberRows: Array<any>;
  normalizedRoles: Array<{ id: string; key: string; label: string; tenant_id: string | null }>;
};

export default function UsersContent({
  orgSlug,
  orgOrganizationId,
  orgOrganizationName,
  currentAppUserId,
  usersPerm,
  initialError,
  initialSuccess,
  initialEditingUserId,
  memberRows,
  normalizedRoles,
}: UsersContentProps) {
  const [editingUserId, setEditingUserId] = useState<string | null>(initialEditingUserId);
  const [error, setError] = useState<string | null>(initialError);
  const [success, setSuccess] = useState<string | null>(initialSuccess);

  const canManage = usersPerm.can_edit;
  const selectableRoles = normalizedRoles.filter((role) => !EXCLUDED_ASSIGNABLE_ROLE_KEYS.has(role.key));

  const resolveUser = (v: any) => (Array.isArray(v) ? v[0] : v) || {};
  const resolveRole = (v: any) => (Array.isArray(v) ? v[0] : v) || {};

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-main">Team Members</h1>
          <p className="text-muted">Manage access and permissions for {orgOrganizationName}.</p>
        </div>
        <div className="flex gap-3">
          <Badge variant="outline" className="h-10 px-4 flex gap-2 items-center bg-white">
            <Users className="h-4 w-4 text-violet-500" />
            <span className="text-main font-bold">{memberRows.length} Total</span>
          </Badge>
        </div>
      </header>

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm flex gap-2 items-center"><Info className="h-4 w-4" />{error}</div>}
      {success && <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-sm flex gap-2 items-center"><Info className="h-4 w-4" />{success}</div>}

      <div className="grid gap-8 lg:grid-cols-3">
        {canManage && usersPerm.can_create && (
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
                  <select
                    name="role"
                    defaultValue={selectableRoles[0]?.key ?? "member"}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                  >
                    {selectableRoles.length > 0 ? (
                      selectableRoles.map((role) => (
                        <option key={role.id} value={role.key}>{role.label || role.key}</option>
                      ))
                    ) : (
                      <option value="member">MEMBER</option>
                    )}
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
                  {memberRows.map((member: any) => {
                    const u = resolveUser(member.users);
                    const r = resolveRole(member.roles);
                    const isSelf = member.user_id === currentAppUserId;
                    const isEditing = editingUserId === member.user_id;

                    return (
                      <tr key={member.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-violet-100 flex items-center justify-center text-sm font-bold text-violet-700 overflow-hidden">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                u.email?.[0].toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              {isEditing ? (
                                <form action={updateUserDetails} className="flex items-center gap-2">
                                  <input type="hidden" name="organization_slug" value={orgSlug} />
                                  <input type="hidden" name="user_id" value={member.user_id} />
                                  <input
                                    name="full_name"
                                    defaultValue={u.full_name || ""}
                                    autoFocus
                                    className="h-8 w-full rounded-lg border border-slate-300 px-2 text-sm focus:ring-1 focus:ring-violet-500 outline-none"
                                  />
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" type="submit">
                                    <Save className="h-3.5 w-3.5" />
                                  </Button>
                                  <button onClick={() => setEditingUserId(null)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </form>
                              ) : (
                                <div className="flex items-center gap-2 group/name">
                                  <p className="font-bold text-main truncate">{u.full_name || "New User"}</p>
                                  {canManage && usersPerm.can_edit && !isSelf && (
                                    <button
                                      onClick={() => setEditingUserId(member.user_id)}
                                      className="opacity-0 group-hover/name:opacity-100 p-1 rounded hover:bg-slate-100 text-slate-400 transition-opacity"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              )}
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
                                <input type="hidden" name="organization_id" value={orgOrganizationId} />
                                <input type="hidden" name="organization_slug" value={orgSlug} />
                                <input type="hidden" name="member_id" value={member.id} />
                                <input type="hidden" name="user_id" value={member.user_id} />
                                <select
                                  name="role"
                                  defaultValue={r.key}
                                  className="h-8 rounded-lg border border-soft bg-white px-2 text-[10px] font-bold focus:ring-1 focus:ring-violet-500"
                                >
                                  {selectableRoles.length > 0 ? (
                                    selectableRoles.map((role) => (
                                      <option key={role.id} value={role.key}>{role.label || role.key}</option>
                                    ))
                                  ) : (
                                    <option value="member">MEMBER</option>
                                  )}
                                </select>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg"
                                  type="submit"
                                  disabled={!usersPerm.can_edit}
                                >
                                  <Save className="h-3.5 w-3.5" />
                                </Button>
                              </form>
                              <form action={removeMember}>
                                <input type="hidden" name="organization_id" value={orgOrganizationId} />
                                <input type="hidden" name="organization_slug" value={orgSlug} />
                                <input type="hidden" name="member_id" value={member.id} />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50"
                                  type="submit"
                                  disabled={!usersPerm.can_delete}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
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
