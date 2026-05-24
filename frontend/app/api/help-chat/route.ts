import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/help-chat-instructions";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("OpenAI API error:", response.status, errorBody);
      return NextResponse.json({ error: "OpenAI API request failed" }, { status: 502 });
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ message });
  } catch (err) {
    console.error("Help chat error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
