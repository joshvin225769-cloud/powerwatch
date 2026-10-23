
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
  started_at: string | null;
  status: string;
  reports: number | null;
  confirmations: number | null;
};

export default function AdminPage() {
  const router = useRouter();
  const [outages, setOutages] = useState<Outage[]>([]);
  const [checking, setChecking] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadOutages = useCallback(async () => {
    const { data, error } = await supabase
      .from("outages")
      .select(
        "id, area, ward, description, started_at, status, reports, confirmations"
      )
      .order("started_at", { ascending: false });

    if (error) {
      setMessage(`Unable to load outages: ${error.message}`);
      return;
    }

    setOutages((data ?? []) as Outage[]);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkAdmin() {
      const { data, error } = await supabase.auth.getUser();

      if (cancelled) return;

      if (error || !data.user) {
        router.replace("/admin/login");
        return;
      }

      const { data: membership, error: membershipError } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (membershipError || !membership) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      await loadOutages();

      if (!cancelled) setChecking(false);
    }

    void checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [router, loadOutages]);

  async function restoreOutage(id: string) {
    if (!window.confirm("Mark this outage as restored?")) return;

    setBusyId(id);
    setMessage("");

    const { error } = await supabase
      .from("outages")
      .update({
        status: "restored",
        restored_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      setMessage(`Could not restore outage: ${error.message}`);
    } else {
      setMessage("Outage marked as restored.");
      await loadOutages();
    }

    setBusyId(null);
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(`Could not sign out: ${error.message}`);
      return;
    }

    router.replace("/admin/login");
    router.refresh();
  }

  if (checking) {
    return (
      <main style={pageStyle}>
        Checking administrator access...
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ color: "#fff" }}>PowerWatch Admin</h1>
            <p style={{ color: "#b6c4d8" }}>
              Manage community outage reports
            </p>
          </div>

          <button onClick={logout} style={buttonStyle}>
            Sign out
          </button>
        </header>

        <p>
          <Link href="/stats" style={{ color: "#93c5fd" }}>
            View statistics
          </Link>
        </p>

        {message && (
          <p role="status" style={{ color: "#93c5fd" }}>
            {message}
          </p>
        )}

        <h2 style={{ marginTop: 30 }}>Outage records ({outages.length})</h2>

        {outages.length === 0 ? (
          <p style={{ color: "#b6c4d8" }}>No outage records found.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: 700,
                borderCollapse: "collapse",
                background: "#121d30",
              }}
            >
              <thead>
                <tr style={{ background: "#20314a", textAlign: "left" }}>
                  {["Area", "Ward", "Status", "Reports", "Action"].map(
                    (heading) => (
                      <th key={heading} style={cellStyle}>
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {outages.map((outage) => {
                  const restored =
                    outage.status?.toLowerCase() === "restored";

                  return (
                    <tr key={outage.id}>
                      <td style={cellStyle}>{outage.area}</td>
                      <td style={cellStyle}>{outage.ward}</td>
                      <td style={cellStyle}>
                        {restored ? "🟢 Restored" : "🔴 Active"}
                      </td>
                      <td style={cellStyle}>
                        {Number(outage.reports) || 0}
                      </td>
                      <td style={cellStyle}>
                        {restored ? (
                          <span style={{ color: "#4ade80" }}>
                            Already restored
                          </span>
                        ) : (
                          <button
                            disabled={busyId === outage.id}
                            onClick={() => void restoreOutage(outage.id)}
                            style={{
                              ...buttonStyle,
                              background:
                                busyId === outage.id ? "#64748b" : "#15803d",
                            }}
                          >
                            {busyId === outage.id
                              ? "Saving..."
                              : "Mark restored"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  padding: "28px 20px",
  background: "#080f1e",
  color: "#f1f5f9",
  fontFamily: "Arial, sans-serif",
};

const cellStyle = {
  padding: 13,
  color: "#e2e8f0",
  border: "1px solid #30415b",
};

const buttonStyle = {
  border: 0,
  borderRadius: 8,
  padding: "10px 14px",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};
