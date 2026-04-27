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
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function getMetadataValue(metadata: Record<string, unknown>, key: string): string {
  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

async function updateProfileDetails(formData: FormData) {
  "use server";

  const organizationSlug = String(formData.get("organization_slug") ?? "").trim();
  const path = `/o/${organizationSlug}/dashboard/settings`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: cleanOptional(formData.get("full_name")),
      job_title: cleanOptional(formData.get("job_title")),
      phone: cleanOptional(formData.get("profile_phone")),
      mobile: cleanOptional(formData.get("profile_mobile")),
      website: cleanOptional(formData.get("profile_website")),
      city: cleanOptional(formData.get("profile_city")),
      state: cleanOptional(formData.get("profile_state")),
    },
  });

  if (error) {
    redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Profile updated successfully.")}`);
}

async function updateOrganizationDetails(formData: FormData) {
  "use server";

  const organizationId = String(formData.get("organization_id") ?? "").trim();
  const organizationSlug = String(formData.get("organization_slug") ?? "").trim();
  const path = `/o/${organizationSlug}/dashboard/settings`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const membership = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const role = membership.data?.role ?? "member";
  if (!canManageOrganizationUsers(role)) {
    redirect(`${path}?error=${encodeURIComponent("Only owner/admin can edit organization details.")}`);
  }

  const payload = {
    name: cleanOptional(formData.get("name")),
    contact_email: cleanOptional(formData.get("contact_email")),
    phone: cleanOptional(formData.get("phone")),
    mobile: cleanOptional(formData.get("mobile")),
    website: cleanOptional(formData.get("website")),
    address: cleanOptional(formData.get("address")),
    city: cleanOptional(formData.get("city")),
    state: cleanOptional(formData.get("state")),
    people_range: cleanOptional(formData.get("people_range")),
  };

  if (!payload.name) {
    redirect(`${path}?error=${encodeURIComponent("Organization name is required.")}`);
  }

  const { error } = await supabase
    .from("organizations")
    .update(payload)
    .eq("id", organizationId);

  if (error) {
    redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Organization details updated successfully.")}`);
}

export default async function SettingsPage({ params, searchParams }: SettingsPageProps) {
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
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;

  const { data: organization, error } = await supabase
    .from("organizations")
    .select("id,slug,name,contact_email,phone,mobile,website,address,city,state,people_range")
    .eq("id", org.organization_id)
    .maybeSingle();

  if (error || !organization) {
    return <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error?.message ?? "Organization not found."}</p>;
  }

  return (
    <section className="space-y-6">
      {query.error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{query.error}</p> : null}
      {query.success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{query.success}</p> : null}

      <article className="rounded-3xl border border-violet-200/70 bg-gradient-to-r from-white via-violet-50/50 to-indigo-50/60 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-violet-600">Workspace Settings</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">Manage {organization.name}</h2>
            <p className="mt-2 text-sm text-slate-600">Update organization, profile, and preferences from a single control center.</p>
          </div>
          <div className="space-y-2">
            <span className="block rounded-full bg-violet-600 px-3 py-1 text-center text-xs font-semibold uppercase tracking-wide text-white">
              {org.role}
            </span>
            <span className="block rounded-full border border-violet-200 bg-white px-3 py-1 text-center text-xs font-medium text-violet-700">
              /o/{organization.slug}
            </span>
          </div>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-3">
        <article className="surface-card rounded-2xl border p-5 shadow-sm xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-main">Organization Details</h3>
              <p className="mt-1 text-sm text-muted">Workspace profile and public-facing company information.</p>
            </div>
            <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
              Editable by owner/admin
            </span>
          </div>

          <form action={updateOrganizationDetails} className="mt-5 space-y-4">
            <input type="hidden" name="organization_id" value={organization.id} />
            <input type="hidden" name="organization_slug" value={organization.slug} />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-slate-700">Organization Name</label>
                <input
                  id="name"
                  name="name"
                  required
                  defaultValue={organization.name ?? ""}
                  disabled={!canManage}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="slug" className="text-sm font-medium text-slate-700">Workspace Slug</label>
                <input
                  id="slug"
                  value={organization.slug}
                  readOnly
                  className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm text-slate-700"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="contact_email" className="text-sm font-medium text-slate-700">Organization Email</label>
                <input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  defaultValue={organization.contact_email ?? ""}
                  disabled={!canManage}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="website" className="text-sm font-medium text-slate-700">Website</label>
                <input
                  id="website"
                  name="website"
                  type="url"
                  defaultValue={organization.website ?? ""}
                  placeholder="https://example.com"
                  disabled={!canManage}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-slate-700">Phone</label>
                <input
                  id="phone"
                  name="phone"
                  defaultValue={organization.phone ?? ""}
                  disabled={!canManage}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="mobile" className="text-sm font-medium text-slate-700">Mobile</label>
                <input
                  id="mobile"
                  name="mobile"
                  defaultValue={organization.mobile ?? ""}
                  disabled={!canManage}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="people_range" className="text-sm font-medium text-slate-700">People Range</label>
                <input
                  id="people_range"
                  name="people_range"
                  defaultValue={organization.people_range ?? ""}
                  placeholder="e.g. 10-50"
                  disabled={!canManage}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="address" className="text-sm font-medium text-slate-700">Address</label>
              <textarea
                id="address"
                name="address"
                rows={3}
                defaultValue={organization.address ?? ""}
                disabled={!canManage}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="city" className="text-sm font-medium text-slate-700">City</label>
                <input
                  id="city"
                  name="city"
                  defaultValue={organization.city ?? ""}
                  disabled={!canManage}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="state" className="text-sm font-medium text-slate-700">State</label>
                <input
                  id="state"
                  name="state"
                  defaultValue={organization.state ?? ""}
                  disabled={!canManage}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            {canManage ? (
              <button type="submit" className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700">
                Save Organization Details
              </button>
            ) : (
              <p className="text-sm text-amber-700">Only owner/admin can edit organization details.</p>
            )}
          </form>
        </article>

        <article className="surface-card rounded-2xl border p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-main">Workspace Snapshot</h3>
          <p className="mt-1 text-sm text-muted">Quick reference for current tenant context.</p>
          <div className="mt-4 space-y-3">
            <div className="surface-muted rounded-xl border border-soft px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted">Organization</p>
              <p className="mt-1 text-sm font-semibold text-main">{organization.name}</p>
            </div>
            <div className="surface-muted rounded-xl border border-soft px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted">Workspace URL</p>
              <p className="mt-1 text-sm font-medium text-main">/o/{organization.slug}</p>
            </div>
            <div className="surface-muted rounded-xl border border-soft px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted">Signed In</p>
              <p className="mt-1 text-sm font-medium text-main">{user.email ?? "-"}</p>
            </div>
            <div className="surface-muted rounded-xl border border-soft px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted">Permissions</p>
              <p className="mt-1 text-sm font-medium uppercase text-violet-700">{org.role}</p>
            </div>
          </div>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <article className="surface-card rounded-2xl border p-5 shadow-sm xl:col-span-2">
          <h3 className="text-lg font-semibold text-main">Profile</h3>
          <p className="mt-1 text-sm text-muted">Update your personal account details.</p>

          <form action={updateProfileDetails} className="mt-5 space-y-4">
            <input type="hidden" name="organization_slug" value={org.organization_slug} />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="full_name" className="text-sm font-medium text-slate-700">Full Name</label>
                <input
                  id="full_name"
                  name="full_name"
                  defaultValue={getMetadataValue(metadata, "full_name")}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="job_title" className="text-sm font-medium text-slate-700">Job Title</label>
                <input
                  id="job_title"
                  name="job_title"
                  defaultValue={getMetadataValue(metadata, "job_title")}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="profile_email" className="text-sm font-medium text-slate-700">Email</label>
              <input
                id="profile_email"
                value={user.email ?? ""}
                readOnly
                className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm text-slate-700"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="profile_phone" className="text-sm font-medium text-slate-700">Phone</label>
                <input
                  id="profile_phone"
                  name="profile_phone"
                  defaultValue={getMetadataValue(metadata, "phone")}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="profile_mobile" className="text-sm font-medium text-slate-700">Mobile</label>
                <input
                  id="profile_mobile"
                  name="profile_mobile"
                  defaultValue={getMetadataValue(metadata, "mobile")}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="profile_website" className="text-sm font-medium text-slate-700">Website</label>
                <input
                  id="profile_website"
                  name="profile_website"
                  type="url"
                  defaultValue={getMetadataValue(metadata, "website")}
                  placeholder="https://example.com"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="profile_city" className="text-sm font-medium text-slate-700">City</label>
                <input
                  id="profile_city"
                  name="profile_city"
                  defaultValue={getMetadataValue(metadata, "city")}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="profile_state" className="text-sm font-medium text-slate-700">State</label>
                <input
                  id="profile_state"
                  name="profile_state"
                  defaultValue={getMetadataValue(metadata, "state")}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white"
                />
              </div>
            </div>

            <button type="submit" className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700">
              Save Profile
            </button>
          </form>
        </article>

        <div className="space-y-6">
          <article className="surface-card rounded-2xl border p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-main">Theme</h3>
            <p className="mt-1 text-sm text-muted">Choose your dashboard appearance preference.</p>
            <div className="mt-4">
              <ThemePreference />
            </div>
          </article>

          <article className="surface-card rounded-2xl border p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-main">Session</h3>
            <p className="mt-1 text-sm text-muted">Sign out securely from your current session.</p>
            <form action={logout} className="mt-4">
              <button type="submit" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white">
                Logout
              </button>
            </form>
          </article>
        </div>
      </div>
    </section>
  );
}
