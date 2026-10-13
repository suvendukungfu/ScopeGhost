"use client";

import React, { useState, useRef } from "react";
import { EvidenceSource, EvidenceChunk } from "@/lib/types";
import { UploadCloud, FileText, CheckCircle2, Hash, User, Calendar, AlertCircle } from "lucide-react";

interface Props {
  projectId: string;
  sources: EvidenceSource[];
  chunks: EvidenceChunk[];
  onEvidenceUploaded: (source: EvidenceSource, newChunks: EvidenceChunk[]) => void;
}

export function EvidenceUploader({
  projectId,
  sources,
  chunks,
  onEvidenceUploaded,
}: Props) {
  const [activeTab, setActiveTab] = useState<"UPLOAD" | "PASTE">("UPLOAD");
  const [isDragging, setIsDragging] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [pastedFilename, setPastedFilename] = useState("client_emails.txt");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setWarnings([]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/projects/${projectId}/evidence`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload file");

      onEvidenceUploaded(data.source, data.chunks);
      setWarnings(data.warnings || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload error");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) return;

    setIsUploading(true);
    setError(null);
    setWarnings([]);

    try {
      const res = await fetch(`/api/projects/${projectId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: pastedFilename.trim() || "pasted_notes.txt",
          rawContent: pastedText,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to ingest pasted evidence");

      onEvidenceUploaded(data.source, data.chunks);
      setWarnings(data.warnings || []);
      setPastedText("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ingestion error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-semibold text-slate-950">
            Evidence library
          </h2>
          <p className="text-sm text-slate-500">
            Import client emails, Slack messages, or ticket exports (.txt, .md, .csv).
            Content is sanitized and segmented into traceable, cited chunks.
          </p>
        </div>
        <p className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-900">
          Imported text is untrusted evidence. Original source text is preserved locally; normalization warnings are shown after import.
        </p>
        {warnings.length > 0 && (
          <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <p className="font-semibold">Import notes</p>
            {warnings.map((warning) => <p key={warning} className="mt-1">{warning}</p>)}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => setActiveTab("UPLOAD")}
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition ${
              activeTab === "UPLOAD"
                ? "border-emerald-600 text-emerald-800 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Upload File (.TXT, .MD, .CSV)
          </button>
          <button
            onClick={() => setActiveTab("PASTE")}
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition ${
              activeTab === "PASTE"
                ? "border-emerald-600 text-emerald-800 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Paste Text Directly
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === "UPLOAD" ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Choose or drop a .txt, .md, .markdown, or .csv evidence file"
              aria-disabled={isUploading}
              onKeyDown={(event) => {
                if (!isUploading && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                isDragging
                  ? "border-emerald-500 bg-emerald-50/50"
                  : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.markdown,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                  e.currentTarget.value = "";
                }}
              />
              <UploadCloud className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-800">
                {isUploading ? "Sanitizing and chunking..." : "Click or drag & drop evidence file here"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports Plain Text, Markdown, and CSV exports (with formula injection defense)
              </p>
            </div>
          ) : (
            <form onSubmit={handlePasteSubmit} className="space-y-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={pastedFilename}
                  onChange={(e) => setPastedFilename(e.target.value)}
                  placeholder="Filename label, e.g. client_slack_thread.txt"
                  className="w-full sm:w-72 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
              <textarea
                rows={6}
                required
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste client email or conversation text here..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isUploading ? "Ingesting..." : "Ingest & Chunk Text"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <section aria-labelledby="source-list-heading" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 id="source-list-heading" className="text-sm font-semibold text-slate-900">Imported source documents</h3>
          <span className="text-xs text-slate-500">{sources.length} local source{sources.length === 1 ? "" : "s"}</span>
        </div>
        {sources.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
            No sources yet. Import a text, Markdown, or CSV export to create stable evidence references.
          </div>
        ) : (
          <div className="grid gap-2">
            {sources.map((source) => (
              <details key={source.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-slate-900">{source.filename}</span>
                  <span className="font-mono text-xs text-indigo-700">{source.stableId}</span>
                  <span className="text-xs text-slate-500">{source.fileType} · {new Date(source.createdAt).toLocaleString()}</span>
                  {source.metadata.synthetic === true && (
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-2xs font-semibold text-sky-800">Synthetic demo data</span>
                  )}
                </summary>
                <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-100 bg-stone-50 p-3 text-xs leading-5 text-slate-700">{source.rawContent}</pre>
                {Array.isArray(source.metadata.normalizationWarnings) && source.metadata.normalizationWarnings.length > 0 && (
                  <p className="mt-2 text-xs text-amber-800">
                    {source.metadata.normalizationWarnings.join(" ")} The original above is unchanged.
                  </p>
                )}
              </details>
            ))}
          </div>
        )}
      </section>

      {/* Extracted Evidence Chunks Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Hash className="w-4 h-4 text-emerald-600" />
            <span>Extracted Evidence Chunks ({chunks.length})</span>
          </h3>
          <span className="text-xs text-slate-500">
            {sources.length} source file(s) ingested
          </span>
        </div>

        {chunks.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-500 text-xs">
            No evidence chunks ingested yet. Upload an email export or message thread above.
          </div>
        ) : (
          <div className="grid gap-3">
            {chunks.map((chunk) => (
              <div
                key={chunk.id}
                className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition shadow-2xs"
              >
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {chunk.stableId}
                    </span>
                    {chunk.author && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <User className="w-3 h-3 text-slate-400" /> {chunk.author}
                      </span>
                    )}
                    {chunk.timestampStr && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Calendar className="w-3 h-3 text-slate-400" /> {chunk.timestampStr}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400 text-2xs">
                    Chunk #{chunk.chunkIndex + 1}
                  </span>
                </div>

                <p className="text-xs text-slate-700 font-mono bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap leading-relaxed">
                  {chunk.textContent}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
