
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Outage = {
  id: string;
  area: string;
  ward: string;
  description: string | null;
  started_at: string;
  restored_at: string | null;
  status: string;
  reports: number | null;
  confirmations: number | null;
};

export default function StatisticsPage() {
  const router = useRouter();
  const [outages, setOutages] = useState<Outage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authorized, setAuthorized] = useState(false);

  const loadOutages = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from("outages")
      .select(
        "id, area, ward, description, started_at, restored_at, status, reports, confirmations"
      )
      .order("started_at", { ascending: false });

    if (queryError) {
      console.error("Statistics query failed:", queryError.message);
      setError(queryError.message);
      return;
    }

    setOutages((data ?? []) as Outage[]);
    setError("");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkLogin() {
      try {
        const { data, error: authError } = await supabase.auth.getUser();

        if (authError || !data.user) {
          router.replace("/admin/login");
          return;
        }

        const { data: membership, error: membershipError } = await supabase
          .from("admin_users")
          .select("user_id")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (membershipError || !membership) {
          await supabase.auth.signOut();
          router.replace("/admin/login");
          return;
        }

        if (cancelled) return;

        setAuthorized(true);
        await loadOutages();
      } catch {
        if (!cancelled) setError("Unable to load statistics. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void checkLogin();

    return () => {
      cancelled = true;
    };
  }, [router, loadOutages]);

  useEffect(() => {
    if (!authorized) return;

    const channel = supabase
      .channel("powerwatch-statistics")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "outages" },
        () => {
          void loadOutages();
        }
      )
      .subscribe();

    const interval = window.setInterval(() => {
      void loadOutages();
    }, 10000);

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [authorized, loadOutages]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  const active = outages.filter((o) => o.status === "outage");
  const restored = outages.filter((o) => o.status === "restored");

  const totalReports = outages.reduce(
    (sum, o) => sum + (o.reports ?? 1),
    0
  );

  const totalConfirmations = outages.reduce(
    (sum, o) => sum + (o.confirmations ?? 0),
    0
  );

  const restorationDurations = restored
    .map((o) => {
      if (!o.restored_at || !o.started_at) return null;

      const minutes =
        (new Date(o.restored_at).getTime() -
          new Date(o.started_at).getTime()) /
        60000;

      return Number.isFinite(minutes) && minutes >= 0 ? minutes : null;
    })
    .filter((value): value is number => value !== null);

  const averageMinutes =
    restorationDurations.length > 0
      ? Math.round(
          restorationDurations.reduce((sum, n) => sum + n, 0) /
            restorationDurations.length
        )
      : null;

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "#080f1e",
    color: "#f8fafc",
    fontFamily: "Arial, sans-serif",
    padding: "28px 20px 50px",
  };

  const buttonStyle: React.CSSProperties = {
    display: "inline-block",
    padding: "10px 14px",
    borderRadius: 8,
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
  };

  const stats = [
    {
      label: "Total Outages",
      value: outages.length,
      color: "#60a5fa",
      background: "#141f33",
    },
    {
      label: "Active Outages",
      value: active.length,
      color: "#fb7185",
      background: "#141f33",
    },
    {
      label: "Restored Outages",
      value: restored.length,
      color: "#4ade80",
      background: "#141f33",
    },
    {
      label: "Community Reports",
      value: totalReports,
      color: "#fbbf24",
      background: "#141f33",
    },
    {
      label: "Confirmations",
      value: totalConfirmations,
      color: "#c4b5fd",
      background: "#141f33",
    },
    {
      label: "Average Restoration Time",
      value: averageMinutes === null ? "—" : `${averageMinutes} minutes`,
      color: "#67e8f9",
      background: "#141f33",
    },
  ];

  if (loading) {
    return (
      <main style={{ ...pageStyle, display: "grid", placeItems: "center" }}>
        Loading PowerWatch statistics...
      </main>
    );
  }

  if (!authorized) {
    return (
      <main style={{ ...pageStyle, display: "grid", placeItems: "center" }}>
        Redirecting to login...
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <header style={{ marginBottom: 34 }}>
          <h1
            style={{
              fontSize: "clamp(30px, 5vw, 46px)",
              margin: "0 0 8px",
            }}
          >
            📊 PowerWatch Statistics
          </h1>

          <p style={{ color: "#cbd5e1", fontSize: 18, marginTop: 0 }}>
            Community electricity outage overview
          </p>

          <nav style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link href="/" style={{ ...buttonStyle, background: "#263750", color: "#fff" }}>
              Dashboard
            </Link>
            <Link href="/report" style={{ ...buttonStyle, background: "#dc2626", color: "#fff" }}>
              Report Outage
            </Link>
            <Link href="/alerts" style={{ ...buttonStyle, background: "#fef3c7", color: "#92400e" }}>
              Alerts
            </Link>
            <Link href="/map" style={{ ...buttonStyle, background: "#164e63", color: "#fff" }}>
              Outage Map
            </Link>
            <button
              onClick={handleSignOut}
              style={{ ...buttonStyle, background: "#475569", color: "#fff" }}
            >
              Sign out
            </button>
          </nav>
        </header>

        {error && (
          <div
            role="alert"
            style={{
              background: "#450a0a",
              border: "1px solid #f87171",
              color: "#fecaca",
              padding: 16,
              borderRadius: 10,
              marginBottom: 24,
              overflowWrap: "anywhere",
            }}
          >
            Could not load statistics: {error}
            <button
              onClick={() => void loadOutages()}
              style={{
                ...buttonStyle,
                background: "#dc2626",
                color: "#fff",
                marginLeft: 12,
              }}
            >
              Try again
            </button>
          </div>
        )}

        <h2 style={{ fontSize: 23, marginBottom: 18 }}>Outage Summary</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))",
            gap: 22,
            marginBottom: 52,
          }}
        >
          {stats.map((stat) => (
            <section
              key={stat.label}
              style={{
                background: stat.background,
                border: "1px solid #33445f",
                borderLeft: `5px solid ${stat.color}`,
                borderRadius: 17,
                padding: "26px 28px",
                minHeight: 105,
              }}
            >
              <p
                style={{
                  color: "#cbd5e1",
                  fontSize: 17,
                  margin: "0 0 18px",
                }}
              >
                {stat.label}
              </p>
              <p
                style={{
                  color: "#fff",
                  fontSize: "clamp(27px, 3vw, 36px)",
                  fontWeight: 800,
                  margin: 0,
                  overflowWrap: "anywhere",
                }}
              >
                {stat.value}
              </p>
            </section>
          ))}
        </div>

        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <h2 style={{ fontSize: 25, margin: 0 }}>Outage Records</h2>
            <span style={{ color: "#cbd5e1", fontSize: 14 }}>
              {outages.length} records
            </span>
          </div>

          <div
            style={{
              overflowX: "auto",
              border: "1px solid #33445f",
              borderRadius: 14,
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: 700,
                borderCollapse: "collapse",
                background: "#141f33",
                textAlign: "left",
              }}
            >
              <thead>
                <tr style={{ background: "#20314b" }}>
                  {[
                    "Area",
                    "Ward",
                    "Status",
                    "Reports",
                    "Confirmations",
                    "Reported At",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: "18px 20px",
                        borderBottom: "1px solid #33445f",
                        color: "#fff",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {outages.map((outage) => {
                  const isRestored = outage.status === "restored";

                  return (
                    <tr key={outage.id}>
                      <td style={cellStyle}>{outage.area}</td>
                      <td style={cellStyle}>{outage.ward}</td>
                      <td style={cellStyle}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "6px 10px",
                            borderRadius: 20,
                            background: isRestored ? "#14532d" : "#7f1d1d",
                            color: isRestored ? "#86efac" : "#fda4af",
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        >
                          {isRestored ? "● Restored" : "● Active"}
                        </span>
                      </td>
                      <td style={cellStyle}>{outage.reports ?? 1}</td>
                      <td style={cellStyle}>{outage.confirmations ?? 0}</td>
                      <td style={cellStyle}>
                        {new Date(outage.started_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}

                {outages.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        ...cellStyle,
                        textAlign: "center",
                        padding: 35,
                        color: "#cbd5e1",
                      }}
                    >
                      No outage records found in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 20 }}>
          Statistics are calculated from records available in the Supabase outages table.
        </p>
      </div>
    </main>
  );
}

const cellStyle: React.CSSProperties = {
  padding: "16px 20px",
  borderBottom: "1px solid #293950",
  color: "#e2e8f0",
  whiteSpace: "nowrap",
};
