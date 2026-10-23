"use client";

import { useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export default function NotificationsPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function enableNotifications() {
    setBusy(true);
    setMessage("");

    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("This browser does not support push notifications.");
      }

      if (!("Notification" in window)) {
        throw new Error("Browser notifications are not supported.");
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        throw new Error("The VAPID public key is missing from .env.local.");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Please allow notifications in your browser settings.");
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not save your subscription.");
      }

      setMessage("Notifications enabled on this device!");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#0b1220",
      color: "#f8fafc",
      display: "grid",
      placeItems: "center",
      padding: 24,
      fontFamily: "Arial, sans-serif"
    }}>
      <section style={{
        maxWidth: 480,
        width: "100%",
        padding: 28,
        border: "1px solid #263449",
        borderRadius: 16,
        background: "#111c2e"
      }}>
        <h1>PowerWatch Notifications</h1>
        <p>Enable browser notifications to receive power outage alerts on this device.</p>
        <button
          onClick={enableNotifications}
          disabled={busy}
          style={{
            padding: "12px 18px",
            borderRadius: 8,
            border: 0,
            background: busy ? "#64748b" : "#38bdf8",
            color: "#07111f",
            fontWeight: 700,
            cursor: busy ? "wait" : "pointer"
          }}
        >
          {busy ? "Enabling..." : "Enable Notifications"}
        </button>
        {message && <p role="status" style={{ marginTop: 16 }}>{message}</p>}
        <p style={{ color: "#94a3b8", fontSize: 13 }}>
          You can change notification permission in your browser settings.
        </p>
      </section>
    </main>
  );
}
