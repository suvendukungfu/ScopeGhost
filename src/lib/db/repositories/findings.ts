import { DatabaseSync } from "node:sqlite";
import {
  AnalysisRun,
  ScopeFinding,
  ChangeOrder,
  ScopeClassification,
  HumanDecision,
  AnalysisRunStatus,
  ChangeOrderStatus,
} from "@/lib/types";
import crypto from "node:crypto";

export interface CreateAnalysisRunInput {
  projectId: string;
  modelName: string;
}

export interface CreateScopeFindingInput {
  runId: string;
  projectId: string;
  evidenceChunkId: string;
  matchedClauseId?: string | null;
  classification: ScopeClassification;
  title: string;
  reasoning: string;
  citedRequestQuote: string;
  citedClauseQuote?: string | null;
  isRequestQuoteVerified: boolean;
  isClauseQuoteVerified: boolean;
  confidenceScore: number;
  estHoursMin: number;
  estHoursMax: number;
}

export interface CreateChangeOrderInput {
  projectId: string;
  orderNumber: number;
  title: string;
  selectedFindingIds: string[];
  totalHoursMin: number;
  totalHoursMax: number;
  totalCostMinCents: number;
  totalCostMaxCents: number;
  generatedMarkdown: string;
  humanDisclaimer: string;
}

interface FindingRow {
  id: string;
  run_id: string;
  project_id: string;
  evidence_chunk_id: string;
  matched_clause_id: string | null;
  classification: ScopeClassification;
  title: string;
  reasoning: string;
  cited_request_quote: string;
  cited_clause_quote: string | null;
  is_request_quote_verified: number;
  is_clause_quote_verified: number;
  confidence_score: number;
  est_hours_min: number;
  est_hours_max: number;
  human_status: HumanDecision;
  human_notes: string | null;
  created_at: string;
}

interface ChangeOrderRow {
  id: string;
  project_id: string;
  order_number: number;
  title: string;
  status: ChangeOrderStatus;
  selected_findings_json: string;
  total_hours_min: number;
  total_hours_max: number;
  total_cost_min_cents: number;
  total_cost_max_cents: number;
  generated_markdown: string;
  human_disclaimer: string;
  created_at: string;
  updated_at: string;
}

function mapRowToFinding(row: FindingRow): ScopeFinding {
  return {
    id: row.id,
    runId: row.run_id,
    projectId: row.project_id,
    evidenceChunkId: row.evidence_chunk_id,
    matchedClauseId: row.matched_clause_id,
    classification: row.classification,
    title: row.title,
    reasoning: row.reasoning,
    citedRequestQuote: row.cited_request_quote,
    citedClauseQuote: row.cited_clause_quote,
    isRequestQuoteVerified: row.is_request_quote_verified === 1,
    isClauseQuoteVerified: row.is_clause_quote_verified === 1,
    confidenceScore: row.confidence_score,
    estHoursMin: row.est_hours_min,
    estHoursMax: row.est_hours_max,
    humanStatus: row.human_status,
    humanNotes: row.human_notes,
    createdAt: row.created_at,
  };
}

function mapRowToChangeOrder(row: ChangeOrderRow): ChangeOrder {
  return {
    id: row.id,
    projectId: row.project_id,
    orderNumber: row.order_number,
    title: row.title,
    status: row.status,
    selectedFindingIds: JSON.parse(row.selected_findings_json || "[]"),
    totalHoursMin: row.total_hours_min,
    totalHoursMax: row.total_hours_max,
    totalCostMinCents: row.total_cost_min_cents,
    totalCostMaxCents: row.total_cost_max_cents,
    generatedMarkdown: row.generated_markdown,
    humanDisclaimer: row.human_disclaimer,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class FindingsRepository {
  constructor(private db: DatabaseSync) {}

  createRun(input: CreateAnalysisRunInput): AnalysisRun {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO analysis_runs (
        id, project_id, model_name, status, started_at
      ) VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, input.projectId, input.modelName, "RUNNING", now);

    return {
      id,
      projectId: input.projectId,
      modelName: input.modelName,
      status: "RUNNING",
      startedAt: now,
    };
  }

  updateRunStatus(
    runId: string,
    status: AnalysisRunStatus,
    errorMessage?: string
  ): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE analysis_runs SET
        status = ?,
        error_message = ?,
        completed_at = ?
      WHERE id = ?
    `);
    stmt.run(status, errorMessage ?? null, now, runId);
  }

  createFindings(inputs: CreateScopeFindingInput[]): ScopeFinding[] {
    const stmt = this.db.prepare(`
      INSERT INTO scope_findings (
        id, run_id, project_id, evidence_chunk_id, matched_clause_id,
        classification, title, reasoning, cited_request_quote, cited_clause_quote,
        is_request_quote_verified, is_clause_quote_verified, confidence_score,
        est_hours_min, est_hours_max, human_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const results: ScopeFinding[] = [];
    const now = new Date().toISOString();

    for (const input of inputs) {
      const id = crypto.randomUUID();
      stmt.run(
        id,
        input.runId,
        input.projectId,
        input.evidenceChunkId,
        input.matchedClauseId ?? null,
        input.classification,
        input.title,
        input.reasoning,
        input.citedRequestQuote,
        input.citedClauseQuote ?? null,
        input.isRequestQuoteVerified ? 1 : 0,
        input.isClauseQuoteVerified ? 1 : 0,
        input.confidenceScore,
        input.estHoursMin,
        input.estHoursMax,
        "PENDING",
        now
      );

      results.push({
        id,
        runId: input.runId,
        projectId: input.projectId,
        evidenceChunkId: input.evidenceChunkId,
        matchedClauseId: input.matchedClauseId ?? null,
        classification: input.classification,
        title: input.title,
        reasoning: input.reasoning,
        citedRequestQuote: input.citedRequestQuote,
        citedClauseQuote: input.citedClauseQuote ?? null,
        isRequestQuoteVerified: input.isRequestQuoteVerified,
        isClauseQuoteVerified: input.isClauseQuoteVerified,
        confidenceScore: input.confidenceScore,
        estHoursMin: input.estHoursMin,
        estHoursMax: input.estHoursMax,
        humanStatus: "PENDING",
        humanNotes: null,
        createdAt: now,
      });
    }

    return results;
  }

  findFindingsByProjectId(projectId: string): ScopeFinding[] {
    const stmt = this.db.prepare(
      "SELECT * FROM scope_findings WHERE project_id = ? ORDER BY created_at DESC"
    );
    const rows = stmt.all(projectId) as unknown as FindingRow[];
    return rows.map(mapRowToFinding);
  }

  updateFindingDecision(
    id: string,
    decision: {
      humanStatus: HumanDecision;
      humanNotes?: string | null;
      classification?: ScopeClassification;
      estHoursMin?: number;
      estHoursMax?: number;
    }
  ): ScopeFinding | null {
    const getStmt = this.db.prepare("SELECT * FROM scope_findings WHERE id = ?");
    const existing = getStmt.get(id) as unknown as FindingRow | undefined;
    if (!existing) return null;

    const newClassification = decision.classification ?? existing.classification;
    const newHoursMin = decision.estHoursMin ?? existing.est_hours_min;
    const newHoursMax = decision.estHoursMax ?? existing.est_hours_max;
    const newNotes = decision.humanNotes !== undefined ? decision.humanNotes : existing.human_notes;

    const stmt = this.db.prepare(`
      UPDATE scope_findings SET
        human_status = ?,
        human_notes = ?,
        classification = ?,
        est_hours_min = ?,
        est_hours_max = ?
      WHERE id = ?
    `);

    stmt.run(
      decision.humanStatus,
      newNotes,
      newClassification,
      newHoursMin,
      newHoursMax,
      id
    );

    const updatedRow = getStmt.get(id) as unknown as FindingRow;
    return mapRowToFinding(updatedRow);
  }

  createChangeOrder(input: CreateChangeOrderInput): ChangeOrder {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO change_orders (
        id, project_id, order_number, title, status,
        selected_findings_json, total_hours_min, total_hours_max,
        total_cost_min_cents, total_cost_max_cents, generated_markdown,
        human_disclaimer, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.projectId,
      input.orderNumber,
      input.title,
      "DRAFT",
      JSON.stringify(input.selectedFindingIds),
      input.totalHoursMin,
      input.totalHoursMax,
      input.totalCostMinCents,
      input.totalCostMaxCents,
      input.generatedMarkdown,
      input.humanDisclaimer,
      now,
      now
    );

    return {
      id,
      projectId: input.projectId,
      orderNumber: input.orderNumber,
      title: input.title,
      status: "DRAFT",
      selectedFindingIds: input.selectedFindingIds,
      totalHoursMin: input.totalHoursMin,
      totalHoursMax: input.totalHoursMax,
      totalCostMinCents: input.totalCostMinCents,
      totalCostMaxCents: input.totalCostMaxCents,
      generatedMarkdown: input.generatedMarkdown,
      humanDisclaimer: input.humanDisclaimer,
      createdAt: now,
      updatedAt: now,
    };
  }

  findChangeOrdersByProjectId(projectId: string): ChangeOrder[] {
    const stmt = this.db.prepare(
      "SELECT * FROM change_orders WHERE project_id = ? ORDER BY order_number DESC"
    );
    const rows = stmt.all(projectId) as unknown as ChangeOrderRow[];
    return rows.map(mapRowToChangeOrder);
  }
}
