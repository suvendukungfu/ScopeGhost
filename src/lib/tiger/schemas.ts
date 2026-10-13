import { z } from "zod";

export const AgentEventStatusSchema = z.enum([
  "SUCCESS",
  "FAILED",
  "PENDING",
  "RATE_LIMITED",
]);

export const AgentEventSchema = z.object({
  id: z.number().int().positive(),
  createdAt: z.string().min(1),
  agentName: z.string().min(1).max(64),
  action: z.string().min(1).max(64),
  status: AgentEventStatusSchema,
  modelName: z.string().max(64).nullable(),
  durationMs: z.number().int().nonnegative().nullable(),
  tokensUsed: z.number().int().nonnegative().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  isSynthetic: z.boolean(),
});

export const TelemetrySummarySchema = z.object({
  totalActions: z.number().int().nonnegative(),
  successCount: z.number().int().nonnegative(),
  failureCount: z.number().int().nonnegative(),
  pendingCount: z.number().int().nonnegative(),
  rateLimitedCount: z.number().int().nonnegative(),
  successRatePercent: z.number().min(0).max(100),
  avgDurationMs: z.number().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
});

export const AgentAggregateSchema = z.object({
  agentName: z.string().min(1),
  totalActions: z.number().int().nonnegative(),
  successCount: z.number().int().nonnegative(),
  failureCount: z.number().int().nonnegative(),
  avgDurationMs: z.number().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
});

export const TigerConnectionInfoSchema = z.object({
  configured: z.boolean(),
  connected: z.boolean(),
  message: z.string(),
});

export const McpToolNameSchema = z.enum(["db_query", "db_schema", "service_list"]);

export const McpExecutionEvidenceSchema = z.object({
  sessionContext: z.string().min(1),
  toolName: McpToolNameSchema,
  operationDescription: z.string().min(1),
  queryOrCommand: z.string().optional(),
  durationMs: z.number().nonnegative(),
  rowsAffectedOrReturned: z.number().int().nonnegative().optional(),
  status: z.enum(["SUCCESS", "FAILED"]),
  recordedAt: z.string().optional(),
  serviceId: z.string().optional(),
});

export const TigerTelemetryResponseSchema = z.object({
  source: z.enum(["LIVE_DATABASE", "VERIFIED_SNAPSHOT"]),
  serviceId: z.string().optional(),
  databaseName: z.string().optional(),
  summary: TelemetrySummarySchema,
  agentAggregates: z.array(AgentAggregateSchema),
  recentEvents: z.array(AgentEventSchema),
  connectionInfo: TigerConnectionInfoSchema,
  historicalMcpEvidence: z.array(McpExecutionEvidenceSchema).default([]),
});
