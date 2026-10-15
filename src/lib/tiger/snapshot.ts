import { computeAggregates, computeHourlyRollup } from "./aggregates";
import type { AgentEvent, McpExecutionEvidence, TigerTelemetryResponse } from "./types";

/**
 * Verified synthetic demonstration data retrieved from Tiger Cloud service db-68737 (ysa2cqiz8e).
 * Represents agent telemetry actions recorded during MCP experimentation.
 */
export const VERIFIED_SYNTHETIC_EVENTS: AgentEvent[] = [
  {
    id: 5,
    createdAt: "2026-10-13T10:59:34.647Z",
    agentName: "scopeghost-core",
    action: "tool_call:db_query",
    status: "SUCCESS",
    modelName: "gemini-2.5-flash",
    durationMs: 255,
    tokensUsed: 180,
    metadata: {
      query_type: "read_only",
      rows_returned: 1,
      synthetic: true,
    },
    isSynthetic: true,
  },
  {
    id: 4,
    createdAt: "2026-10-13T10:58:34.647Z",
    agentName: "code-reviewer",
    action: "tool_call:run_tests",
    status: "FAILED",
    modelName: "gemini-2.5-flash",
    durationMs: 5100,
    tokensUsed: 320,
    metadata: {
      error: "assertion_failure",
      exit_code: 1,
      synthetic: true,
    },
    isSynthetic: true,
  },
  {
    id: 3,
    createdAt: "2026-10-13T10:57:34.647Z",
    agentName: "security-auditor",
    action: "tool_call:db_schema",
    status: "SUCCESS",
    modelName: "gemini-2.5-flash",
    durationMs: 480,
    tokensUsed: 210,
    metadata: {
      service_id: "ysa2cqiz8e",
      synthetic: true,
    },
    isSynthetic: true,
  },
  {
    id: 2,
    createdAt: "2026-10-13T10:56:34.647Z",
    agentName: "code-reviewer",
    action: "tool_call:grep_search",
    status: "SUCCESS",
    modelName: "gemini-2.5-flash",
    durationMs: 320,
    tokensUsed: 140,
    metadata: {
      query: "TODO",
      matches: 4,
      synthetic: true,
    },
    isSynthetic: true,
  },
  {
    id: 1,
    createdAt: "2026-10-13T10:55:34.647Z",
    agentName: "scopeghost-core",
    action: "plan_generation",
    status: "SUCCESS",
    modelName: "gemini-2.5-pro",
    durationMs: 1240,
    tokensUsed: 512,
    metadata: {
      step: 1,
      task: "analyze_repo",
      synthetic: true,
    },
    isSynthetic: true,
  },
];

/**
 * Historical execution evidence recorded from Antigravity Tiger MCP tool calls.
 * Preserves actual measured tool latency and rows affected from the MCP inspection session.
 */
export const HISTORICAL_MCP_EVIDENCE: McpExecutionEvidence[] = [
  {
    sessionContext: "Prior Antigravity MCP Session",
    toolName: "db_query",
    operationDescription: "Multi-statement transaction: DDL schema setup and synthetic seed insertion",
    queryOrCommand: "BEGIN; CREATE TABLE IF NOT EXISTS agent_events ... INSERT INTO agent_events ... COMMIT;",
    durationMs: 323.19,
    rowsAffectedOrReturned: 5,
    status: "SUCCESS",
    serviceId: "ysa2cqiz8e",
  },
  {
    sessionContext: "Prior Antigravity MCP Session",
    toolName: "db_query",
    operationDescription: "Read-only summary aggregate metrics calculation",
    queryOrCommand: "SELECT COUNT(*) AS total_actions, COUNT(*) FILTER (WHERE status = 'SUCCESS') ... FROM agent_events;",
    durationMs: 252.54,
    rowsAffectedOrReturned: 1,
    status: "SUCCESS",
    serviceId: "ysa2cqiz8e",
  },
  {
    sessionContext: "Prior Antigravity MCP Session",
    toolName: "db_schema",
    operationDescription: "Database schema inspection for service db-68737",
    queryOrCommand: "db_schema(service_id: 'ysa2cqiz8e')",
    durationMs: 0,
    status: "SUCCESS",
    serviceId: "ysa2cqiz8e",
  },
];

export function getVerifiedSnapshot(connectionMessage?: string): TigerTelemetryResponse {
  const { summary, agentAggregates } = computeAggregates(VERIFIED_SYNTHETIC_EVENTS);
  const hourlyRollup = computeHourlyRollup(VERIFIED_SYNTHETIC_EVENTS);

  return {
    source: "VERIFIED_SNAPSHOT",
    serviceId: "ysa2cqiz8e",
    databaseName: "db-68737",
    summary,
    agentAggregates,
    recentEvents: VERIFIED_SYNTHETIC_EVENTS,
    connectionInfo: {
      configured: false,
      connected: false,
      message:
        connectionMessage ||
        "Live Tiger Cloud PostgreSQL connectivity is unconfigured (TIGER_DATABASE_URL not set). Showing verified synthetic snapshot from service ysa2cqiz8e.",
    },
    historicalMcpEvidence: HISTORICAL_MCP_EVIDENCE,
    hourlyRollup,
  };
}
