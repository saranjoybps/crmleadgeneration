import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";
import { getPermissions } from "@/lib/api-data";
import UsersContent from "./UsersContent";

export default async function UsersPage({ params, searchParams }: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string; edit_user_id?: string }>;
}) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const initialError = query.error ?? null;
  const initialSuccess = query.success ?? null;
  const initialEditingUserId = query.edit_user_id ?? null;

  const supabase = await createClient();
  const org = await getOrganizationContextOrRedirect(orgSlug);

  const [{ data: { user } }, permissionsResponse] = await Promise.all([
    supabase.auth.getUser(),
    getPermissions(orgSlug),
  ]);

  const currentUserRes = await supabase.from("users").select("id").eq("auth_user_id", user?.id ?? "").maybeSingle();
  const currentAppUserId = currentUserRes.data?.id ?? "";
  const usersPerm = permissionsResponse.data?.modules.find((m) => m.key === "users")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false, can_delete: false,
  };

  if (!usersPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view users.</p>;
  }

  const [{ data: members, error: membersError }, { data: roleRows }] = await Promise.all([
    supabase
      .from("user_tenant_roles")
      .select(`
        id,
        user_id,
        role_id,
        created_at,
        roles(key, label),
        users!user_tenant_roles_user_id_fkey(email, full_name, avatar_url)
      `)
      .eq("tenant_id", org.organization_id)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("roles")
      .select("id,key,label,tenant_id,created_at")
      .or(`tenant_id.eq.${org.organization_id},tenant_id.is.null`)
      .order("created_at", { ascending: true }),
  ]);

  if (membersError) return <p className="p-6 text-red-600">{membersError.message}</p>;

  const memberRows = members ?? [];
  const roles = (roleRows ?? []) as Array<{ id: string; key: string; label: string; tenant_id: string | null }>;
  const roleByKey = new Map<string, { id: string; key: string; label: string; tenant_id: string | null }>();
  for (const role of roles) {
    if (!roleByKey.has(role.key)) {
      roleByKey.set(role.key, role);
      continue;
    }
    const current = roleByKey.get(role.key)!;
    const isCurrentSystem = current.tenant_id == null;
    const isRoleSystem = role.tenant_id == null;
    if (!isCurrentSystem && isRoleSystem) {
      roleByKey.set(role.key, role);
    }
  }
  const normalizedRoles = Array.from(roleByKey.values());

  return (
    <UsersContent
      orgSlug={orgSlug}
      orgOrganizationId={org.organization_id}
      orgOrganizationName={org.organization_name}
      currentAppUserId={currentAppUserId}
      usersPerm={usersPerm}
      initialError={initialError}
      initialSuccess={initialSuccess}
      initialEditingUserId={initialEditingUserId}
      memberRows={memberRows}
      normalizedRoles={normalizedRoles}
    />
  );
}
