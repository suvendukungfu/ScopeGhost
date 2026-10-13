"use client";

import React, { useState } from "react";
import { Project } from "@/lib/types";

interface Props {
  project: Project;
  onUpdated: (project: Project) => void;
}

export function ProjectSettings({ project, onUpdated }: Props) {
  const [name, setName] = useState(project.name);
  const [clientName, setClientName] = useState(project.clientName);
  const [currency, setCurrency] = useState(project.currency);
  const [rate, setRate] = useState((project.hourlyRateCents / 100).toFixed(2));
  const [budget, setBudget] = useState((project.originalBudgetCents / 100).toFixed(2));
  const [revisionLimit, setRevisionLimit] = useState(String(project.revisionLimit));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const hourlyRateCents = Math.round(Number(rate) * 100);
    const originalBudgetCents = Math.round(Number(budget) * 100);
    const parsedRevisionLimit = Number(revisionLimit);
    if (
      !name.trim() ||
      !clientName.trim() ||
      !Number.isSafeInteger(hourlyRateCents) ||
      !Number.isSafeInteger(originalBudgetCents) ||
      !Number.isSafeInteger(parsedRevisionLimit) ||
      hourlyRateCents < 0 ||
      originalBudgetCents < 0 ||
      parsedRevisionLimit < 0
    ) {
      setError("Enter valid project details, non-negative amounts, and a whole-number revision limit.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          clientName: clientName.trim(),
          currency,
          hourlyRateCents,
          originalBudgetCents,
          revisionLimit: parsedRevisionLimit,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.project) {
        throw new Error(data.error || "Could not save project settings");
      }
      onUpdated(data.project);
      setSaved(true);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Could not save project settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="max-w-3xl rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
      <div className="mb-6 border-b border-slate-100 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Scope editor</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">Project terms and baseline</h2>
        <p className="mt-1 text-sm text-slate-600">
          Define the signed scope with deliverables, exclusions, assumptions, and revision limits in the agreement section.
          Update project identity and deterministic billing details here.
        </p>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {saved && <p role="status" className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800">Project terms saved locally.</p>}

      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Project name
          <input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-indigo-600" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Client name
          <input required maxLength={100} value={clientName} onChange={(event) => setClientName(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-indigo-600" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Currency
          <select value={currency} onChange={(event) => setCurrency(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-indigo-600">
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — Pound Sterling</option>
            <option value="CAD">CAD — Canadian Dollar</option>
            <option value="AUD">AUD — Australian Dollar</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Hourly rate
          <input required type="number" min="0" step="0.01" value={rate} onChange={(event) => setRate(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-indigo-600" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Original budget
          <input required type="number" min="0" step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-indigo-600" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Included revision rounds
          <input required type="number" min="0" step="1" value={revisionLimit} onChange={(event) => setRevisionLimit(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-indigo-600" />
        </label>
        <div className="sm:col-span-2 flex justify-end border-t border-slate-100 pt-4">
          <button type="submit" disabled={isSaving} className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 disabled:opacity-60">
            {isSaving ? "Saving…" : "Save project terms"}
          </button>
        </div>
      </form>
    </section>
  );
}
