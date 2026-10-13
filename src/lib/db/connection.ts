import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { runMigrations } from "./migrations";

let globalDb: DatabaseSync | null = null;

export interface DbConfig {
  dbPath?: string;
  inMemory?: boolean;
}

/**
 * Returns a DatabaseSync instance.
 * By default in production/dev, opens `./data/scopeghost.db` (creating dir if necessary).
 * In unit tests or when inMemory is true, creates a fresh `:memory:` database.
 */
export function getDb(config?: DbConfig): DatabaseSync {
  if (config?.inMemory) {
    const memDb = new DatabaseSync(":memory:");
    memDb.exec("PRAGMA foreign_keys = ON;");
    runMigrations(memDb);
    return memDb;
  }

  if (globalDb) {
    return globalDb;
  }

  const defaultDbDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(defaultDbDir)) {
    fs.mkdirSync(defaultDbDir, { recursive: true });
  }

  const targetPath =
    config?.dbPath ||
    process.env.DATABASE_PATH ||
    path.join(defaultDbDir, "scopeghost.db");

  const db = new DatabaseSync(targetPath);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");

  runMigrations(db);
  globalDb = db;
  return globalDb;
}

/**
 * Closes and resets the cached database instance (useful in tests).
 */
export function closeDb(): void {
  if (globalDb) {
    globalDb.close();
    globalDb = null;
  }
}
