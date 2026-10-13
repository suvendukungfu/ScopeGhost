"use client";

import React, { useState } from "react";
import { Project, ScopeFinding, ChangeOrder } from "@/lib/types";
import { formatCurrency, calculateChangeOrderTotals } from "@/lib/financial";
import {
  FileText,
  Plus,
  Copy,
  Check,
  Printer,
  Calendar,
  DollarSign,
  Clock,
  ShieldCheck,
  AlertCircle,
  X,
} from "lucide-react";

interface Props {
  project: Project;
  findings: ScopeFinding[];
  changeOrders: ChangeOrder[];
  onChangeOrderCreated: (newOrder: ChangeOrder) => void;
}

export function ChangeOrderManager({
  project,
  findings,
  changeOrders,
  onChangeOrderCreated,
}: Props) {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [title, setTitle] = useState("Additional Scope & Feature Adjustments");
  const [customNotes, setCustomNotes] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    findings
      .filter(
        (f) =>
          f.humanStatus === "ACCEPTED" ||
          f.classification === "POTENTIALLY_OUT_OF_SCOPE" ||
          f.classification === "AMBIGUOUS"
      )
      .map((f) => f.id)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<ChangeOrder | null>(
    changeOrders[0] || null
  );

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedFindings = findings.filter((f) => selectedIds.includes(f.id));
  const previewFinancials = calculateChangeOrderTotals(
    selectedFindings.map((f) => ({
      hoursMin: f.estHoursMin,
      hoursMax: f.estHoursMax,
    })),
    project.hourlyRateCents,
    project.currency
  );

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/change-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          selectedFindingIds: selectedIds,
          customNotes: customNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to draft change order");

      onChangeOrderCreated(data.changeOrder);
      setActiveOrder(data.changeOrder);
      setIsBuilderOpen(false);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Error creating change order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Change Orders &amp; Client Proposals
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic financial pricing based on verified scope findings. Prepared for human approval.
          </p>
        </div>

        <button
          onClick={() => setIsBuilderOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition"
        >
          <Plus className="w-4 h-4" /> Draft New Change Order
        </button>
      </div>

      {/* Builder Modal */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-base font-bold text-slate-900">
                Draft Change Order Proposal
              </h3>
              <button
                onClick={() => setIsBuilderOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Change Order Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Custom Context / Client Notes
                </label>
                <textarea
                  rows={2}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="e.g. As discussed during our call on Friday..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              {/* Select Findings */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Select Scope Items to Include ({selectedIds.length} selected)
                </label>

                {findings.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    No findings recorded yet. Run a scope audit first.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50">
                    {findings.map((f) => (
                      <label
                        key={f.id}
                        className="flex items-start gap-3 p-2 bg-white rounded-md border border-slate-200 hover:border-slate-300 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(f.id)}
                          onChange={() => toggleSelect(f.id)}
                          className="mt-1 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">
                              {f.title}
                            </span>
                            <span className="font-mono text-emerald-700 font-semibold">
                              {f.estHoursMin === f.estHoursMax
                                ? `${f.estHoursMin}h`
                                : `${f.estHoursMin}h – ${f.estHoursMax}h`}
                            </span>
                          </div>
                          <p className="text-2xs text-slate-500 truncate">
                            &quot;{f.citedRequestQuote}&quot;
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Live Deterministic Calculation Preview */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-2xs font-semibold text-emerald-800 uppercase tracking-wider block">
                    Deterministic Total Additional Cost
                  </span>
                  <span className="text-lg font-extrabold text-emerald-950 mt-0.5 block">
                    {previewFinancials.formattedCostRange}
                  </span>
                </div>
                <div className="text-right text-xs text-emerald-800">
                  <span className="block font-bold">
                    {previewFinancials.totalHoursMin}h – {previewFinancials.totalHoursMax}h
                  </span>
                  <span className="text-2xs text-emerald-700">
                    @ {formatCurrency(project.hourlyRateCents, project.currency)}/hr
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBuilderOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || selectedIds.length === 0}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Generating..." : "Generate Change Order Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Orders Display */}
      {changeOrders.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white border border-dashed border-slate-300 rounded-xl">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">
            No Change Orders Drafted Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Once you have reviewed the scope audit findings, package them into an itemized change order proposal for client approval.
          </p>
          <button
            onClick={() => setIsBuilderOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
          >
            Draft Change Order
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Order Selector */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Draft Documents ({changeOrders.length})
            </h3>
            <div className="space-y-2">
              {changeOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => setActiveOrder(order)}
                  className={`w-full text-left p-4 rounded-xl border transition flex flex-col justify-between ${
                    activeOrder?.id === order.id
                      ? "bg-white border-emerald-600 shadow-sm ring-1 ring-emerald-500/30"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-2xs font-bold font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                        CO #{order.orderNumber}
                      </span>
                      <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                        {order.status}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                      {order.title}
                    </h4>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500">
                    <span>
                      {order.totalHoursMin}h – {order.totalHoursMax}h
                    </span>
                    <span className="font-bold text-emerald-700 font-mono">
                      {formatCurrency(order.totalCostMinCents, project.currency)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Full Markdown View */}
          <div className="lg:col-span-2">
            {activeOrder && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                {/* Actions Bar */}
                <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      Change Order #{activeOrder.orderNumber}
                    </span>
                    <span className="text-2xs text-slate-500">
                      &bull; Prepared for {project.clientName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        copyToClipboard(
                          activeOrder.generatedMarkdown,
                          activeOrder.id
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition"
                    >
                      {copiedId === activeOrder.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied Markdown!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Markdown</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>
                  </div>
                </div>

                {/* Document Preview */}
                <div className="p-8 prose prose-slate max-w-none text-xs leading-relaxed font-mono whitespace-pre-wrap bg-slate-50/30">
                  {activeOrder.generatedMarkdown}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
