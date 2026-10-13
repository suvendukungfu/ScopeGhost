"use client";

import React, { useState } from "react";
import { X, PlusCircle } from "lucide-react";
import { Project } from "@/lib/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
}

export function ProjectFormModal({ isOpen, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [rateDollars, setRateDollars] = useState("125");
  const [budgetDollars, setBudgetDollars] = useState("10000");
  const [revisionLimit, setRevisionLimit] = useState("2");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const hourlyRateCents = Math.round(parseFloat(rateDollars || "0") * 100);
    const originalBudgetCents = Math.round(parseFloat(budgetDollars || "0") * 100);
    const revLimit = parseInt(revisionLimit || "2", 10);

    if (!name.trim() || !clientName.trim()) {
      setError("Project name and Client name are required.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          clientName: clientName.trim(),
          currency,
          hourlyRateCents,
          originalBudgetCents,
          revisionLimit: revLimit,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      onCreated(data.project);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Create New Project</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-sm rounded-lg border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Project Title *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Web App v2"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Client / Company Name *
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Acme Corporation"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Hourly Billing Rate
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={rateDollars}
                  onChange={(e) => setRateDollars(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Original Budget
              </label>
              <input
                type="number"
                min="0"
                step="100"
                required
                value={budgetDollars}
                onChange={(e) => setBudgetDollars(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Included Revision Rounds
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={revisionLimit}
                onChange={(e) => setRevisionLimit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              {isSubmitting ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
