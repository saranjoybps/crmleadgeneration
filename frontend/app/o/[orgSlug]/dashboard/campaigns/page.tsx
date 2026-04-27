import Link from "next/link";
import { redirect } from "next/navigation";

import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";
import type { Campaign } from "@/lib/types";

type CampaignRow = Campaign;

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

type CampaignsPageProps = {
  params: Promise<{ orgSlug: string }>;
};

export default async function CampaignsPage({ params }: CampaignsPageProps) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const org = await getOrganizationContextOrRedirect(orgSlug);

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("id,name,industries,sources,location,organization_id,created_by,created_at")
    .eq("organization_id", org.organization_id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error.message}</p>
    );
  }

  const normalizedCampaigns = (campaigns ?? []) as CampaignRow[];
  const counts = await Promise.all(
    normalizedCampaigns.map(async (campaign) => {
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id);
      return { campaignId: campaign.id, totalLeads: count ?? 0 };
    }),
  );

  const leadsByCampaign = new Map(counts.map((item) => [item.campaignId, item.totalLeads]));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <h2 className="text-2xl font-semibold text-slate-900">Campaigns</h2>
      <p className="mt-1 text-sm text-slate-600">Track all lead generation campaigns in one place.</p>

      {normalizedCampaigns.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          No campaigns yet. Create your first campaign to start fetching leads.
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-600">
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Industries</th>
                <th className="px-4 py-3 font-medium">Sources</th>
                <th className="px-4 py-3 font-medium">Total Leads</th>
                <th className="px-4 py-3 font-medium">View</th>
              </tr>
            </thead>
            <tbody>
              {normalizedCampaigns.map((campaign) => (
                <tr key={campaign.id} className="border-t border-slate-100 text-slate-700">
                  <td className="px-4 py-3 font-medium text-slate-900">{campaign.name}</td>
                  <td className="px-4 py-3">{toStringList(campaign.industries).join(", ") || "-"}</td>
                  <td className="px-4 py-3">{toStringList(campaign.sources).join(", ") || "-"}</td>
                  <td className="px-4 py-3">{leadsByCampaign.get(campaign.id) ?? 0}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/o/${org.organization_slug}/dashboard/campaign/${campaign.id}`}
                      className="font-medium text-violet-700 hover:text-violet-900"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
