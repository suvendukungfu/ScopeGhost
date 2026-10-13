import React from "react";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { TigerTelemetryDashboard } from "@/components/TigerTelemetryDashboard";
import { getTigerTelemetry } from "@/lib/tiger/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tiger Cloud Agent Telemetry | ScopeGhost Demo",
  description:
    "Managed PostgreSQL and TimescaleDB telemetry dashboard for AI agents via Tiger Cloud MCP.",
};

export default async function TigerDemoPage() {
  const telemetry = await getTigerTelemetry();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TigerTelemetryDashboard initialData={telemetry} />
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>ScopeGhost &bull; Tiger Cloud MLH Demonstration &bull; Service db-68737</p>
          <p className="text-slate-400">
            Introspected via Tiger MCP. Server-side queries strictly read-only and sanitized.
          </p>
        </div>
      </footer>
    </div>
  );
}
