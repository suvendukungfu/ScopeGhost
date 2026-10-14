import { describe, expect, it } from "vitest";
import {
  calculateAcceptableRate,
  calculateCitationMetrics,
  calculateConfusionMatrix,
  calculatePerClassMetrics,
  calculateStrictAccuracy,
  calculateSubgroupMetrics,
  computeEvaluationSummary,
  safeDivide,
} from "./metrics";
import { EvaluationCase, ModelPredictionFinding } from "./types";

describe("Evaluation Metrics Pure Math & Edge Cases", () => {
  it("safeDivide returns exact quotient or undefined for zero/invalid denominators", () => {
    expect(safeDivide(10, 2)).toBe(5);
    expect(safeDivide(0, 5)).toBe(0);
    expect(safeDivide(5, 0)).toBeUndefined();
    expect(safeDivide(5, -1)).toBeUndefined();
    expect(safeDivide(5, Infinity)).toBeUndefined();
    expect(safeDivide(5, NaN)).toBeUndefined();
  });

  it("calculates exact confusion matrix from known predictions", () => {
    const cases: EvaluationCase[] = [
      {
        id: "1",
        name: "Case 1",
        category: "IN_SCOPE",
        chunkId: "c1",
        requestText: "req",
        expectedClassification: "IN_SCOPE",
        acceptableClassifications: ["IN_SCOPE"],
      },
      {
        id: "2",
        name: "Case 2",
        category: "IN_SCOPE",
        chunkId: "c2",
        requestText: "req",
        expectedClassification: "IN_SCOPE",
        acceptableClassifications: ["IN_SCOPE"],
      },
      {
        id: "3",
        name: "Case 3",
        category: "EXCLUSION_AND_LIMIT",
        chunkId: "c3",
        requestText: "req",
        expectedClassification: "POTENTIALLY_OUT_OF_SCOPE",
        acceptableClassifications: ["POTENTIALLY_OUT_OF_SCOPE"],
      },
      {
        id: "4",
        name: "Case 4",
        category: "AMBIGUOUS_AND_INSUFFICIENT",
        chunkId: "c4",
        requestText: "req",
        expectedClassification: "AMBIGUOUS",
        acceptableClassifications: ["AMBIGUOUS"],
      },
    ];

    const predictions = new Map<string, ModelPredictionFinding>([
      ["c1", { chunkStableId: "c1", requestQuote: "q", classification: "IN_SCOPE", title: "t", reasoning: "r", confidenceScore: 0.9, estHoursMin: 0, estHoursMax: 0 }],
      ["c2", { chunkStableId: "c2", requestQuote: "q", classification: "POTENTIALLY_OUT_OF_SCOPE", title: "t", reasoning: "r", confidenceScore: 0.9, estHoursMin: 10, estHoursMax: 20 }], // Misclassified!
      ["c3", { chunkStableId: "c3", requestQuote: "q", classification: "POTENTIALLY_OUT_OF_SCOPE", title: "t", reasoning: "r", confidenceScore: 0.9, estHoursMin: 10, estHoursMax: 20 }],
      ["c4", { chunkStableId: "c4", requestQuote: "q", classification: "AMBIGUOUS", title: "t", reasoning: "r", confidenceScore: 0.8, estHoursMin: 5, estHoursMax: 10 }],
    ]);

    const cm = calculateConfusionMatrix(cases, predictions);

    // Row IN_SCOPE: [1 IN_SCOPE, 1 POTENTIALLY_OUT_OF_SCOPE, 0 AMBIGUOUS, 0 INSUFFICIENT_EVIDENCE]
    expect(cm.matrix.IN_SCOPE.IN_SCOPE).toBe(1);
    expect(cm.matrix.IN_SCOPE.POTENTIALLY_OUT_OF_SCOPE).toBe(1);
    expect(cm.matrix.IN_SCOPE.AMBIGUOUS).toBe(0);
    expect(cm.matrix.IN_SCOPE.INSUFFICIENT_EVIDENCE).toBe(0);

    // Row POTENTIALLY_OUT_OF_SCOPE: [0, 1, 0, 0]
    expect(cm.matrix.POTENTIALLY_OUT_OF_SCOPE.POTENTIALLY_OUT_OF_SCOPE).toBe(1);

    // Row AMBIGUOUS: [0, 0, 1, 0]
    expect(cm.matrix.AMBIGUOUS.AMBIGUOUS).toBe(1);

    expect(cm.totalPredictions).toBe(4);
  });

  it("calculates hand-solved Precision, Recall, and F1 with undefined on zero denominator", () => {
    // Construct synthetic confusion matrix
    const matrix = {
      matrix: {
        IN_SCOPE: { IN_SCOPE: 3, POTENTIALLY_OUT_OF_SCOPE: 1, AMBIGUOUS: 0, INSUFFICIENT_EVIDENCE: 0 },
        POTENTIALLY_OUT_OF_SCOPE: { IN_SCOPE: 1, POTENTIALLY_OUT_OF_SCOPE: 4, AMBIGUOUS: 0, INSUFFICIENT_EVIDENCE: 0 },
        AMBIGUOUS: { IN_SCOPE: 0, POTENTIALLY_OUT_OF_SCOPE: 0, AMBIGUOUS: 2, INSUFFICIENT_EVIDENCE: 0 },
        INSUFFICIENT_EVIDENCE: { IN_SCOPE: 0, POTENTIALLY_OUT_OF_SCOPE: 0, AMBIGUOUS: 0, INSUFFICIENT_EVIDENCE: 0 },
      },
      classes: ["IN_SCOPE", "POTENTIALLY_OUT_OF_SCOPE", "AMBIGUOUS", "INSUFFICIENT_EVIDENCE"] as const,
      totalPredictions: 11,
    };

    const metrics = calculatePerClassMetrics(matrix as any);

    // For IN_SCOPE:
    // TP = 3
    // FP = 1 (from POTENTIALLY_OUT_OF_SCOPE row)
    // FN = 1 (to POTENTIALLY_OUT_OF_SCOPE col)
    // Precision = 3 / (3 + 1) = 0.75
    // Recall = 3 / (3 + 1) = 0.75
    // F1 = 2 * (0.75 * 0.75) / (0.75 + 0.75) = 0.75
    expect(metrics.IN_SCOPE.truePositives).toBe(3);
    expect(metrics.IN_SCOPE.falsePositives).toBe(1);
    expect(metrics.IN_SCOPE.falseNegatives).toBe(1);
    expect(metrics.IN_SCOPE.precision).toBeCloseTo(0.75, 5);
    expect(metrics.IN_SCOPE.recall).toBeCloseTo(0.75, 5);
    expect(metrics.IN_SCOPE.f1).toBeCloseTo(0.75, 5);
    expect(metrics.IN_SCOPE.support).toBe(4);

    // For POTENTIALLY_OUT_OF_SCOPE:
    // TP = 4
    // FP = 1 (from IN_SCOPE row)
    // FN = 1 (to IN_SCOPE col)
    // Precision = 4 / (4 + 1) = 0.8
    // Recall = 4 / (4 + 1) = 0.8
    // F1 = 0.8
    expect(metrics.POTENTIALLY_OUT_OF_SCOPE.truePositives).toBe(4);
    expect(metrics.POTENTIALLY_OUT_OF_SCOPE.precision).toBeCloseTo(0.8, 5);
    expect(metrics.POTENTIALLY_OUT_OF_SCOPE.recall).toBeCloseTo(0.8, 5);
    expect(metrics.POTENTIALLY_OUT_OF_SCOPE.f1).toBeCloseTo(0.8, 5);

    // For INSUFFICIENT_EVIDENCE:
    // TP = 0, FP = 0, FN = 0, Support = 0
    // Precision and Recall have 0/0 -> must be undefined
    expect(metrics.INSUFFICIENT_EVIDENCE.support).toBe(0);
    expect(metrics.INSUFFICIENT_EVIDENCE.precision).toBeUndefined();
    expect(metrics.INSUFFICIENT_EVIDENCE.recall).toBeUndefined();
    expect(metrics.INSUFFICIENT_EVIDENCE.f1).toBeUndefined();
  });

  it("calculates strict accuracy and acceptable rate separately", () => {
    const cases: EvaluationCase[] = [
      {
        id: "1",
        name: "Strict match",
        category: "IN_SCOPE",
        chunkId: "c1",
        requestText: "req",
        expectedClassification: "IN_SCOPE",
        acceptableClassifications: ["IN_SCOPE"],
      },
      {
        id: "2",
        name: "Acceptable boundary match",
        category: "AMBIGUOUS_AND_INSUFFICIENT",
        chunkId: "c2",
        requestText: "req",
        expectedClassification: "AMBIGUOUS",
        acceptableClassifications: ["AMBIGUOUS", "POTENTIALLY_OUT_OF_SCOPE"],
      },
      {
        id: "3",
        name: "Forbidden match",
        category: "ADVERSARIAL_INJECTION",
        chunkId: "c3",
        requestText: "req",
        expectedClassification: "INSUFFICIENT_EVIDENCE",
        acceptableClassifications: ["INSUFFICIENT_EVIDENCE", "POTENTIALLY_OUT_OF_SCOPE"],
        forbiddenClassifications: ["IN_SCOPE"],
      },
    ];

    const predictions = new Map<string, ModelPredictionFinding>([
      ["c1", { chunkStableId: "c1", requestQuote: "q", classification: "IN_SCOPE", title: "t", reasoning: "r", confidenceScore: 0.9, estHoursMin: 0, estHoursMax: 0 }],
      ["c2", { chunkStableId: "c2", requestQuote: "q", classification: "POTENTIALLY_OUT_OF_SCOPE", title: "t", reasoning: "r", confidenceScore: 0.8, estHoursMin: 10, estHoursMax: 20 }], // Not strict match, but acceptable!
      ["c3", { chunkStableId: "c3", requestQuote: "q", classification: "IN_SCOPE", title: "t", reasoning: "r", confidenceScore: 0.9, estHoursMin: 0, estHoursMax: 0 }], // Forbidden!
    ]);

    const strict = calculateStrictAccuracy(cases, predictions);
    const acceptable = calculateAcceptableRate(cases, predictions);

    // Strict accuracy: only c1 matches strictly -> 1 / 3 = 0.333...
    expect(strict).toBeCloseTo(1 / 3, 5);

    // Acceptable rate: c1 is acceptable, c2 is acceptable, c3 is forbidden -> 2 / 3 = 0.666...
    expect(acceptable).toBeCloseTo(2 / 3, 5);
  });

  it("calculates false positive rate on in-scope items with explicit denominator", () => {
    const cases: EvaluationCase[] = [
      { id: "1", name: "In scope 1", category: "IN_SCOPE", chunkId: "c1", requestText: "r", expectedClassification: "IN_SCOPE", acceptableClassifications: ["IN_SCOPE"] },
      { id: "2", name: "In scope 2", category: "IN_SCOPE", chunkId: "c2", requestText: "r", expectedClassification: "IN_SCOPE", acceptableClassifications: ["IN_SCOPE"] },
      { id: "3", name: "In scope 3", category: "IN_SCOPE", chunkId: "c3", requestText: "r", expectedClassification: "IN_SCOPE", acceptableClassifications: ["IN_SCOPE"] },
      { id: "4", name: "In scope 4", category: "IN_SCOPE", chunkId: "c4", requestText: "r", expectedClassification: "IN_SCOPE", acceptableClassifications: ["IN_SCOPE"] },
      { id: "5", name: "Out of scope", category: "EXCLUSION_AND_LIMIT", chunkId: "c5", requestText: "r", expectedClassification: "POTENTIALLY_OUT_OF_SCOPE", acceptableClassifications: ["POTENTIALLY_OUT_OF_SCOPE"] },
    ];

    const predictions = new Map<string, ModelPredictionFinding>([
      ["c1", { chunkStableId: "c1", requestQuote: "q", classification: "IN_SCOPE", title: "t", reasoning: "r", confidenceScore: 0.9, estHoursMin: 0, estHoursMax: 0 }],
      ["c2", { chunkStableId: "c2", requestQuote: "q", classification: "POTENTIALLY_OUT_OF_SCOPE", title: "t", reasoning: "r", confidenceScore: 0.9, estHoursMin: 10, estHoursMax: 20 }], // False positive!
      ["c3", { chunkStableId: "c3", requestQuote: "q", classification: "AMBIGUOUS", title: "t", reasoning: "r", confidenceScore: 0.8, estHoursMin: 0, estHoursMax: 0 }], // Ambiguous, not out of scope
      ["c4", { chunkStableId: "c4", requestQuote: "q", classification: "IN_SCOPE", title: "t", reasoning: "r", confidenceScore: 0.9, estHoursMin: 0, estHoursMax: 0 }],
      ["c5", { chunkStableId: "c5", requestQuote: "q", classification: "POTENTIALLY_OUT_OF_SCOPE", title: "t", reasoning: "r", confidenceScore: 0.9, estHoursMin: 10, estHoursMax: 20 }],
    ]);

    const subgroups = calculateSubgroupMetrics(cases, predictions);

    // Total in-scope cases = 4
    // In-scope falsely classified as POTENTIALLY_OUT_OF_SCOPE = 1 (c2)
    // False Positive Rate = 1 / 4 = 0.25 (25%)
    expect(subgroups.totalInScopeCases).toBe(4);
    expect(subgroups.falseOutOfScopeCount).toBe(1);
    expect(subgroups.falseExclusionRate).toBe(0.25);
    expect(subgroups.inScopeMissRate).toBe(0.25);
    expect(subgroups.falsePositiveRateOnInScope).toBe(0.25);
  });

  it("calculates citation verification and fabricated citation rejection", () => {
    const cases: EvaluationCase[] = [
      { id: "1", name: "Valid case 1", category: "IN_SCOPE", chunkId: "c1", requestText: "r", expectedClassification: "IN_SCOPE", acceptableClassifications: ["IN_SCOPE"] },
      { id: "2", name: "Valid case 2", category: "EXCLUSION_AND_LIMIT", chunkId: "c2", requestText: "r", expectedClassification: "POTENTIALLY_OUT_OF_SCOPE", acceptableClassifications: ["POTENTIALLY_OUT_OF_SCOPE"] },
      { id: "3", name: "Fabricated control", category: "ADVERSARIAL_INJECTION", chunkId: "c3", requestText: "r", expectedClassification: "INSUFFICIENT_EVIDENCE", acceptableClassifications: ["INSUFFICIENT_EVIDENCE"], isFabricatedCitation: true },
    ];

    const predictions = new Map<string, ModelPredictionFinding>([
      ["c1", { chunkStableId: "c1", requestQuote: "q1", isRequestQuoteVerified: true, isClauseQuoteVerified: false, classification: "IN_SCOPE", title: "t", reasoning: "r", confidenceScore: 0.9, estHoursMin: 0, estHoursMax: 0 }],
      ["c2", { chunkStableId: "c2", requestQuote: "q2", clauseQuote: "cq2", isRequestQuoteVerified: true, isClauseQuoteVerified: true, classification: "POTENTIALLY_OUT_OF_SCOPE", title: "t", reasoning: "r", confidenceScore: 0.9, estHoursMin: 10, estHoursMax: 20 }],
      ["c3", { chunkStableId: "c3", requestQuote: "fake", clauseQuote: "fake", isRequestQuoteVerified: false, isClauseQuoteVerified: false, classification: "INSUFFICIENT_EVIDENCE", title: "t", reasoning: "r", confidenceScore: 0.9, estHoursMin: 0, estHoursMax: 0 }],
    ]);

    const citations = calculateCitationMetrics(cases, predictions);

    // Request quotes: 2 eligible (c1, c2), 2 verified -> 1.0 (100%)
    expect(citations.requestQuoteTotalEligible).toBe(2);
    expect(citations.requestQuoteVerifiedCount).toBe(2);
    expect(citations.requestQuoteVerificationRate).toBe(1.0);

    // Clause quotes: 1 eligible (c2), 1 verified -> 1.0 (100%)
    expect(citations.clauseQuoteTotalEligible).toBe(1);
    expect(citations.clauseQuoteVerifiedCount).toBe(1);
    expect(citations.clauseQuoteVerificationRate).toBe(1.0);

    // Fabricated citations: 1 total (c3), 1 successfully rejected -> 1.0 (100%)
    expect(citations.fabricatedCitationTotalCount).toBe(1);
    expect(citations.fabricatedCitationRejectedCount).toBe(1);
    expect(citations.fabricatedCitationRejectionRate).toBe(1.0);
  });

  it("calculates topic mismatch, contradiction, and prompt injection defense rates", () => {
    const cases: EvaluationCase[] = [
      { id: "1", name: "Topic mismatch", category: "TOPIC_MISMATCH", chunkId: "c1", requestText: "r", expectedClassification: "AMBIGUOUS", acceptableClassifications: ["AMBIGUOUS"], hasTopicMismatch: true },
      { id: "2", name: "Contradiction", category: "CONTRADICTION", chunkId: "c2", requestText: "r", expectedClassification: "AMBIGUOUS", acceptableClassifications: ["AMBIGUOUS"], hasContradiction: true },
      { id: "3", name: "Injection 1 blocked", category: "ADVERSARIAL_INJECTION", chunkId: "c3", requestText: "r", expectedClassification: "INSUFFICIENT_EVIDENCE", acceptableClassifications: ["INSUFFICIENT_EVIDENCE"], isAdversarial: true },
      { id: "4", name: "Injection 2 breached", category: "ADVERSARIAL_INJECTION", chunkId: "c4", requestText: "r", expectedClassification: "INSUFFICIENT_EVIDENCE", acceptableClassifications: ["INSUFFICIENT_EVIDENCE"], isAdversarial: true },
    ];

    const predictions = new Map<string, ModelPredictionFinding>([
      ["c1", { chunkStableId: "c1", requestQuote: "q", classification: "AMBIGUOUS", title: "t", reasoning: "r", confidenceScore: 0.8, estHoursMin: 0, estHoursMax: 0 }], // Topic mismatch correctly AMBIGUOUS
      ["c2", { chunkStableId: "c2", requestQuote: "q", classification: "AMBIGUOUS", title: "t", reasoning: "r", confidenceScore: 0.7, estHoursMin: 0, estHoursMax: 0 }], // Contradiction correctly AMBIGUOUS
      ["c3", { chunkStableId: "c3", requestQuote: "q", classification: "INSUFFICIENT_EVIDENCE", title: "t", reasoning: "r", confidenceScore: 0.9, estHoursMin: 0, estHoursMax: 0 }], // Blocked
      ["c4", { chunkStableId: "c4", requestQuote: "q", classification: "IN_SCOPE", title: "t", reasoning: "r", confidenceScore: 0.9, estHoursMin: 0, estHoursMax: 0 }], // Unsafe acceptance!
    ]);

    const subgroups = calculateSubgroupMetrics(cases, predictions);

    expect(subgroups.topicMismatchTotalCount).toBe(1);
    expect(subgroups.topicMismatchCorrectCount).toBe(1);
    expect(subgroups.topicMismatchRejectionRate).toBe(1.0);

    expect(subgroups.contradictionTotalCount).toBe(1);
    expect(subgroups.contradictionCorrectCount).toBe(1);
    expect(subgroups.contradictionHandlingRate).toBe(1.0);

    expect(subgroups.adversarialTotalCount).toBe(2);
    expect(subgroups.adversarialBlockedCount).toBe(1);
    // Unsafe acceptance rate: 1 unsafe / 2 total = 0.5 (50%)
    expect(subgroups.adversarialUnsafeAcceptanceRate).toBe(0.5);
  });
});
