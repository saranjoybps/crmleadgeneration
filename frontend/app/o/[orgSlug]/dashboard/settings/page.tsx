import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { User, Shield, Palette, Info, LogOut, Globe, Mail, Briefcase, Check } from "lucide-react";

import { logout } from "@/app/actions/auth";
import { ThemePreference } from "@/components/ThemePreference";
import { canManageOrganizationUsers, getOrganizationContextOrRedirect } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

type SettingsPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string; tab?: string }>;
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
  const path = `/o/${organizationSlug}/dashboard/settings?tab=profile`;
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

  if (authError) redirect(`${path}&error=${encodeURIComponent(authError.message)}`);

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
  redirect(`${path}&success=${encodeURIComponent("Profile updated successfully.")}`);
}

async function updateTenantDetails(formData: FormData) {
  "use server";
  const tenantId = String(formData.get("organization_id") ?? "").trim();
  const tenantSlug = String(formData.get("organization_slug") ?? "").trim();
  const path = `/o/${tenantSlug}/dashboard/settings?tab=organization`;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getOrganizationContextOrRedirect(tenantSlug);
  if (!canManageOrganizationUsers(org.role)) {
    redirect(`${path}&error=${encodeURIComponent("Only owner/admin can edit tenant details.")}`);
  }

  const payload = {
    name: cleanOptional(formData.get("name")),
    contact_email: cleanOptional(formData.get("contact_email")),
    domain: cleanOptional(formData.get("domain")),
  };

  if (!payload.name) redirect(`${path}&error=${encodeURIComponent("Tenant name is required.")}`);

  const { error } = await supabase.from("tenants").update(payload).eq("id", tenantId);
  if (error) redirect(`${path}&error=${encodeURIComponent(error.message)}`);

  revalidatePath(path);
  redirect(`${path}&success=${encodeURIComponent("Tenant details updated successfully.")}`);
}

export default async function SettingsPage({ params, searchParams }: SettingsPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const activeTab = query.tab || "profile";
  
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

  const tabs = [
    { id: "profile", label: "My Profile", icon: User },
    { id: "organization", label: "Organization", icon: Shield },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "info", label: "System Info", icon: Info },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-main">Settings</h1>
          <p className="mt-1 text-muted font-medium">Manage your personal profile and organization preferences.</p>
        </div>
        <form action={logout}>
          <Button variant="outline" type="submit" className="gap-2 border-soft text-muted font-bold hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-all rounded-xl shadow-sm">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </form>
      </header>

      {(query.error || query.success) && (
        <div className={cn(
          "p-4 rounded-2xl border text-sm font-medium flex items-center gap-3",
          query.error ? "bg-red-50 border-red-100 text-red-700" : "bg-emerald-50 border-emerald-100 text-emerald-700"
        )}>
          <div className={cn("h-2 w-2 rounded-full", query.error ? "bg-red-500" : "bg-emerald-500")} />
          {query.error || query.success}
        </div>
      )}

      {/* TABS NAVIGATION */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-2xl border border-soft/50 w-fit">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/o/${orgSlug}/dashboard/settings?tab=${tab.id}`}
            className={cn(
              "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200",
              activeTab === tab.id 
                ? "bg-white text-violet-600 shadow-md shadow-violet-500/10 border border-violet-100 scale-[1.02]" 
                : "text-muted hover:text-main hover:bg-white/50"
            )}
          >
            <tab.icon className={cn("h-4 w-4", activeTab === tab.id ? "text-violet-600" : "text-muted/70")} />
            {tab.label}
          </Link>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div className="mt-6">
        {activeTab === "profile" && (
           <Card className="p-0 overflow-hidden border-none shadow-xl shadow-slate-200/50">
             <div className="bg-slate-50 border-b border-soft px-8 py-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white border border-soft flex items-center justify-center shadow-sm">
                  <User className="h-6 w-6 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-main leading-none">Personal Profile</h2>
                  <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Manage your identity and avatar</p>
                </div>
             </div>
             <div className="p-8">
                <form action={updateProfileDetails} className="space-y-10">
                  <input type="hidden" name="organization_slug" value={orgSlug} />
                  
                  <div className="space-y-4">
                    <label className="text-sm font-bold uppercase tracking-wider text-muted ml-1">Profile Avatar</label>
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
                          <div className="aspect-square rounded-2xl border-2 border-soft bg-slate-50 overflow-hidden transition-all peer-checked:border-violet-600 peer-checked:ring-2 peer-checked:ring-violet-600/20 group-hover:border-violet-200 shadow-sm relative">
                            <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-violet-600/0 peer-checked:bg-violet-600/5 transition-colors" />
                            <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-violet-600 text-white flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity scale-0 peer-checked:scale-100 transform origin-center">
                              <Check className="h-2 w-2 stroke-[4px]" />
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-8 sm:grid-cols-2">
                    <Input label="Full Name" name="full_name" defaultValue={String((user.user_metadata as any)?.full_name ?? "")} placeholder="Enter your name" />
                    <Input label="Job Title" name="job_title" defaultValue={String((user.user_metadata as any)?.job_title ?? "")} placeholder="Product Designer, Developer, etc." />
                  </div>
                  <div className="flex justify-end pt-8 border-t border-soft">
                    <Button type="submit" className="px-8 h-12 shadow-lg shadow-violet-500/20">Save Profile Changes</Button>
                  </div>
                </form>
             </div>
           </Card>
        )}

        {activeTab === "organization" && (
           <Card className="p-0 overflow-hidden border-none shadow-xl shadow-slate-200/50">
             <div className="bg-slate-50 border-b border-soft px-8 py-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white border border-soft flex items-center justify-center shadow-sm">
                  <Shield className="h-6 w-6 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-main leading-none">Organization Workspace</h2>
                  <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Tenant identity and domain settings</p>
                </div>
             </div>
             <div className="p-8">
                <form action={updateTenantDetails} className="space-y-8">
                  <input type="hidden" name="organization_id" value={tenant.id} />
                  <input type="hidden" name="organization_slug" value={tenant.slug} />
                  <div className="grid gap-8 sm:grid-cols-2">
                    <Input label="Workspace Name" name="name" defaultValue={tenant.name ?? ""} disabled={!canManage} />
                    <Input label="Support Email" name="contact_email" type="email" defaultValue={tenant.contact_email ?? ""} disabled={!canManage} />
                    <div className="sm:col-span-2">
                      <Input label="Custom Domain" name="domain" defaultValue={tenant.domain ?? ""} disabled={!canManage} placeholder="crm.yourcompany.com" />
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex justify-end pt-8 border-t border-soft">
                      <Button type="submit" className="px-8 h-12 shadow-lg shadow-violet-500/20">Save Workspace Details</Button>
                    </div>
                  )}
                </form>
             </div>
           </Card>
        )}

        {activeTab === "appearance" && (
           <Card className="p-0 overflow-hidden border-none shadow-xl shadow-slate-200/50">
             <div className="bg-slate-50 border-b border-soft px-8 py-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white border border-soft flex items-center justify-center shadow-sm">
                  <Palette className="h-6 w-6 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-main leading-none">Appearance</h2>
                  <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Customize your visual experience</p>
                </div>
             </div>
             <div className="p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 p-6 rounded-3xl bg-slate-50 border border-soft">
                  <div>
                    <h3 className="text-lg font-black text-main">Theme Mode</h3>
                    <p className="text-sm font-medium text-muted mt-1">Choose how JOY CRM looks on your device.</p>
                  </div>
                  <ThemePreference />
                </div>
             </div>
           </Card>
        )}

        {activeTab === "info" && (
           <Card className="p-0 overflow-hidden border-none shadow-xl shadow-slate-200/50">
             <div className="bg-slate-50 border-b border-soft px-8 py-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white border border-soft flex items-center justify-center shadow-sm">
                  <Info className="h-6 w-6 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-main leading-none">System Info</h2>
                  <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Workspace configuration and roles</p>
                </div>
             </div>
             <div className="p-8 space-y-8">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted mb-4 ml-1">Configured Roles</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {roles.map((role) => (
                      <div key={role.id} className="group flex items-center justify-between gap-4 rounded-2xl border border-soft px-5 py-4 bg-white hover:border-violet-200 hover:shadow-md transition-all">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl bg-violet-50 flex items-center justify-center">
                            <Shield className="h-4 w-4 text-violet-600" />
                          </div>
                          <span className="text-sm font-bold text-main">{role.label}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tighter bg-slate-50 border-soft text-muted">{role.key}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8 border-t border-soft">
                   <div className="p-6 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                         <Globe className="h-5 w-5 text-indigo-600" />
                      </div>
                      <p className="text-sm font-bold text-indigo-900 leading-snug">
                         This workspace is isolated and secure. All data is scoped to <span className="underline decoration-indigo-300 underline-offset-4">{tenant.name}</span>.
                      </p>
                   </div>
                </div>
             </div>
           </Card>
        )}
      </div>
    </div>
  );
}
