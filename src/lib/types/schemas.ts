import { z } from "zod";

export const ClauseTypeSchema = z.enum([
  "DELIVERABLE",
  "EXCLUSION",
  "ASSUMPTION",
  "REVISION_LIMIT",
]);

export const FileTypeSchema = z.enum(["TXT", "MARKDOWN", "CSV"]);

export const ScopeClassificationSchema = z.enum([
  "IN_SCOPE",
  "POTENTIALLY_OUT_OF_SCOPE",
  "AMBIGUOUS",
  "INSUFFICIENT_EVIDENCE",
]);

export const HumanDecisionSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "DISMISSED",
  "MODIFIED",
]);

export const CreateProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(100),
  clientName: z.string().trim().min(1, "Client name is required").max(100),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, "Currency must be a three-letter ISO code")
    .transform((currency) => currency.toUpperCase())
    .default("USD"),
  hourlyRateCents: z.number().int().nonnegative("Hourly rate must be non-negative"),
  originalBudgetCents: z.number().int().nonnegative("Budget must be non-negative"),
  revisionLimit: z.number().int().min(0, "Revision limit cannot be negative").default(2),
});

export const UpdateProjectSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  clientName: z.string().trim().min(1).max(100).optional(),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, "Currency must be a three-letter ISO code")
    .transform((currency) => currency.toUpperCase())
    .optional(),
  hourlyRateCents: z.number().int().nonnegative().optional(),
  originalBudgetCents: z.number().int().nonnegative().optional(),
  revisionLimit: z.number().int().min(0).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one project field must be provided",
});

export const CreateBaselineClauseSchema = z.object({
  clauseType: ClauseTypeSchema,
  title: z.string().min(1, "Clause title is required").max(200),
  content: z.string().min(1, "Clause content is required"),
  sectionRef: z.string().max(100).optional().nullable(),
});

export const UploadEvidenceSourceSchema = z.object({
  filename: z.string().trim().min(1, "Filename is required").max(255),
  fileType: FileTypeSchema,
  rawContent: z.string().min(1, "Content cannot be empty").max(10_000_000),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
}).strict();

export const EvidenceUploadRequestSchema = z.object({
  filename: z.string().trim().min(1).max(255).optional(),
  fileType: FileTypeSchema.optional(),
  rawContent: z.string().min(1, "Content cannot be empty").max(10_000_000),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
}).strict();

export const ModelConfidenceSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const ModelEvidenceCitationSchema = z.object({
  evidenceId: z.string().min(1),
  quote: z.string().min(1),
});

export const ModelClauseCitationSchema = z.preprocess((val) => {
  if (!val || typeof val !== "object") return null;
  const obj = val as Record<string, unknown>;
  const clauseId = obj.clauseId ?? obj.clause_id;
  const quote = obj.quote;
  if (!clauseId && !quote) return null;
  return {
    clauseId,
    quote,
  };
}, z.object({
  clauseId: z.string().min(1),
  quote: z.string().min(1),
}));

export const ScopeAnalysisResultSchema = z.object({
  classification: z.preprocess(
    (val) => typeof val === "string" ? val.trim().toUpperCase().replace(/[-\s]+/g, "_") : val,
    ScopeClassificationSchema
  ),
  explanation: z.string().min(1).max(2000),
  clauseCitation: ModelClauseCitationSchema.nullable().optional().default(null),
  supportingEvidence: z.array(ModelEvidenceCitationSchema).max(20).default([]),
  contradictingEvidence: z.array(ModelEvidenceCitationSchema).max(20).default([]),
  missingInformation: z.array(z.string().min(1).max(500)).max(20).default([]),
  confidence: z.preprocess(
    (val) => typeof val === "string" ? val.trim().toUpperCase() : val,
    ModelConfidenceSchema
  ),
  confidenceExplanation: z.string().min(1).max(500),
  estimatedHoursMin: z.coerce.number().finite().nonnegative().max(100_000).default(0),
  estimatedHoursMax: z.coerce.number().finite().nonnegative().max(100_000).default(0),
  nextAction: z.preprocess((val) => {
    if (typeof val === "string" && val.trim().length > 0) {
      return val.trim().slice(0, 1000);
    }
    return "Review scope and confirm next steps with client.";
  }, z.string().min(1).max(1000)),
}).strict().refine(
  (result) => result.estimatedHoursMax >= result.estimatedHoursMin,
  { message: "Maximum estimated hours must not be less than minimum estimated hours" }
);

/**
 * Structured LLM Output Item Schema for each detected client request
 */
export const ModelFindingItemSchema = z.object({
  requestQuote: z
    .string()
    .min(1, "Must cite exact quote from client communication"),
  chunkStableId: z
    .string()
    .min(1, "Must reference stable chunk ID"),
  matchedClauseSection: z
    .string()
    .optional()
    .nullable()
    .describe("Section or title of the baseline agreement clause compared against, or null"),
  clauseQuote: z
    .string()
    .optional()
    .nullable()
    .describe("Exact quote from baseline agreement, if applicable"),
  classification: ScopeClassificationSchema,
  title: z
    .string()
    .min(1)
    .max(150)
    .describe("Concise summary of the request"),
  reasoning: z
    .string()
    .min(1)
    .describe("Objective justification comparing the request against baseline deliverables and exclusions"),
  confidenceScore: z
    .number()
    .min(0)
    .max(1)
    .default(0.8),
  estHoursMin: z
    .number()
    .nonnegative()
    .default(0)
    .describe("Estimated minimum developer hours required to implement if out-of-scope or ambiguous"),
  estHoursMax: z
    .number()
    .nonnegative()
    .default(0)
    .describe("Estimated maximum developer hours required"),
});

export const ModelScopeAnalysisOutputSchema = z.object({
  findings: z.array(ModelFindingItemSchema),
});

export const UpdateFindingDecisionSchema = z.object({
  humanStatus: HumanDecisionSchema,
  humanNotes: z.string().max(1000).optional().nullable(),
  classification: ScopeClassificationSchema.optional(),
  estHoursMin: z.number().finite().nonnegative().optional(),
  estHoursMax: z.number().finite().nonnegative().optional(),
}).strict().refine(
  (value) =>
    value.estHoursMin === undefined ||
    value.estHoursMax === undefined ||
    value.estHoursMax >= value.estHoursMin,
  { message: "Maximum effort estimate cannot be lower than minimum" }
);

export const CreateChangeOrderSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  selectedFindingIds: z.array(z.string()).min(1, "At least one finding must be included"),
  customNotes: z.string().max(5000).optional(),
}).strict().refine(
  (value) => new Set(value.selectedFindingIds).size === value.selectedFindingIds.length,
  { path: ["selectedFindingIds"], message: "Finding IDs must be unique" }
);

export const UpdateChangeOrderSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  generatedMarkdown: z.string().min(1).max(100_000).optional(),
  status: z.enum(["DRAFT", "APPROVED"]).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one change order field must be provided",
});

export const ClearLocalDataSchema = z.object({
  confirmation: z.literal("DELETE ALL LOCAL DATA"),
}).strict();
