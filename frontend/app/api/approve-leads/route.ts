import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { ApproveLeadsPayload } from "@/lib/types";

const BACKEND_URL = process.env.BACKEND_BASE_URL ?? "http://127.0.0.1:8000";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ApproveLeadsPayload;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return NextResponse.json({ detail: "Missing session token" }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/approve-leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ detail }, { status: 500 });
  }
}
