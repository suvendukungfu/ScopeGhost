import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/connection";
import { ScopeAnalysisOrchestrator } from "@/lib/analysis/orchestrator";
import { ScopeAnalysisServiceError } from "@/lib/analysis/service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const db = getDb();
    const orchestrator = new ScopeAnalysisOrchestrator(db);

    const result = await orchestrator.runAnalysis(projectId, { signal: req.signal });

    return NextResponse.json({
      success: true,
      runId: result.runId,
      findings: result.findings,
      durationMs: result.durationMs,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = err instanceof ScopeAnalysisServiceError
      ? err.category === "MODEL_UNAVAILABLE"
        ? 503
        : err.category === "TIMEOUT"
          ? 504
          : err.category === "CANCELLED"
            ? 499
            : 422
      : message === "Project not found"
        ? 404
        : message.includes("No evidence")
          ? 400
          : 500;
    return NextResponse.json({
      error: message,
      category: err instanceof ScopeAnalysisServiceError ? err.category : undefined,
    }, { status });
  }
}
