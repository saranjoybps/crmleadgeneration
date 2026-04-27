export type SourceOption = "google_maps" | "instagram";

export type Campaign = {
  id: string;
  organization_id: string;
  name: string;
  industries: string[];
  sources: string[];
  location: string;
  created_by: string | null;
  created_at: string;
};

export type Lead = {
  id: string;
  campaign_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  source: string;
  raw_data: Record<string, unknown>;
  created_at: string;
};

export type FetchLeadsPayload = {
  organization_id: string;
  campaign_name: string;
  industries: string[];
  sources: SourceOption[];
  location: string;
  keywords: string;
  leads_count: number;
};

export type PreviewLead = {
  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  source: string;
  raw_data: Record<string, unknown>;
};

export type FetchLeadsResult = {
  leads_found: number;
  leads: PreviewLead[];
};

export type ApproveLeadsPayload = {
  organization_id: string;
  campaign_name: string;
  industries: string[];
  sources: SourceOption[];
  location: string;
  selected_leads: PreviewLead[];
};

export type ApproveLeadsResult = {
  campaign_id: string;
  leads_inserted: number;
};

export type OrganizationRole = "owner" | "admin" | "member";

export type OrganizationContext = {
  organization_id: string;
  organization_slug: string;
  organization_name: string;
  role: OrganizationRole;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  email: string;
  role: OrganizationRole;
  status: "active" | "invited" | "suspended";
  created_at: string;
};

export type OrganizationInvite = {
  id: string;
  organization_id: string;
  email: string;
  role: OrganizationRole;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  created_at: string;
};
