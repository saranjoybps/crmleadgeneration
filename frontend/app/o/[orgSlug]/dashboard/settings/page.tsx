import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { User, Shield, Palette, Info, LogOut, Globe, Mail, Briefcase } from "lucide-react";

import { logout } from "@/app/actions/auth";
import { ThemePreference } from "@/components/ThemePreference";
import { canManageOrganizationUsers, getOrganizationContextOrRedirect } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

type SettingsPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

function cleanOptional(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

const AVATARS = [
  { name: "Aria", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Aria" },
  { name: "Alex", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Alex" },
  { name: "James", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=James" },
  { name: "Ethan", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Ethan" },
  { name: "Sofia", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Sofia" },
  { name: "Lily", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Lily" },
  { name: "Nora", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Nora" },
  { name: "Luna", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Luna" },
  { name: "Nova", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Nova" },
  { name: "Felix", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Felix" },
];

async function updateProfileDetails(formData: FormData) {
  "use server";
  const organizationSlug = String(formData.get("organization_slug") ?? "").trim();
  const path = `/o/${organizationSlug}/dashboard/settings`;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName = cleanOptional(formData.get("full_name"));
  const avatarUrl = cleanOptional(formData.get("avatar_url"));

  // 1. Update auth metadata
  const { error: authError } = await supabase.auth.updateUser({
    data: {
      full_name: fullName,
      job_title: cleanOptional(formData.get("job_title")),
      avatar_url: avatarUrl,
    },
  });

  if (authError) redirect(`${path}?error=${encodeURIComponent(authError.message)}`);

  // 2. Sync to public.users table
  const { error: dbError } = await supabase
    .from("users")
    .update({ 
      full_name: fullName,
      avatar_url: avatarUrl
    })
    .eq("auth_user_id", user.id);

  if (dbError) {
    console.error("Failed to sync profile to users table:", dbError);
  }

  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Profile updated successfully.")}`);
}

async function updateTenantDetails(formData: FormData) {
  "use server";
  const tenantId = String(formData.get("organization_id") ?? "").trim();
  const tenantSlug = String(formData.get("organization_slug") ?? "").trim();
  const path = `/o/${tenantSlug}/dashboard/settings`;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getOrganizationContextOrRedirect(orgSlug);
  const canManage = canManageOrganizationUsers(org.role);

  const [tenantRes, rolesRes] = await Promise.all([
    supabase.from("tenants").select("id,slug,name,contact_email,domain").eq("id", org.organization_id).maybeSingle(),
    supabase.from("roles").select("id,key,label").order("created_at", { ascending: true })
  ]);

  if (tenantRes.error || !tenantRes.data) return <p className="p-6 text-red-600">Tenant not found.</p>;
  const tenant = tenantRes.data;
  const roles = rolesRes.data ?? [];

  return (
    <div className="max-w-4xl space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-main">Settings</h1>
        <p className="text-muted">Manage your personal profile and organization preferences.</p>
      </header>

      {query.error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm">{query.error}</div>}
      {query.success && <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-sm">{query.success}</div>}

      <div className="grid gap-10">
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-soft pb-4">
            <User className="h-5 w-5 text-violet-600" />
            <h2 className="text-xl font-bold text-main">Personal Profile</h2>
          </div>
          <Card className="p-8">
            <form action={updateProfileDetails} className="space-y-10">
              <input type="hidden" name="organization_slug" value={orgSlug} />
              
              <div className="space-y-4">
                <label className="text-sm font-bold uppercase tracking-wider text-muted">Profile Avatar</label>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
                  {AVATARS.map((avatar) => (
                    <label key={avatar.name} className="relative cursor-pointer group">
                      <input 
                        type="radio" 
                        name="avatar_url" 
                        value={avatar.url} 
                        className="peer sr-only" 
                        defaultChecked={(user.user_metadata as any)?.avatar_url === avatar.url}
                      />
                      <div className="aspect-square rounded-2xl border-2 border-soft bg-slate-50 overflow-hidden transition-all peer-checked:border-violet-600 peer-checked:ring-2 peer-checked:ring-violet-600/20 group-hover:border-violet-200 shadow-sm">
                        <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                         <span className="text-[10px] font-bold text-muted bg-white px-1.5 py-0.5 rounded border border-soft shadow-sm">{avatar.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <Input label="Full Name" name="full_name" defaultValue={String((user.user_metadata as any)?.full_name ?? "")} placeholder="Enter your name" />
                <Input label="Job Title" name="job_title" defaultValue={String((user.user_metadata as any)?.job_title ?? "")} placeholder="Product Designer, Developer, etc." />
              </div>
              <div className="flex justify-end pt-4 border-t border-soft">
                <Button type="submit">Update Profile</Button>
              </div>
            </form>
          </Card>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-soft pb-4">
            <Shield className="h-5 w-5 text-violet-600" />
            <h2 className="text-xl font-bold text-main">Organization Workspace</h2>
          </div>
          <Card className="p-8">
            <form action={updateTenantDetails} className="space-y-6">
              <input type="hidden" name="organization_id" value={tenant.id} />
              <input type="hidden" name="organization_slug" value={tenant.slug} />
              <div className="grid gap-6 sm:grid-cols-2">
                <Input label="Workspace Name" name="name" defaultValue={tenant.name ?? ""} disabled={!canManage} />
                <Input label="Support Email" name="contact_email" type="email" defaultValue={tenant.contact_email ?? ""} disabled={!canManage} />
                <div className="sm:col-span-2">
                  <Input label="Custom Domain" name="domain" defaultValue={tenant.domain ?? ""} disabled={!canManage} placeholder="crm.yourcompany.com" />
                </div>
              </div>
              {canManage && (
                <div className="flex justify-end pt-2">
                  <Button type="submit">Save Organization</Button>
                </div>
              )}
            </form>
          </Card>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-soft pb-4">
            <Palette className="h-5 w-5 text-violet-600" />
            <h2 className="text-xl font-bold text-main">Appearance</h2>
          </div>
          <Card className="p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <h3 className="font-bold text-main">Theme Mode</h3>
                <p className="text-sm text-muted">Choose how JOY CRM looks on your device.</p>
              </div>
              <ThemePreference />
            </div>
          </Card>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-soft pb-4">
            <Info className="h-5 w-5 text-violet-600" />
            <h2 className="text-xl font-bold text-main">System Roles</h2>
          </div>
          <Card className="p-8">
            <p className="text-sm text-muted mb-6">These are the access levels configured for this workspace.</p>
            <div className="flex flex-wrap gap-3">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center gap-2 rounded-2xl border border-soft px-4 py-2 bg-slate-50">
                  <span className="text-sm font-bold text-main">{role.label}</span>
                  <Badge variant="outline" className="text-[10px] lowercase">{role.key}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <div className="pt-10 border-t border-soft">
          <form action={logout}>
            <Button variant="danger" type="submit" className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out of Session
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
