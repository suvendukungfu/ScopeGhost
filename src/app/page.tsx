import React from "react";

export default function HomePage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <header className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Local-First &bull; Zero Cloud Leakage
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Scope<span className="text-emerald-600">Ghost</span>
        </h1>
        <p className="mt-3 text-lg text-slate-600 max-w-2xl mx-auto">
          Audit client requests against your baseline agreement, verify evidence citations, calculate costs deterministically, and generate change orders.
        </p>
      </header>
    </main>
  );
}
