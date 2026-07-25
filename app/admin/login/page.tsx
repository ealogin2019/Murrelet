"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed.");
      }
      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="wrap" style={{ maxWidth: 360, paddingTop: 100, paddingBottom: 100 }}>
      <h1 style={{ fontFamily: "var(--serif)", fontWeight: 500, marginBottom: 8 }}>Admin</h1>
      <p style={{ color: "var(--muted)", marginBottom: 28, fontSize: "0.9rem" }}>
        Sign in to edit products, photos and the homepage carousel.
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          autoFocus
          style={{
            width: "100%",
            padding: "12px 14px",
            border: "1px solid var(--line)",
            borderRadius: 2,
            fontSize: "0.9rem",
            marginBottom: 14,
          }}
        />
        {error && (
          <p style={{ color: "#c0392b", fontSize: "0.85rem", marginBottom: 14 }}>{error}</p>
        )}
        <button className="btn" type="submit" disabled={loading || !password}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
