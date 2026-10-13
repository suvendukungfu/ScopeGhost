"use client";

import React, { useRef, useState } from "react";
import {
  Project,
  BaselineClause,
  EvidenceChunk,
  ScopeFinding,
  ScopeClassification,
  HumanDecision,
} from "@/lib/types";
import { formatCurrency, calculateItemCostCents } from "@/lib/financial";
import {
  ShieldAlert,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Check,
  X,
  Edit2,
  Sparkles,
  ArrowRight,
  Quote,
  Clock,
  DollarSign,
  AlertTriangle,
  BadgeCheck,
} from "lucide-react";

interface Props {
  project: Project;
  clauses: BaselineClause[];
  chunks: EvidenceChunk[];
  findings: ScopeFinding[];
  onFindingsUpdated: (findings: ScopeFinding[]) => void;
  onProceedToChangeOrder: () => void;
}

export function ScopeAuditReview({
  project,
  clauses,
  chunks,
  findings,
  onFindingsUpdated,
  onProceedToChangeOrder,
}: Props) {
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | ScopeClassification>("ALL");
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  const [editClassification, setEditClassification] =
    useState<ScopeClassification>("POTENTIALLY_OUT_OF_SCOPE");
  const [editHoursMin, setEditHoursMin] = useState("0");
  const [editHoursMax, setEditHoursMax] = useState("0");
  const [editNotes, setEditNotes] = useState("");
  const [updatingFindingId, setUpdatingFindingId] = useState<string | null>(null);
  const auditController = useRef<AbortController | null>(null);

  const runAudit = async () => {
    setIsRunningAudit(true);
    setError(null);
    const controller = new AbortController();
    auditController.current = controller;

    try {
      const res = await fetch(`/api/projects/${project.id}/analyze`, {
        method: "POST",
        signal: controller.signal,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Scope audit failed");
      }

      onFindingsUpdated(data.findings);
    } catch (err: unknown) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setError(
          err instanceof Error
            ? err.message
            : "Audit failed. Check the local Ollama service and selected model."
        );
      }
    } finally {
      auditController.current = null;
      setIsRunningAudit(false);
    }
  };

  const handleUpdateDecision = async (
    findingId: string,
    decision: {
      humanStatus: HumanDecision;
      classification?: ScopeClassification;
      estHoursMin?: number;
      estHoursMax?: number;
      humanNotes?: string;
    }
  ) => {
    setUpdatingFindingId(findingId);
    setError(null);
    try {
      const res = await fetch(`/api/findings/${findingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(decision),
      });

      const data = await res.json();
      if (!res.ok || !data.finding) {
        throw new Error(data.error || "Could not save the review decision");
      }
      onFindingsUpdated(findings.map((f) => (f.id === findingId ? data.finding : f)));
      setEditingFindingId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save the review decision");
    } finally {
      setUpdatingFindingId(null);
    }
  };

  const startEditing = (finding: ScopeFinding) => {
    setEditingFindingId(finding.id);
    setEditClassification(finding.classification);
    setEditHoursMin(String(finding.estHoursMin));
    setEditHoursMax(String(finding.estHoursMax));
    setEditNotes(finding.humanNotes || "");
  };

  const filteredFindings = findings.filter((f) => {
    if (filter === "ALL") return true;
    return f.classification === filter;
  });

  const outOfScopeCount = findings.filter(
    (f) => f.classification === "POTENTIALLY_OUT_OF_SCOPE"
  ).length;
  const ambiguousCount = findings.filter(
    (f) => f.classification === "AMBIGUOUS"
  ).length;
  const inScopeCount = findings.filter(
    (f) => f.classification === "IN_SCOPE"
  ).length;
  const insufficientCount = findings.filter(
    (f) => f.classification === "INSUFFICIENT_EVIDENCE"
  ).length;

  const totalMinHours = findings
    .filter((f) => f.humanStatus !== "DISMISSED")
    .reduce((acc, f) => acc + f.estHoursMin, 0);
  const totalMaxHours = findings
    .filter((f) => f.humanStatus !== "DISMISSED")
    .reduce((acc, f) => acc + f.estHoursMax, 0);

  const costMinCents = calculateItemCostCents(totalMinHours, project.hourlyRateCents);
  const costMaxCents = calculateItemCostCents(totalMaxHours, project.hourlyRateCents);

  const getClassificationBadge = (classification: ScopeClassification) => {
    switch (classification) {
      case "POTENTIALLY_OUT_OF_SCOPE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <ShieldAlert className="w-3.5 h-3.5" /> Out of Scope
          </span>
        );
      case "AMBIGUOUS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5" /> Ambiguous Scope
          </span>
        );
      case "IN_SCOPE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5" /> In Scope
          </span>
        );
      case "INSUFFICIENT_EVIDENCE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <HelpCircle className="w-3.5 h-3.5" /> Insufficient Evidence
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Audit Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-slate-200 rounded-xl shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Scope Differential Audit
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Local Ollama model audits client requests against contract deliverables and exclusions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isRunningAudit && (
            <button
              type="button"
              onClick={() => auditController.current?.abort()}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:border-rose-300 hover:text-rose-800"
            >
              Cancel analysis
            </button>
          )}
          <button
            onClick={runAudit}
            disabled={isRunningAudit || chunks.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {isRunningAudit
              ? "Auditing locally..."
              : findings.length > 0
              ? "Re-run Local Scope Audit"
              : "Run Local Scope Audit"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Local Inference Issue</p>
            <p>{error}</p>
            <p className="text-slate-600">
              Ensure Ollama is running in your terminal:{" "}
              <code className="bg-white px-1.5 py-0.5 rounded border border-rose-200 font-mono">
                ollama run gemma3:4b
              </code>
            </p>
          </div>
        </div>
      )}

      {findings.length > 0 && (
        <p className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-900">
          Confidence labels are qualitative review signals, not probabilities. Model effort ranges are estimates, not verified evidence or invoice totals.
        </p>
      )}

      {/* Summary KPI Cards */}
      {findings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <span className="text-2xs font-semibold text-rose-600 uppercase tracking-wider block">
              Out of Scope
            </span>
            <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
              {outOfScopeCount}
            </span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <span className="text-2xs font-semibold text-amber-600 uppercase tracking-wider block">
              Ambiguous
            </span>
            <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
              {ambiguousCount}
            </span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <span className="text-2xs font-semibold text-emerald-600 uppercase tracking-wider block">
              In Scope
            </span>
            <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
              {inScopeCount}
            </span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <span className="text-2xs font-semibold text-slate-500 uppercase tracking-wider block">
              Estimated Extra Cost
            </span>
            <span className="text-lg font-extrabold text-slate-900 mt-1 block">
              {costMinCents === costMaxCents
                ? formatCurrency(costMinCents, project.currency)
                : `${formatCurrency(costMinCents, project.currency)} – ${formatCurrency(costMaxCents, project.currency)}`}
            </span>
            <span className="text-2xs text-slate-400 block">
              {totalMinHours}h – {totalMaxHours}h labor
            </span>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {findings.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold gap-1">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1.5 rounded-md transition ${
                filter === "ALL"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({findings.length})
            </button>
            <button
              onClick={() => setFilter("POTENTIALLY_OUT_OF_SCOPE")}
              className={`px-3 py-1.5 rounded-md transition ${
                filter === "POTENTIALLY_OUT_OF_SCOPE"
                  ? "bg-white text-rose-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Out of Scope ({outOfScopeCount})
            </button>
            <button
              onClick={() => setFilter("AMBIGUOUS")}
              className={`px-3 py-1.5 rounded-md transition ${
                filter === "AMBIGUOUS"
                  ? "bg-white text-amber-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Ambiguous ({ambiguousCount})
            </button>
            <button
              onClick={() => setFilter("IN_SCOPE")}
              className={`px-3 py-1.5 rounded-md transition ${
                filter === "IN_SCOPE"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              In Scope ({inScopeCount})
            </button>
            <button
              onClick={() => setFilter("INSUFFICIENT_EVIDENCE")}
              className={`px-3 py-1.5 rounded-md transition ${
                filter === "INSUFFICIENT_EVIDENCE"
                  ? "bg-white text-slate-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Insufficient ({insufficientCount})
            </button>
          </div>

          <button
            onClick={onProceedToChangeOrder}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition"
          >
            <span>Proceed to Change Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Findings List */}
      {findings.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white border border-dashed border-slate-300 rounded-xl">
          <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">
            No Scope Findings Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Click &quot;Run Local Scope Audit&quot; to cross-reference the {chunks.length}{" "}
            ingested message chunks against your {clauses.length} baseline contract clauses.
          </p>
          <button
            onClick={runAudit}
            disabled={isRunningAudit || chunks.length === 0}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition disabled:opacity-50"
          >
            Run Local Audit
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFindings.map((finding) => {
            const isEditing = editingFindingId === finding.id;

            return (
              <div
                key={finding.id}
                className={`p-5 bg-white border rounded-xl shadow-2xs transition space-y-4 ${
                  finding.humanStatus === "ACCEPTED"
                    ? "border-emerald-500/60 ring-1 ring-emerald-500/20"
                    : finding.humanStatus === "DISMISSED"
                    ? "border-slate-200 opacity-60 bg-slate-50/50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {getClassificationBadge(finding.classification)}

                    {finding.isRequestQuoteVerified ? (
                      <span
                        className="inline-flex items-center gap-1 text-2xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200"
                        title="Quote verified verbatim against source chunk text"
                      >
                        <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Verified Citation
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-2xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200"
                        title="Quote could not be verified in raw evidence"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Unverified Quote
                      </span>
                    )}

                    <h3 className="text-sm font-bold text-slate-900">
                      {finding.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span
                      title={finding.estimateSource === "HUMAN" ? "Effort adjusted by a human reviewer" : "Model-generated effort estimate"}
                      className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md"
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {finding.estHoursMin === finding.estHoursMax
                        ? `${finding.estHoursMin}h`
                        : `${finding.estHoursMin}h – ${finding.estHoursMax}h`}
                      <span className="text-2xs text-slate-500">
                        {finding.estimateSource === "HUMAN" ? "reviewer" : "model"}
                      </span>
                    </span>
                    <span
                      title="Deterministic rate-times-hours estimate; not a final invoice total"
                      className="flex items-center gap-1 text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md font-bold"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      {formatCurrency(calculateItemCostCents(finding.estHoursMin, project.hourlyRateCents), project.currency)}
                      {finding.estHoursMin !== finding.estHoursMax && (
                        <> – {formatCurrency(calculateItemCostCents(finding.estHoursMax, project.hourlyRateCents), project.currency)}</>
                      )}
                    </span>
                  </div>
                </div>

                {/* Diff Comparison: Client Request vs Contract Clause */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Left: Client Communication Excerpt */}
                  <div className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-lg space-y-1">
                    <span className="text-2xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                      <Quote className="w-3 h-3" /> Cited Client Message Excerpt
                    </span>
                    <p className="font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                      &quot;{finding.citedRequestQuote}&quot;
                    </p>
                  </div>

                  {/* Right: Matched Contract Clause */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <span className="text-2xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                      <Quote className="w-3 h-3" /> Baseline Agreement Reference
                    </span>
                    <p className="font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {finding.citedClauseQuote
                        ? `"${finding.citedClauseQuote}"`
                        : "(No direct clause match — potential novel scope)"}
                    </p>
                  </div>
                </div>

                {/* Reasoning Analysis */}
                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                  <span className="font-bold text-slate-800 mr-1">
                    Technical Assessment:
                  </span>
                  {finding.reasoning}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold text-slate-800">
                      {finding.confidenceIndicator} confidence · qualitative
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{finding.confidenceExplanation}</p>
                  </div>
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
                    <p className="text-xs font-semibold text-indigo-900">Suggested human next step</p>
                    <p className="mt-1 text-xs leading-5 text-slate-700">
                      {finding.nextAction || "Review the cited source and confirm the request with the client."}
                    </p>
                  </div>
                </div>
                {finding.supportingEvidenceIds.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold text-slate-800">Supporting evidence</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {finding.supportingEvidenceIds.map((evidenceId) => (
                        <span key={evidenceId} className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 font-mono text-2xs text-indigo-900">
                          {evidenceId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {finding.contradictingEvidenceIds.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                    <p className="text-xs font-semibold text-amber-900">Contradicting evidence</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {finding.contradictingEvidenceIds.map((evidenceId) => (
                        <span key={evidenceId} className="rounded-md border border-amber-200 bg-white px-2 py-1 font-mono text-2xs text-amber-900">
                          {evidenceId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {finding.missingInformation.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-stone-50 p-3">
                    <p className="text-xs font-semibold text-slate-800">What remains unknown</p>
                    <ul className="mt-1 list-disc pl-5 text-xs leading-5 text-slate-600">
                      {finding.missingInformation.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
                    </ul>
                  </div>
                )}

                {/* Edit Form if user is overriding hours or category */}
                {isEditing && (
                  <div className="p-4 bg-slate-100 rounded-lg space-y-3 text-xs">
                    <h4 className="font-bold text-slate-800">
                      Adjust Classification &amp; Hours
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-2xs font-semibold text-slate-600 mb-1">
                          Classification
                        </label>
                        <select
                          value={editClassification}
                          onChange={(e) =>
                            setEditClassification(
                              e.target.value as ScopeClassification
                            )
                          }
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-xs"
                        >
                          <option value="POTENTIALLY_OUT_OF_SCOPE">
                            Out of Scope
                          </option>
                          <option value="AMBIGUOUS">Ambiguous</option>
                          <option value="IN_SCOPE">In Scope</option>
                          <option value="INSUFFICIENT_EVIDENCE">
                            Insufficient Evidence
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-2xs font-semibold text-slate-600 mb-1">
                          Min Hours
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={editHoursMin}
                          onChange={(e) => setEditHoursMin(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-2xs font-semibold text-slate-600 mb-1">
                          Max Hours
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={editHoursMax}
                          onChange={(e) => setEditHoursMax(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-2xs font-semibold text-slate-600 mb-1">
                        Reviewer Notes
                      </label>
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Reason for adjustment..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-xs"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditingFindingId(null)}
                        className="px-3 py-1 bg-white border border-slate-300 rounded-md text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateDecision(finding.id, {
                            humanStatus: "MODIFIED",
                            classification: editClassification,
                            estHoursMin: parseFloat(editHoursMin || "0"),
                            estHoursMax: parseFloat(editHoursMax || "0"),
                            humanNotes: editNotes,
                          })
                        }
                        className="px-3 py-1 bg-emerald-600 text-white rounded-md font-semibold"
                      >
                        Save Adjustments
                      </button>
                    </div>
                  </div>
                )}

                {/* Human Review Decision Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    {finding.humanStatus === "ACCEPTED" ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Approved for Change Order
                      </span>
                    ) : finding.humanStatus === "DISMISSED" ? (
                      <span className="text-slate-500 font-medium">
                        Dismissed as Courtesy / In-Scope
                      </span>
                    ) : (
                      <span className="text-slate-400">Pending Review</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditing(finding)}
                      className="px-2.5 py-1 text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-md flex items-center gap-1 transition"
                    >
                      <Edit2 className="w-3 h-3" /> Adjust
                    </button>

                    <button
                      onClick={() =>
                        handleUpdateDecision(finding.id, {
                          humanStatus: "DISMISSED",
                        })
                      }
                      disabled={updatingFindingId === finding.id}
                      className="px-2.5 py-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() =>
                        handleUpdateDecision(finding.id, {
                          humanStatus: "MODIFIED",
                          classification: "AMBIGUOUS",
                        })
                      }
                      disabled={updatingFindingId === finding.id}
                      className="px-2.5 py-1 text-amber-800 hover:bg-amber-50 rounded-md transition disabled:opacity-50"
                    >
                      Mark ambiguous
                    </button>

                    <button
                      onClick={() =>
                        handleUpdateDecision(finding.id, {
                          humanStatus: "ACCEPTED",
                        })
                      }
                      disabled={updatingFindingId === finding.id}
                      className="px-3 py-1 text-white bg-indigo-700 hover:bg-indigo-800 font-semibold rounded-md shadow-2xs transition flex items-center gap-1 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" /> Accept in Change Order
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
