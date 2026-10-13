"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { AgreementManager } from "@/components/AgreementManager";
import { EvidenceUploader } from "@/components/EvidenceUploader";
import { ScopeAuditReview } from "@/components/ScopeAuditReview";
import { ChangeOrderManager } from "@/components/ChangeOrderManager";
import { ProjectSettings } from "@/components/ProjectSettings";
import {
  Project,
  BaselineClause,
  EvidenceSource,
  EvidenceChunk,
  ScopeFinding,
  ChangeOrder,
} from "@/lib/types";
import { formatCurrency } from "@/lib/financial";
import {
  FileText,
  MessageSquare,
  ShieldAlert,
  FileCheck,
  ChevronLeft,
  DollarSign,
  Clock,
  Sparkles,
} from "lucide-react";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [project, setProject] = useState<Project | null>(null);
  const [clauses, setClauses] = useState<BaselineClause[]>([]);
  const [sources, setSources] = useState<EvidenceSource[]>([]);
  const [chunks, setChunks] = useState<EvidenceChunk[]>([]);
  const [findings, setFindings] = useState<ScopeFinding[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    "AGREEMENT" | "EVIDENCE" | "AUDIT" | "CHANGE_ORDERS"
  >("AGREEMENT");

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) {
        throw new Error("Project not found");
      }
      const data = await res.json();
      setProject(data.project);
      setClauses(data.clauses || []);
      setSources(data.sources || []);
      setChunks(data.chunks || []);
      setFindings(data.findings || []);
      setChangeOrders(data.changeOrders || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8 text-slate-500 text-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping mr-2"></span>
          Loading project workspace...
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-4xl mx-auto p-8 text-center">
          <p className="text-rose-600 font-semibold mb-4">{error || "Project not found"}</p>
          <Link
            href="/"
            className="px-4 py-2 bg-indigo-700 text-white rounded-lg text-xs font-semibold"
          >
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const outOfScopeCount = findings.filter(
    (f) => f.classification === "POTENTIALLY_OUT_OF_SCOPE"
  ).length;
  const ambiguousCount = findings.filter(
    (f) => f.classification === "AMBIGUOUS"
  ).length;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="space-y-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition mb-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Projects
            </Link>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                {project.clientName}
              </span>
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-950">
                {project.name}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 font-semibold text-indigo-800">
                {sources.length > 0 ? "Active" : "Setup"}
              </span>
              <span className="text-slate-600">
                {findings.filter((finding) => finding.humanStatus === "PENDING").length} pending review
                {findings.filter((finding) => finding.humanStatus === "PENDING").length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs text-xs">
            <div className="px-3 border-r border-slate-100">
              <span className="text-2xs text-slate-400 block font-medium">BILLING RATE</span>
              <span className="font-bold text-slate-800">
                {formatCurrency(project.hourlyRateCents, project.currency)}/hr
              </span>
            </div>
            <div className="px-3 border-r border-slate-100">
              <span className="text-2xs text-slate-400 block font-medium">REVISION LIMIT</span>
              <span className="font-bold text-slate-800">
                {project.revisionLimit} rounds
              </span>
            </div>
            <div className="px-3">
              <span className="text-2xs text-slate-400 block font-medium">ORIGINAL BUDGET</span>
              <span className="font-bold text-slate-800">
                {formatCurrency(project.originalBudgetCents, project.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab("AGREEMENT")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition ${
              activeTab === "AGREEMENT"
                ? "border-emerald-600 text-emerald-800 bg-white rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>1. Scope editor</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-2xs bg-slate-100 text-slate-600">
              {clauses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("EVIDENCE")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition ${
              activeTab === "EVIDENCE"
                ? "border-emerald-600 text-emerald-800 bg-white rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>2. Evidence library</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-2xs bg-slate-100 text-slate-600">
              {chunks.length} chunks
            </span>
          </button>

          <button
            onClick={() => setActiveTab("AUDIT")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition ${
              activeTab === "AUDIT"
                ? "border-emerald-600 text-emerald-800 bg-white rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>3. Request analysis &amp; review</span>
            {outOfScopeCount + ambiguousCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-2xs bg-rose-100 text-rose-700 font-bold">
                {outOfScopeCount + ambiguousCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("CHANGE_ORDERS")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition ${
              activeTab === "CHANGE_ORDERS"
                ? "border-emerald-600 text-emerald-800 bg-white rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileCheck className="w-4 h-4 text-emerald-600" />
            <span>4. Change Orders</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-2xs bg-slate-100 text-slate-600">
              {changeOrders.length}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="pt-2">
          {activeTab === "AGREEMENT" && (
            <>
            <AgreementManager
              projectId={project.id}
              clauses={clauses}
              onClauseAdded={(newClause) => setClauses([...clauses, newClause])}
              onClauseDeleted={(clauseId) =>
                setClauses(clauses.filter((c) => c.id !== clauseId))
              }
            />
            <ProjectSettings
              project={project}
              onUpdated={setProject}
            />
            </>
          )}

          {activeTab === "EVIDENCE" && (
            <EvidenceUploader
              projectId={project.id}
              sources={sources}
              chunks={chunks}
              onEvidenceUploaded={(newSource, newChunks) => {
                setSources([...sources, newSource]);
                setChunks([...chunks, ...newChunks]);
              }}
            />
          )}

          {activeTab === "AUDIT" && (
            <ScopeAuditReview
              project={project}
              clauses={clauses}
              chunks={chunks}
              findings={findings}
              onFindingsUpdated={(updated) => setFindings(updated)}
              onProceedToChangeOrder={() => setActiveTab("CHANGE_ORDERS")}
            />
          )}

          {activeTab === "CHANGE_ORDERS" && (
            <ChangeOrderManager
              project={project}
              findings={findings}
              changeOrders={changeOrders}
              onChangeOrderCreated={(newOrder) =>
                setChangeOrders((orders) => [newOrder, ...orders])
              }
              onChangeOrderUpdated={(updatedOrder) =>
                setChangeOrders((orders) => orders.map((order) => order.id === updatedOrder.id ? updatedOrder : order))
              }
            />
          )}
        </div>
      </main>
    </div>
  );
}
