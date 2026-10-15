import { describe, expect, it } from "vitest";
import { computeAggregates, computeHourlyRollup } from "./aggregates";
import { getTigerTelemetry } from "./client";
import {
  AgentEventSchema,
  AgentEventStatusSchema,
  HourlyTelemetryBucketSchema,
  McpExecutionEvidenceSchema,
  TelemetrySummarySchema,
  TigerTelemetryResponseSchema,
} from "./schemas";
import {
  getVerifiedSnapshot,
  HISTORICAL_MCP_EVIDENCE,
  VERIFIED_SYNTHETIC_EVENTS,
} from "./snapshot";
import type { AgentEvent, HourlyTelemetryBucket, McpExecutionEvidence } from "./types";

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

describe("TimescaleDB Continuous Aggregate (Hourly Rollup)", () => {
  it("validates a well-formed continuous aggregate row from live database", () => {
    const liveCaggRow: HourlyTelemetryBucket = {
      bucket: "2026-10-13T10:00:00.000Z",
      agentName: "scopeghost-core",
      totalActions: 14,
      successCount: 13,
      failureCount: 1,
      avgDurationMs: 1420.5,
      maxDurationMs: 2850,
      totalTokens: 4200,
      avgTokens: 300.0,
      source: "LIVE_CAGG",
    };

    const parsed = HourlyTelemetryBucketSchema.parse(liveCaggRow);
    expect(parsed.bucket).toBe("2026-10-13T10:00:00.000Z");
    expect(parsed.agentName).toBe("scopeghost-core");
    expect(parsed.totalActions).toBe(14);
    expect(parsed.successCount).toBe(13);
    expect(parsed.failureCount).toBe(1);
    expect(parsed.avgDurationMs).toBe(1420.5);
    expect(parsed.maxDurationMs).toBe(2850);
    expect(parsed.totalTokens).toBe(4200);
    expect(parsed.avgTokens).toBe(300.0);
    expect(parsed.source).toBe("LIVE_CAGG");
  });

  it("handles null average and maximum metrics gracefully", () => {
    const nullMetricRow = {
      bucket: "2026-10-13T11:00:00.000Z",
      agentName: "financial-auditor",
      totalActions: 2,
      successCount: 2,
      failureCount: 0,
      avgDurationMs: null,
      maxDurationMs: null,
      totalTokens: 0,
      avgTokens: null,
      source: "SYNTHETIC_FALLBACK",
    };

    const parsed = HourlyTelemetryBucketSchema.parse(nullMetricRow);
    expect(parsed.avgDurationMs).toBeNull();
    expect(parsed.maxDurationMs).toBeNull();
    expect(parsed.avgTokens).toBeNull();
    expect(parsed.source).toBe("SYNTHETIC_FALLBACK");
  });

  it("rejects invalid negative metrics in aggregate rows", () => {
    expect(() =>
      HourlyTelemetryBucketSchema.parse({
        bucket: "2026-10-13T11:00:00.000Z",
        agentName: "bad-agent",
        totalActions: -1,
        successCount: 0,
        failureCount: 0,
        avgDurationMs: null,
        maxDurationMs: null,
        totalTokens: 0,
        avgTokens: null,
      })
    ).toThrow();
  });

  it("computes accurate hourly buckets and metrics using computeHourlyRollup", () => {
    const rollup = computeHourlyRollup(VERIFIED_SYNTHETIC_EVENTS);

    // Verified events span 10:00 UTC and 11:00 UTC across 3 agents
    expect(rollup.length).toBeGreaterThanOrEqual(3);

    // Verify all buckets have valid ISO strings ending in 00:00.000Z
    for (const b of rollup) {
      expect(b.bucket).toMatch(/T\d\d:00:00\.000Z$/);
      expect(b.totalActions).toBeGreaterThanOrEqual(1);
      expect(b.totalActions).toBe(b.successCount + b.failureCount);
      expect(b.source).toBe("SYNTHETIC_FALLBACK");
    }

    // Verify ordering: descending by bucket, ascending by agentName
    for (let i = 1; i < rollup.length; i++) {
      const prev = rollup[i - 1];
      const curr = rollup[i];
      if (prev.bucket === curr.bucket) {
        expect(prev.agentName.localeCompare(curr.agentName)).toBeLessThanOrEqual(0);
      } else {
        expect(prev.bucket.localeCompare(curr.bucket)).toBeGreaterThan(0);
      }
    }
  });

  it("handles empty event lists in computeHourlyRollup without error", () => {
    const emptyRollup = computeHourlyRollup([]);
    expect(emptyRollup).toEqual([]);
  });

  it("verifies snapshot includes populated hourly rollup with explicit fallback source", () => {
    const snapshot = getVerifiedSnapshot();
    expect(snapshot.hourlyRollup).toBeDefined();
    expect(snapshot.hourlyRollup.length).toBeGreaterThan(0);

    for (const bucket of snapshot.hourlyRollup) {
      expect(bucket.source).toBe("SYNTHETIC_FALLBACK");
    }

    expect(snapshot.source).toBe("VERIFIED_SNAPSHOT");
    expect(snapshot.connectionInfo.connected).toBe(false);
  });
});

