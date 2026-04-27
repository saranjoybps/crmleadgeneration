import { redirect } from "next/navigation";

import { getOrCreatePrimaryOrganization } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";

export default async function CreateCampaignPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  const org = await getOrCreatePrimaryOrganization();
  redirect(`/o/${org.organization_slug}/dashboard/create-campaign`);
}
