
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ReportPage() {
  const router = useRouter();

  const [area, setArea] = useState("Vellangallur");
  const [ward, setWard] = useState("Ward 5");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitReport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      // Verify the logged-in user.
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        router.replace("/admin/login");
        return;
      }

      // Verify PowerWatch admin membership.
      const { data: membership, error: membershipError } =
        await supabase
          .from("admin_users")
          .select("user_id")
          .eq("user_id", userData.user.id)
          .maybeSingle();

      if (membershipError) {
        throw new Error(
          `Could not verify admin access: ${membershipError.message}`
        );
      }

      if (!membership) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      // Save the outage in Supabase.
      const { data, error: insertError } = await supabase
        .from("outages")
        .insert({
          area,
          ward,
          description:
            description.trim() || "No description provided",
          started_at: new Date().toISOString(),
          status: "outage",
          reports: 1,
          confirmations: 0,
          restored_at: null,
        })
        .select(
          "id, area, ward, description, status, started_at, restored_at"
        )
        .single();

      if (insertError) {
        console.error("Supabase report insert failed:", insertError);
        throw new Error(
          `${insertError.message} (code: ${insertError.code || "unknown"})`
        );
      }

      if (!data) {
        throw new Error("The database did not return the saved report.");
      }

      setSuccess("Power outage report saved successfully!");

      // Send push notifications after the outage is saved.
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (accessToken) {
        try {
          const notificationResponse = await fetch("/api/push/notify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ outageId: data.id }),
          });

          if (!notificationResponse.ok) {
  const notificationResult = await notificationResponse
    .json()
    .catch(() => ({}));

  console.log(
    "Outage saved, but push notifications failed:",
    notificationResult
  );
} else {
            console.log(
              "Push notification result:",
              await notificationResponse.json()
            );
          }
        } catch (notificationError) {
          console.error(
            "Outage saved, but push notification request failed:",
            notificationError
          );
        }
      }

      // Navigate back after showing the confirmation.
      window.setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 900);
    } catch (err) {
      console.error("Could not save outage report:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while saving the report."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: "700px",
        margin: "35px auto",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
        color: "#111827",
      }}
    >
      <Link href="/" style={{ color: "#175cd3" }}>
        ← Back to dashboard
      </Link>

      <h1 style={{ marginTop: "25px" }}>
        🔴 Report Power Cut
      </h1>

      <p style={{ color: "#667085" }}>
        Tell your community about a power outage in your area.
      </p>

      <form
        onSubmit={submitReport}
        style={{
          display: "grid",
          gap: "18px",
          marginTop: "25px",
          padding: "25px",
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "14px",
        }}
      >
        <div>
          <label htmlFor="area">Area</label>
          <select
            id="area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            style={fieldStyle}
            disabled={saving}
          >
            <option value="Vellangallur">Vellangallur</option>
            <option value="Vadama">Vadama</option>
          </select>
        </div>

        <div>
          <label htmlFor="ward">Ward</label>
          <select
            id="ward"
            value={ward}
            onChange={(e) => setWard(e.target.value)}
            style={fieldStyle}
            disabled={saving}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={`Ward ${n}`}>
                Ward {n}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="description">
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Example: There is no electricity in our street."
            maxLength={500}
            rows={4}
            style={fieldStyle}
            disabled={saving}
          />
        </div>

        <p style={{ color: "#667085", fontSize: "13px" }}>
          The report date and time will be recorded automatically.
        </p>

        {error && (
          <p
            role="alert"
            style={{
              color: "#b42318",
              background: "#fef3f2",
              padding: "12px",
              borderRadius: "8px",
              overflowWrap: "anywhere",
            }}
          >
            Could not save the report: {error}
          </p>
        )}

        {success && (
          <p
            role="status"
            style={{
              color: "#065f46",
              background: "#d9fbe5",
              padding: "12px",
              borderRadius: "8px",
            }}
          >
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            background: saving ? "#9ca3af" : "#dc2626",
            color: "white",
            padding: "15px",
            border: "none",
            borderRadius: "9px",
            fontWeight: "bold",
            fontSize: "16px",
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? "SAVING REPORT..." : "🔴 SUBMIT POWER CUT REPORT"}
        </button>
      </form>
    </main>
  );
}

const fieldStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "12px",
  marginTop: "8px",
  border: "1px solid #d0d5dd",
  borderRadius: "8px",
  background: "white",
  fontSize: "15px",
};

