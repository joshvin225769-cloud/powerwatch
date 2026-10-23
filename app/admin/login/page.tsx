
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError || !data.user) {
        setError("Sign-in failed. Check your email and password.");
        return;
      }

      const { data: membership, error: membershipError } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (membershipError || !membership) {
        await supabase.auth.signOut();
        setError("This account is not approved as a PowerWatch admin.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#080f1e",
        color: "#f1f5f9",
        padding: 20,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          width: "100%",
          maxWidth: 420,
          padding: 28,
          border: "1px solid #30415b",
          borderRadius: 16,
          background: "#121d30",
        }}
      >
        <h1 style={{ color: "#fff", marginTop: 0 }}>PowerWatch Admin</h1>
        <p style={{ color: "#b6c4d8" }}>
          Sign in with your approved administrator account.
        </p>

        <label htmlFor="admin-email">Email</label>
        <input
          id="admin-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          style={fieldStyle}
        />

        <label htmlFor="admin-password">Password</label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          style={fieldStyle}
        />

        {error && (
          <p role="alert" style={{ color: "#fda4af" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          style={{
            width: "100%",
            marginTop: 22,
            padding: 13,
            border: 0,
            borderRadius: 9,
            background: busy ? "#64748b" : "#2563eb",
            color: "#fff",
            fontWeight: 700,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}

const fieldStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box" as const,
  marginTop: 8,
  marginBottom: 18,
  padding: 12,
  color: "#fff",
  background: "#0b1425",
  border: "1px solid #30415b",
  borderRadius: 8,
};
