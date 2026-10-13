import { DatabaseSync } from "node:sqlite";
import { BaselineClauseRepository } from "@/lib/db/repositories/clauses";
import { EvidenceRepository } from "@/lib/db/repositories/evidence";
import { FindingsRepository, CreateScopeFindingInput } from "@/lib/db/repositories/findings";
import { OllamaClient } from "@/lib/ollama/client";
import { buildScopeAnalysisPrompt, SCOPE_ANALYSIS_SYSTEM_PROMPT } from "./prompts";
import { extractAndValidateLlmOutput } from "./parser";
import { verifyCitation } from "@/lib/verification/citation";
import { ScopeFinding } from "@/lib/types";

export interface AnalysisOrchestratorResult {
  runId: string;
  findings: ScopeFinding[];
  durationMs: number;
}

export class ScopeAnalysisOrchestrator {
  constructor(
    private db: DatabaseSync,
    private ollamaClient = new OllamaClient()
  ) {}

  async runAnalysis(projectId: string): Promise<AnalysisOrchestratorResult> {
    const startTime = Date.now();
    const clauseRepo = new BaselineClauseRepository(this.db);
    const evidenceRepo = new EvidenceRepository(this.db);
    const findingsRepo = new FindingsRepository(this.db);

    const clauses = clauseRepo.findByProjectId(projectId);
    const chunks = evidenceRepo.findChunksByProjectId(projectId);

    if (chunks.length === 0) {
      throw new Error(
        "No evidence chunks found for this project. Please import client messages or emails before running an audit."
      );
    }

    // 1. Create Analysis Run record
    const run = findingsRepo.createRun({
      projectId,
      modelName: this.ollamaClient.getModel(),
    });

    try {
      // 2. Build prompt with structural boundaries and anti-injection instructions
      const prompt = buildScopeAnalysisPrompt(clauses, chunks);

      // 3. Query local Ollama instance
      const rawResponse = await this.ollamaClient.generateCompletion(
        prompt,
        SCOPE_ANALYSIS_SYSTEM_PROMPT
      );

      // 4. Extract and validate structured JSON
      const parsedOutput = extractAndValidateLlmOutput(rawResponse);

      // 5. Run programmatic Citation Verification Engine on every finding
      const chunkMap = new Map(chunks.map((c) => [c.stableId, c]));
      const clauseMap = new Map(
        clauses.map((cl) => [(cl.sectionRef || cl.title).toLowerCase(), cl])
      );

      const findingInputs: CreateScopeFindingInput[] = [];

      for (const item of parsedOutput.findings) {
        // Resolve referenced chunk
        const chunk = chunkMap.get(item.chunkStableId) || chunks[0];

        // Verify request citation against raw chunk text
        const reqVerification = verifyCitation(item.requestQuote, chunk.textContent);

        // Find matched clause and verify clause quote if present
        let matchedClauseId: string | null = null;
        let isClauseVerified = false;

        if (item.matchedClauseSection) {
          const searchKey = item.matchedClauseSection.toLowerCase();
          for (const [key, cl] of clauseMap.entries()) {
            if (key.includes(searchKey) || searchKey.includes(key)) {
              matchedClauseId = cl.id;
              if (item.clauseQuote) {
                const clauseVer = verifyCitation(item.clauseQuote, cl.content);
                isClauseVerified = clauseVer.isVerified;
              }
              break;
            }
          }
        }

        // If request quote is unverified, downgrade classification if it claimed to be out-of-scope without evidence
        let finalClassification = item.classification;
        if (!reqVerification.isVerified) {
          finalClassification = "INSUFFICIENT_EVIDENCE";
        }

        findingInputs.push({
          runId: run.id,
          projectId,
          evidenceChunkId: chunk.id,
          matchedClauseId,
          classification: finalClassification,
          title: item.title,
          reasoning: item.reasoning,
          citedRequestQuote: item.requestQuote,
          citedClauseQuote: item.clauseQuote ?? null,
          isRequestQuoteVerified: reqVerification.isVerified,
          isClauseQuoteVerified: isClauseVerified,
          confidenceScore: reqVerification.isVerified
            ? item.confidenceScore
            : Math.min(item.confidenceScore, 0.4),
          estHoursMin: item.estHoursMin,
          estHoursMax: item.estHoursMax,
        });
      }

      // 6. Persist findings to database
      const createdFindings = findingsRepo.createFindings(findingInputs);
      findingsRepo.updateRunStatus(run.id, "COMPLETED");

      const durationMs = Date.now() - startTime;
      return {
        runId: run.id,
        findings: createdFindings,
        durationMs,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      findingsRepo.updateRunStatus(run.id, "FAILED", message);
      throw err;
    }
  }
}
