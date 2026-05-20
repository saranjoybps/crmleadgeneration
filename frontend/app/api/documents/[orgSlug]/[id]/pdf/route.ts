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

  const response = await fetch(`${apiBase}/api/v1/documents/${id}/pdf`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Org-Slug": orgSlug,
    },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to fetch document PDF" },
      { status: response.status },
    );
  }

  const pdfBlob = await response.blob();
  const filename = response.headers
    .get("Content-Disposition")
    ?.match(/filename="?(.+?)"?$/)
    ?.[1] || `document-${id}.pdf`;

  return new NextResponse(pdfBlob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
