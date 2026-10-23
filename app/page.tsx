
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Outage = {
  id: string;
  area: string;
  ward: string | null;
  description: string;
  started_at: string;
  restored_at: string | null;
  status: string;
  reports: number;
  confirmations: number;
};

const buttonBase: React.CSSProperties = {
  border: "1px solid #2a4160",
  borderRadius: 9,
  padding: "11px 15px",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14,
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#050d1a",
    color: "#f1f5f9",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    background: "#081426",
    color: "#f8fafc",
    padding: "20px 5%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    borderBottom: "1px solid #172b45",
  },
  content: {
    maxWidth: 1450,
    margin: "0 auto",
    padding: "28px 24px",
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 20,
    margin: "24px 0",
  },
  stat: {
    background: "#0b1729",
    border: "1px solid #243b5b",
    borderRadius: 15,
    padding: 24,
    boxShadow: "0 5px 20px rgba(0,0,0,0.15)",
  },
  card: {
    background: "#0b1729",
    border: "1px solid #243b5b",
    color: "#f1f5f9",
    borderRadius: 15,
    padding: 24,
    marginBottom: 18,
    boxShadow: "0 5px 20px rgba(0,0,0,0.15)",
  },
  muted: {
    color: "#9bb4d8",
    fontSize: 14,
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
};

export default function DashboardPage() {
  const router = useRouter();

  const [outages, setOutages] = useState<Outage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [adminReady, setAdminReady] = useState(false);

  const loadOutages = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("outages")
      .select(
        "id, area, ward, description, started_at, restored_at, status, reports, confirmations"
      )
      .order("started_at", { ascending: false })
      .limit(10);

    if (loadError) {
      setError(`Could not load outages: ${loadError.message}`);
      setLoading(false);
      return;
    }

    setOutages((data ?? []) as Outage[]);
    setError("");
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    async function checkAdmin() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data: admin, error: adminError } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;

      if (adminError || !admin) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setAdminReady(true);
    }

    checkAdmin();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!adminReady) return;

    loadOutages();

    const channel = supabase
      .channel("powerwatch-dashboard-outages")
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
  }, [adminReady, loadOutages]);

  async function confirmReport(outage: Outage) {
    if (busyId) return;

    setBusyId(outage.id);
    setMessage("");
    setError("");

    const { error: actionError } = await supabase.rpc("confirm_outage", {
      p_outage_id: outage.id,
    });

    if (actionError) {
      setError(`Could not confirm report: ${actionError.message}`);
    } else {
      setMessage(`Report for ${outage.area} confirmed successfully.`);
      await loadOutages();
    }

    setBusyId(null);
  }

  async function markRestored(outage: Outage) {
    if (busyId) return;

    const confirmed = window.confirm(
      `Mark the outage in ${outage.area} as restored?`
    );

    if (!confirmed) return;

    setBusyId(outage.id);
    setMessage("");
    setError("");

    const { data, error: actionError } = await supabase
      .from("outages")
      .update({
        status: "restored",
        restored_at: new Date().toISOString(),
      })
      .eq("id", outage.id)
      .eq("status", "outage")
      .select("id");

    if (actionError) {
      setError(`Could not restore outage: ${actionError.message}`);
    } else if (!data || data.length === 0) {
      setError(
        "No outage was updated. It may already be restored, or your admin permissions need checking."
      );
    } else {
      setMessage(`Outage in ${outage.area} marked as restored.`);
      await loadOutages();
    }

    setBusyId(null);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const activeCount = outages.filter(
    (outage) => outage.status === "outage"
  ).length;

  const restoredCount = outages.filter(
    (outage) => outage.status === "restored"
  ).length;

  if (!adminReady) {
    return (
      <main style={styles.page}>
        <div style={styles.content}>Checking admin access...</div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30 }}>⚡ PowerWatch</h1>
          <p style={{ margin: "6px 0 0", color: "#9bb4d8" }}>
            Power outage monitoring dashboard
          </p>
        </div>

        <button
          style={{
            ...buttonBase,
            background: "#192c46",
            color: "#ffffff",
          }}
          onClick={signOut}
        >
          Sign out
        </button>
      </header>

      <section style={styles.content}>
        <div style={styles.row}>
          <div>
            <h2 style={{ margin: 0, fontSize: 28 }}>Dashboard</h2>
            <p style={styles.muted}>
              Monitor reports and update outage status.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              style={{
                ...buttonBase,
                background: "#1265f4",
                color: "#ffffff",
                border: "1px solid #1265f4",
              }}
              onClick={() => router.push("/report")}
            >
              + Report Outage
            </button>

            <button
              style={{
                ...buttonBase,
                background: "#192c46",
                color: "#f1f5f9",
              }}
              onClick={() => router.push("/statistics")}
            >
              Statistics
            </button>

            <button
              style={{
                ...buttonBase,
                background: "#192c46",
                color: "#f1f5f9",
              }}
              onClick={() => router.push("/alerts")}
            >
              Alerts
            </button>

            <button
              style={{
                ...buttonBase,
                background: "#192c46",
                color: "#f1f5f9",
              }}
              onClick={() => router.push("/map")}
            >
              Outage Map
            </button>
          </div>
        </div>

        <div style={styles.stats}>
          <div style={styles.stat}>
            <p style={styles.muted}>Active outages (loaded)</p>
            <h2 style={{ fontSize: 38, margin: "10px 0", color: "#fb5265" }}>
              {activeCount}
            </h2>
          </div>

          <div style={styles.stat}>
            <p style={styles.muted}>Restored outages (loaded)</p>
            <h2 style={{ fontSize: 38, margin: "10px 0", color: "#34d399" }}>
              {restoredCount}
            </h2>
          </div>

          <div style={styles.stat}>
            <p style={styles.muted}>Outages displayed</p>
            <h2 style={{ fontSize: 38, margin: "10px 0", color: "#f8fafc" }}>
              {outages.length}
            </h2>
          </div>
        </div>

        {message && (
          <div
            role="status"
            style={{
              background: "#052e2b",
              color: "#5eead4",
              border: "1px solid #059669",
              padding: 15,
              borderRadius: 10,
              marginBottom: 18,
            }}
          >
            ✓ {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              background: "#35151b",
              color: "#fda4af",
              border: "1px solid #9f1239",
              padding: 15,
              borderRadius: 10,
              marginBottom: 18,
              overflowWrap: "anywhere",
            }}
          >
            {error}
          </div>
        )}

        <div style={styles.row}>
          <h2 style={{ fontSize: 26 }}>Recent Outages</h2>

          <button
            style={{
              ...buttonBase,
              background: "#192c46",
              color: "#bfdbfe",
            }}
            onClick={loadOutages}
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div style={styles.card}>Loading outages...</div>
        ) : outages.length === 0 ? (
          <div style={styles.card}>
            No outage reports found. Use “Report Outage” to add one.
          </div>
        ) : (
          outages.map((outage) => {
            const isActive = outage.status === "outage";
            const isBusy = busyId === outage.id;

            return (
              <article key={outage.id} style={styles.card}>
                <div style={styles.row}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: "0 0 10px", fontSize: 20 }}>
                      ⚡ {outage.area}
                      {outage.ward ? ` — Ward ${outage.ward}` : ""}
                    </h3>

                    <p
                      style={{
                        margin: "0 0 14px",
                        color: "#cbd5e1",
                      }}
                    >
                      {outage.description || "No description provided"}
                    </p>
                  </div>

                  <span
                    style={{
                      padding: "8px 13px",
                      borderRadius: 24,
                      fontSize: 12,
                      fontWeight: 700,
                      background: isActive ? "#451923" : "#064e3b",
                      color: isActive ? "#fda4af" : "#6ee7b7",
                    }}
                  >
                    {isActive ? "ACTIVE" : "RESTORED"}
                  </span>
                </div>

                <p style={styles.muted}>
                  Reported: {new Date(outage.started_at).toLocaleString()}
                </p>

                {outage.restored_at && (
                  <p style={styles.muted}>
                    Restored: {new Date(outage.restored_at).toLocaleString()}
                  </p>
                )}

                <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
                  <p style={styles.muted}>
                    Reports: {outage.reports ?? 0}
                  </p>
                  <p style={styles.muted}>
                    Confirmations: {outage.confirmations ?? 0}
                  </p>
                </div>

                {isActive && (
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      marginTop: 12,
                    }}
                  >
                    <button
                      disabled={Boolean(busyId)}
                      onClick={() => confirmReport(outage)}
                      style={{
                        ...buttonBase,
                        background: "#172f55",
                        color: "#93c5fd",
                        border: "1px solid #2563eb",
                        opacity: busyId ? 0.6 : 1,
                        cursor: busyId ? "wait" : "pointer",
                      }}
                    >
                      {isBusy ? "Processing..." : "✓ Confirm Report"}
                    </button>

                    <button
                      disabled={Boolean(busyId)}
                      onClick={() => markRestored(outage)}
                      style={{
                        ...buttonBase,
                        background: "#087f5b",
                        color: "#ffffff",
                        border: "1px solid #059669",
                        opacity: busyId ? 0.6 : 1,
                        cursor: busyId ? "wait" : "pointer",
                      }}
                    >
                      {isBusy ? "Processing..." : "✓ Mark as Restored"}
                    </button>
                  </div>
                )}
              </article>
            );
          })
        )}

        <p
          style={{
            ...styles.muted,
            textAlign: "center",
            marginTop: 28,
          }}
        >
          Dashboard refreshes automatically every 10 seconds.
        </p>
      </section>
    </main>
  );
}
