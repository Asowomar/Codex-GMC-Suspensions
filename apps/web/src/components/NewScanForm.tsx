"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function NewScanForm() {
  const [domain, setDomain] = useState("");
  const [mode, setMode] = useState<"QUICK" | "FULL">("FULL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, mode }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start scan");
      }
      const data = await res.json();
      window.location.href = `/scan/${data.scanId}`;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
      <div>
        <label className="text-sm font-semibold">Domain</label>
        <input
          required
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="https://shop.example.com"
          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"
        />
      </div>
      <div>
        <label className="text-sm font-semibold">Scan mode</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as "QUICK" | "FULL")}
          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"
        >
          <option value="QUICK">Quick (25 pages)</option>
          <option value="FULL">Full (500 pages)</option>
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button disabled={loading}>{loading ? "Starting..." : "Start scan"}</Button>
    </form>
  );
}
