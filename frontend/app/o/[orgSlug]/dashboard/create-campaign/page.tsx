import { redirect } from "next/navigation";

import { CreateCampaignForm } from "@/components/CreateCampaignForm";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";

type CreateCampaignPageProps = {
  params: Promise<{ orgSlug: string }>;
};

export default async function CreateCampaignPage({ params }: CreateCampaignPageProps) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  const org = await getOrganizationContextOrRedirect(orgSlug);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Create Campaign</h2>
        <p className="mt-1 text-sm text-slate-600">Configure data sources and lead filters for your next batch.</p>
      </div>
      <CreateCampaignForm organizationId={org.organization_id} organizationSlug={org.organization_slug} />
    </section>
  );
}
