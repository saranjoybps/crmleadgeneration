import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type InvitePageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
};

async function acceptInvite(formData: FormData) {
  "use server";

  const token = String(formData.get("token") ?? "").trim();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?error=${encodeURIComponent("Please login before accepting the invite.")}`);
  }

  const { data, error } = await supabase.rpc("accept_tenant_invite", { p_token: token });

  if (error) {
    redirect(`/invite/${token}?error=${encodeURIComponent(error.message)}`);
  }

  const accepted = Array.isArray(data) ? data[0] : null;
  if (!accepted?.tenant_slug) {
    redirect(`/invite/${token}?error=${encodeURIComponent("Invite accepted but tenant redirect failed.")}`);
  }

  redirect(`/o/${accepted.tenant_slug}/dashboard`);
}

export default async function InvitePage({ params, searchParams }: InvitePageProps) {
  const { token } = await params;
  const query = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4">
      <section className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Tenant Invite</h1>
        <p className="mt-2 text-sm text-slate-600">Accept this invite to join the tenant workspace.</p>
        {query.error ? <p className="mt-4 rounded-md bg-red-50 p-2 text-sm text-red-700">{query.error}</p> : null}

        <form action={acceptInvite} className="mt-6">
          <input type="hidden" name="token" value={token} />
          <button type="submit" className="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white">Accept Invite</button>
        </form>
      </section>
    </main>
  );
}
