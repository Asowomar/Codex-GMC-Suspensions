"use client";

import { useEffect, useState } from "react";

type ScanData = {
  id: string;
  status: string;
  progress: number;
  score?: number;
  topIssues?: string[];
  sheetUrl?: string;
  errorMessage?: string;
  pagesPreview?: Array<{ url: string; severitySummary?: string }>;
};

export default function ScanStatus({ scanId }: { scanId: string }) {
  const [data, setData] = useState<ScanData | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const fetchStatus = async () => {
      const res = await fetch(`/api/scan/${scanId}`);
      const json = await res.json();
      setData(json);
      if (json.status === "DONE" || json.status === "FAILED") return;
      timer = setTimeout(fetchStatus, 3000);
    };
    fetchStatus();
    return () => clearTimeout(timer);
  }, [scanId]);

  if (!data) {
    return <div className="card p-6">Loading scan...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-display text-2xl">Scan status: {data.status}</h2>
        <p className="text-sm text-slate-600 mt-2">Progress: {data.progress}%</p>
        <div className="mt-4 h-2 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full bg-accent" style={{ width: `${data.progress}%` }} />
        </div>
        {data.status === "FAILED" && (
          <p className="text-sm text-red-600 mt-4">
            Scan failed. {data.errorMessage || "Please retry or contact support."}
          </p>
        )}
      </div>

      {data.status === "DONE" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-6">
            <p className="text-sm text-slate-500">Compliance score</p>
            <p className="text-4xl font-display text-ink">{data.score}</p>
            <div className="mt-4">
              <p className="text-sm font-semibold">Top issues</p>
              <ul className="text-sm text-slate-600 mt-2 space-y-1">
                {data.topIssues?.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="card p-6">
            <p className="text-sm font-semibold">Preview</p>
            <ul className="mt-2 text-sm text-slate-600 space-y-2">
              {data.pagesPreview?.map((page) => (
                <li key={page.url}>
                  <span className="block text-ink font-medium">{page.url}</span>
                  <span className="text-xs">{page.severitySummary || "OK"}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {data.status === "DONE" && (
        <div className="flex flex-wrap gap-3">
          {data.sheetUrl && (
            <a
              href={data.sheetUrl}
              target="_blank"
              className="rounded-2xl bg-ink text-white px-5 py-3 font-semibold"
            >
              Open Google Sheet
            </a>
          )}
          <a
            href={`/api/scan/${scanId}/summary`}
            target="_blank"
            className="rounded-2xl border border-slate-300 px-5 py-3 font-semibold"
          >
            Open HTML Summary
          </a>
          <a href="/app" className="rounded-2xl border border-slate-300 px-5 py-3 font-semibold">
            Upgrade to Full Scan
          </a>
        </div>
      )}
    </div>
  );
}
