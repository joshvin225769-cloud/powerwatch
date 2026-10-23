
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Outage = {
  id: string;
  area: string;
  ward: string | null;
  description: string | null;
  started_at: string;
  restored_at: string | null;
  status: string;
  reports: number;
  confirmations: number;
};

const buttonStyle: React.CSSProperties = {
  padding: "12px 16px",
  border: "1px solid #2a4160",
  borderRadius: 8,
  background: "#192c46",
  color: "#f1f5f9",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
};

export default function AlertsPage() {
  const [outages, setOutages] = useState<Outage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOutages = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("outages")
      .select(
        "id, area, ward, description, started_at, restored_at, status, reports, confirmations"
      )
      .eq("status", "outage")
      .order("started_at", { ascending: false });

    if (fetchError) {
      setError(`Unable to load outage alerts: ${fetchError.message}`);
      setLoading(false);
      return;
    }

    setOutages((data ?? []) as Outage[]);
    setError("");
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOutages();

    const channel = supabase
      .channel("powerwatch-alerts-outages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "outages",
        },
        () => {
          loadOutages();
        }
      )
      .subscribe();

    const interval = setInterval(loadOutages, 10000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [loadOutages]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050d1a",
        color: "#f1f5f9",
        fontFamily: "Arial, sans-serif",
        padding: "32px 20px",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h1 style={{ fontSize: 36, marginBottom: 8 }}>
          ⚠️ PowerWatch Alerts
        </h1>

        <p style={{ color: "#9bb4d8", lineHeight: 1.6 }}>
          View reported power outages and community confirmations in your area.
        </p>

        <div
          style={{
            height: 1,
            background: "#1e3049",
            margin: "20px 0",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <h2 style={{ fontSize: 22 }}>
            Current Outage Alerts ({outages.length})
          </h2>

          <button
            onClick={loadOutages}
            style={{
              ...buttonStyle,
              background: "#1265f4",
            }}
          >
            ↻ Refresh
          </button>
        </div>

        {error && (
          <section
            role="alert"
            style={{
              background: "#35151b",
              border: "1px solid #9f1239",
              color: "#fda4af",
              borderRadius: 12,
              padding: 18,
              marginBottom: 16,
              overflowWrap: "anywhere",
            }}
          >
            {error}
          </section>
        )}

        {loading ? (
          <section
            style={{
              background: "#0b1729",
              border: "1px solid #243b5b",
              borderRadius: 12,
              padding: 22,
              color: "#9bb4d8",
            }}
          >
            Loading outage alerts from Supabase...
          </section>
        ) : !error && outages.length === 0 ? (
          <section
            style={{
              background: "#082820",
              border: "1px solid #087f5b",
              borderRadius: 12,
              padding: 22,
              marginBottom: 18,
            }}
          >
            <h3 style={{ color: "#6ee7b7", marginTop: 0 }}>
              🟢 No Active Outages
            </h3>
            <p style={{ color: "#a7f3d0", marginBottom: 0 }}>
              Supabase currently has no active outage reports.
            </p>
          </section>
        ) : (
          outages.map((outage) => (
            <section
              key={outage.id}
              style={{
                background: "#0b1729",
                border: "1px solid #7f2937",
                borderRadius: 12,
                padding: 22,
                marginBottom: 16,
                boxShadow: "0 5px 20px rgba(0,0,0,0.15)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <h3 style={{ color: "#fb7185", margin: "0 0 12px" }}>
                  🔴 Power Outage
                </h3>

                <span
                  style={{
                    background: "#451923",
                    color: "#fda4af",
                    borderRadius: 20,
                    padding: "7px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  ACTIVE
                </span>
              </div>

              <p>
                <strong>Area:</strong> {outage.area}
              </p>
              <p>
                <strong>Ward:</strong> {outage.ward || "Not specified"}
              </p>
              <p>
                <strong>Details:</strong>{" "}
                {outage.description || "No description provided"}
              </p>
              <p style={{ color: "#9bb4d8" }}>
                <strong>Reported:</strong>{" "}
                {new Date(outage.started_at).toLocaleString()}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 24,
                  flexWrap: "wrap",
                  color: "#bfdbfe",
                }}
              >
                <p>
                  <strong>Reports:</strong> {outage.reports ?? 0}
                </p>
                <p>
                  <strong>Confirmations:</strong>{" "}
                  {outage.confirmations ?? 0}
                </p>
              </div>
            </section>
          ))
        )}

        <section
          style={{
            background: "#292211",
            border: "1px solid #8a6b25",
            borderRadius: 12,
            padding: 22,
            marginTop: 28,
          }}
        >
          <h2 style={{ color: "#fcd34d", marginTop: 0 }}>
            💡 Power Cut Preparedness
          </h2>
          <ul style={{ color: "#fef3c7", lineHeight: 2 }}>
            <li>Keep your phone charged.</li>
            <li>Use a flashlight instead of candles when possible.</li>
            <li>Unplug sensitive electrical equipment during outages.</li>
            <li>
              Check official electricity-board updates for restoration news.
            </li>
          </ul>
        </section>

        <nav
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 26,
          }}
        >
          <Link href="/" style={buttonStyle}>
            Dashboard
          </Link>
          <Link href="/report" style={buttonStyle}>
            Report Outage
          </Link>
          <Link href="/statistics" style={buttonStyle}>
            Statistics
          </Link>
        </nav>

        <p
          style={{
            color: "#64748b",
            marginTop: 24,
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          Alerts are loaded from Supabase and refresh automatically every 10
          seconds. SMS, email, and push notifications require separate
          notification-service setup.
        </p>
      </div>
    </main>
  );
}
