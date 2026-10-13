import { DatabaseSync } from "node:sqlite";
import { Project } from "@/lib/types";
import crypto from "node:crypto";

export interface CreateProjectInput {
  name: string;
  clientName: string;
  currency: string;
  hourlyRateCents: number;
  originalBudgetCents: number;
  revisionLimit: number;
}

export interface UpdateProjectInput {
  name?: string;
  clientName?: string;
  currency?: string;
  hourlyRateCents?: number;
  originalBudgetCents?: number;
  revisionLimit?: number;
}

interface ProjectRow {
  id: string;
  name: string;
  client_name: string;
  currency: string;
  hourly_rate_cents: number;
  original_budget_cents: number;
  revision_limit: number;
  created_at: string;
  updated_at: string;
}

function mapRowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    clientName: row.client_name,
    currency: row.currency,
    hourlyRateCents: row.hourly_rate_cents,
    originalBudgetCents: row.original_budget_cents,
    revisionLimit: row.revision_limit,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ProjectRepository {
  constructor(private db: DatabaseSync) {}

  create(input: CreateProjectInput, customId?: string): Project {
    const id = customId || crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO projects (
        id, name, client_name, currency, hourly_rate_cents,
        original_budget_cents, revision_limit, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.name,
      input.clientName,
      input.currency,
      input.hourlyRateCents,
      input.originalBudgetCents,
      input.revisionLimit,
      now,
      now
    );

    return {
      id,
      name: input.name,
      clientName: input.clientName,
      currency: input.currency,
      hourlyRateCents: input.hourlyRateCents,
      originalBudgetCents: input.originalBudgetCents,
      revisionLimit: input.revisionLimit,
      createdAt: now,
      updatedAt: now,
    };
  }

  findById(id: string): Project | null {
    const stmt = this.db.prepare("SELECT * FROM projects WHERE id = ?");
    const row = stmt.get(id) as unknown as ProjectRow | undefined;
    return row ? mapRowToProject(row) : null;
  }

  findAll(): Project[] {
    const stmt = this.db.prepare("SELECT * FROM projects ORDER BY created_at DESC");
    const rows = stmt.all() as unknown as ProjectRow[];
    return rows.map(mapRowToProject);
  }

  update(id: string, input: UpdateProjectInput): Project | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated: Project = {
      ...existing,
      name: input.name ?? existing.name,
      clientName: input.clientName ?? existing.clientName,
      currency: input.currency ?? existing.currency,
      hourlyRateCents: input.hourlyRateCents ?? existing.hourlyRateCents,
      originalBudgetCents: input.originalBudgetCents ?? existing.originalBudgetCents,
      revisionLimit: input.revisionLimit ?? existing.revisionLimit,
      updatedAt: now,
    };

    const stmt = this.db.prepare(`
      UPDATE projects SET
        name = ?,
        client_name = ?,
        currency = ?,
        hourly_rate_cents = ?,
        original_budget_cents = ?,
        revision_limit = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.name,
      updated.clientName,
      updated.currency,
      updated.hourlyRateCents,
      updated.originalBudgetCents,
      updated.revisionLimit,
      updated.updatedAt,
      id
    );

    return updated;
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare("DELETE FROM projects WHERE id = ?");
    stmt.run(id);
    return true;
  }
}
