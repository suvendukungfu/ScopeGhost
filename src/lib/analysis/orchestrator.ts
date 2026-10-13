import { DatabaseSync } from "node:sqlite";
import { BaselineClauseRepository } from "@/lib/db/repositories/clauses";
import { EvidenceRepository } from "@/lib/db/repositories/evidence";
import { FindingsRepository, CreateScopeFindingInput } from "@/lib/db/repositories/findings";
import { ProjectRepository } from "@/lib/db/repositories/projects";
import { AuditEventRepository } from "@/lib/db/repositories/audit-events";
import { ScopeFinding } from "@/lib/types";
import { ScopeAnalysisService, ScopeAnalysisServiceError } from "./service";

export interface AnalysisOrchestratorResult {
  runId: string;
  findings: ScopeFinding[];
  durationMs: number;
}

export class ScopeAnalysisOrchestrator {
  constructor(
    private db: DatabaseSync,
    private analysisService = new ScopeAnalysisService()
  ) {}

  async runAnalysis(
    projectId: string,
    options: { signal?: AbortSignal } = {}
  ): Promise<AnalysisOrchestratorResult> {
    const startTime = Date.now();
    const projectRepo = new ProjectRepository(this.db);
    const clauseRepo = new BaselineClauseRepository(this.db);
    const evidenceRepo = new EvidenceRepository(this.db);
    const findingsRepo = new FindingsRepository(this.db);
    const auditRepo = new AuditEventRepository(this.db);

    const project = projectRepo.findById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const clauses = clauseRepo.findByProjectId(projectId);
    const chunks = evidenceRepo.findChunksByProjectId(projectId);
    if (chunks.length === 0) {
      throw new Error(
        "No evidence excerpts found for this project. Import client messages before running an audit."
      );
    }

    const run = findingsRepo.createRun({
      projectId,
      modelName: this.analysisService.getModelName(),
    });

    try {
      const originalScope = clauses
        .filter((clause) => clause.clauseType === "DELIVERABLE")
        .map((clause) => `${clause.title}: ${clause.content}`)
        .join("\n");
      const scopeItems = clauses.map((clause) => ({
        id: clause.id,
        kind: clause.clauseType,
        title: clause.title,
        content: clause.content,
      }));

      const findingInputs: CreateScopeFindingInput[] = [];
      for (const chunk of chunks) {
        if (options.signal?.aborted) {
          throw new Error("Analysis request was cancelled");
        }

        try {
          const result = await this.analysisService.analyze(
            {
              originalScope,
              scopeItems,
              clientRequest: {
                id: chunk.stableId,
                text: chunk.textContent,
              },
              evidenceExcerpts: [{
                evidenceId: chunk.stableId,
                text: chunk.textContent,
              }],
            },
            options
          );

          const confidenceScore =
            result.confidence === "HIGH" ? 0.9 : result.confidence === "MEDIUM" ? 0.65 : 0.35;
          const hours =
            result.classification === "POTENTIALLY_OUT_OF_SCOPE" ||
            result.classification === "AMBIGUOUS"
              ? result.estimate
              : null;
          const candidateCitation =
            result.supportingEvidence[0] ??
            result.contradictingEvidence[0];

          findingInputs.push({
            runId: run.id,
            projectId,
            evidenceChunkId: chunk.id,
            classification: result.classification,
            title: chunk.textContent.trim().slice(0, 147) || "Client request",
            reasoning: result.explanation,
            citedRequestQuote: candidateCitation?.quote ?? chunk.textContent,
            isRequestQuoteVerified: Boolean(candidateCitation),
            isClauseQuoteVerified: false,
            confidenceScore,
            estHoursMin: hours?.hoursMin ?? 0,
            estHoursMax: hours?.hoursMax ?? 0,
            supportingEvidenceIds: result.supportingEvidenceIds,
            contradictingEvidenceIds: result.contradictingEvidenceIds,
            missingInformation: result.missingInformation,
            confidenceIndicator: result.confidence,
            confidenceExplanation: result.confidenceExplanation,
            nextAction: result.nextAction,
            estimateSource: "MODEL",
          });
        } catch (err: unknown) {
          if (
            err instanceof ScopeAnalysisServiceError &&
            (err.category === "UNVERIFIED_CITATION" || err.category === "UNKNOWN_EVIDENCE")
          ) {
            findingInputs.push({
              runId: run.id,
              projectId,
              evidenceChunkId: chunk.id,
              classification: "INSUFFICIENT_EVIDENCE",
              title: chunk.textContent.trim().slice(0, 147) || "Client request",
              reasoning: `Model analysis produced an unverified citation or unsupported evidence reference: ${err.message}. Flagged for human review without accepting unverified claims.`,
              citedRequestQuote: chunk.textContent.slice(0, 300),
              isRequestQuoteVerified: false,
              isClauseQuoteVerified: false,
              confidenceScore: 0.2,
              estHoursMin: 0,
              estHoursMax: 0,
              supportingEvidenceIds: [],
              contradictingEvidenceIds: [],
              missingInformation: ["Verifiable citation in supplied evidence excerpt"],
              confidenceIndicator: "LOW",
              confidenceExplanation: "Model output failed evidence verification.",
              nextAction: "Review raw client message manually to verify scope.",
              estimateSource: "MODEL",
            });
            continue;
          }
          throw err;
        }
      }

      const createdFindings = findingsRepo.createFindings(findingInputs);
      findingsRepo.updateRunStatus(run.id, "COMPLETED");
      auditRepo.create({
        projectId,
        eventType: "ANALYSIS_COMPLETED",
        entityId: run.id,
        metadata: { findingCount: createdFindings.length, model: run.modelName },
      });

      return {
        runId: run.id,
        findings: createdFindings,
        durationMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      findingsRepo.updateRunStatus(run.id, "FAILED", message);
      throw err;
    }
  }
}
