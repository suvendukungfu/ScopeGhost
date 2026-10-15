import type { AgentAggregate, AgentEvent, HourlyTelemetryBucket, TelemetrySummary } from "./types";

export function computeAggregates(events: AgentEvent[]): {
  summary: TelemetrySummary;
  agentAggregates: AgentAggregate[];
} {
  const totalActions = events.length;
  let successCount = 0;
  let failureCount = 0;
  let pendingCount = 0;
  let rateLimitedCount = 0;
  let totalDurationMs = 0;
  let durationCount = 0;
  let totalTokens = 0;

  const agentMap = new Map<
    string,
    {
      totalActions: number;
      successCount: number;
      failureCount: number;
      totalDurationMs: number;
      durationCount: number;
      totalTokens: number;
    }
  >();

  for (const event of events) {
    if (event.status === "SUCCESS") successCount++;
    else if (event.status === "FAILED") failureCount++;
    else if (event.status === "PENDING") pendingCount++;
    else if (event.status === "RATE_LIMITED") rateLimitedCount++;

    if (typeof event.durationMs === "number" && event.durationMs >= 0) {
      totalDurationMs += event.durationMs;
      durationCount++;
    }

    if (typeof event.tokensUsed === "number" && event.tokensUsed >= 0) {
      totalTokens += event.tokensUsed;
    }

    const current = agentMap.get(event.agentName) || {
      totalActions: 0,
      successCount: 0,
      failureCount: 0,
      totalDurationMs: 0,
      durationCount: 0,
      totalTokens: 0,
    };

    current.totalActions++;
    if (event.status === "SUCCESS") current.successCount++;
    if (event.status === "FAILED") current.failureCount++;
    if (typeof event.durationMs === "number" && event.durationMs >= 0) {
      current.totalDurationMs += event.durationMs;
      current.durationCount++;
    }
    if (typeof event.tokensUsed === "number" && event.tokensUsed >= 0) {
      current.totalTokens += event.tokensUsed;
    }

    agentMap.set(event.agentName, current);
  }

  const avgDurationMs =
    durationCount > 0 ? Math.round((totalDurationMs / durationCount) * 10) / 10 : 0;
  const successRatePercent =
    totalActions > 0
      ? Math.round((successCount / totalActions) * 1000) / 10
      : 0;

  const agentAggregates: AgentAggregate[] = Array.from(agentMap.entries())
    .map(([agentName, stats]) => ({
      agentName,
      totalActions: stats.totalActions,
      successCount: stats.successCount,
      failureCount: stats.failureCount,
      avgDurationMs:
        stats.durationCount > 0
          ? Math.round((stats.totalDurationMs / stats.durationCount) * 100) / 100
          : 0,
      totalTokens: stats.totalTokens,
    }))
    .sort((a, b) => b.totalActions - a.totalActions);

  const summary: TelemetrySummary = {
    totalActions,
    successCount,
    failureCount,
    pendingCount,
    rateLimitedCount,
    successRatePercent,
    avgDurationMs,
    totalTokens,
  };

  return { summary, agentAggregates };
}

/**
 * Computes deterministic hourly telemetry buckets from an array of AgentEvents.
 * Serves as an exact algorithmic reference for TimescaleDB time_bucket('1 hour', created_at)
 * and provides verified fallback when the live CAGG is empty or during offline testing.
 */
export function computeHourlyRollup(events: AgentEvent[]): HourlyTelemetryBucket[] {
  const bucketMap = new Map<
    string,
    {
      bucket: string;
      agentName: string;
      totalActions: number;
      successCount: number;
      failureCount: number;
      totalDurationMs: number;
      durationCount: number;
      maxDurationMs: number | null;
      totalTokens: number;
      tokensCount: number;
    }
  >();

  for (const event of events) {
    const d = new Date(event.createdAt);
    if (isNaN(d.getTime())) continue;

    d.setUTCMinutes(0, 0, 0);
    const bucketIso = d.toISOString();
    const key = `${bucketIso}::${event.agentName}`;

    const existing = bucketMap.get(key) || {
      bucket: bucketIso,
      agentName: event.agentName,
      totalActions: 0,
      successCount: 0,
      failureCount: 0,
      totalDurationMs: 0,
      durationCount: 0,
      maxDurationMs: null,
      totalTokens: 0,
      tokensCount: 0,
    };

    existing.totalActions++;
    if (event.status === "SUCCESS") existing.successCount++;
    if (event.status === "FAILED") existing.failureCount++;

    if (typeof event.durationMs === "number" && event.durationMs >= 0) {
      existing.totalDurationMs += event.durationMs;
      existing.durationCount++;
      existing.maxDurationMs =
        existing.maxDurationMs === null
          ? event.durationMs
          : Math.max(existing.maxDurationMs, event.durationMs);
    }

    if (typeof event.tokensUsed === "number" && event.tokensUsed >= 0) {
      existing.totalTokens += event.tokensUsed;
      existing.tokensCount++;
    }

    bucketMap.set(key, existing);
  }

  return Array.from(bucketMap.values())
    .map((b) => ({
      bucket: b.bucket,
      agentName: b.agentName,
      totalActions: b.totalActions,
      successCount: b.successCount,
      failureCount: b.failureCount,
      avgDurationMs:
        b.durationCount > 0
          ? Math.round((b.totalDurationMs / b.durationCount) * 10) / 10
          : null,
      maxDurationMs: b.maxDurationMs,
      totalTokens: b.totalTokens,
      avgTokens:
        b.tokensCount > 0
          ? Math.round((b.totalTokens / b.tokensCount) * 10) / 10
          : null,
      source: "SYNTHETIC_FALLBACK" as const,
    }))
    .sort((a, b) => {
      const cmp = b.bucket.localeCompare(a.bucket);
      if (cmp !== 0) return cmp;
      return a.agentName.localeCompare(b.agentName);
    });
}
