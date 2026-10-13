"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Project } from "@/lib/types";
import { formatCurrency } from "@/lib/financial";
import { ProjectFormModal } from "./ProjectFormModal";
import { Plus, ArrowRight, FolderKanban, Sparkles, Trash2, Clock, DollarSign } from "lucide-react";

interface Props {
  initialProjects: Project[];
}

export function ProjectList({ initialProjects }: Props) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);

  const handleCreated = (newProject: Project) => {
    setProjects([newProject, ...projects]);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this project and all its audit records?")) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProjects(projects.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete project", err);
    }
  };

  const handleLoadDemo = async () => {
    setIsSeedingDemo(true);
    try {
      const res = await fetch("/api/demo/seed", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.project) {
        setProjects([data.project, ...projects.filter((p) => p.id !== data.project.id)]);
      }
    } catch (err) {
      console.error("Failed to seed demo project", err);
    } finally {
      setIsSeedingDemo(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Active Projects
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Compare agreements against client communications with verifiable citations.
          </p>
        </div>

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
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group p-5 bg-white border border-slate-200 rounded-xl hover:border-emerald-500/50 hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-2xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {project.clientName}
                    </span>
                    <h2 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition mt-1.5">
                      {project.name}
                    </h2>
                  </div>

                  <button
                    onClick={(e) => handleDelete(project.id, e)}
                    title="Delete Project"
                    className="text-slate-300 hover:text-rose-600 p-1 rounded-md transition opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600 group-hover:text-emerald-700">
                <span>View Scope Audit &rarr;</span>
                <span className="text-slate-400 font-normal text-2xs">
                  Budget: {formatCurrency(project.originalBudgetCents, project.currency)}
                </span>
              </div>
            </Link>
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
