import { redirect } from "next/navigation";

import { LeadDetailsDrawer } from "@/components/LeadDetailsDrawer";
import { extractLeadMeta } from "@/lib/lead-meta";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";
import type { Campaign, Lead } from "@/lib/types";

type CampaignPageProps = {
  params: Promise<{ orgSlug: string; id: string }>;
};

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export default async function CampaignDetailPage({ params }: CampaignPageProps) {
  const { orgSlug, id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  const org = await getOrganizationContextOrRedirect(orgSlug);

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id,name,industries,sources,location,organization_id,created_by,created_at")
    .eq("id", id)
    .eq("organization_id", org.organization_id)
    .maybeSingle();

  if (campaignError) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{campaignError.message}</p>
    );
  }

  if (!campaign) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
        Campaign not found.
      </p>
    );
  }

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id,campaign_id,name,phone,email,website,source,raw_data,created_at")
    .eq("campaign_id", id)
    .order("created_at", { ascending: false });

  if (leadsError) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{leadsError.message}</p>
    );
  }

  const typedCampaign = campaign as Campaign;
  const typedLeads = (leads ?? []) as Lead[];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <h2 className="text-2xl font-semibold text-slate-900">{typedCampaign.name}</h2>
      <p className="mt-1 text-sm text-slate-600">
        Industries: {toStringList(typedCampaign.industries).join(", ") || "-"} | Sources:{" "}
        {toStringList(typedCampaign.sources).join(", ") || "-"}
      </p>

      {typedLeads.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          No leads found for this campaign yet.
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col />
              <col className="w-[9rem]" />
              <col className="w-[11rem]" />
              <col className="w-[5rem]" />
              <col className="w-[5.5rem]" />
              <col className="w-[18rem]" />
              <col className="w-[8rem]" />
              <col className="w-[6rem]" />
            </colgroup>
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-600">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Reviews</th>
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {typedLeads.map((lead) => {
                const meta = extractLeadMeta(lead);
                return (
                  <tr key={lead.id} className="border-t border-slate-100 text-slate-700">
                    <td className="truncate px-4 py-3 font-medium leading-6 text-slate-900" title={lead.name}>
                      {lead.name}
                    </td>
                    <td className="truncate px-4 py-3" title={meta.category ?? undefined}>
                      {meta.category ?? "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[0.9rem] leading-6 whitespace-nowrap">{lead.phone ?? "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{meta.rating ?? "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{meta.reviewsCount ?? "-"}</td>
                    <td className="truncate px-4 py-3" title={meta.address ?? undefined}>
                      {meta.address ?? "-"}
                    </td>
                    <td className="truncate px-4 py-3 whitespace-nowrap" title={lead.source}>
                      {lead.source}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <LeadDetailsDrawer lead={lead} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
