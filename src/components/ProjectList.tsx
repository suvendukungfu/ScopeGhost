"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Project, ProjectDashboardItem } from "@/lib/types";
import { formatCurrency } from "@/lib/financial";
import { ProjectFormModal } from "./ProjectFormModal";
import { Plus, ArrowRight, FolderKanban, Sparkles, Trash2, Clock, DollarSign } from "lucide-react";

interface Props {
  initialProjects: ProjectDashboardItem[];
}

export function ProjectList({ initialProjects }: Props) {
  const [projects, setProjects] = useState<ProjectDashboardItem[]>(initialProjects);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreated = (newProject: Project) => {
    setProjects([{
      ...newProject,
      pendingReviewCount: 0,
      evidenceCount: 0,
      status: "SETUP",
    }, ...projects]);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this project and all its audit records?")) {
      return;
    }

    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProjects(projects.filter((p) => p.id !== id));
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete project");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setDeletingId(null);
    }
  };

  const handleLoadDemo = async () => {
    setIsSeedingDemo(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.project) {
        throw new Error(data.error || "Failed to load the synthetic demo");
      }
      setProjects([{
        ...data.project,
        pendingReviewCount: 0,
        evidenceCount: 1,
        status: "ACTIVE",
      }, ...projects.filter((p) => p.id !== data.project.id)]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load the synthetic demo");
    } finally {
      setIsSeedingDemo(false);
    }
  };
  const totalPendingReviews = projects.reduce(
    (total, project) => total + project.pendingReviewCount,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-slate-950">
            Project portfolio
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Compare agreements against client communications with verifiable citations.
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </p>
        )}

        {projects.length > 0 && (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <dt className="text-xs font-medium text-slate-500">Projects in workspace</dt>
              <dd className="mt-1 text-xl font-semibold text-slate-900">{projects.length}</dd>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <dt className="text-xs font-medium text-slate-500">Projects with imported evidence</dt>
              <dd className="mt-1 text-xl font-semibold text-slate-900">{projects.filter((project) => project.evidenceCount > 0).length}</dd>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <dt className="text-xs font-medium text-slate-500">Pending human review</dt>
              <dd className="mt-1 text-xl font-semibold text-slate-900">{totalPendingReviews}</dd>
            </div>
          </dl>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleLoadDemo}
            disabled={isSeedingDemo}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            {isSeedingDemo ? "Loading Demo..." : "Load Synthetic Demo"}
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white border border-dashed border-slate-300 rounded-2xl">
          <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900">No Projects Found</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
            Get started by creating a new project or loading the synthetic demonstration project preloaded with realistic agreement clauses and client emails.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleLoadDemo}
              disabled={isSeedingDemo}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Load Synthetic Demo
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs"
            >
              <Plus className="w-4 h-4" /> Create New Project
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <article
              key={project.id}
              className="group p-5 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-2xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                      {project.clientName}
                    </span>
                    <h2 className="text-base font-bold text-slate-900 group-hover:text-indigo-700 transition mt-1.5">
                      <Link href={`/projects/${project.id}`} aria-label={`Open ${project.name}`}>
                        {project.name}
                      </Link>
                    </h2>
                  </div>

                  <button
                    onClick={(e) => handleDelete(project.id, e)}
                    title="Delete Project"
                    aria-label={`Delete ${project.name}`}
                    disabled={deletingId === project.id}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition disabled:opacity-50"
                  >
                    {deletingId === project.id ? "Deleting…" : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-2xs font-semibold ${
                    project.status === "NEEDS_REVIEW"
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : project.status === "ACTIVE"
                        ? "bg-indigo-50 text-indigo-800 border border-indigo-200"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                  }`}>
                    {project.status === "NEEDS_REVIEW"
                      ? "Needs review"
                      : project.status === "ACTIVE"
                        ? "Active"
                        : "Setup"}
                  </span>
                  <span className="text-2xs text-slate-500">
                    {project.pendingReviewCount} pending review{project.pendingReviewCount === 1 ? "" : "s"}
                  </span>
                  {project.id === "demo-aerotech-portal" && (
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-2xs font-semibold text-sky-800">
                      Synthetic demo
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    <span>Rate: {formatCurrency(project.hourlyRateCents, project.currency)}/hr</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Limit: {project.revisionLimit} rev.</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <Link
                  href={`/projects/${project.id}`}
                  className="font-semibold text-indigo-700 hover:text-indigo-900 focus-visible:outline-2 focus-visible:outline-indigo-600 rounded"
                >
                  View Scope Audit <span aria-hidden="true">&rarr;</span>
                </Link>
                <span className="text-slate-400 font-normal text-2xs">
                  Budget: {formatCurrency(project.originalBudgetCents, project.currency)}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      <ProjectFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
