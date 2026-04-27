"use client";

import { useEffect, useMemo, useState } from "react";

import { extractLeadMeta } from "@/lib/lead-meta";
import type { Lead, PreviewLead } from "@/lib/types";

type LeadLike = Lead | PreviewLead;

type LeadDetailsDrawerProps = {
  lead: LeadLike;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function formatBool(value: boolean | null): string {
  if (value === null) {
    return "-";
  }
  return value ? "Yes" : "No";
}

function TagList({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {values.length ? (
        <div className="flex flex-wrap gap-2">
          {values.map((item) => (
            <span key={item} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">-</p>
      )}
    </div>
  );
}

export function LeadDetailsDrawer({ lead }: LeadDetailsDrawerProps) {
  const [open, setOpen] = useState(false);
  const meta = useMemo(() => extractLeadMeta(lead), [lead]);
  const raw = useMemo(() => asRecord(lead.raw_data), [lead.raw_data]);
  const imageUrl = asString(raw.imageUrl);
  const mapsUrl = asString(raw.url) ?? lead.website;

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md px-2 py-1 text-sm font-medium text-violet-700 transition hover:bg-violet-50 hover:text-violet-900"
      >
        View
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 pointer-events-auto">
          <div onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-900/35 transition-opacity duration-200 opacity-100" />

          <aside
            className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl transition-transform duration-300 translate-x-0"
            aria-label="Lead details"
          >
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-violet-500">Lead Details</p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900">{lead.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{meta.category ?? "Business"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="space-y-6 px-6 py-5">
              {imageUrl ? (
                <img src={imageUrl} alt={lead.name} className="h-44 w-full rounded-xl border border-slate-200 object-cover" />
              ) : null}

              <section className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Rating</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{meta.rating ?? "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Reviews</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{meta.reviewsCount ?? "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Rank</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{meta.rank ?? "-"}</p>
                </div>
              </section>

              <section className="space-y-2 rounded-xl border border-slate-200 p-4">
                <h4 className="text-sm font-semibold text-slate-900">Contact</h4>
                <p className="text-sm text-slate-700">Phone: {lead.phone ?? "-"}</p>
                <p className="text-sm text-slate-700">Email: {lead.email ?? "-"}</p>
                <p className="text-sm text-slate-700">
                  Website:{" "}
                  {lead.website ? (
                    <a href={lead.website} target="_blank" rel="noreferrer" className="text-violet-700 hover:text-violet-900">
                      Open website
                    </a>
                  ) : (
                    "-"
                  )}
                </p>
                <p className="text-sm text-slate-700">
                  Maps:{" "}
                  {mapsUrl ? (
                    <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-violet-700 hover:text-violet-900">
                      Open listing
                    </a>
                  ) : (
                    "-"
                  )}
                </p>
              </section>

              <section className="space-y-2 rounded-xl border border-slate-200 p-4">
                <h4 className="text-sm font-semibold text-slate-900">Location</h4>
                <p className="text-sm text-slate-700">Address: {meta.address ?? "-"}</p>
                <p className="text-sm text-slate-700">
                  City/State: {[meta.city, meta.state].filter(Boolean).join(", ") || "-"}
                </p>
                <p className="text-sm text-slate-700">Postal Code: {meta.postalCode ?? "-"}</p>
              </section>

              <section className="space-y-2 rounded-xl border border-slate-200 p-4">
                <h4 className="text-sm font-semibold text-slate-900">Business Signals</h4>
                <p className="text-sm text-slate-700">Source: {lead.source}</p>
                <p className="text-sm text-slate-700">Google Place ID: {meta.placeId ?? "-"}</p>
                <p className="text-sm text-slate-700">Advertisement: {formatBool(meta.isAdvertisement)}</p>
              </section>

              <TagList title="Offerings" values={meta.offerings} />
              <TagList title="Payment Methods" values={meta.paymentMethods} />
              <TagList title="Parking" values={meta.parking} />

              <section className="space-y-2 rounded-xl border border-slate-200 p-4">
                <h4 className="text-sm font-semibold text-slate-900">Opening Hours</h4>
                {meta.openingHours.length ? (
                  <ul className="space-y-1 text-sm text-slate-700">
                    {meta.openingHours.map((row) => (
                      <li key={row}>{row}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">-</p>
                )}
              </section>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
