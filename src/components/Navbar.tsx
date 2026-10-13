"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Cpu, AlertTriangle } from "lucide-react";

interface HealthState {
  ok: boolean;
  selectedModelAvailable: boolean;
  configuredModel?: string;
  loading: boolean;
  error?: string;
}

export function Navbar() {
  const [health, setHealth] = useState<HealthState>({
    ok: false,
    selectedModelAvailable: false,
    loading: true,
  });

  const checkHealth = async () => {
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setHealth({
        ok: data.ok,
        selectedModelAvailable: data.selectedModelAvailable,
        configuredModel: data.configuredModel,
        loading: false,
        error: data.error,
      });
    } catch {
      setHealth({
        ok: false,
        selectedModelAvailable: false,
        loading: false,
        error: "Cannot connect to Ollama",
      });
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-sm group-hover:bg-emerald-700 transition">
              SG
            </div>
            <span className="font-bold text-xl text-slate-900 tracking-tight">
              Scope<span className="text-emerald-600">Ghost</span>
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Local-First &bull; Private</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {health.loading ? (
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 rounded-md">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
              Checking Ollama...
            </div>
          ) : health.ok && health.selectedModelAvailable ? (
            <div
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md"
              title={`Connected to Ollama using ${health.configuredModel}`}
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ollama: {health.configuredModel}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
          ) : health.ok && !health.selectedModelAvailable ? (
            <div
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-md"
              title={`Model ${health.configuredModel} not found in Ollama`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Run: ollama pull {health.configuredModel || "gemma3:4b"}</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-rose-800 bg-rose-50 border border-rose-200 rounded-md"
              title="Ollama is not running. Start it with 'ollama serve'"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Ollama Offline (127.0.0.1:11434)</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
