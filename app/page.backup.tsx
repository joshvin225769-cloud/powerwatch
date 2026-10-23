

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Outage = {
  id: string;
  area: string;
  ward: string;
  description: string;
  startedAt: string;
  restoredAt?: string;
  status: string;
  reports: number;
  confirmations: number;
};

export default function Home() {
  const [outages, setOutages] = useState<Outage[]>([]);

  useEffect(() => {
  function loadOutages() {
    try {
      const saved = localStorage.getItem("powerwatch-outages");
      setOutages(saved ? JSON.parse(saved) : []);
    } catch {
      setOutages([]);
    }
  }

  loadOutages();

  window.addEventListener("focus", loadOutages);
  window.addEventListener("powerwatch-updated", loadOutages);

  const interval = window.setInterval(loadOutages, 3000);

  return () => {
    window.removeEventListener("focus", loadOutages);
    window.removeEventListener("powerwatch-updated", loadOutages);
    window.clearInterval(interval);
  };
}, []);

  function saveOutages(updated: Outage[]) {
    localStorage.setItem("powerwatch-outages", JSON.stringify(updated));
    setOutages(updated);
    window.dispatchEvent(new Event("powerwatch-updated"));
  }

  function confirmOutage(id: string) {
    const updated = outages.map((o) =>
      o.id === id ? { ...o, confirmations: o.confirmations + 1 } : o
    );
    saveOutages(updated);
  }

  function restoreOutage(id: string) {
    const updated = outages.map((o) =>
      o.id === id
        ? { ...o, status: "restored", restoredAt: new Date().toISOString() }
        : o
    );
    saveOutages(updated);
  }

  const active = outages.filter((o) => o.status === "outage");
  const restored = outages.filter((o) => o.status === "restored");

  const cardStyle = {
    background: "#ffe1e1",
    border: "1px solid #ff9999",
    borderRadius: "15px",
    padding: "25px 30px",
    marginBottom: "20px",
    color: "#111",
  } as const;

  const buttonStyle = {
    padding: "15px 20px",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  } as const;

  return (
    <main
      style={{
        maxWidth: "700px",
        margin: "20px auto",
        padding: "16px",
        fontFamily: "Arial, sans-serif",
        color: "#111",
      }}
    >
      <header style={{ borderBottom: "1px solid #222", paddingBottom: "5px" }}>
        <h1 style={{ fontSize: "40px", margin: "0 0 10px" }}>
          ⚡ PowerWatch
        </h1>
        <p style={{ fontSize: "20px", margin: "0 0 5px" }}>
          Community Power Outage Reporting System
        </p>
      </header>

      <h2 style={{ fontSize: "20px", margin: "45px 0 25px" }}>
        Live Power Status
      </h2>

      {active.length === 0 && (
        <div
          style={{
            ...cardStyle,
            background: "#e1f8e8",
            borderColor: "#8bd6a2",
          }}
        >
          <h3>🟢 POWER RESTORED</h3>
          No active outages have been reported.
        </div>
      )}

      {active.map((o) => (
        <section key={o.id} style={cardStyle}>
          <p style={{ color: "#d71920", fontSize: "20px", margin: "5px 0" }}>
            🔴 POWER OUTAGE REPORTED
          </p>
          <p style={{ margin: "5px 0" }}>{o.area}</p>
          <p style={{margin:"5px 0"}}><strong>Ward:</strong> {o.ward}</p>
          <p style={{ margin: "5px 0" }}>
            <strong>Description:</strong> {o.description}
          </p>
          <p style={{ margin: "5px 0" }}>
            <strong>Reported:</strong>{" "}
            {new Date(o.startedAt).toLocaleString()}
          </p>
          <p style={{ margin: "5px 0" }}>
            <strong>Reports:</strong> {o.reports}
          </p>
          <p style={{ margin: "5px 0" }}>
            <strong>Confirmations:</strong> {o.confirmations}
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginTop: "15px",
            }}
          >
            <button
              onClick={() => confirmOutage(o.id)}
              style={{
                ...buttonStyle,
                background: "#1d5ed8",
                color: "white",
              }}
            >
              ✓ Confirm Outage
            </button>

            <button
              onClick={() => restoreOutage(o.id)}
              style={{
                ...buttonStyle,
                background: "#16803d",
                color: "white",
              }}
            >
              ✓ Mark as Restored
            </button>
          </div>
        </section>
      ))}

      {restored.length > 0 && (
        <>
          <h2 style={{ marginTop: "30px" }}>Restored Outages</h2>
          {restored.map((o) => (
            <section
              key={o.id}
              style={{
                ...cardStyle,
                background: "#e1f8e8",
                borderColor: "#8bd6a2",
              }}
            >
              <p style={{ color: "#16803d", fontSize: "20px" }}>
                🟢 POWER RESTORED
              </p>
              <p>
                <strong>Area:</strong> {o.area}, Ward {o.ward}
              </p>
              {o.restoredAt && (
                <p>
                  <strong>Restored:</strong>{" "}
                  {new Date(o.restoredAt).toLocaleString()}
                </p>
              )}
            </section>
          ))}
        </>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "15px",
          margin: "30px 0 45px",
        }}
      >
        <Link href="/report" style={{ textDecoration: "none" }}>
          <button
            style={{ ...buttonStyle, background: "#e52328", color: "white" }}
          >
            🔴 Report Power Cut
          </button>
        </Link>
        <Link href="/statistics" style={{ textDecoration: "none" }}>
          <button
            style={{ ...buttonStyle, background: "#1d5ed8", color: "white" }}
          >
            📊 Statistics
          </button>
        </Link>
        <Link href="/alerts" style={{ textDecoration: "none" }}>
          <button
            style={{ ...buttonStyle, background: "#fff2c4", color: "#713f12" }}
          >
            ⚠️ Alerts
          </button>
        </Link>
      </div>

      <section
        style={{
          background: "#f1f2f5",
          borderRadius: "15px",
          padding: "25px",
        }}
      >
        <p style={{ marginTop: "0", fontSize: "20px" }}>Our Coverage Areas</p>
        <p>📍 Vellangallur</p>
        <p>📍 Vadama</p>
      </section>
    </main>
  );
}
