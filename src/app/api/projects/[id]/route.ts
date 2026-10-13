import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/connection";
import { ProjectRepository } from "@/lib/db/repositories/projects";
import { BaselineClauseRepository } from "@/lib/db/repositories/clauses";
import { EvidenceRepository } from "@/lib/db/repositories/evidence";
import { FindingsRepository } from "@/lib/db/repositories/findings";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const projectRepo = new ProjectRepository(db);
    const clauseRepo = new BaselineClauseRepository(db);
    const evidenceRepo = new EvidenceRepository(db);
    const findingsRepo = new FindingsRepository(db);

    const project = projectRepo.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const clauses = clauseRepo.findByProjectId(id);
    const sources = evidenceRepo.findSourcesByProjectId(id);
    const chunks = evidenceRepo.findChunksByProjectId(id);
    const findings = findingsRepo.findFindingsByProjectId(id);
    const changeOrders = findingsRepo.findChangeOrdersByProjectId(id);

    return NextResponse.json({
      project,
      clauses,
      sources,
      chunks,
      findings,
      changeOrders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const projectRepo = new ProjectRepository(db);

    const project = projectRepo.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    projectRepo.delete(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
