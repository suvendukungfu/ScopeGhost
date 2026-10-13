import React from "react";
import { getDb } from "@/lib/db/connection";
import { ProjectRepository } from "@/lib/db/repositories/projects";
import { Navbar } from "@/components/Navbar";
import { ProjectList } from "@/components/ProjectList";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const db = getDb();
  const repo = new ProjectRepository(db);
  const projects = repo.findAll();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProjectList initialProjects={projects} />
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>ScopeGhost &bull; Local-First Project Scope Auditor &bull; Open Source</p>
          <p className="text-slate-400">
            Inference processed strictly locally via Ollama. No data leaves your device.
          </p>
        </div>
      </footer>
    </div>
  );
}
