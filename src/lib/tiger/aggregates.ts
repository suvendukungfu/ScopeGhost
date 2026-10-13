import type { AgentAggregate, AgentEvent, TelemetrySummary } from "./types";

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
