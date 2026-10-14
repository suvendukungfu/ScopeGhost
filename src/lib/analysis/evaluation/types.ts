import { ScopeClassification } from "@/lib/types";

export interface EvaluationCase {
  id: string;
  name: string;
  category:
    | "IN_SCOPE"
    | "EXCLUSION_AND_LIMIT"
    | "AMBIGUOUS_AND_INSUFFICIENT"
    | "TOPIC_MISMATCH"
    | "CONTRADICTION"
    | "ADVERSARIAL_INJECTION";
  chunkId: string;
  requestText: string;
  expectedClassification: ScopeClassification;
  acceptableClassifications: ScopeClassification[];
  forbiddenClassifications?: ScopeClassification[];
  matchedClauseId?: string | null;
  expectedClauseQuote?: string | null;
  isAdversarial?: boolean;
  hasTopicMismatch?: boolean;
  hasContradiction?: boolean;
  isFabricatedCitation?: boolean;
}

export interface ModelPredictionFinding {
  chunkStableId: string;
  requestQuote: string;
  matchedClauseSection?: string | null;
  clauseQuote?: string | null;
  classification: ScopeClassification;
  title: string;
  reasoning: string;
  confidenceScore: number;
  estHoursMin: number;
  estHoursMax: number;
  isRequestQuoteVerified?: boolean;
  isClauseQuoteVerified?: boolean;
}

export interface ClassificationConfusionMatrix {
  matrix: Record<ScopeClassification, Record<ScopeClassification, number>>;
  classes: ScopeClassification[];
  totalPredictions: number;
}

export interface ClassMetricEntry {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  precision: number | undefined; // undefined if TP + FP == 0
  recall: number | undefined;    // undefined if TP + FN == 0
  f1: number | undefined;        // undefined if precision + recall == 0 or undefined
  support: number;
}

export type PerClassMetrics = Record<ScopeClassification, ClassMetricEntry>;

export interface CitationEvaluationMetrics {
  requestQuoteVerificationRate: number | undefined;
  requestQuoteVerifiedCount: number;
  requestQuoteTotalEligible: number;

  clauseQuoteVerificationRate: number | undefined;
  clauseQuoteVerifiedCount: number;
  clauseQuoteTotalEligible: number;

  fabricatedCitationRejectionRate: number | undefined;
  fabricatedCitationRejectedCount: number;
  fabricatedCitationTotalCount: number;
}

export interface SubgroupEvaluationMetrics {
  topicMismatchRejectionRate: number | undefined;
  topicMismatchCorrectCount: number;
  topicMismatchTotalCount: number;

  contradictionHandlingRate: number | undefined;
  contradictionCorrectCount: number;
  contradictionTotalCount: number;

  adversarialUnsafeAcceptanceRate: number | undefined;
  adversarialBlockedCount: number;
  adversarialTotalCount: number;

  /**
   * False Exclusion Rate (also known as In-Scope Miss Rate):
   * Fraction of actual IN_SCOPE cases that were falsely classified as POTENTIALLY_OUT_OF_SCOPE.
   * Numerator: falseOutOfScopeCount (actual IN_SCOPE predicted as POTENTIALLY_OUT_OF_SCOPE).
   * Denominator: totalInScopeCases (total actual IN_SCOPE cases).
   * Returns undefined if totalInScopeCases === 0.
   */
  falseExclusionRate: number | undefined;
  /** In-Scope Miss Rate alias */
  inScopeMissRate?: number | undefined;
  /** Backward-compatible alias */
  falsePositiveRateOnInScope?: number | undefined;
  falseOutOfScopeCount: number;
  totalInScopeCases: number;
}

export interface EvaluationMetricsSummary {
  totalCases: number;
  strictAccuracy: number;
  acceptableRate: number;
  perClass: PerClassMetrics;
  confusionMatrix: ClassificationConfusionMatrix;
  citations: CitationEvaluationMetrics;
  subgroups: SubgroupEvaluationMetrics;
  metadata: EvaluationRunMetadata;
}

export interface EvaluationRunMetadata {
  corpusVersion: string;
  evaluatorVersion: string;
  timestamp: string;
  modelIdentifier: string;
  isSyntheticBenchmark: boolean;
}
