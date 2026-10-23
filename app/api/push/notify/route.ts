import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";

    if (!token) {
      return NextResponse.json(
        { error: "Sign-in required." },
        { status: 401 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (!url || !anonKey || !publicKey || !privateKey || !subject) {
      console.error("Missing PowerWatch push configuration:", {
        url: !!url,
        anonKey: !!anonKey,
        publicKey: !!publicKey,
        privateKey: !!privateKey,
        subject: !!subject,
      });

      return NextResponse.json(
        { error: "Server notification settings are incomplete." },
        { status: 500 }
      );
    }

    const authClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: userData, error: authError } =
      await authClient.auth.getUser(token);

    if (authError || !userData.user) {
      console.error("PowerWatch token validation failed:", {
        message: authError?.message,
        status: authError?.status,
        code: authError?.code,
      });

      return NextResponse.json(
        {
          error: "Invalid session.",
          details: authError?.message || "Supabase did not return a user.",
          code: authError?.code || null,
        },
        { status: 401 }
      );
    }

    const { data: admin, error: adminError } = await supabaseAdmin
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (adminError) {
      console.error("PowerWatch admin lookup failed:", adminError.message);
      return NextResponse.json(
        { error: "Could not verify admin access." },
        { status: 500 }
      );
    }

    if (!admin) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const outageId = body?.outageId;

    if (typeof outageId !== "string" || outageId.length > 100) {
      return NextResponse.json(
        { error: "Invalid outage ID." },
        { status: 400 }
      );
    }

    const { data: outage, error: outageError } = await supabaseAdmin
      .from("outages")
      .select("id, area, ward, description, status")
      .eq("id", outageId)
      .maybeSingle();

    if (outageError) {
      console.error("PowerWatch outage lookup failed:", outageError.message);
      return NextResponse.json(
        { error: "Could not load outage." },
        { status: 500 }
      );
    }

    if (!outage || outage.status !== "outage") {
      return NextResponse.json(
        { error: "Active outage not found." },
        { status: 404 }
      );
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const { data: subscriptions, error: subscriptionsError } =
      await supabaseAdmin
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth");

    if (subscriptionsError) {
      console.error(
        "Could not load push subscriptions:",
        subscriptionsError.message
      );
      return NextResponse.json(
        { error: "Could not load subscriptions." },
        { status: 500 }
      );
    }

    const payload = JSON.stringify({
      title: "PowerWatch: Power Outage Reported",
      body: `${outage.area}${outage.ward ? `, ${outage.ward}` : ""}: ${outage.description}`,
      url: "/alerts",
      tag: `outage-${outage.id}`,
    });

    let sent = 0;
    let failed = 0;

    for (const subscription of subscriptions ?? []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload
        );
        sent++;
      } catch (error: unknown) {
        failed++;

        const statusCode =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error
            ? (error as { statusCode?: number }).statusCode
            : undefined;

        if (statusCode === 404 || statusCode === 410) {
          const { error: deleteError } = await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);

          if (deleteError) {
            console.error(
              "Could not remove expired subscription:",
              deleteError.message
            );
          }
        } else {
          console.error(
            "Push delivery failed:",
            statusCode ?? "unknown error"
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: subscriptions?.length ?? 0,
    });
  } catch (error) {
    console.error("Push notification route failed:", error);
    return NextResponse.json(
      { error: "Notification request failed." },
      { status: 500 }
    );
  }
}
