export type ClauseType =
  | "DELIVERABLE"
  | "EXCLUSION"
  | "ASSUMPTION"
  | "REVISION_LIMIT";

export type FileType = "TXT" | "MARKDOWN" | "CSV";

export type ScopeClassification =
  | "IN_SCOPE"
  | "POTENTIALLY_OUT_OF_SCOPE"
  | "AMBIGUOUS"
  | "INSUFFICIENT_EVIDENCE";

export type HumanDecision = "PENDING" | "ACCEPTED" | "DISMISSED" | "MODIFIED";

export type AnalysisRunStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export type ChangeOrderStatus = "DRAFT" | "APPROVED" | "CANCELLED";

export interface Project {
  id: string;
  name: string;
  clientName: string;
  currency: string;
  hourlyRateCents: number;
  originalBudgetCents: number;
  revisionLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDashboardItem extends Project {
  pendingReviewCount: number;
  evidenceCount: number;
  status: "SETUP" | "ACTIVE" | "NEEDS_REVIEW";
}

export type ScopeItem = BaselineClause;

export interface BaselineClause {
  id: string;
  projectId: string;
  clauseType: ClauseType;
  title: string;
  content: string;
  sectionRef?: string | null;
  createdAt: string;
}

export interface EvidenceSource {
  id: string;
  stableId: string;
  projectId: string;
  filename: string;
  fileType: FileType;
  rawContent: string;
  sourceHash: string;
  metadataJson: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type SourceDocument = EvidenceSource;

export interface EvidenceChunk {
  id: string;
  sourceId: string;
  projectId: string;
  chunkIndex: number;
  stableId: string; // e.g. "SRC-01#C02"
  textContent: string;
  author?: string | null;
  timestampStr?: string | null;
  metadata: Record<string, string>;
}

export type SourceExcerpt = EvidenceChunk;

export interface ClientRequest {
  id: string;
  projectId: string;
  sourceExcerptId: string;
  requestText: string;
  createdAt: string;
}

export interface Estimate {
  hoursMin: number;
  hoursMax: number;
  source: "MODEL" | "HUMAN";
  confidence: "LOW" | "MEDIUM" | "HIGH";
}

export interface AnalysisRun {
  id: string;
  projectId: string;
  modelName: string;
  status: AnalysisRunStatus;
  errorMessage?: string | null;
  startedAt: string;
  completedAt?: string | null;
}

export interface ScopeFinding {
  id: string;
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
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  missingInformation: string[];
  confidenceIndicator: "LOW" | "MEDIUM" | "HIGH";
  confidenceExplanation: string;
  nextAction: string;
  estimateSource: "MODEL" | "HUMAN";
  humanStatus: HumanDecision;
  humanNotes?: string | null;
  createdAt: string;
}

export interface Finding extends ScopeFinding {
  nextAction: string;
  estimate: Estimate | null;
}

export interface ChangeOrder {
  id: string;
  projectId: string;
  orderNumber: number;
  title: string;
  status: ChangeOrderStatus;
  selectedFindingIds: string[];
  totalHoursMin: number;
  totalHoursMax: number;
  totalCostMinCents: number;
  totalCostMaxCents: number;
  generatedMarkdown: string;
  humanDisclaimer: string;
  createdAt: string;
  updatedAt: string;
}

export type ChangeOrderDraft = ChangeOrder;

export interface AuditEvent {
  id: string;
  projectId: string;
  eventType:
    | "SOURCE_IMPORTED"
    | "ANALYSIS_COMPLETED"
    | "FINDING_REVIEWED"
    | "CHANGE_ORDER_DRAFTED"
    | "CHANGE_ORDER_UPDATED"
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}
