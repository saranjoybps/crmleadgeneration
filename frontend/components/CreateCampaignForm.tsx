"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { LeadDetailsDrawer } from "@/components/LeadDetailsDrawer";
import { extractLeadMeta } from "@/lib/lead-meta";
import { MultiSelect } from "@/components/MultiSelect";
import type { ApproveLeadsPayload, ApproveLeadsResult, FetchLeadsPayload, FetchLeadsResult, PreviewLead, SourceOption } from "@/lib/types";

const INDUSTRY_OPTIONS = [
  { label: "Restaurants", value: "restaurants" },
  { label: "Real Estate", value: "real_estate" },
  { label: "Fashion", value: "fashion" },
  { label: "SaaS", value: "saas" },
  { label: "Healthcare", value: "healthcare" },
];

const SOURCE_OPTIONS: { label: string; value: SourceOption }[] = [
  { label: "Google Maps", value: "google_maps" },
  { label: "Instagram", value: "instagram" },
];

type CreateCampaignFormProps = {
  organizationId: string;
  organizationSlug: string;
};

export function CreateCampaignForm({ organizationId, organizationSlug }: CreateCampaignFormProps) {
  const router = useRouter();
  const [fetching, setFetching] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [industries, setIndustries] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [campaignDraft, setCampaignDraft] = useState<FetchLeadsPayload | null>(null);
  const [previewLeads, setPreviewLeads] = useState<PreviewLead[]>([]);
  const [selectedLeadIndexes, setSelectedLeadIndexes] = useState<number[]>([]);

  const allSelected = previewLeads.length > 0 && selectedLeadIndexes.length === previewLeads.length;

  function toggleLead(index: number) {
    setSelectedLeadIndexes((previous) => {
      if (previous.includes(index)) {
        return previous.filter((item) => item !== index);
      }
      return [...previous, index];
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedLeadIndexes([]);
      return;
    }
    setSelectedLeadIndexes(previewLeads.map((_, index) => index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFetching(true);

    const formData = new FormData(event.currentTarget);

    const payload: FetchLeadsPayload = {
      organization_id: organizationId,
      campaign_name: String(formData.get("campaign_name") ?? "").trim(),
      industries,
      sources: sources as SourceOption[],
      location: String(formData.get("location") ?? "").trim(),
      keywords: String(formData.get("keywords") ?? "").trim(),
      leads_count: Number(formData.get("leads_count") ?? 10),
    };

    try {
      const response = await fetch("/api/fetch-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as FetchLeadsResult | { detail?: string };
      if (!response.ok) {
        throw new Error("detail" in result && result.detail ? result.detail : "Unable to fetch leads.");
      }

      const successResult = result as FetchLeadsResult;
      setCampaignDraft(payload);
      setPreviewLeads(successResult.leads);
      setSelectedLeadIndexes(successResult.leads.map((_, index) => index));
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unexpected error.";
      setError(message);
    } finally {
      setFetching(false);
    }
  }

  async function handleApprove() {
    if (!campaignDraft) {
      return;
    }

    const selectedLeads = selectedLeadIndexes.map((index) => previewLeads[index]).filter(Boolean);
    if (!selectedLeads.length) {
      setError("Please select at least one lead before approving.");
      return;
    }

    setError(null);
    setApproving(true);

    const payload: ApproveLeadsPayload = {
      organization_id: organizationId,
      campaign_name: campaignDraft.campaign_name,
      industries: campaignDraft.industries,
      sources: campaignDraft.sources,
      location: campaignDraft.location,
      selected_leads: selectedLeads,
    };

    try {
      const response = await fetch("/api/approve-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as ApproveLeadsResult | { detail?: string };
      if (!response.ok) {
        throw new Error("detail" in result && result.detail ? result.detail : "Unable to approve leads.");
      }

      const successResult = result as ApproveLeadsResult;
      router.push(`/o/${organizationSlug}/dashboard/campaign/${successResult.campaign_id}`);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unexpected error.";
      setError(message);
    } finally {
      setApproving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <p className="text-sm text-slate-600">Select filters and fetch leads from Apify sources.</p>

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="campaign_name" className="text-sm font-medium text-slate-700">
            Campaign Name
          </label>
          <input
            id="campaign_name"
            name="campaign_name"
            required
            type="text"
            defaultValue={campaignDraft?.campaign_name ?? ""}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="leads_count" className="text-sm font-medium text-slate-700">
            Leads Count
          </label>
          <input
            id="leads_count"
            name="leads_count"
            required
            type="number"
            min={1}
            max={500}
            defaultValue={campaignDraft?.leads_count ?? 20}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white"
          />
        </div>
      </div>

      <MultiSelect label="Industries" name="industries" options={INDUSTRY_OPTIONS} values={industries} onChange={setIndustries} />
      <MultiSelect label="Source" name="sources" options={SOURCE_OPTIONS} values={sources} onChange={setSources} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="location" className="text-sm font-medium text-slate-700">
            Location
          </label>
          <input
            id="location"
            name="location"
            required
            type="text"
            placeholder="e.g. New York"
            defaultValue={campaignDraft?.location ?? ""}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="keywords" className="text-sm font-medium text-slate-700">
            Keywords
          </label>
          <input
            id="keywords"
            name="keywords"
            required
            type="text"
            placeholder="e.g. pizza, italian"
            defaultValue={campaignDraft?.keywords ?? ""}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={fetching || approving}
        className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {fetching ? "Fetching Leads..." : "Fetch Leads Preview"}
      </button>

      {campaignDraft ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-700">
              Fetched <span className="font-semibold">{previewLeads.length}</span> leads. Selected{" "}
              <span className="font-semibold">{selectedLeadIndexes.length}</span> for approval.
            </p>
            <button
              type="button"
              onClick={toggleSelectAll}
              disabled={!previewLeads.length}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {allSelected ? "Clear Selection" : "Select All"}
            </button>
          </div>

          {previewLeads.length === 0 ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              No leads were fetched from Apify for this filter. Adjust filters and fetch again.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[3.5rem]" />
                  <col />
                  <col className="w-[9rem]" />
                  <col className="w-[11rem]" />
                  <col className="w-[5rem]" />
                  <col className="w-[5.5rem]" />
                  <col className="w-[18rem]" />
                  <col className="w-[8rem]" />
                  <col className="w-[6rem]" />
                </colgroup>
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-4 py-3">
                      <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} aria-label="Select all leads" />
                    </th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Rating</th>
                    <th className="px-4 py-3">Reviews</th>
                    <th className="px-4 py-3">Address</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {previewLeads.map((lead, index) => {
                    const meta = extractLeadMeta(lead);
                    return (
                      <tr key={`${lead.name}-${lead.phone ?? "no-phone"}-${index}`} className="border-t border-slate-100 text-slate-700">
                      <td className="px-4 py-3 align-top">
                          <input
                            type="checkbox"
                            checked={selectedLeadIndexes.includes(index)}
                            onChange={() => toggleLead(index)}
                            aria-label={`Select ${lead.name}`}
                          />
                      </td>
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

          <button
            type="button"
            onClick={handleApprove}
            disabled={approving || selectedLeadIndexes.length === 0}
            className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {approving ? "Approving..." : "Approve Selected Leads"}
          </button>
        </div>
      ) : null}
    </form>
  );
}
