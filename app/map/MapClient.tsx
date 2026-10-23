"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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

const areas = [
  {
    name: "Vellangallur",
    position: [10.305, 76.2186] as [number, number],
    accuracy: "Approximate locality marker",
  },
  {
    name: "Vadama",
    position: [10.249796, 76.265206] as [number, number],
    accuracy: "Approximate locality marker",
  },
];

function makeIcon(color: string) {
  return new L.DivIcon({
    className: "",
    html: `<div style="background:${color};width:20px;height:20px;border:3px solid white;border-radius:50%;box-shadow:0 1px 6px #555"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

const outageIcon = makeIcon("#dc2626");
const restoredIcon = makeIcon("#16a34a");

function FitMap() {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 100);
    return () => window.clearTimeout(timer);
  }, [map]);

  return null;
}

export default function MapClient() {
  const [outages, setOutages] = useState<Outage[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadOutages = useCallback(async () => {
    const { data, error } = await supabase
      .from("outages")
      .select(
        "id, area, ward, description, started_at, restored_at, status, reports, confirmations"
      )
      .order("started_at", { ascending: false });

    if (error) {
      console.error("Could not load map outages:", error.message);
      setLoadError(error.message);
      setLoading(false);
      return;
    }

    setOutages((data ?? []) as Outage[]);
    setLoadError("");
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadOutages();

    const channel = supabase
      .channel("powerwatch-map-outages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "outages" },
        () => void loadOutages()
      )
      .subscribe();

    const timer = window.setInterval(() => void loadOutages(), 10000);

    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [loadOutages]);

  const isActive = (o: Outage) =>
    (o.status ?? "").trim().toLowerCase() === "outage";

  const isRestored = (o: Outage) =>
    (o.status ?? "").trim().toLowerCase() === "restored";

  const activeCount = outages.filter(isActive).length;
  const restoredCount = outages.filter(isRestored).length;

  return (
    <main
      style={{
        color: "#e5e7eb",
        background: "#0b1120",
        minHeight: "100vh",
        fontFamily: "Arial, sans-serif",
        padding: "16px",
      }}
    >
      <h1>📍 PowerWatch Outage Map</h1>
      <p>
        Red markers indicate reported outages. Green markers indicate restored
        outages. Area markers are approximate and do not represent verified
        ward boundaries.
      </p>

      <div style={{ display: "flex", gap: "18px", marginBottom: "15px" }}>
        <span>🔴 Active: {activeCount}</span>
        <span>🟢 Restored: {restoredCount}</span>
      </div>

      {loading && <p>Loading outage reports...</p>}

      {loadError && (
        <p role="alert" style={{ color: "#fca5a5" }}>
          Could not load outages: {loadError}
        </p>
      )}

      <MapContainer
        center={[10.29, 76.24]}
        zoom={12}
        style={{
          height: "520px",
          width: "100%",
          borderRadius: "14px",
          border: "1px solid #ddd",
        }}
      >
        <FitMap />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {areas.map((area) => {
          const related = outages.filter(
            (o) =>
              (o.area ?? "").trim().toLowerCase() ===
              area.name.trim().toLowerCase()
          );

          const active = related.filter(isActive);
          const restored = related.filter(isRestored);
          const icon = active.length > 0 ? outageIcon : restoredIcon;

          return (
            <Marker
              key={area.name}
              position={area.position}
              icon={icon}
              eventHandlers={{}}
            >
              <Popup>
                <strong>{area.name}</strong>
                <br />
                {area.accuracy}
                <br />
                Active outages: {active.length}
                <br />
                Restored reports: {restored.length}
                {related.map((o) => (
                  <div key={o.id} style={{ marginTop: "8px" }}>
                    <strong>Ward {o.ward || "Not specified"}</strong>
                    <br />
                    {o.description}
                    <br />
                    Status: {o.status}
                    <br />
                    Reports: {o.reports}
                    <br />
                    Confirmations: {o.confirmations}
                  </div>
                ))}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <p style={{ fontSize: "13px", color: "#9ca3af", marginTop: "12px" }}>
        Map data © OpenStreetMap contributors. Outage markers show the general
        area, not the exact fault location.
      </p>
    </main>
  );
}
