import { DatabaseSync } from "node:sqlite";
import { BaselineClause, ClauseType } from "@/lib/types";
import crypto from "node:crypto";

export interface CreateBaselineClauseInput {
  projectId: string;
  clauseType: ClauseType;
  title: string;
  content: string;
  sectionRef?: string | null;
}

interface BaselineClauseRow {
  id: string;
  project_id: string;
  clause_type: ClauseType;
  title: string;
  content: string;
  section_ref: string | null;
  created_at: string;
}

function mapRowToClause(row: BaselineClauseRow): BaselineClause {
  return {
    id: row.id,
    projectId: row.project_id,
    clauseType: row.clause_type,
    title: row.title,
    content: row.content,
    sectionRef: row.section_ref,
    createdAt: row.created_at,
  };
}

export class BaselineClauseRepository {
  constructor(private db: DatabaseSync) {}

  create(input: CreateBaselineClauseInput, customId?: string): BaselineClause {
    const id = customId || crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO baseline_clauses (
        id, project_id, clause_type, title, content, section_ref, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.projectId,
      input.clauseType,
      input.title,
      input.content,
      input.sectionRef ?? null,
      now
    );

    return {
      id,
      projectId: input.projectId,
      clauseType: input.clauseType,
      title: input.title,
      content: input.content,
      sectionRef: input.sectionRef ?? null,
      createdAt: now,
    };
  }

  findByProjectId(projectId: string): BaselineClause[] {
    const stmt = this.db.prepare(
      "SELECT * FROM baseline_clauses WHERE project_id = ? ORDER BY created_at ASC"
    );
    const rows = stmt.all(projectId) as unknown as BaselineClauseRow[];
    return rows.map(mapRowToClause);
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare("DELETE FROM baseline_clauses WHERE id = ?");
    stmt.run(id);
    return true;
  }

  deleteByProjectId(projectId: string): void {
    const stmt = this.db.prepare("DELETE FROM baseline_clauses WHERE project_id = ?");
    stmt.run(projectId);
  }
}
