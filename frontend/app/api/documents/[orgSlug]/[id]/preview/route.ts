import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: Promise<{ orgSlug: string; id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { orgSlug, id } = await params;

  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  const response = await fetch(`${apiBase}/api/v1/documents/${id}/preview`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Org-Slug": orgSlug,
    },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to fetch document preview" },
      { status: response.status },
    );
  }

  const html = await response.text();

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
