import { DatabaseSync } from "node:sqlite";

export function runMigrations(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      client_name TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      hourly_rate_cents INTEGER NOT NULL,
      original_budget_cents INTEGER NOT NULL,
      revision_limit INTEGER NOT NULL DEFAULT 2,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS baseline_clauses (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      clause_type TEXT NOT NULL CHECK(clause_type IN ('DELIVERABLE', 'EXCLUSION', 'ASSUMPTION', 'REVISION_LIMIT')),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      section_ref TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS evidence_sources (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_type TEXT NOT NULL CHECK(file_type IN ('TXT', 'MARKDOWN', 'CSV')),
      raw_content TEXT NOT NULL,
      source_hash TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS evidence_chunks (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      stable_id TEXT NOT NULL,
      text_content TEXT NOT NULL,
      author TEXT,
      timestamp_str TEXT,
      FOREIGN KEY(source_id) REFERENCES evidence_sources(id) ON DELETE CASCADE,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analysis_runs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      model_name TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
      error_message TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scope_findings (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      evidence_chunk_id TEXT NOT NULL,
      matched_clause_id TEXT,
      classification TEXT NOT NULL CHECK(classification IN ('IN_SCOPE', 'POTENTIALLY_OUT_OF_SCOPE', 'AMBIGUOUS', 'INSUFFICIENT_EVIDENCE')),
      title TEXT NOT NULL,
      reasoning TEXT NOT NULL,
      cited_request_quote TEXT NOT NULL,
      cited_clause_quote TEXT,
      is_request_quote_verified INTEGER NOT NULL DEFAULT 0,
      is_clause_quote_verified INTEGER NOT NULL DEFAULT 0,
      confidence_score REAL NOT NULL,
      est_hours_min REAL NOT NULL DEFAULT 0,
      est_hours_max REAL NOT NULL DEFAULT 0,
      human_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(human_status IN ('PENDING', 'ACCEPTED', 'DISMISSED', 'MODIFIED')),
      human_notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(run_id) REFERENCES analysis_runs(id) ON DELETE CASCADE,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(evidence_chunk_id) REFERENCES evidence_chunks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS change_orders (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      order_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'APPROVED', 'CANCELLED')),
      selected_findings_json TEXT NOT NULL,
      total_hours_min REAL NOT NULL,
      total_hours_max REAL NOT NULL,
      total_cost_min_cents INTEGER NOT NULL,
      total_cost_max_cents INTEGER NOT NULL,
      generated_markdown TEXT NOT NULL,
      human_disclaimer TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_clauses_project ON baseline_clauses(project_id);
    CREATE INDEX IF NOT EXISTS idx_sources_project ON evidence_sources(project_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_project ON evidence_chunks(project_id);
    CREATE INDEX IF NOT EXISTS idx_findings_project ON scope_findings(project_id);
    CREATE INDEX IF NOT EXISTS idx_change_orders_project ON change_orders(project_id);
  `);
}
