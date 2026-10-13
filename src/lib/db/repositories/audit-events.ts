import { DatabaseSync } from "node:sqlite";
import { AuditEvent } from "@/lib/types";
import crypto from "node:crypto";

export type AuditEventType = AuditEvent["eventType"];

interface AuditEventRow {
  id: string;
  project_id: string;
  event_type: AuditEventType;
  entity_id: string | null;
  metadata_json: string;
  created_at: string;
}

function mapRow(row: AuditEventRow): AuditEvent {
  const metadata: unknown = JSON.parse(row.metadata_json);
  if (metadata === null || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error("Stored audit metadata is not a JSON object");
  }

  return {
    id: row.id,
    projectId: row.project_id,
    eventType: row.event_type,
    entityId: row.entity_id,
    metadata: metadata as Record<string, unknown>,
    createdAt: row.created_at,
  };
}

export class AuditEventRepository {
  constructor(private db: DatabaseSync) {}

  create(input: {
    projectId: string;
    eventType: AuditEventType;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  }): AuditEvent {
    const event: AuditEvent = {
      id: crypto.randomUUID(),
      projectId: input.projectId,
      eventType: input.eventType,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? {},
      createdAt: new Date().toISOString(),
    };
    const stmt = this.db.prepare(`
      INSERT INTO audit_events (
        id, project_id, event_type, entity_id, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      event.id,
      event.projectId,
      event.eventType,
      event.entityId,
      JSON.stringify(event.metadata),
      event.createdAt
    );
    return event;
  }

  findByProjectId(projectId: string): AuditEvent[] {
    const rows = this.db
      .prepare("SELECT * FROM audit_events WHERE project_id = ? ORDER BY created_at DESC")
      .all(projectId) as unknown as AuditEventRow[];
    return rows.map(mapRow);
  }
}
