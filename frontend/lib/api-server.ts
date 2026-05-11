import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
  meta?: any;
};

export async function getApiContext(orgSlug?: string) {
  const supabase = await createClient();
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  if (orgSlug) {
    headers["X-Org-Slug"] = orgSlug;
  }

  return { apiBase, headers };
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: any;
    orgSlug?: string;
    cache?: RequestCache;
  } = {}
): Promise<ApiResponse<T>> {
  const { apiBase, headers } = await getApiContext(options.orgSlug);

  if (!apiBase) {
    return { data: null, error: "API base URL not configured." };
  }

  try {
    const resp = await fetch(`${apiBase}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: options.cache ?? "no-store",
    });

    const json = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return {
        data: null,
        error: json.error?.message || json.detail || `API request failed (${resp.status})`,
      };
    }

    return {
      data: json.data as T,
      error: null,
      meta: json.meta,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
