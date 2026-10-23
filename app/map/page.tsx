
"use client";

import dynamic from "next/dynamic";

const MapClient = dynamic(() => import("./MapClient"), {
  ssr: false,
  loading: () => (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b1120",
        color: "#ffffff",
        padding: "32px",
      }}
    >
      Loading PowerWatch map...
    </main>
  ),
});

export default function MapPage() {
  return <MapClient />;
}
