"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface HealthResponse {
  ok: boolean;
  status: "AVAILABLE" | "MODEL_UNAVAILABLE" | "OFFLINE";
  configuredModel?: string;
  selectedModelAvailable: boolean;
  error?: string;
}

export function SettingsPanel() {
  const router = useRouter();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmation, setConfirmation] = useState("");
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      const data = await response.json();
      setHealth({
        ok: Boolean(data.ok),
        status: data.status ?? (data.ok ? "MODEL_UNAVAILABLE" : "OFFLINE"),
        configuredModel: data.configuredModel,
        selectedModelAvailable: Boolean(data.selectedModelAvailable),
        error: data.error,
      });
    } catch {
      setHealth({
        ok: false,
        status: "OFFLINE",
        selectedModelAvailable: false,
        error: "Could not reach the local model status endpoint.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadHealth();
  }, []);

  const clearLocalData = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (confirmation !== "DELETE ALL LOCAL DATA") {
      setError("Type the confirmation phrase exactly to continue.");
      return;
    }

    setError(null);
    setIsClearing(true);
    try {
      const response = await fetch("/api/data", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const data = await response.json();
      if (!response.ok || !data.deleted) {
        throw new Error(data.error || "Local data could not be deleted");
      }
      router.push("/");
      router.refresh();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Local data could not be deleted");
      setIsClearing(false);
    }
  };

  const modelState = health?.status ?? "OFFLINE";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">Workspace settings</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight text-slate-950">Privacy and local processing</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          ScopeGhost keeps project records and evidence in the local SQLite database. Analysis requests go only to the local Ollama service configured on this machine.
        </p>
      </header>

      <section aria-labelledby="model-status-heading" className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="model-status-heading" className="text-base font-semibold text-slate-900">Local model status</h2>
            <p className="mt-1 text-sm text-slate-600">Selected model: <span className="font-mono text-slate-900">{health?.configuredModel ?? "gemma3:4b"}</span></p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            isLoading
              ? "border-slate-200 bg-slate-50 text-slate-600"
              : modelState === "AVAILABLE" && health?.selectedModelAvailable
                ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                : modelState === "MODEL_UNAVAILABLE"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
          }`}>
            {isLoading
              ? "Checking local service…"
              : modelState === "AVAILABLE" && health?.selectedModelAvailable
                ? "Model available"
                : modelState === "MODEL_UNAVAILABLE"
                  ? "Model not installed"
                  : "Ollama offline"}
          </span>
        </div>
        {health?.error && <p role="status" className="mt-3 text-sm text-slate-600">{health.error}</p>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs leading-5 text-slate-500">
            Configure <code className="rounded bg-slate-100 px-1">OLLAMA_MODEL</code>; default: <code className="rounded bg-slate-100 px-1">gemma3:4b</code>. No hosted model fallback is configured.
          </p>
          <button type="button" onClick={() => void loadHealth()} disabled={isLoading} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-800 disabled:opacity-50">
            {isLoading ? "Checking…" : "Check again"}
          </button>
        </div>
      </section>

      <section aria-labelledby="data-controls-heading" className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 id="data-controls-heading" className="text-base font-semibold text-slate-900">Local data controls</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">Export your projects, original imported documents, audit findings, drafts, and metadata before clearing local records.</p>
        <a href="/api/data/export" className="mt-4 inline-flex rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">
          Download local data export
        </a>

        <form onSubmit={clearLocalData} className="mt-7 border-t border-rose-100 pt-5">
          <h3 className="text-sm font-semibold text-rose-800">Clear all local project data</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">This permanently removes projects, source documents, excerpts, findings, drafts, and their audit history from this local database. Export first if you may need a copy.</p>
          {error && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          <label className="mt-4 block max-w-md text-xs font-medium text-slate-700">
            Type <code className="font-bold">DELETE ALL LOCAL DATA</code> to confirm
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-rose-600"
            />
          </label>
          <button type="submit" disabled={isClearing || confirmation !== "DELETE ALL LOCAL DATA"} className="mt-3 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-50">
            {isClearing ? "Clearing local data…" : "Delete all local data"}
          </button>
        </form>
      </section>
    </div>
  );
}
