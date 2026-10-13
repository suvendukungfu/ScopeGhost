"use client";

import React, { useState } from "react";
import { BaselineClause, ClauseType } from "@/lib/types";
import { Plus, Trash2, CheckCircle, ShieldAlert, Info, RotateCcw } from "lucide-react";

interface Props {
  projectId: string;
  clauses: BaselineClause[];
  onClauseAdded: (clause: BaselineClause) => void;
  onClauseDeleted: (clauseId: string) => void;
}

export function AgreementManager({
  projectId,
  clauses,
  onClauseAdded,
  onClauseDeleted,
}: Props) {
  const [isOpenForm, setIsOpenForm] = useState(false);
  const [clauseType, setClauseType] = useState<ClauseType>("DELIVERABLE");
  const [title, setTitle] = useState("");
  const [sectionRef, setSectionRef] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getBadge = (type: ClauseType) => {
    switch (type) {
      case "DELIVERABLE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle className="w-3 h-3" /> Deliverable
          </span>
        );
      case "EXCLUSION":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <ShieldAlert className="w-3 h-3" /> Explicit Exclusion
          </span>
        );
      case "ASSUMPTION":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
            <Info className="w-3 h-3" /> Tech Assumption
          </span>
        );
      case "REVISION_LIMIT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <RotateCcw className="w-3 h-3" /> Revision Limit
          </span>
        );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/clauses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clauseType,
          title: title.trim(),
          sectionRef: sectionRef.trim() || null,
          content: content.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add clause");

      onClauseAdded(data.clause);
      setTitle("");
      setSectionRef("");
      setContent("");
      setIsOpenForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving clause");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (clauseId: string) => {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/clauses?clauseId=${clauseId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        onClauseDeleted(clauseId);
      }
    } catch (err) {
      console.error("Failed to delete clause", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Baseline Agreement Clauses
          </h2>
          <p className="text-sm text-slate-500">
            Agreed deliverables, explicit exclusions, and boundaries against which incoming client requests are audited.
          </p>
        </div>

        {!isOpenForm && (
          <button
            onClick={() => setIsOpenForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs"
          >
            <Plus className="w-4 h-4" /> Add Clause
          </button>
        )}
      </div>

      {isOpenForm && (
        <form
          onSubmit={handleSubmit}
          className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              New Agreement Clause
            </h3>
            <button
              type="button"
              onClick={() => setIsOpenForm(false)}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>

          {error && (
            <div className="p-2.5 text-xs text-rose-700 bg-rose-50 rounded-lg border border-rose-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clause Category *
              </label>
              <select
                value={clauseType}
                onChange={(e) => setClauseType(e.target.value as ClauseType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              >
                <option value="DELIVERABLE">Agreed Deliverable</option>
                <option value="EXCLUSION">Explicit Exclusion</option>
                <option value="ASSUMPTION">Technical Assumption</option>
                <option value="REVISION_LIMIT">Revision Policy</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clause Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Next.js Responsive Web App"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Section Reference
              </label>
              <input
                type="text"
                value={sectionRef}
                onChange={(e) => setSectionRef(e.target.value)}
                placeholder="e.g. SOW Section 2.1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Verbatim Clause Text / Scope Definition *
            </label>
            <textarea
              required
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste the exact text from your Statement of Work or agreement..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-xs leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsOpenForm(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
            >
              {isSubmitting ? "Saving..." : "Save Clause"}
            </button>
          </div>
        </form>
      )}

      {clauses.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white border border-dashed border-slate-300 rounded-xl">
          <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-900">
            No Baseline Clauses Added
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Add deliverables and exclusions from your signed contract so ScopeGhost knows what is in-scope vs. out-of-scope.
          </p>
          <button
            onClick={() => setIsOpenForm(true)}
            className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition"
          >
            Add First Clause
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {clauses.map((clause) => (
            <div
              key={clause.id}
              className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition shadow-2xs"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getBadge(clause.clauseType)}
                    <h3 className="text-sm font-bold text-slate-900">
                      {clause.title}
                    </h3>
                    {clause.sectionRef && (
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {clause.sectionRef}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap leading-relaxed mt-2">
                    {clause.content}
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(clause.id)}
                  title="Delete clause"
                  className="text-slate-400 hover:text-rose-600 transition p-1.5 hover:bg-rose-50 rounded-lg shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
