"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Outage = {
  id: string;
  area: string;
  ward: string;
  description: string;
  startedAt: string;
  status: "outage" | "restored";
  reports: number;
  confirmations: number;
};

export default function ReportPage() {
  const router = useRouter();

  const [area, setArea] = useState("Vellangallur");
  const [ward, setWard] = useState("Ward 5");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  function submitReport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    try {
      const saved = localStorage.getItem("powerwatch-outages");
      const outages: Outage[] = saved ? JSON.parse(saved) : [];

      const newOutage: Outage = {
        id: crypto.randomUUID(),
        area,
        ward,
        description: description.trim() || "No description provided",
        startedAt: new Date().toISOString(),
        status: "outage",
        reports: 1,
        confirmations: 0
      };

      outages.unshift(newOutage);
      localStorage.setItem("powerwatch-outages", JSON.stringify(outages));

      router.push("/");
    } catch {
      setError("Could not save the report. Please try again.");
    }
  }

  return (
    <main style={{
      maxWidth: "700px",
      margin: "35px auto",
      padding: "24px",
      fontFamily: "Arial, sans-serif"
    }}>
      <Link href="/" style={{ color: "#175cd3" }}>
        ← Back to dashboard
      </Link>

      <h1 style={{ marginTop: "25px" }}>🔴 Report Power Cut</h1>
      <p style={{ color: "#667085" }}>
        Tell your community about a power outage in your area.
      </p>

      <form onSubmit={submitReport} style={{
        display: "grid",
        gap: "18px",
        marginTop: "25px",
        padding: "25px",
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "14px"
      }}>
        <div>
          <label htmlFor="area">Area</label>
          <select
            id="area"
            value={area}
            onChange={e => setArea(e.target.value)}
            style={fieldStyle}
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
            onChange={e => setWard(e.target.value)}
            style={fieldStyle}
          >
            {[1, 2, 3, 4, 5, 6].map(n => (
              <option key={n} value={`Ward ${n}`}>
                Ward {n}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="description">Description (optional)</label>
          <textarea
            id="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Example: There is no electricity in our street."
            maxLength={500}
            rows={4}
            style={fieldStyle}
          />
        </div>

        <p style={{ color: "#667085", fontSize: "13px" }}>
          The report date and time will be recorded automatically.
        </p>

        {error && (
          <p role="alert" style={{ color: "#b42318" }}>
            {error}
          </p>
        )}

        <button type="submit" style={{
          background: "#dc2626",
          color: "white",
          padding: "15px",
          border: "none",
          borderRadius: "9px",
          fontWeight: "bold",
          fontSize: "16px",
          cursor: "pointer"
        }}>
          🔴 SUBMIT POWER CUT REPORT
        </button>
      </form>
    </main>
  );
}

const fieldStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "12px",
  marginTop: "8px",
  border: "1px solid #d0d5dd",
  borderRadius: "8px",
  background: "white",
  fontSize: "15px"
};
