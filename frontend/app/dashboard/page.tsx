import { redirect } from "next/navigation";

import { getOrCreatePrimaryOrganization } from "@/lib/organizations";

export default async function LegacyDashboardPage() {
  const org = await getOrCreatePrimaryOrganization();
  redirect(`/o/${org.organization_slug}/dashboard`);
}
