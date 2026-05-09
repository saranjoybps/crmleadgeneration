import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { logout } from "@/app/actions/auth";
import { ThemePreference } from "@/components/ThemePreference";
import { canManageOrganizationUsers, getOrganizationContextOrRedirect } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";

type SettingsPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

function cleanOptional(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

async function updateProfileDetails(formData: FormData) {
  "use server";

  const organizationSlug = String(formData.get("organization_slug") ?? "").trim();
  const path = `/o/${organizationSlug}/dashboard/settings`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: cleanOptional(formData.get("full_name")),
      job_title: cleanOptional(formData.get("job_title")),
    },
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Profile updated successfully.")}`);
}

async function updateTenantDetails(formData: FormData) {
  "use server";

  const tenantId = String(formData.get("organization_id") ?? "").trim();
  const tenantSlug = String(formData.get("organization_slug") ?? "").trim();
  const path = `/o/${tenantSlug}/dashboard/settings`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const org = await getOrganizationContextOrRedirect(tenantSlug);
  if (!canManageOrganizationUsers(org.role)) {
    redirect(`${path}?error=${encodeURIComponent("Only owner/admin can edit tenant details.")}`);
  }

  const payload = {
    name: cleanOptional(formData.get("name")),
    contact_email: cleanOptional(formData.get("contact_email")),
    domain: cleanOptional(formData.get("domain")),
  };

  if (!payload.name) redirect(`${path}?error=${encodeURIComponent("Tenant name is required.")}`);

  const { error } = await supabase.from("tenants").update(payload).eq("id", tenantId);
  if (error) redirect(`${path}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Tenant details updated successfully.")}`);
}

export default async function SettingsPage({ params, searchParams }: SettingsPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const org = await getOrganizationContextOrRedirect(orgSlug);
  const canManage = canManageOrganizationUsers(org.role);

  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("id,slug,name,contact_email,domain")
    .eq("id", org.organization_id)
    .maybeSingle();
  const { data: roles, error: rolesError } = await supabase
    .from("roles")
    .select("id,key,label")
    .order("created_at", { ascending: true });

  if (error || !tenant) {
    return <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error?.message ?? "Tenant not found."}</p>;
  }
  if (rolesError) {
    return <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{rolesError.message}</p>;
  }

  return (
    <section className="space-y-6">
      {query.error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{query.error}</p> : null}
      {query.success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{query.success}</p> : null}

      <article className="surface-card rounded-2xl border p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-main">Tenant Details</h3>
        <form action={updateTenantDetails} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="organization_id" value={tenant.id} />
          <input type="hidden" name="organization_slug" value={tenant.slug} />
          <label className="text-sm text-main">
            Workspace Name
            <input name="name" defaultValue={tenant.name ?? ""} disabled={!canManage} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          </label>
          <label className="text-sm text-main">
            Contact Email
            <input name="contact_email" type="email" defaultValue={tenant.contact_email ?? ""} disabled={!canManage} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          </label>
          <label className="text-sm text-main md:col-span-2">
            Domain
            <input name="domain" defaultValue={tenant.domain ?? ""} disabled={!canManage} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          </label>
          {canManage ? <button type="submit" className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">Save Tenant</button> : null}
        </form>
      </article>

      <article className="surface-card rounded-2xl border p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-main">Profile</h3>
        <form action={updateProfileDetails} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="organization_slug" value={org.organization_slug} />
          <label className="text-sm text-main">
            Full Name
            <input name="full_name" defaultValue={String((user.user_metadata as Record<string, unknown> | null)?.full_name ?? "")} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          </label>
          <label className="text-sm text-main">
            Job Title
            <input name="job_title" defaultValue={String((user.user_metadata as Record<string, unknown> | null)?.job_title ?? "")} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          </label>
          <button type="submit" className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">Save Profile</button>
        </form>
      </article>

      <article className="surface-card rounded-2xl border p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-main">Theme</h3>
        <div className="mt-4"><ThemePreference /></div>
      </article>

      <article className="surface-card rounded-2xl border p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-main">Available Roles</h3>
        <p className="mt-1 text-sm text-muted">Roles configured in your workspace database.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(roles ?? []).map((role) => (
            <span key={role.id} className="rounded-full border border-soft px-3 py-1 text-xs font-medium text-main">
              {role.label} ({role.key})
            </span>
          ))}
        </div>
      </article>

      <article className="surface-card rounded-2xl border p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-main">Session</h3>
        <form action={logout} className="mt-4">
          <button type="submit" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white">Logout</button>
        </form>
      </article>
    </section>
  );
}
