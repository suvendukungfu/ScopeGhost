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
  name: z.string().min(1, "Project name is required").max(100),
  clientName: z.string().min(1, "Client name is required").max(100),
  currency: z.string().min(1).max(10).default("USD"),
  hourlyRateCents: z.number().int().nonnegative("Hourly rate must be non-negative"),
  originalBudgetCents: z.number().int().nonnegative("Budget must be non-negative"),
  revisionLimit: z.number().int().min(0, "Revision limit cannot be negative").default(2),
});

export const CreateBaselineClauseSchema = z.object({
  clauseType: ClauseTypeSchema,
  title: z.string().min(1, "Clause title is required").max(200),
  content: z.string().min(1, "Clause content is required"),
  sectionRef: z.string().max(100).optional().nullable(),
});

export const UploadEvidenceSourceSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  fileType: FileTypeSchema,
  rawContent: z.string().min(1, "Content cannot be empty"),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

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
  estHoursMin: z.number().nonnegative().optional(),
  estHoursMax: z.number().nonnegative().optional(),
});

export const CreateChangeOrderSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  selectedFindingIds: z.array(z.string()).min(1, "At least one finding must be included"),
  customNotes: z.string().optional(),
});
