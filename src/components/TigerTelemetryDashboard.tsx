"use client";

import React, { useState } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  Database,
  RefreshCw,
  Server,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  Terminal,
  ShieldCheck,
  AlertTriangle,
  Layers,
  BarChart3,
} from "lucide-react";
import type {
  AgentEvent,
  HourlyTelemetryBucket,
  McpExecutionEvidence,
  TigerTelemetryResponse,
} from "@/lib/tiger/types";

interface Props {
  initialData: TigerTelemetryResponse;
}

function formatUtcTime(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss} UTC`;
}

export function TigerTelemetryDashboard({ initialData }: Props) {
  const [data, setData] = useState<TigerTelemetryResponse>(initialData);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const refreshData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/tiger-telemetry");
      if (!res.ok) {
        throw new Error(`Failed to reload telemetry (HTTP ${res.status})`);
      }
      const json = (await res.json()) as TigerTelemetryResponse;
      setData(json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to reach telemetry API";
      setErrorMessage(msg);
      console.warn("[TigerTelemetryDashboard] Refresh warning:", msg);
    } finally {
      setLoading(false);
    }
  };

  const isLive = data.source === "LIVE_DATABASE";
  const { summary, agentAggregates, recentEvents, connectionInfo, historicalMcpEvidence = [], hourlyRollup = [] } = data;

  const filteredEvents = recentEvents.filter((event: AgentEvent) => {
    if (statusFilter === "ALL") return true;
    return event.status === statusFilter;
  });

  // Safe percentage calculations (avoid NaN or division-by-zero)
  const total = summary.totalActions;
  const successPercent = total > 0 ? (summary.successCount / total) * 100 : 0;
  const failurePercent = total > 0 ? (summary.failureCount / total) * 100 : 0;

  // Maximum latency for CSS bar scaling (at least 1 to avoid division by zero)
  const maxEventLatency = Math.max(
    ...recentEvents.map((e) => e.durationMs ?? 0),
    1
  );

  return (
    <div className="space-y-8" aria-busy={loading}>
      {/* Top Banner / Heading */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-amber-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Tiger Cloud Agent Telemetry
                </h1>
                <span className="hidden sm:inline-block rounded-md border border-slate-200 bg-white px-2 py-0.5 text-2xs font-mono font-medium text-slate-600">
                  TimescaleDB
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Managed PostgreSQL / TimescaleDB telemetry for autonomous AI agent actions
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Data Origin Pill */}
          {isLive ? (
            <div
              role="status"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>Live Tiger Cloud: {data.serviceId || "db-68737"}</span>
            </div>
          ) : (
            <div
              role="status"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Verified Snapshot (Tiger Service: ysa2cqiz8e)</span>
            </div>
          )}

          {/* Refresh Action */}
          <button
            onClick={refreshData}
            disabled={loading}
            aria-label="Refresh telemetry data"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-indigo-600"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            <span>{loading ? "Reloading..." : "Refresh"}</span>
          </button>
        </div>
      </header>

      {/* Error Alert if Refresh Fails */}
      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Failed to reload live telemetry</p>
            <p className="text-rose-700 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Connectivity & Provenance Notice */}
      <section
        aria-label="Connection Status and Provenance"
        className={`rounded-xl border p-4 text-xs ${
          isLive
            ? "border-emerald-200 bg-emerald-50/60 text-emerald-950"
            : "border-slate-200 bg-white text-slate-700"
        }`}
      >
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">
                {isLive ? "Active Live Connection" : "Data Provenance & Safety Notice"}
              </span>
              <span className="text-2xs rounded bg-slate-100 px-1.5 py-0.2 font-mono text-slate-600">
                Service: {data.serviceId || "ysa2cqiz8e"}
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              {connectionInfo.message}
            </p>
            {!isLive && (
              <p className="text-slate-500 text-2xs pt-1">
                Note: In environments where <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-700">TIGER_DATABASE_URL</code> is configured, the server-side access layer queries Tiger Cloud directly via read-only PostgreSQL. When unconfigured, it safely falls back to this verified snapshot.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* KPI Cards Grid */}
      <section aria-label="Key Performance Indicators" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Actions */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Agent Actions</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {summary.totalActions}
            </div>
            <p className="text-xs text-slate-500 mt-1">Recorded telemetry events</p>
          </div>
        </div>

        {/* Success Rate */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Success Rate</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {total > 0 ? `${summary.successRatePercent}%` : "0%"}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {summary.successCount} passed · {summary.failureCount} failed
            </p>
          </div>
        </div>

        {/* Average Latency */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Avg Execution Latency</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {summary.avgDurationMs.toLocaleString()} <span className="text-sm font-normal text-slate-500">ms</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Deterministic execution time</p>
          </div>
        </div>

        {/* Tokens Used */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Tokens</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {summary.totalTokens.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">Consumed across model calls</p>
          </div>
        </div>
      </section>

      {/* Outcome Distribution Bar */}
      <section aria-label="Status Distribution" className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Execution Status Distribution</h2>
          <span className="text-xs text-slate-500">{total} total samples</span>
        </div>

        {total > 0 ? (
          <>
            {/* Segmented Progress Bar */}
            <div
              role="progressbar"
              aria-label="Execution Success and Failure Ratio"
              aria-valuenow={summary.successRatePercent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex"
            >
              <div
                style={{ width: `${successPercent}%` }}
                className="bg-emerald-500 h-full transition-all duration-300"
                title={`Success: ${summary.successCount}`}
              />
              <div
                style={{ width: `${failurePercent}%` }}
                className="bg-rose-500 h-full transition-all duration-300"
                title={`Failed: ${summary.failureCount}`}
              />
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
                <span>SUCCESS: {summary.successCount} ({successPercent.toFixed(1)}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-500 inline-block"></span>
                <span>FAILED: {summary.failureCount} ({failurePercent.toFixed(1)}%)</span>
              </div>
              {summary.pendingCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-500 inline-block"></span>
                  <span>PENDING: {summary.pendingCount}</span>
                </div>
              )}
              {summary.rateLimitedCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-purple-500 inline-block"></span>
                  <span>RATE_LIMITED: {summary.rateLimitedCount}</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-500 py-2">No event records available to calculate distribution.</p>
        )}
      </section>

      {/* Compact "Last MCP Query" Evidence Panel (MLH Submission Focus) */}
      <section
        aria-label="Historical Antigravity MCP Execution Evidence"
        className="rounded-xl border border-indigo-100 bg-white p-5 shadow-2xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Antigravity Tiger MCP Execution Evidence
              </h2>
              <p className="text-xs text-slate-500">
                Verifiable record of tool calls executed directly by the AI agent on Tiger Cloud service <span className="font-mono text-indigo-700">ysa2cqiz8e</span>
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-2xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Audited MCP Session</span>
          </div>
        </div>

        {/* Honest Provenance Disclaimer */}
        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-lg border border-slate-100">
          <strong>Provenance:</strong> The evidence below documents actual tool executions performed through Antigravity&apos;s Tiger MCP server during repository setup and database schema inspection. The web application&apos;s Next.js server accesses Tiger Cloud independently when <code className="font-mono bg-white px-1 py-0.5 rounded text-indigo-700">TIGER_DATABASE_URL</code> is configured.
        </p>

        {/* Evidence Cards */}
        {historicalMcpEvidence.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {historicalMcpEvidence.map((ev: McpExecutionEvidence, idx: number) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2 text-xs shadow-2xs hover:border-indigo-200 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-2xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {ev.toolName}
                  </span>
                  <span className="inline-flex items-center gap-1 text-2xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-2.5 h-2.5" /> {ev.status}
                  </span>
                </div>

                <div className="font-medium text-slate-900 text-xs">
                  {ev.operationDescription}
                </div>

                {ev.queryOrCommand && (
                  <pre className="text-2xs font-mono bg-slate-50 text-slate-700 p-2 rounded border border-slate-100 overflow-x-auto whitespace-pre-wrap wrap-break-word max-h-20">
                    {ev.queryOrCommand}
                  </pre>
                )}

                <div className="flex items-center justify-between pt-1 text-2xs text-slate-500 border-t border-slate-100">
                  <span>
                    Duration: <strong className="text-slate-800">{ev.durationMs > 0 ? `${ev.durationMs} ms` : "Verified"}</strong>
                  </span>
                  {typeof ev.rowsAffectedOrReturned === "number" && (
                    <span>
                      Rows: <strong className="text-slate-800">{ev.rowsAffectedOrReturned}</strong>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic py-2">
            No historical MCP evidence records currently attached.
          </p>
        )}
      </section>

      {/* Lightweight CSS Latency Visualization (Section 3.G) */}
      <section
        aria-label="Event Latency Comparison"
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Event Execution Latency Comparison
            </h2>
            <p className="text-xs text-slate-500">
              Discrete execution latency across the 5 synthetic demonstration events
            </p>
          </div>
          <span className="text-2xs font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 self-start sm:self-auto">
            Synthetic Demonstration Snapshot
          </span>
        </div>

        {recentEvents.length > 0 ? (
          <div className="space-y-2.5 pt-2">
            {recentEvents.map((event) => {
              const duration = event.durationMs ?? 0;
              const barPercent = Math.min(Math.round((duration / maxEventLatency) * 100), 100);
              const isFail = event.status === "FAILED";

              return (
                <div key={event.id} className="text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-mono text-2xs text-slate-600">
                      #{event.id} &bull; <strong className="text-slate-900">{event.agentName}</strong> ({event.action})
                    </span>
                    <span className="font-mono text-2xs font-semibold text-slate-800">
                      {duration > 0 ? `${duration.toLocaleString()} ms` : "—"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                    <div
                      style={{ width: `${barPercent}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        isFail ? "bg-rose-500" : "bg-indigo-600"
                      }`}
                      title={`Event #${event.id}: ${duration} ms`}
                    />
                  </div>
                </div>
              );
            })}
            <p className="text-2xs text-slate-400 pt-1">
              *Note: Represents sample latency profile for single-step agent tasks. Does not suggest statistical trends from 5 samples.
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-2">No event records available for latency comparison.</p>
        )}
      </section>

      {/* Hourly Continuous Aggregate Section (TimescaleDB CAGG) */}
      <section
        aria-label="Hourly Continuous Aggregate Rollup"
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900">
                  Hourly Telemetry Continuous Aggregate
                </h2>
                <span className="hidden sm:inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-2xs font-mono font-medium text-indigo-700 border border-indigo-100">
                  agent_telemetry_hourly
                </span>
              </div>
              <p className="text-xs text-slate-500">
                TimescaleDB continuous aggregate materialized by <code className="font-mono text-indigo-700">time_bucket(&apos;1 hour&apos;, created_at)</code>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-2xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>Window: 48h limit</span>
            </span>
            {hourlyRollup.some((b) => b.source === "LIVE_CAGG") ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-2xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>TimescaleDB Live View</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-2xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <Info className="w-3 h-3 text-amber-600" />
                <span>Snapshot Fallback</span>
              </span>
            )}
          </div>
        </div>

        {/* Visual Bar Cards or Table */}
        {hourlyRollup.length > 0 ? (
          <div className="space-y-4">
            {/* Visual throughput cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {hourlyRollup.map((bucket: HourlyTelemetryBucket, idx: number) => {
                const bucketTotal = bucket.totalActions;
                const bucketSuccessPct = bucketTotal > 0 ? Math.round((bucket.successCount / bucketTotal) * 100) : 0;
                const bucketFailPct = 100 - bucketSuccessPct;
                const formattedTime = formatUtcTime(bucket.bucket);
                const isLiveCagg = bucket.source === "LIVE_CAGG";

                return (
                  <div
                    key={`${bucket.bucket}-${bucket.agentName}-${idx}`}
                    className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5 hover:border-indigo-200 transition text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-mono text-2xs text-slate-600">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="font-semibold text-slate-800">{formattedTime}</span>
                      </div>
                      <span className="font-mono text-2xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">
                        {bucket.agentName}
                      </span>
                    </div>

                    {/* Action Counts & Success Rate */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-2xs">
                        <span className="text-slate-500 font-medium">
                          Throughput: <strong className="text-slate-900">{bucket.totalActions} actions</strong>
                        </span>
                        <span className="text-slate-600 font-mono">
                          {bucket.successCount} ok / {bucket.failureCount} fail ({bucketSuccessPct}%)
                        </span>
                      </div>
                      {/* Mini Progress Bar */}
                      <div
                        role="progressbar"
                        aria-label={`Bucket ${formattedTime} Success Rate`}
                        aria-valuenow={bucketSuccessPct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex"
                      >
                        <div
                          style={{ width: `${bucketSuccessPct}%` }}
                          className="bg-emerald-500 h-full transition-all duration-300"
                        />
                        <div
                          style={{ width: `${bucketFailPct}%` }}
                          className="bg-rose-500 h-full transition-all duration-300"
                        />
                      </div>
                    </div>

                    {/* Latency and Tokens metrics */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-2xs">
                      <div>
                        <span className="text-slate-400 block">Avg / Max Latency</span>
                        <span className="font-mono font-medium text-slate-700">
                          {bucket.avgDurationMs !== null ? `${bucket.avgDurationMs}ms` : "—"} /{" "}
                          {bucket.maxDurationMs !== null ? `${bucket.maxDurationMs}ms` : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Total / Avg Tokens</span>
                        <span className="font-mono font-medium text-slate-700">
                          {bucket.totalTokens} / {bucket.avgTokens !== null ? bucket.avgTokens : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Origin Tag */}
                    <div className="flex items-center justify-between pt-1 text-3xs text-slate-400">
                      <span>Source: {isLiveCagg ? "TimescaleDB CAGG" : "Snapshot Fallback"}</span>
                      <span className="font-mono">{bucket.bucket.substring(0, 10)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Accessible Tabular Alternative */}
            <div className="pt-2">
              <details className="group text-xs text-slate-600">
                <summary className="cursor-pointer font-medium text-slate-700 hover:text-indigo-600 inline-flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-indigo-600 rounded">
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>View Full Hourly Aggregate Data Table ({hourlyRollup.length} buckets)</span>
                </summary>
                <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
                  <table
                    aria-label="Hourly Continuous Aggregate Data Table"
                    className="w-full text-left text-2xs"
                  >
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Hour Bucket (UTC)</th>
                        <th className="py-2 px-3">Agent</th>
                        <th className="py-2 px-3">Actions</th>
                        <th className="py-2 px-3">Pass / Fail</th>
                        <th className="py-2 px-3">Avg Latency</th>
                        <th className="py-2 px-3">Max Latency</th>
                        <th className="py-2 px-3">Total Tokens</th>
                        <th className="py-2 px-3">Avg Tokens</th>
                        <th className="py-2 px-3">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {hourlyRollup.map((bucket: HourlyTelemetryBucket, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                            {bucket.bucket}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-900">
                            {bucket.agentName}
                          </td>
                          <td className="py-2 px-3 font-semibold">{bucket.totalActions}</td>
                          <td className="py-2 px-3">
                            <span className="text-emerald-700">{bucket.successCount}</span> /{" "}
                            <span className={bucket.failureCount > 0 ? "text-rose-700" : "text-slate-400"}>
                              {bucket.failureCount}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono">
                            {bucket.avgDurationMs !== null ? `${bucket.avgDurationMs} ms` : "—"}
                          </td>
                          <td className="py-2 px-3 font-mono">
                            {bucket.maxDurationMs !== null ? `${bucket.maxDurationMs} ms` : "—"}
                          </td>
                          <td className="py-2 px-3 font-mono">{bucket.totalTokens}</td>
                          <td className="py-2 px-3 font-mono">
                            {bucket.avgTokens !== null ? bucket.avgTokens : "—"}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-3xs font-medium ${
                                bucket.source === "LIVE_CAGG"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {bucket.source || "SNAPSHOT"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-slate-500 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
            <p className="font-medium text-slate-600">No hourly aggregate records found.</p>
            <p className="text-2xs text-slate-400 mt-1">
              Continuous aggregate view <code className="font-mono">agent_telemetry_hourly</code> returned zero buckets for the query window.
            </p>
          </div>
        )}
      </section>

      {/* Two Column Section: Agent Aggregates + Architecture Note */}
      <section aria-label="Agent Workload and Architecture" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Aggregates Table (2 cols) */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-700" />
              Per-Agent Workload & Performance
            </h2>
            <span className="text-xs text-slate-500">
              {agentAggregates.length} agents tracked
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Agent Name</th>
                  <th className="py-2.5 px-3">Actions</th>
                  <th className="py-2.5 px-3">Success / Fail</th>
                  <th className="py-2.5 px-3">Avg Latency</th>
                  <th className="py-2.5 px-3">Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {agentAggregates.length > 0 ? (
                  agentAggregates.map((agent) => (
                    <tr key={agent.agentName} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        <span className="font-mono text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded">
                          {agent.agentName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold">{agent.totalActions}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-emerald-700 font-medium">{agent.successCount}</span> /{" "}
                        <span className={agent.failureCount > 0 ? "text-rose-700 font-medium" : "text-slate-400"}>
                          {agent.failureCount}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">{agent.avgDurationMs} ms</td>
                      <td className="py-2.5 px-3 font-mono">{agent.totalTokens}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-500 italic">
                      No agent records available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tiger Cloud & MCP Integration Spec (1 col) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-600" />
            Tiger MCP Architecture
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Tiger Cloud provides managed PostgreSQL &amp; TimescaleDB. Antigravity connects directly via the Tiger MCP server for development, service inspection, and verified telemetry recording.
          </p>
          <div className="rounded-lg bg-slate-50 p-3 text-2xs space-y-1.5 border border-slate-100 font-mono text-slate-700">
            <div><span className="text-indigo-600">Service:</span> db-68737</div>
            <div><span className="text-indigo-600">Service ID:</span> ysa2cqiz8e</div>
            <div><span className="text-indigo-600">Table:</span> agent_events</div>
            <div><span className="text-indigo-600">Engine:</span> TimescaleDB 2.x</div>
            <div><span className="text-indigo-600">MCP Tools:</span> service_list, db_schema, db_query</div>
          </div>
          <p className="text-2xs text-slate-500 pt-1">
            Data access from Next.js is isolated to server-side read-only queries with strict error sanitization. No credentials touch client code.
          </p>
        </div>
      </section>

      {/* Recent Events Table */}
      <section aria-label="Recent Events Log" className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Recent Telemetry Activity</h2>
            <p className="text-xs text-slate-500">
              Chronological log of agent tool calls, plan generations, and outcomes
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label htmlFor="status-filter" className="text-slate-500">Filter status:</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:outline-indigo-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="PENDING">PENDING</option>
              <option value="RATE_LIMITED">RATE_LIMITED</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Event ID</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Agent</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Latency</th>
                <th className="py-2.5 px-3">Tokens</th>
                <th className="py-2.5 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredEvents.length > 0 ? (
                filteredEvents.map((event: AgentEvent) => {
                  const isExpanded = expandedRow === event.id;
                  return (
                    <React.Fragment key={event.id}>
                      <tr className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3 font-mono text-slate-500">#{event.id}</td>
                        <td
                          className="py-2.5 px-3 text-slate-600 whitespace-nowrap"
                          suppressHydrationWarning
                          title={event.createdAt}
                        >
                          {formatUtcTime(event.createdAt)}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {event.agentName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-indigo-700">
                          {event.action}
                        </td>
                        <td className="py-2.5 px-3">
                          {event.status === "SUCCESS" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> SUCCESS
                            </span>
                          )}
                          {event.status === "FAILED" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3" /> FAILED
                            </span>
                          )}
                          {event.status === "PENDING" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              PENDING
                            </span>
                          )}
                          {event.status === "RATE_LIMITED" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                              RATE_LIMITED
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {event.modelName ? (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-2xs text-slate-700">
                              {event.modelName}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {event.durationMs !== null ? `${event.durationMs} ms` : "—"}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {event.tokensUsed !== null ? event.tokensUsed : "—"}
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : event.id)}
                            aria-expanded={isExpanded}
                            className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600 cursor-pointer focus-visible:outline-2 focus-visible:outline-indigo-600 rounded px-1"
                          >
                            <span className="text-2xs font-medium">
                              {isExpanded ? "Hide" : "Payload"}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={9} className="p-3">
                            <div className="rounded-lg border border-slate-200 bg-white p-3 text-2xs font-mono space-y-1">
                              <div className="text-slate-500 font-sans font-semibold">
                                Metadata &amp; Diagnostic Payload:
                              </div>
                              <pre className="overflow-auto text-slate-800">
                                {JSON.stringify(event.metadata, null, 2)}
                              </pre>
                              {event.isSynthetic && (
                                <div className="text-amber-700 font-sans pt-1">
                                  Notice: Verified synthetic demonstration record on Tiger Cloud service ysa2cqiz8e.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-4 text-center text-slate-500 italic">
                    No events match the selected status filter ({statusFilter}).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
