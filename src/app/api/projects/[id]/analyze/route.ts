import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/connection";
import { ScopeAnalysisOrchestrator } from "@/lib/analysis/orchestrator";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const db = getDb();
    const orchestrator = new ScopeAnalysisOrchestrator(db);

    const result = await orchestrator.runAnalysis(projectId);

    return NextResponse.json({
      success: true,
      runId: result.runId,
      findings: result.findings,
      durationMs: result.durationMs,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
