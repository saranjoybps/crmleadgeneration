import { cache } from "react";
import { apiRequest } from "./api-server";

export const getPermissions = cache(async (orgSlug: string) => {
  return apiRequest<{
    role: { key: string; label: string };
    modules: Array<{
      key: string;
      label: string;
      permissions: {
        can_view: boolean;
        can_create: boolean;
        can_edit: boolean;
        can_delete: boolean;
      };
    }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
});
