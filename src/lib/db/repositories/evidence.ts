import { DatabaseSync } from "node:sqlite";
import { EvidenceSource, EvidenceChunk, FileType } from "@/lib/types";
import crypto from "node:crypto";

export interface CreateEvidenceSourceInput {
  projectId: string;
  stableId?: string;
  filename: string;
  fileType: FileType;
  rawContent: string;
  sourceHash: string;
  metadataJson?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateEvidenceChunkInput {
  sourceId: string;
  projectId: string;
  chunkIndex: number;
  stableId: string;
  textContent: string;
  author?: string | null;
  timestampStr?: string | null;
  metadata?: Record<string, string>;
}

interface EvidenceSourceRow {
  id: string;
  stable_id: string;
  project_id: string;
  filename: string;
  file_type: FileType;
  raw_content: string;
  source_hash: string;
  metadata_json: string;
  created_at: string;
}

interface EvidenceChunkRow {
  id: string;
  source_id: string;
  project_id: string;
  chunk_index: number;
  stable_id: string;
  text_content: string;
  author: string | null;
  timestamp_str: string | null;
  metadata_json: string;
}

function parseMetadata(json: string): Record<string, unknown> {
  const value: unknown = JSON.parse(json);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Stored evidence metadata is not a JSON object");
  }
  return value as Record<string, unknown>;
}

function mapRowToSource(row: EvidenceSourceRow): EvidenceSource {
  return {
    id: row.id,
    stableId: row.stable_id,
    projectId: row.project_id,
    filename: row.filename,
    fileType: row.file_type,
    rawContent: row.raw_content,
    sourceHash: row.source_hash,
    metadataJson: row.metadata_json,
    metadata: parseMetadata(row.metadata_json),
    createdAt: row.created_at,
  };
}

function mapRowToChunk(row: EvidenceChunkRow): EvidenceChunk {
  return {
    id: row.id,
    sourceId: row.source_id,
    projectId: row.project_id,
    chunkIndex: row.chunk_index,
    stableId: row.stable_id,
    textContent: row.text_content,
    author: row.author,
    timestampStr: row.timestamp_str,
    metadata: parseMetadata(row.metadata_json) as Record<string, string>,
  };
}

export class EvidenceRepository {
  constructor(private db: DatabaseSync) {}

  private withTransaction<T>(write: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = write();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  createSource(
    input: CreateEvidenceSourceInput,
    customId?: string
  ): EvidenceSource {
    const id = customId || crypto.randomUUID();
    const stableId = input.stableId || `DOC-${id}`;
    const now = new Date().toISOString();
    const metadataJson = input.metadataJson ?? JSON.stringify(input.metadata ?? {});
    const metadata = parseMetadata(metadataJson);

    const duplicate = this.db
      .prepare("SELECT 1 FROM evidence_sources WHERE project_id = ? AND stable_id = ?")
      .get(input.projectId, stableId);
    if (duplicate) {
      throw new Error(`Duplicate source document ID "${stableId}" in this project`);
    }

    const stmt = this.db.prepare(`
      INSERT INTO evidence_sources (
        id, project_id, stable_id, filename, file_type, raw_content, source_hash, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.projectId,
      stableId,
      input.filename,
      input.fileType,
      input.rawContent,
      input.sourceHash,
      metadataJson,
      now
    );

    return {
      id,
      stableId,
      projectId: input.projectId,
      filename: input.filename,
      fileType: input.fileType,
      rawContent: input.rawContent,
      sourceHash: input.sourceHash,
      metadataJson,
      metadata,
      createdAt: now,
    };
  }

  createSourceWithChunks(
    input: CreateEvidenceSourceInput,
    chunks: Omit<CreateEvidenceChunkInput, "sourceId" | "projectId">[],
    auditMetadata: Record<string, unknown> = {}
  ): { source: EvidenceSource; chunks: EvidenceChunk[] } {
    return this.withTransaction(() => {
      const source = this.createSource(input);
      const createdChunks = this.insertChunks(
        chunks.map((chunk) => ({
          ...chunk,
          sourceId: source.id,
          projectId: input.projectId,
        }))
      );
      this.db.prepare(`
        INSERT INTO audit_events (
          id, project_id, event_type, entity_id, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        input.projectId,
        "SOURCE_IMPORTED",
        source.id,
        JSON.stringify(auditMetadata),
        new Date().toISOString()
      );
      return { source, chunks: createdChunks };
    });
  }

  createChunks(chunks: CreateEvidenceChunkInput[]): EvidenceChunk[] {
    return this.withTransaction(() => this.insertChunks(chunks));
  }

  private insertChunks(chunks: CreateEvidenceChunkInput[]): EvidenceChunk[] {
    const seenStableIds = new Set<string>();
    for (const chunk of chunks) {
      if (!chunk.stableId.trim()) {
        throw new Error("Evidence excerpt ID is required");
      }
      if (seenStableIds.has(chunk.stableId)) {
        throw new Error(`Duplicate evidence excerpt ID "${chunk.stableId}"`);
      }
      seenStableIds.add(chunk.stableId);
      const duplicate = this.db
        .prepare("SELECT 1 FROM evidence_chunks WHERE project_id = ? AND stable_id = ?")
        .get(chunk.projectId, chunk.stableId);
      if (duplicate) {
        throw new Error(`Duplicate evidence excerpt ID "${chunk.stableId}" in this project`);
      }
    }

    const stmt = this.db.prepare(`
      INSERT INTO evidence_chunks (
        id, source_id, project_id, chunk_index, stable_id, text_content, author, timestamp_str, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const results: EvidenceChunk[] = [];
    for (const chunk of chunks) {
      const id = crypto.randomUUID();
      stmt.run(
        id,
        chunk.sourceId,
        chunk.projectId,
        chunk.chunkIndex,
        chunk.stableId,
        chunk.textContent,
        chunk.author ?? null,
        chunk.timestampStr ?? null,
        JSON.stringify(chunk.metadata ?? {})
      );
      results.push({
        id,
        sourceId: chunk.sourceId,
        projectId: chunk.projectId,
        chunkIndex: chunk.chunkIndex,
        stableId: chunk.stableId,
        textContent: chunk.textContent,
        author: chunk.author ?? null,
        timestampStr: chunk.timestampStr ?? null,
        metadata: chunk.metadata ?? {},
      });
    }

    return results;
  }

  findSourcesByProjectId(projectId: string): EvidenceSource[] {
    const stmt = this.db.prepare(
      "SELECT * FROM evidence_sources WHERE project_id = ? ORDER BY created_at ASC"
    );
    const rows = stmt.all(projectId) as unknown as EvidenceSourceRow[];
    return rows.map(mapRowToSource);
  }

  findChunksByProjectId(projectId: string): EvidenceChunk[] {
    const stmt = this.db.prepare(
      "SELECT * FROM evidence_chunks WHERE project_id = ? ORDER BY chunk_index ASC"
    );
    const rows = stmt.all(projectId) as unknown as EvidenceChunkRow[];
    return rows.map(mapRowToChunk);
  }

  findChunkByStableId(projectId: string, stableId: string): EvidenceChunk | null {
    const stmt = this.db.prepare(
      "SELECT * FROM evidence_chunks WHERE project_id = ? AND stable_id = ?"
    );
    const row = stmt.get(projectId, stableId) as unknown as EvidenceChunkRow | undefined;
    return row ? mapRowToChunk(row) : null;
  }

  deleteSource(sourceId: string): void {
    const stmt = this.db.prepare("DELETE FROM evidence_sources WHERE id = ?");
    stmt.run(sourceId);
  }
}
