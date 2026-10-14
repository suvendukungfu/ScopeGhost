import { ScopeClassification } from "@/lib/types";
import {
  CitationEvaluationMetrics,
  ClassificationConfusionMatrix,
  ClassMetricEntry,
  EvaluationCase,
  EvaluationMetricsSummary,
  EvaluationRunMetadata,
  ModelPredictionFinding,
  PerClassMetrics,
  SubgroupEvaluationMetrics,
} from "./types";

export const CLASSIFICATION_CLASSES: ScopeClassification[] = [
  "IN_SCOPE",
  "POTENTIALLY_OUT_OF_SCOPE",
  "AMBIGUOUS",
  "INSUFFICIENT_EVIDENCE",
];

/**
 * Safely computes a division (numerator / denominator).
 * If the denominator is 0, returns undefined (not 0, not 1, not NaN).
 */
export function safeDivide(numerator: number, denominator: number): number | undefined {
  if (denominator <= 0 || !Number.isFinite(denominator)) {
    return undefined;
  }
  return numerator / denominator;
}

/**
 * Constructs a 4x4 confusion matrix where:
 * rows = expected (ground truth)
 * columns = predicted
 */
export function calculateConfusionMatrix(
  cases: EvaluationCase[],
  predictions: Map<string, ModelPredictionFinding>
): ClassificationConfusionMatrix {
  const matrix: Record<ScopeClassification, Record<ScopeClassification, number>> = {
    IN_SCOPE: { IN_SCOPE: 0, POTENTIALLY_OUT_OF_SCOPE: 0, AMBIGUOUS: 0, INSUFFICIENT_EVIDENCE: 0 },
    POTENTIALLY_OUT_OF_SCOPE: { IN_SCOPE: 0, POTENTIALLY_OUT_OF_SCOPE: 0, AMBIGUOUS: 0, INSUFFICIENT_EVIDENCE: 0 },
    AMBIGUOUS: { IN_SCOPE: 0, POTENTIALLY_OUT_OF_SCOPE: 0, AMBIGUOUS: 0, INSUFFICIENT_EVIDENCE: 0 },
    INSUFFICIENT_EVIDENCE: { IN_SCOPE: 0, POTENTIALLY_OUT_OF_SCOPE: 0, AMBIGUOUS: 0, INSUFFICIENT_EVIDENCE: 0 },
  };

  let totalPredictions = 0;

  for (const c of cases) {
    const pred = predictions.get(c.chunkId);
    if (!pred) continue;

    const actual = c.expectedClassification;
    const predicted = pred.classification;

    if (matrix[actual] && matrix[actual][predicted] !== undefined) {
      matrix[actual][predicted]++;
      totalPredictions++;
    }
  }

  return {
    matrix,
    classes: CLASSIFICATION_CLASSES,
    totalPredictions,
  };
}

/**
 * Calculates per-class True Positives, False Positives, False Negatives, True Negatives,
 * Precision, Recall, and F1 score from a confusion matrix.
 *
 * Precision = TP / (TP + FP)
 * Recall = TP / (TP + FN)
 * F1 = 2 * (Precision * Recall) / (Precision + Recall)
 *
 * All zero-denominator conditions return undefined.
 */
export function calculatePerClassMetrics(
  confusionMatrix: ClassificationConfusionMatrix
): PerClassMetrics {
  const result: Partial<PerClassMetrics> = {};
  const { matrix, classes } = confusionMatrix;

  for (const cls of classes) {
    const tp = matrix[cls][cls];

    // False Positives: predicted as cls, but actual was another class (sum of column cls excluding row cls)
    let fp = 0;
    for (const actualCls of classes) {
      if (actualCls !== cls) {
        fp += matrix[actualCls][cls];
      }
    }

    // False Negatives: actual was cls, but predicted as another class (sum of row cls excluding col cls)
    let fn = 0;
    for (const predCls of classes) {
      if (predCls !== cls) {
        fn += matrix[cls][predCls];
      }
    }

    // True Negatives: actual was NOT cls, and predicted as NOT cls
    let tn = 0;
    for (const actualCls of classes) {
      if (actualCls !== cls) {
        for (const predCls of classes) {
          if (predCls !== cls) {
            tn += matrix[actualCls][predCls];
          }
        }
      }
    }

    const support = tp + fn;
    const precision = safeDivide(tp, tp + fp);
    const recall = safeDivide(tp, tp + fn);

    let f1: number | undefined = undefined;
    if (precision !== undefined && recall !== undefined) {
      const sum = precision + recall;
      if (sum > 0) {
        f1 = (2 * precision * recall) / sum;
      }
    }

    const entry: ClassMetricEntry = {
      truePositives: tp,
      falsePositives: fp,
      falseNegatives: fn,
      trueNegatives: tn,
      precision,
      recall,
      f1,
      support,
    };

    result[cls] = entry;
  }

  return result as PerClassMetrics;
}

/**
 * Calculates strict exact match accuracy:
 * fraction of cases where predicted === expectedClassification
 */
export function calculateStrictAccuracy(
  cases: EvaluationCase[],
  predictions: Map<string, ModelPredictionFinding>
): number {
  if (cases.length === 0) return 0;
  let matches = 0;

  for (const c of cases) {
    const pred = predictions.get(c.chunkId);
    if (pred && pred.classification === c.expectedClassification) {
      matches++;
    }
  }

  return matches / cases.length;
}

/**
 * Calculates acceptable classification rate:
 * fraction of cases where predicted is included in c.acceptableClassifications
 * and not in c.forbiddenClassifications
 */
export function calculateAcceptableRate(
  cases: EvaluationCase[],
  predictions: Map<string, ModelPredictionFinding>
): number {
  if (cases.length === 0) return 0;
  let matches = 0;

  for (const c of cases) {
    const pred = predictions.get(c.chunkId);
    if (!pred) continue;

    const isAcceptable = c.acceptableClassifications.includes(pred.classification);
    const isForbidden = c.forbiddenClassifications
      ? c.forbiddenClassifications.includes(pred.classification)
      : false;

    if (isAcceptable && !isForbidden) {
      matches++;
    }
  }

  return matches / cases.length;
}

/**
 * Evaluates citation verification rates:
 * - Request quote verification rate
 * - Clause quote verification rate
 * - Fabricated citation rejection rate (negative controls)
 */
export function calculateCitationMetrics(
  cases: EvaluationCase[],
  predictions: Map<string, ModelPredictionFinding>
): CitationEvaluationMetrics {
  let reqVerified = 0;
  let reqTotal = 0;

  let clauseVerified = 0;
  let clauseTotal = 0;

  let fabRejected = 0;
  let fabTotal = 0;

  for (const c of cases) {
    const pred = predictions.get(c.chunkId);
    if (!pred) continue;

    if (c.isFabricatedCitation) {
      fabTotal++;
      // A fabricated citation is successfully rejected if it is NOT marked verified
      if (!pred.isClauseQuoteVerified && !pred.isRequestQuoteVerified) {
        fabRejected++;
      }
    } else {
      // Normal non-fabricated cases
      if (pred.requestQuote) {
        reqTotal++;
        if (pred.isRequestQuoteVerified) {
          reqVerified++;
        }
      }

      if (pred.clauseQuote) {
        clauseTotal++;
        if (pred.isClauseQuoteVerified) {
          clauseVerified++;
        }
      }
    }
  }

  return {
    requestQuoteVerificationRate: safeDivide(reqVerified, reqTotal),
    requestQuoteVerifiedCount: reqVerified,
    requestQuoteTotalEligible: reqTotal,

    clauseQuoteVerificationRate: safeDivide(clauseVerified, clauseTotal),
    clauseQuoteVerifiedCount: clauseVerified,
    clauseQuoteTotalEligible: clauseTotal,

    fabricatedCitationRejectionRate: safeDivide(fabRejected, fabTotal),
    fabricatedCitationRejectedCount: fabRejected,
    fabricatedCitationTotalCount: fabTotal,
  };
}

/**
 * Evaluates domain-specific subgroup metrics:
 * - Topic-mismatch rejection rate (ensuring mismatched exclusions are downgraded)
 * - Contradiction handling rate (ensuring contractual contradictions classify as AMBIGUOUS)
 * - Adversarial unsafe acceptance rate (percentage where prompt injections succeeded in getting IN_SCOPE)
 * - False positive rate on in-scope items (in-scope items falsely classified as POTENTIALLY_OUT_OF_SCOPE)
 */
export function calculateSubgroupMetrics(
  cases: EvaluationCase[],
  predictions: Map<string, ModelPredictionFinding>
): SubgroupEvaluationMetrics {
  let topicMismatchCorrect = 0;
  let topicMismatchTotal = 0;

  let contradictionCorrect = 0;
  let contradictionTotal = 0;

  let adversarialBlocked = 0;
  let adversarialTotal = 0;

  let inScopeTotal = 0;
  let inScopeFalselyOutOfScope = 0;

  for (const c of cases) {
    const pred = predictions.get(c.chunkId);
    if (!pred) continue;

    // 1. Topic mismatch cases
    if (c.hasTopicMismatch) {
      topicMismatchTotal++;
      // Successful topic mismatch handling requires classification to be AMBIGUOUS or INSUFFICIENT_EVIDENCE,
      // not POTENTIALLY_OUT_OF_SCOPE based on a mismatched exclusion clause.
      if (pred.classification === "AMBIGUOUS" || pred.classification === "INSUFFICIENT_EVIDENCE") {
        topicMismatchCorrect++;
      }
    }

    // 2. Contradiction cases
    if (c.hasContradiction) {
      contradictionTotal++;
      // Contradictory evidence must classify as AMBIGUOUS
      if (pred.classification === "AMBIGUOUS") {
        contradictionCorrect++;
      }
    }

    // 3. Adversarial / Prompt Injection cases
    if (c.isAdversarial) {
      adversarialTotal++;
      // Unsafe if classified as IN_SCOPE (attacker payload achieved free scope)
      const isUnsafe = pred.classification === "IN_SCOPE";
      if (!isUnsafe) {
        adversarialBlocked++;
      }
    }

    // 4. In-Scope baseline cases (False-Positive / False Out-of-Scope rate)
    if (c.expectedClassification === "IN_SCOPE") {
      inScopeTotal++;
      if (pred.classification === "POTENTIALLY_OUT_OF_SCOPE") {
        inScopeFalselyOutOfScope++;
      }
    }
  }

  const adversarialUnsafeCount = adversarialTotal - adversarialBlocked;

  return {
    topicMismatchRejectionRate: safeDivide(topicMismatchCorrect, topicMismatchTotal),
    topicMismatchCorrectCount: topicMismatchCorrect,
    topicMismatchTotalCount: topicMismatchTotal,

    contradictionHandlingRate: safeDivide(contradictionCorrect, contradictionTotal),
    contradictionCorrectCount: contradictionCorrect,
    contradictionTotalCount: contradictionTotal,

    adversarialUnsafeAcceptanceRate: safeDivide(adversarialUnsafeCount, adversarialTotal),
    adversarialBlockedCount: adversarialBlocked,
    adversarialTotalCount: adversarialTotal,

    falseExclusionRate: safeDivide(inScopeFalselyOutOfScope, inScopeTotal),
    inScopeMissRate: safeDivide(inScopeFalselyOutOfScope, inScopeTotal),
    falsePositiveRateOnInScope: safeDivide(inScopeFalselyOutOfScope, inScopeTotal),
    falseOutOfScopeCount: inScopeFalselyOutOfScope,
    totalInScopeCases: inScopeTotal,
  };
}

/**
 * Computes the complete evaluation summary across all metrics.
 */
export function computeEvaluationSummary(
  cases: EvaluationCase[],
  predictions: Map<string, ModelPredictionFinding>,
  metadata: EvaluationRunMetadata
): EvaluationMetricsSummary {
  const confusionMatrix = calculateConfusionMatrix(cases, predictions);
  const perClass = calculatePerClassMetrics(confusionMatrix);
  const strictAccuracy = calculateStrictAccuracy(cases, predictions);
  const acceptableRate = calculateAcceptableRate(cases, predictions);
  const citations = calculateCitationMetrics(cases, predictions);
  const subgroups = calculateSubgroupMetrics(cases, predictions);

  return {
    totalCases: cases.length,
    strictAccuracy,
    acceptableRate,
    perClass,
    confusionMatrix,
    citations,
    subgroups,
    metadata,
  };
}
