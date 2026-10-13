import { describe, it, expect } from "vitest";
import {
  CreateProjectSchema,
  CreateBaselineClauseSchema,
  ModelFindingItemSchema,
  ModelScopeAnalysisOutputSchema,
  UpdateFindingDecisionSchema,
  UpdateProjectSchema,
  EvidenceUploadRequestSchema,
  ScopeAnalysisResultSchema,
} from "./schemas";

describe("Zod Validation Schemas", () => {
  describe("CreateProjectSchema", () => {
    it("validates a valid project payload", () => {
      const valid = {
        name: "Website Redesign",
        clientName: "Acme Corp",
        currency: "USD",
        hourlyRateCents: 15000,
        originalBudgetCents: 1000000,
        revisionLimit: 2,
      };
      const result = CreateProjectSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects negative rates or budgets", () => {
      const invalid = {
        name: "Bad Budget",
        clientName: "Client",
        currency: "USD",
        hourlyRateCents: -50,
        originalBudgetCents: -1000,
      };
      const result = CreateProjectSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("requires a project name and client name", () => {
      const empty = {
        name: "",
        clientName: "",
        hourlyRateCents: 10000,
        originalBudgetCents: 500000,
      };
      const result = CreateProjectSchema.safeParse(empty);
      expect(result.success).toBe(false);
    });

    it("rejects invalid currency codes and trims user-provided names", () => {
      expect(CreateProjectSchema.safeParse({
        name: "  New project  ",
        clientName: "Client",
        currency: "US dollars",
        hourlyRateCents: 10000,
        originalBudgetCents: 100000,
      }).success).toBe(false);
      const parsed = CreateProjectSchema.safeParse({
        name: "  New project  ",
        clientName: "  Client  ",
        hourlyRateCents: 10000,
        originalBudgetCents: 100000,
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.name).toBe("New project");
    });
  });

  describe("Import and update validation", () => {
    it("rejects empty evidence, unsupported formats, and extra request fields", () => {
      expect(EvidenceUploadRequestSchema.safeParse({
        filename: "notes.pdf",
        rawContent: "content",
        fileType: "PDF",
      }).success).toBe(false);
      expect(EvidenceUploadRequestSchema.safeParse({
        filename: "notes.txt",
        rawContent: "",
      }).success).toBe(false);
      expect(EvidenceUploadRequestSchema.safeParse({
        filename: "notes.txt",
        rawContent: "content",
        unknownField: true,
      }).success).toBe(false);
    });

    it("requires a non-empty validated project update", () => {
      expect(UpdateProjectSchema.safeParse({}).success).toBe(false);
      expect(UpdateProjectSchema.safeParse({ hourlyRateCents: -1 }).success).toBe(false);
      expect(UpdateProjectSchema.safeParse({ currency: "US" }).success).toBe(false);
      expect(UpdateProjectSchema.safeParse({ revisionLimit: 3 }).success).toBe(true);
      expect(UpdateProjectSchema.safeParse({ name: "valid", ignored: true }).success).toBe(false);
    });
  });

  describe("CreateBaselineClauseSchema", () => {
    it("accepts valid clause types", () => {
      const clause = {
        clauseType: "EXCLUSION",
        title: "No Native iOS/Android Apps",
        content: "Only responsive web design is included in phase 1.",
        sectionRef: "Section 4.2",
      };
      const result = CreateBaselineClauseSchema.safeParse(clause);
      expect(result.success).toBe(true);
    });

    it("rejects invalid clause types", () => {
      const invalid = {
        clauseType: "SOMETHING_ELSE",
        title: "Invalid",
        content: "Content",
      };
      const result = CreateBaselineClauseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("ModelScopeAnalysisOutputSchema", () => {
    it("validates structured LLM output with honest uncertainty classifications", () => {
      const llmOutput = {
        findings: [
          {
            requestQuote: "Can we also add a mobile app for iOS?",
            chunkStableId: "SRC-01#C02",
            matchedClauseSection: "Section 4.2",
            clauseQuote: "Only responsive web design is included in phase 1.",
            classification: "POTENTIALLY_OUT_OF_SCOPE",
            title: "Request for native iOS mobile application",
            reasoning:
              "The original agreement explicitly excludes native mobile apps in Section 4.2.",
            confidenceScore: 0.95,
            estHoursMin: 40,
            estHoursMax: 60,
          },
          {
            requestQuote: "Please adjust the hero font weight to 600.",
            chunkStableId: "SRC-01#C03",
            matchedClauseSection: null,
            clauseQuote: null,
            classification: "IN_SCOPE",
            title: "Minor typography weight adjustment",
            reasoning: "Typography styling is covered under design deliverables.",
            confidenceScore: 0.9,
            estHoursMin: 0.5,
            estHoursMax: 1,
          },
          {
            requestQuote: "Let's explore integrating blockchain audit trails.",
            chunkStableId: "SRC-01#C04",
            matchedClauseSection: null,
            clauseQuote: null,
            classification: "AMBIGUOUS",
            title: "Exploratory blockchain audit feature",
            reasoning: "Unclear if exploratory inquiry or hard requirement.",
            confidenceScore: 0.6,
            estHoursMin: 10,
            estHoursMax: 20,
          },
        ],
      };

      const result = ModelScopeAnalysisOutputSchema.safeParse(llmOutput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.findings).toHaveLength(3);
        expect(result.data.findings[0].classification).toBe("POTENTIALLY_OUT_OF_SCOPE");
      }
    });

    it("rejects LLM output missing mandatory chunk citations", () => {
      const missingCitation = {
        findings: [
          {
            requestQuote: "Missing chunk id",
            // missing chunkStableId
            classification: "POTENTIALLY_OUT_OF_SCOPE",
            title: "No citation",
            reasoning: "Invalid",
            confidenceScore: 0.8,
            estHoursMin: 5,
            estHoursMax: 10,
          },
        ],
      };
      const result = ModelScopeAnalysisOutputSchema.safeParse(missingCitation);
      expect(result.success).toBe(false);
    });
  });

  describe("UpdateFindingDecisionSchema", () => {
    it("allows human reviewer to accept or modify finding classification", () => {
      const update = {
        humanStatus: "MODIFIED",
        classification: "IN_SCOPE",
        estHoursMin: 0,
        estHoursMax: 0,
        humanNotes: "Client agreed this was a free courtesy tweak.",
      };
      const result = UpdateFindingDecisionSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    describe("Structured single-request analysis response", () => {
      it("rejects invalid confidence, unsupported fields, and inverted estimates", () => {
        const valid = {
          classification: "AMBIGUOUS",
          explanation: "The requirements conflict.",
          supportingEvidence: [],
          contradictingEvidence: [],
          missingInformation: ["Expected platform"],
          confidence: "LOW",
          confidenceExplanation: "A key requirement is unknown.",
          estimatedHoursMin: 2,
          estimatedHoursMax: 5,
          nextAction: "Clarify platform support.",
        };
        expect(ScopeAnalysisResultSchema.safeParse(valid).success).toBe(true);
        expect(ScopeAnalysisResultSchema.safeParse({
          ...valid,
          confidence: "99%",
        }).success).toBe(false);
        expect(ScopeAnalysisResultSchema.safeParse({
          ...valid,
          estimatedHoursMax: 1,
        }).success).toBe(false);
        expect(ScopeAnalysisResultSchema.safeParse({
          ...valid,
          finalInvoiceTotal: 500,
        }).success).toBe(false);
      });
    });
  });
});
