import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const endpoint = body?.endpoint;
    const p256dh = body?.keys?.p256dh;
    const auth = body?.keys?.auth;

    if (
      typeof endpoint !== "string" ||
      !endpoint.startsWith("https://") ||
      typeof p256dh !== "string" ||
      typeof auth !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid push subscription." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        { endpoint, p256dh, auth },
        { onConflict: "endpoint" }
      );

    if (error) {
      console.error("Subscription database error:", error.message);
      return NextResponse.json(
        { error: "Could not save subscription." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}
