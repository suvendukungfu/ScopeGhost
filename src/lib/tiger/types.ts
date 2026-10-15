export type AgentEventStatus = "SUCCESS" | "FAILED" | "PENDING" | "RATE_LIMITED";

export interface AgentEvent {
  id: number;
  createdAt: string;
  agentName: string;
  action: string;
  status: AgentEventStatus;
  modelName: string | null;
  durationMs: number | null;
  tokensUsed: number | null;
  metadata: Record<string, unknown> | null;
  isSynthetic: boolean;
}

export interface TelemetrySummary {
  totalActions: number;
  successCount: number;
  failureCount: number;
  pendingCount: number;
  rateLimitedCount: number;
  successRatePercent: number;
  avgDurationMs: number;
  totalTokens: number;
}

export interface AgentAggregate {
  agentName: string;
  totalActions: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
  totalTokens: number;
}

export type TigerDataSource = "LIVE_DATABASE" | "VERIFIED_SNAPSHOT";

export interface TigerConnectionInfo {
  configured: boolean;
  connected: boolean;
  message: string;
}

export type McpToolName = "db_query" | "db_schema" | "service_list";

export interface McpExecutionEvidence {
  sessionContext: string;
  toolName: McpToolName;
  operationDescription: string;
  queryOrCommand?: string;
  durationMs: number;
  rowsAffectedOrReturned?: number;
  status: "SUCCESS" | "FAILED";
  recordedAt?: string;
  serviceId?: string;
}

export interface HourlyTelemetryBucket {
  bucket: string;
  agentName: string;
  totalActions: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number | null;
  maxDurationMs: number | null;
  totalTokens: number;
  avgTokens: number | null;
  source?: "LIVE_CAGG" | "SYNTHETIC_FALLBACK";
}

export interface TigerTelemetryResponse {
  source: TigerDataSource;
  serviceId?: string;
  databaseName?: string;
  summary: TelemetrySummary;
  agentAggregates: AgentAggregate[];
  recentEvents: AgentEvent[];
  connectionInfo: TigerConnectionInfo;
  historicalMcpEvidence: McpExecutionEvidence[];
  hourlyRollup: HourlyTelemetryBucket[];
}
