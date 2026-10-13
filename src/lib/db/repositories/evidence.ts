import { DatabaseSync } from "node:sqlite";
import { EvidenceSource, EvidenceChunk, FileType } from "@/lib/types";
import crypto from "node:crypto";

export interface CreateEvidenceSourceInput {
  projectId: string;
  filename: string;
  fileType: FileType;
  rawContent: string;
  sourceHash: string;
  metadataJson?: string;
}

export interface CreateEvidenceChunkInput {
  sourceId: string;
  projectId: string;
  chunkIndex: number;
  stableId: string;
  textContent: string;
  author?: string | null;
  timestampStr?: string | null;
}

interface EvidenceSourceRow {
  id: string;
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
}

function mapRowToSource(row: EvidenceSourceRow): EvidenceSource {
  return {
    id: row.id,
    projectId: row.project_id,
    filename: row.filename,
    fileType: row.file_type,
    rawContent: row.raw_content,
    sourceHash: row.source_hash,
    metadataJson: row.metadata_json,
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
  };
}

export class EvidenceRepository {
  constructor(private db: DatabaseSync) {}

  createSource(
    input: CreateEvidenceSourceInput,
    customId?: string
  ): EvidenceSource {
    const id = customId || crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO evidence_sources (
        id, project_id, filename, file_type, raw_content, source_hash, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.projectId,
      input.filename,
      input.fileType,
      input.rawContent,
      input.sourceHash,
      input.metadataJson || "{}",
      now
    );

    return {
      id,
      projectId: input.projectId,
      filename: input.filename,
      fileType: input.fileType,
      rawContent: input.rawContent,
      sourceHash: input.sourceHash,
      metadataJson: input.metadataJson || "{}",
      createdAt: now,
    };
  }

  createChunks(chunks: CreateEvidenceChunkInput[]): EvidenceChunk[] {
    const stmt = this.db.prepare(`
      INSERT INTO evidence_chunks (
        id, source_id, project_id, chunk_index, stable_id, text_content, author, timestamp_str
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
        chunk.timestampStr ?? null
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
