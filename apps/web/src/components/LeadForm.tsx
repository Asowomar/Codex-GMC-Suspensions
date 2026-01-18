"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function LeadForm() {
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, email, consent }),
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

  async function handleDemo() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/demo", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start demo");
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
    <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-4">
      <div>
        <label className="text-sm font-semibold">E-commerce store URL</label>
        <input
          required
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="https://shop.example.com"
          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-base"
        />
      </div>
      <div>
        <label className="text-sm font-semibold">Email (for your scan report)</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@agency.com"
          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-base"
        />
      </div>
      <label className="flex items-start gap-3 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
          className="mt-1"
        />
        <span>
          I agree to the processing of this data to run the scan and receive the report. Read our{" "}
          <a href="/privacy" className="underline">
            GDPR-friendly privacy policy
          </a>
          .
        </span>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button disabled={loading} className="w-full shadow-lg shadow-slate-300/70">
        {loading ? "Starting scan..." : "Free E-commerce Quick Scan"}
      </Button>
      {demoMode && (
        <button
          type="button"
          onClick={handleDemo}
          className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold"
        >
          Run Demo Scan (Instant)
        </button>
      )}
    </form>
  );
}
