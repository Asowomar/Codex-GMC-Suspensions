"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Rule = {
  id: string;
  name: string;
  pattern: string;
  patternType: "KEYWORD" | "REGEX";
  appliesTo: "PRODUCT" | "POLICY" | "ANY";
  severity: "HIGH" | "MEDIUM" | "LOW" | "REVIEW";
  message: string;
  enabled: boolean;
};

const defaultRule = {
  name: "",
  pattern: "",
  patternType: "KEYWORD" as const,
  appliesTo: "ANY" as const,
  severity: "REVIEW" as const,
  message: "",
};

export default function CustomRulesForm() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [form, setForm] = useState(defaultRule);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const loadRules = async () => {
    const res = await fetch("/api/custom-rules");
    const data = await res.json();
    setRules(data.rules || []);
  };

  useEffect(() => {
    loadRules();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/custom-rules", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create rule");
      }
      setForm(defaultRule);
      setEditingId(null);
      await loadRules();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(rule: Rule) {
    await fetch("/api/custom-rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
    });
    await loadRules();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/custom-rules?id=${id}`, { method: "DELETE" });
    await loadRules();
  }

  function parseCsv(text: string) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const cells: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        const next = line[i + 1];
        if (char === "\"" && inQuotes && next === "\"") {
          current += "\"";
          i += 1;
          continue;
        }
        if (char === "\"") {
          inQuotes = !inQuotes;
          continue;
        }
        if (char === "," && !inQuotes) {
          cells.push(current);
          current = "";
          continue;
        }
        current += char;
      }
      cells.push(current);
      const data: Record<string, string> = {};
      headers.forEach((h, idx) => {
        data[h] = (cells[idx] || "").trim();
      });
      return data;
    });
  }

  async function handleImport(file: File) {
    setImporting(true);
    setError(null);
    try {
      const text = await file.text();
      let payload: any[] = [];
      if (file.name.endsWith(".json") || text.trim().startsWith("[")) {
        payload = JSON.parse(text);
      } else {
        const rows = parseCsv(text);
        payload = rows.map((row) => ({
          name: row.name,
          pattern: row.pattern,
          patternType: (row.patternType || "KEYWORD").toUpperCase(),
          appliesTo: (row.appliesTo || "ANY").toUpperCase(),
          severity: (row.severity || "REVIEW").toUpperCase(),
          message: row.message || row.name,
          enabled: row.enabled ? row.enabled === "true" : true,
        }));
      }
      const res = await fetch("/api/custom-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: payload }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to import rules");
      }
      await loadRules();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  }

  function startEdit(rule: Rule) {
    setForm({
      name: rule.name,
      pattern: rule.pattern,
      patternType: rule.patternType,
      appliesTo: rule.appliesTo,
      severity: rule.severity,
      message: rule.message,
    });
    setEditingId(rule.id);
  }

  return (
    <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6">
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="text-sm font-semibold">Rule name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2"
            required
          />
        </div>
        <div>
          <label className="text-sm font-semibold">Pattern</label>
          <input
            value={form.pattern}
            onChange={(e) => setForm({ ...form, pattern: e.target.value })}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2"
            required
          />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold">Pattern type</label>
            <select
              value={form.patternType}
              onChange={(e) => setForm({ ...form, patternType: e.target.value as Rule["patternType"] })}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2"
            >
              <option value="KEYWORD">Keyword</option>
              <option value="REGEX">Regex</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold">Applies to</label>
            <select
              value={form.appliesTo}
              onChange={(e) => setForm({ ...form, appliesTo: e.target.value as Rule["appliesTo"] })}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2"
            >
              <option value="ANY">Any page</option>
              <option value="PRODUCT">Product</option>
              <option value="POLICY">Policy</option>
            </select>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold">Severity</label>
            <select
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value as Rule["severity"] })}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2"
            >
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="REVIEW">Review</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold">Message</label>
            <input
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2"
              required
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <Button disabled={loading}>{loading ? "Saving..." : editingId ? "Save changes" : "Add rule"}</Button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setForm(defaultRule);
                setEditingId(null);
              }}
              className="text-sm text-slate-500"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Active rules</h3>
          <div className="flex items-center gap-2 text-xs">
            <a href="/api/custom-rules?format=csv" className="text-slate-500">
              Export CSV
            </a>
            <a href="/api/custom-rules?format=json" className="text-slate-500">
              Export JSON
            </a>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 text-sm">
          <input
            type="file"
            accept=".json,.csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
            }}
          />
          {importing && <span className="text-slate-500">Importing...</span>}
        </div>
        <div className="mt-4 space-y-3">
          {rules.length === 0 && <p className="text-sm text-slate-500">No custom rules yet.</p>}
          {rules.map((rule) => (
            <div key={rule.id} className="border border-slate-200 rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-ink">{rule.name}</p>
                  <p className="text-xs text-slate-500">{rule.patternType} · {rule.appliesTo} · {rule.severity}</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <button onClick={() => handleToggle(rule)} className="text-slate-500">
                    {rule.enabled ? "Disable" : "Enable"}
                  </button>
                  <button onClick={() => startEdit(rule)} className="text-slate-500">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(rule.id)} className="text-red-600">
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-600 mt-2">Pattern: {rule.pattern}</p>
              <p className="text-sm text-slate-600">Message: {rule.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
