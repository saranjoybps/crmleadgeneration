import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ProjectMembersField } from "@/components/ProjectMembersField";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";

type ProjectsPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

function resolveJoinedUserEmail(value: unknown): string {
  if (Array.isArray(value)) return String(value[0]?.email ?? "unknown");
  if (value && typeof value === "object" && "email" in value) return String((value as { email?: string }).email ?? "unknown");
  return "unknown";
}

async function getApiContext(orgSlug: string) {
  const supabase = await createClient();
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!apiBase || !accessToken) return null;
  return { apiBase, accessToken };
}

async function createProject(formData: FormData) {
  "use server";
  const orgSlug = String(formData.get("organization_slug") ?? "").trim();
  const tenantId = String(formData.get("organization_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const path = `/o/${orgSlug}/dashboard/projects`;

  const org = await getOrganizationContextOrRedirect(orgSlug);
  if (!(org.role === "owner" || org.role === "admin")) {
    redirect(`${path}?error=${encodeURIComponent("Only owner/admin can create projects.")}`);
  }
  if (!name) {
    redirect(`${path}?error=${encodeURIComponent("Project name is required.")}`);
  }

  const api = await getApiContext(orgSlug);
  if (!api) {
    redirect(`${path}?error=${encodeURIComponent("API base URL or session missing.")}`);
  }

  const ids = formData
    .getAll("member_user_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const resp = await fetch(`${api.apiBase}/api/v1/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${api.accessToken}`,
      "X-Org-Slug": orgSlug,
    },
    body: JSON.stringify({
      name,
      description: description || null,
      status: "active",
      member_user_ids: ids,
    }),
    cache: "no-store",
  });
  const payload = (await resp.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!resp.ok) {
    redirect(`${path}?error=${encodeURIComponent(payload?.error?.message ?? `Unable to create project (${resp.status})`)}`);
  }

  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Project created.")}`);
}

export default async function ProjectsPage({ params, searchParams }: ProjectsPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const org = await getOrganizationContextOrRedirect(orgSlug);
  const supabase = await createClient();
  const api = await getApiContext(orgSlug);
  if (!api) {
    return <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">API base URL or session missing.</p>;
  }

  const [projectsResp, usersResp] = await Promise.all([
    fetch(`${api.apiBase}/api/v1/projects`, {
      headers: { Authorization: `Bearer ${api.accessToken}`, "X-Org-Slug": orgSlug },
      cache: "no-store",
    }),
    (org.role === "owner" || org.role === "admin")
      ? fetch(`${api.apiBase}/api/v1/users?limit=200&offset=0`, {
          headers: { Authorization: `Bearer ${api.accessToken}`, "X-Org-Slug": orgSlug },
          cache: "no-store",
        })
      : Promise.resolve(null),
  ]);

  const projectsBody = (await projectsResp.json().catch(() => null)) as { data?: Array<{ id: string; name: string; description?: string; status: string }>; error?: { message?: string } } | null;
  if (!projectsResp.ok) {
    return <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{projectsBody?.error?.message ?? "Failed to load projects."}</p>;
  }
  const usersBody = usersResp
    ? ((await usersResp.json().catch(() => null)) as { data?: Array<{ user_id: string; users?: unknown }> } | null)
    : null;
  const projects = projectsBody?.data ?? [];
  const usersFromApi = usersBody?.data ?? [];
  let users = usersFromApi;
  if ((org.role === "owner" || org.role === "admin") && users.length === 0) {
    const { data: fallbackUsers } = await supabase
      .from("user_tenant_roles")
      .select("user_id,users!user_tenant_roles_user_id_fkey(email)")
      .eq("tenant_id", org.organization_id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    users = (fallbackUsers ?? []) as Array<{ user_id: string; users?: unknown }>;
  }
  const userOptions = users.map((row) => ({
    user_id: row.user_id,
    email: resolveJoinedUserEmail((row as { users?: unknown }).users),
  }));

  return (
    <section className="space-y-6">
      {query.error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{query.error}</p> : null}
      {query.success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{query.success}</p> : null}

      {(org.role === "owner" || org.role === "admin") ? (
        <article className="surface-card rounded-2xl border p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-main">Create Project</h2>
          <form action={createProject} className="mt-4 grid gap-3">
            <input type="hidden" name="organization_slug" value={org.organization_slug} />
            <input type="hidden" name="organization_id" value={org.organization_id} />
            <input name="name" required placeholder="Project name" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            <textarea name="description" placeholder="Description" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            <ProjectMembersField users={userOptions} />
            <button type="submit" className="w-fit rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">Create Project</button>
          </form>
          <div className="mt-3 text-xs text-muted">
            Active users: {(users ?? []).map((row) => `${resolveJoinedUserEmail((row as { users?: unknown }).users)} (${row.user_id})`).join(", ")}
          </div>
        </article>
      ) : null}

      <article className="surface-card rounded-2xl border p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-main">Projects</h2>
        <div className="mt-4 space-y-3">
          {(projects ?? []).length === 0 ? <p className="text-sm text-muted">No projects yet.</p> : null}
          {(projects ?? []).map((project) => (
            <div key={project.id} className="rounded-xl border border-soft p-4">
              <p className="font-semibold text-main">{project.name}</p>
              <p className="text-xs uppercase text-muted">{project.status}</p>
              <p className="mt-1 text-sm text-muted">{project.description ?? "No description"}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
