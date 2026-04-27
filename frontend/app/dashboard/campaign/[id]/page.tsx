import { redirect } from "next/navigation";

import { getOrCreatePrimaryOrganization } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";

type LegacyCampaignPageProps = {
  params: Promise<{ id: string }>;
};

export default async function LegacyCampaignPage({ params }: LegacyCampaignPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const org = await getOrCreatePrimaryOrganization();
  redirect(`/o/${org.organization_slug}/dashboard/campaign/${id}`);
}
