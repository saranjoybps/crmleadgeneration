import type { Lead, PreviewLead } from "@/lib/types";

type LeadLike = Lead | PreviewLead;

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

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }
  return null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => asString(item))
    .filter((item): item is string => Boolean(item));
}

function extractFeatureKeys(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const keys: string[] = [];
  for (const item of value) {
    const record = asRecord(item);
    for (const [key, enabled] of Object.entries(record)) {
      if (enabled === true && key.trim().length > 0) {
        keys.push(key);
      }
    }
  }

  return keys;
}

function extractOpeningHours(raw: Record<string, unknown>): string[] {
  const openingHours = raw.openingHours;
  if (!Array.isArray(openingHours)) {
    return [];
  }

  return openingHours
    .map((item) => {
      const row = asRecord(item);
      const day = asString(row.day);
      const hours = asString(row.hours);
      if (!day || !hours) {
        return null;
      }
      return `${day}: ${hours}`;
    })
    .filter((item): item is string => Boolean(item));
}

export type LeadMeta = {
  category: string | null;
  address: string | null;
  rating: number | null;
  reviewsCount: number | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  placeId: string | null;
  rank: number | null;
  isAdvertisement: boolean | null;
  openingHours: string[];
  paymentMethods: string[];
  offerings: string[];
  parking: string[];
};

export function extractLeadMeta(lead: LeadLike): LeadMeta {
  const raw = asRecord(lead.raw_data);
  const additionalInfo = asRecord(raw.additionalInfo);

  return {
    category: asString(raw.categoryName) ?? asStringArray(raw.categories)[0] ?? null,
    address: asString(raw.address),
    rating: asNumber(raw.totalScore),
    reviewsCount: asNumber(raw.reviewsCount),
    city: asString(raw.city),
    state: asString(raw.state),
    postalCode: asString(raw.postalCode),
    placeId: asString(raw.placeId),
    rank: asNumber(raw.rank),
    isAdvertisement: asBoolean(raw.isAdvertisement),
    openingHours: extractOpeningHours(raw),
    paymentMethods: extractFeatureKeys(additionalInfo.Payments),
    offerings: extractFeatureKeys(additionalInfo.Offerings),
    parking: extractFeatureKeys(additionalInfo.Parking),
  };
}
