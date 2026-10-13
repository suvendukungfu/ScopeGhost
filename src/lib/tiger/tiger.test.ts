import { describe, expect, it } from "vitest";
import { computeAggregates } from "./aggregates";
import { getTigerTelemetry } from "./client";
import {
  AgentEventSchema,
  AgentEventStatusSchema,
  McpExecutionEvidenceSchema,
  TelemetrySummarySchema,
  TigerTelemetryResponseSchema,
} from "./schemas";
import {
  getVerifiedSnapshot,
  HISTORICAL_MCP_EVIDENCE,
  VERIFIED_SYNTHETIC_EVENTS,
} from "./snapshot";
import type { AgentEvent, McpExecutionEvidence } from "./types";

describe("Tiger Telemetry Schemas & Validation", () => {
  it("validates permissible event statuses", () => {
    expect(AgentEventStatusSchema.parse("SUCCESS")).toBe("SUCCESS");
    expect(AgentEventStatusSchema.parse("FAILED")).toBe("FAILED");
    expect(AgentEventStatusSchema.parse("PENDING")).toBe("PENDING");
    expect(AgentEventStatusSchema.parse("RATE_LIMITED")).toBe("RATE_LIMITED");

    expect(() => AgentEventStatusSchema.parse("INVALID")).toThrow();
  });

  it("validates a well-formed AgentEvent", () => {
    const validEvent: AgentEvent = {
      id: 1,
      createdAt: "2026-10-13T10:55:00.000Z",
      agentName: "scopeghost-core",
      action: "plan_generation",
      status: "SUCCESS",
      modelName: "gemini-2.5-pro",
      durationMs: 1200,
      tokensUsed: 450,
      metadata: { step: 1 },
      isSynthetic: true,
    };

    const parsed = AgentEventSchema.parse(validEvent);
    expect(parsed.id).toBe(1);
    expect(parsed.agentName).toBe("scopeghost-core");
    expect(parsed.isSynthetic).toBe(true);
  });

  it("rejects invalid negative duration or invalid status in AgentEvent", () => {
    expect(() =>
      AgentEventSchema.parse({
        id: 1,
        createdAt: "2026-10-13T10:55:00.000Z",
        agentName: "agent",
        action: "run",
        status: "NOT_A_STATUS",
        modelName: null,
        durationMs: -50,
        tokensUsed: null,
        metadata: null,
        isSynthetic: false,
      })
    ).toThrow();
  });

  it("validates historical MCP execution evidence schema", () => {
    const validMcp: McpExecutionEvidence = {
      sessionContext: "Prior Antigravity MCP Session",
      toolName: "db_query",
      operationDescription: "Multi-statement transaction",
      queryOrCommand: "BEGIN; ... COMMIT;",
      durationMs: 323.19,
      rowsAffectedOrReturned: 5,
      status: "SUCCESS",
      serviceId: "ysa2cqiz8e",
    };

    const parsed = McpExecutionEvidenceSchema.parse(validMcp);
    expect(parsed.toolName).toBe("db_query");
    expect(parsed.durationMs).toBe(323.19);
    expect(parsed.rowsAffectedOrReturned).toBe(5);

    // Rejects invalid tool name
    expect(() =>
      McpExecutionEvidenceSchema.parse({
        ...validMcp,
        toolName: "unrecognized_tool",
      })
    ).toThrow();
  });
});

describe("Deterministic Telemetry Aggregation", () => {
  it("accurately computes metrics from verified synthetic events", () => {
    const { summary, agentAggregates } = computeAggregates(VERIFIED_SYNTHETIC_EVENTS);

    expect(summary.totalActions).toBe(5);
    expect(summary.successCount).toBe(4);
    expect(summary.failureCount).toBe(1);
    expect(summary.pendingCount).toBe(0);
    expect(summary.rateLimitedCount).toBe(0);
    expect(summary.successRatePercent).toBe(80.0);
    expect(summary.totalTokens).toBe(1362);
    expect(summary.avgDurationMs).toBe(1479.0);

    // Verify per-agent breakdown
    expect(agentAggregates).toHaveLength(3);
    const codeReviewer = agentAggregates.find((a) => a.agentName === "code-reviewer");
    expect(codeReviewer).toBeDefined();
    expect(codeReviewer?.totalActions).toBe(2);
    expect(codeReviewer?.successCount).toBe(1);
    expect(codeReviewer?.failureCount).toBe(1);
    expect(codeReviewer?.totalTokens).toBe(460);
  });

  it("handles empty event lists gracefully", () => {
    const { summary, agentAggregates } = computeAggregates([]);

    expect(summary.totalActions).toBe(0);
    expect(summary.successCount).toBe(0);
    expect(summary.failureCount).toBe(0);
    expect(summary.successRatePercent).toBe(0);
    expect(summary.avgDurationMs).toBe(0);
    expect(summary.totalTokens).toBe(0);
    expect(agentAggregates).toEqual([]);
  });
});

describe("Verified Snapshot & Fallback Behavior", () => {
  it("returns verified synthetic snapshot matching schema with MCP evidence", () => {
    const snapshot = getVerifiedSnapshot();

    expect(snapshot.source).toBe("VERIFIED_SNAPSHOT");
    expect(snapshot.serviceId).toBe("ysa2cqiz8e");
    expect(snapshot.recentEvents).toHaveLength(5);
    expect(snapshot.connectionInfo.connected).toBe(false);
    expect(snapshot.historicalMcpEvidence.length).toBeGreaterThanOrEqual(1);

    // Validate entire response with Zod
    expect(() => TigerTelemetryResponseSchema.parse(snapshot)).not.toThrow();
  });

  it("verifies historical MCP evidence records contain truthful measured timings", () => {
    expect(HISTORICAL_MCP_EVIDENCE.length).toBe(3);
    const ddlTx = HISTORICAL_MCP_EVIDENCE.find(
      (e) => e.operationDescription.includes("Multi-statement")
    );
    expect(ddlTx).toBeDefined();
    expect(ddlTx?.durationMs).toBe(323.19);
    expect(ddlTx?.rowsAffectedOrReturned).toBe(5);

    const summaryQuery = HISTORICAL_MCP_EVIDENCE.find(
      (e) => e.operationDescription.includes("Read-only summary")
    );
    expect(summaryQuery).toBeDefined();
    expect(summaryQuery?.durationMs).toBe(252.54);
    expect(summaryQuery?.rowsAffectedOrReturned).toBe(1);
  });

  it("falls back to snapshot when TIGER_DATABASE_URL is not set", async () => {
    const originalUrl = process.env.TIGER_DATABASE_URL;
    delete process.env.TIGER_DATABASE_URL;

    try {
      const data = await getTigerTelemetry();
      expect(data.source).toBe("VERIFIED_SNAPSHOT");
      expect(data.connectionInfo.connected).toBe(false);
      expect(data.recentEvents).toHaveLength(5);
      expect(data.historicalMcpEvidence).toBeDefined();
    } finally {
      if (originalUrl) process.env.TIGER_DATABASE_URL = originalUrl;
    }
  });

  it("falls back gracefully without throwing when TIGER_DATABASE_URL is invalid", async () => {
    const originalUrl = process.env.TIGER_DATABASE_URL;
    process.env.TIGER_DATABASE_URL = "postgres://invalid_user:invalid_pass@127.0.0.1:54329/fake_db";

    try {
      const data = await getTigerTelemetry();
      expect(data.source).toBe("VERIFIED_SNAPSHOT");
      expect(data.connectionInfo.connected).toBe(false);
      expect(data.summary.totalActions).toBe(5);
    } finally {
      if (originalUrl) {
        process.env.TIGER_DATABASE_URL = originalUrl;
      } else {
        delete process.env.TIGER_DATABASE_URL;
      }
    }
  });
});
