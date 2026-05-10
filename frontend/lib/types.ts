export type AppRole = "owner" | "admin" | "member" | "client";
export type OrganizationRole = AppRole;

export type OrganizationContext = {
  organization_id: string;
  organization_slug: string;
  organization_name: string;
  role: AppRole;
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

