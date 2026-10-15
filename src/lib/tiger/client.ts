import { Pool } from "pg";
import { computeAggregates, computeHourlyRollup } from "./aggregates";
import {
  AgentEventSchema,
  HourlyTelemetryBucketSchema,
  TigerTelemetryResponseSchema,
} from "./schemas";
import { getVerifiedSnapshot, HISTORICAL_MCP_EVIDENCE } from "./snapshot";
import type { AgentEvent, HourlyTelemetryBucket, TigerTelemetryResponse } from "./types";

let cachedPool: Pool | null = null;

function getPgPool(connectionString: string): Pool {
  if (!cachedPool) {
    cachedPool = new Pool({
      connectionString,
      connectionTimeoutMillis: 3000,
      statement_timeout: 5000,
      query_timeout: 5000,
      max: 3,
      ssl: process.env.TIGER_SSL_DISABLE === "true" ? false : { rejectUnauthorized: false },
    });
  }
  return cachedPool;
}

/**
 * Server-only data access layer for Tiger Cloud Agent Telemetry.
 * Returns live data if TIGER_DATABASE_URL is configured and reachable;
 * otherwise gracefully falls back to the verified synthetic demonstration snapshot.
 * Never exposes credentials, tokens, or connection strings to callers.
 */
export async function getTigerTelemetry(): Promise<TigerTelemetryResponse> {
  const dbUrl = process.env.TIGER_DATABASE_URL?.trim();

  if (!dbUrl) {
    return getVerifiedSnapshot(
      "Live connectivity unconfigured (TIGER_DATABASE_URL environment variable is unset). Displaying verified synthetic snapshot from Tiger Cloud service ysa2cqiz8e."
    );
  }

  try {
    const pool = getPgPool(dbUrl);
    // Explicit read-only transaction and query
    const client = await pool.connect();
    let rows: unknown[] = [];
    let hourlyRows: unknown[] = [];
    try {
      await client.query("SET TRANSACTION READ ONLY;");
      const res = await client.query(`
        SELECT
          id,
          created_at,
          agent_name,
          action,
          status,
          model_name,
          duration_ms,
          tokens_used,
          metadata
        FROM agent_events
        ORDER BY created_at DESC
        LIMIT 50;
      `);
      rows = res.rows;

      // Query hourly continuous aggregate with parameterized lookback limit
      try {
        const caggRes = await client.query(
          `
          SELECT
            bucket,
            agent_name,
            total_actions,
            success_count,
            failure_count,
            avg_duration_ms,
            max_duration_ms,
            total_tokens,
            avg_tokens
          FROM agent_telemetry_hourly
          ORDER BY bucket DESC, agent_name ASC
          LIMIT $1;
        `,
          [48]
        );
        hourlyRows = caggRes.rows;
      } catch (caggErr) {
        console.warn(
          "[TigerTelemetry] Continuous aggregate view query fallback:",
          caggErr instanceof Error ? caggErr.message : String(caggErr)
        );
      }
    } finally {
      client.release();
    }

    const validatedEvents: AgentEvent[] = [];
    for (const r of rows) {
      const raw = r as Record<string, unknown>;
      const parsed = AgentEventSchema.safeParse({
        id: Number(raw.id),
        createdAt:
          raw.created_at instanceof Date
            ? raw.created_at.toISOString()
            : String(raw.created_at),
        agentName: String(raw.agent_name),
        action: String(raw.action),
        status: raw.status,
        modelName: raw.model_name ? String(raw.model_name) : null,
        durationMs:
          typeof raw.duration_ms === "number"
            ? raw.duration_ms
            : raw.duration_ms !== null && raw.duration_ms !== undefined
            ? Number(raw.duration_ms)
            : null,
        tokensUsed:
          typeof raw.tokens_used === "number"
            ? raw.tokens_used
            : raw.tokens_used !== null && raw.tokens_used !== undefined
            ? Number(raw.tokens_used)
            : null,
        metadata:
          raw.metadata && typeof raw.metadata === "object"
            ? (raw.metadata as Record<string, unknown>)
            : null,
        isSynthetic:
          raw.metadata &&
          typeof raw.metadata === "object" &&
          (raw.metadata as Record<string, unknown>).synthetic === true,
      });

      if (parsed.success) {
        validatedEvents.push(parsed.data);
      }
    }

    if (validatedEvents.length === 0) {
      return getVerifiedSnapshot(
        "Live database query returned 0 rows in agent_events. Displaying verified synthetic demonstration snapshot."
      );
    }

    const { summary, agentAggregates } = computeAggregates(validatedEvents);

    const validatedHourly: HourlyTelemetryBucket[] = [];
    for (const hr of hourlyRows) {
      const rawH = hr as Record<string, unknown>;
      const parsedH = HourlyTelemetryBucketSchema.safeParse({
        bucket:
          rawH.bucket instanceof Date
            ? rawH.bucket.toISOString()
            : String(rawH.bucket),
        agentName: String(rawH.agent_name),
        totalActions: Number(rawH.total_actions ?? 0),
        successCount: Number(rawH.success_count ?? 0),
        failureCount: Number(rawH.failure_count ?? 0),
        avgDurationMs:
          rawH.avg_duration_ms !== null && rawH.avg_duration_ms !== undefined
            ? Number(rawH.avg_duration_ms)
            : null,
        maxDurationMs:
          rawH.max_duration_ms !== null && rawH.max_duration_ms !== undefined
            ? Number(rawH.max_duration_ms)
            : null,
        totalTokens: Number(rawH.total_tokens ?? 0),
        avgTokens:
          rawH.avg_tokens !== null && rawH.avg_tokens !== undefined
            ? Number(rawH.avg_tokens)
            : null,
        source: "LIVE_CAGG",
      });

      if (parsedH.success) {
        validatedHourly.push(parsedH.data);
      }
    }

    const hourlyRollup =
      validatedHourly.length > 0
        ? validatedHourly
        : computeHourlyRollup(validatedEvents);

    const response: TigerTelemetryResponse = {
      source: "LIVE_DATABASE",
      serviceId: process.env.TIGER_SERVICE_ID || "ysa2cqiz8e",
      databaseName: "agent_events",
      summary,
      agentAggregates,
      recentEvents: validatedEvents,
      connectionInfo: {
        configured: true,
        connected: true,
        message: "Successfully connected to live Tiger Cloud PostgreSQL database.",
      },
      historicalMcpEvidence: HISTORICAL_MCP_EVIDENCE,
      hourlyRollup,
    };

    return TigerTelemetryResponseSchema.parse(response);
  } catch (err: unknown) {
    // Sanitize error: never leak connection string, credentials, or stack traces
    const message =
      err instanceof Error
        ? `Database error: ${err.message.replace(/:\/\/.*@/, "://***@")}`
        : "Database connection failed.";

    console.warn("[TigerTelemetry] Live query fallback:", message);

    return getVerifiedSnapshot(
      "Connection to live Tiger Cloud database failed or timed out. Gracefully displaying verified synthetic snapshot."
    );
  }
}
