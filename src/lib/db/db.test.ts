import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "./connection";
import { ProjectRepository } from "./repositories/projects";
import { BaselineClauseRepository } from "./repositories/clauses";
import { EvidenceRepository } from "./repositories/evidence";
import { FindingsRepository } from "./repositories/findings";
import { AuditEventRepository } from "./repositories/audit-events";
import { DatabaseSync } from "node:sqlite";

describe("SQLite Database & Repositories", () => {
  let db: DatabaseSync;
  let projectRepo: ProjectRepository;
  let clauseRepo: BaselineClauseRepository;
  let evidenceRepo: EvidenceRepository;
  let findingsRepo: FindingsRepository;

  beforeEach(() => {
    // Fresh in-memory DB per test
    db = getDb({ inMemory: true });
    projectRepo = new ProjectRepository(db);
    clauseRepo = new BaselineClauseRepository(db);
    evidenceRepo = new EvidenceRepository(db);
    findingsRepo = new FindingsRepository(db);
  });

  it("creates and retrieves a project with exact financial integer cents", () => {
    const project = projectRepo.create({
      name: "E-Commerce Replatform",
      clientName: "Retail Co",
      currency: "USD",
      hourlyRateCents: 15000, // $150.00
      originalBudgetCents: 2500000, // $25,000.00
      revisionLimit: 3,
    });

    expect(project.id).toBeDefined();
    expect(project.hourlyRateCents).toBe(15000);

    const fetched = projectRepo.findById(project.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe("E-Commerce Replatform");
    expect(fetched?.revisionLimit).toBe(3);
  });

  it("handles baseline clause creation and associations", () => {
    const project = projectRepo.create({
      name: "Test SOW",
      clientName: "Test Client",
      currency: "USD",
      hourlyRateCents: 12000,
      originalBudgetCents: 1000000,
      revisionLimit: 2,
    });

    const clause1 = clauseRepo.create({
      projectId: project.id,
      clauseType: "DELIVERABLE",
      title: "Stripe Checkout Integration",
      content: "Setup Stripe Checkout for standard credit card payments.",
      sectionRef: "Deliverable 1.1",
    });

    const clause2 = clauseRepo.create({
      projectId: project.id,
      clauseType: "EXCLUSION",
      title: "Crypto Payments Excluded",
      content: "Cryptocurrency or custom merchant gateways are not included.",
      sectionRef: "Exclusion 2.1",
    });

    const clauses = clauseRepo.findByProjectId(project.id);
    expect(clauses).toHaveLength(2);
    expect(clauses.map((c) => c.title)).toContain("Stripe Checkout Integration");
  });

  it("handles evidence sources and chunks with stable IDs", () => {
    const project = projectRepo.create({
      name: "App Build",
      clientName: "Client",
      currency: "USD",
      hourlyRateCents: 10000,
      originalBudgetCents: 500000,
      revisionLimit: 2,
    });

    const source = evidenceRepo.createSource({
      projectId: project.id,
      filename: "client_emails.txt",
      fileType: "TXT",
      rawContent: "Email content here...",
      sourceHash: "abc123hash",
    });

    const chunks = evidenceRepo.createChunks([
      {
        sourceId: source.id,
        projectId: project.id,
        chunkIndex: 0,
        stableId: "SRC-01#C01",
        textContent: "Can we support Ethereum payments?",
        author: "Client CEO",
      },
      {
        sourceId: source.id,
        projectId: project.id,
        chunkIndex: 1,
        stableId: "SRC-01#C02",
        textContent: "Also make sure the logo is blue.",
        author: "Client CEO",
      },
    ]);

    expect(chunks).toHaveLength(2);
    expect(chunks[0].stableId).toBe("SRC-01#C01");
    expect(source.stableId).toMatch(/^DOC-/);

    const foundChunk = evidenceRepo.findChunkByStableId(project.id, "SRC-01#C01");
    expect(foundChunk).not.toBeNull();
    expect(foundChunk?.textContent).toBe("Can we support Ethereum payments?");
  });

  it("persists original source text and import metadata without changing evidence references", () => {
    const project = projectRepo.create({
      name: "Evidence Preservation",
      clientName: "Client",
      currency: "USD",
      hourlyRateCents: 10000,
      originalBudgetCents: 500000,
      revisionLimit: 2,
    });
    const original = "Line one\r\nLine two\u0001";
    const result = evidenceRepo.createSourceWithChunks(
      {
        projectId: project.id,
        stableId: "DOC-preserved",
        filename: "messages.txt",
        fileType: "TXT",
        rawContent: original,
        sourceHash: "hash",
        metadata: { sender: "Client", importNote: "synthetic metadata" },
      },
      [{
        chunkIndex: 0,
        stableId: "DOC-preserved#C01",
        textContent: "Line one\nLine two",
        metadata: { sender: "Client", originalItemRef: "MSG-1" },
      }]
    );

    expect(result.source.rawContent).toBe(original);
    expect(result.source.metadata).toEqual({
      sender: "Client",
      importNote: "synthetic metadata",
    });
    expect(result.chunks[0].stableId).toBe("DOC-preserved#C01");
    expect(result.chunks[0].metadata).toEqual({
      sender: "Client",
      originalItemRef: "MSG-1",
    });
    const events = new AuditEventRepository(db).findByProjectId(project.id);
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe("SOURCE_IMPORTED");
  });

  it("rejects duplicate stable source and excerpt IDs", () => {
    const project = projectRepo.create({
      name: "Duplicate IDs",
      clientName: "Client",
      currency: "USD",
      hourlyRateCents: 10000,
      originalBudgetCents: 500000,
      revisionLimit: 2,
    });
    const source = evidenceRepo.createSource({
      projectId: project.id,
      stableId: "DOC-duplicate",
      filename: "emails.txt",
      fileType: "TXT",
      rawContent: "Source",
      sourceHash: "hash",
    });
    expect(() => evidenceRepo.createSource({
      projectId: project.id,
      stableId: "DOC-duplicate",
      filename: "copy.txt",
      fileType: "TXT",
      rawContent: "Copy",
      sourceHash: "hash-2",
    })).toThrow(/Duplicate source document ID/);

    evidenceRepo.createChunks([{
      sourceId: source.id,
      projectId: project.id,
      chunkIndex: 0,
      stableId: "DOC-duplicate#C01",
      textContent: "An excerpt",
    }]);
    expect(() => evidenceRepo.createChunks([{
      sourceId: source.id,
      projectId: project.id,
      chunkIndex: 1,
      stableId: "DOC-duplicate#C01",
      textContent: "A duplicate excerpt",
    }])).toThrow(/Duplicate evidence excerpt ID/);
  });

  it("rejects missing source references and rolls back failed source-plus-excerpt transactions", () => {
    const project = projectRepo.create({
      name: "Atomic Import",
      clientName: "Client",
      currency: "USD",
      hourlyRateCents: 10000,
      originalBudgetCents: 500000,
      revisionLimit: 2,
    });
    expect(() => evidenceRepo.createChunks([{
      sourceId: "missing-source",
      projectId: project.id,
      chunkIndex: 0,
      stableId: "DOC-missing#C01",
      textContent: "Orphan excerpt",
    }])).toThrow();

    const source = evidenceRepo.createSource({
      projectId: project.id,
      stableId: "DOC-existing",
      filename: "existing.txt",
      fileType: "TXT",
      rawContent: "Existing",
      sourceHash: "hash",
    });
    evidenceRepo.createChunks([{
      sourceId: source.id,
      projectId: project.id,
      chunkIndex: 0,
      stableId: "DOC-existing#C01",
      textContent: "Existing excerpt",
    }]);
    const sourcesBefore = evidenceRepo.findSourcesByProjectId(project.id);
    expect(() => evidenceRepo.createSourceWithChunks({
      projectId: project.id,
      stableId: "DOC-rollback",
      filename: "rollback.txt",
      fileType: "TXT",
      rawContent: "Will not persist",
      sourceHash: "hash-2",
    }, [{
      chunkIndex: 1,
      stableId: "DOC-existing#C01",
      textContent: "Duplicate excerpt",
    }])).toThrow(/Duplicate evidence excerpt ID/);
    expect(evidenceRepo.findSourcesByProjectId(project.id)).toHaveLength(sourcesBefore.length);
  });

  it("initializes audit and evidence metadata schema on a fresh database", () => {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table'"
    ).all() as Array<{ name: string }>;
    const sourceColumns = db.prepare("PRAGMA table_info(evidence_sources)").all() as Array<{ name: string }>;
    const excerptColumns = db.prepare("PRAGMA table_info(evidence_chunks)").all() as Array<{ name: string }>;
    expect(tables.map((table) => table.name)).toContain("audit_events");
    expect(sourceColumns.map((column) => column.name)).toContain("stable_id");
    expect(excerptColumns.map((column) => column.name)).toContain("metadata_json");
  });

  it("derives dashboard status and pending review count from persisted project data", () => {
    const project = projectRepo.create({
      name: "Dashboard project",
      clientName: "Client",
      currency: "USD",
      hourlyRateCents: 10000,
      originalBudgetCents: 500000,
      revisionLimit: 2,
    });
    expect(projectRepo.findAllWithSummary()[0]).toMatchObject({
      id: project.id,
      status: "SETUP",
      pendingReviewCount: 0,
      evidenceCount: 0,
    });

    const source = evidenceRepo.createSource({
      projectId: project.id,
      filename: "notes.txt",
      fileType: "TXT",
      rawContent: "Please add a report.",
      sourceHash: "hash",
    });
    const [chunk] = evidenceRepo.createChunks([{
      sourceId: source.id,
      projectId: project.id,
      chunkIndex: 0,
      stableId: "DOC-dashboard#C01",
      textContent: "Please add a report.",
    }]);
    const run = findingsRepo.createRun({ projectId: project.id, modelName: "test" });
    findingsRepo.createFindings([{
      runId: run.id,
      projectId: project.id,
      evidenceChunkId: chunk.id,
      classification: "AMBIGUOUS",
      title: "Report",
      reasoning: "Needs review.",
      citedRequestQuote: "Please add a report.",
      isRequestQuoteVerified: true,
      isClauseQuoteVerified: false,
      confidenceScore: 0.6,
      estHoursMin: 1,
      estHoursMax: 2,
    }]);

    expect(projectRepo.findAllWithSummary()[0]).toMatchObject({
      status: "NEEDS_REVIEW",
      pendingReviewCount: 1,
      evidenceCount: 1,
    });
  });

  it("records analysis runs and human decision overrides on findings", () => {
    const project = projectRepo.create({
      name: "Analysis Test",
      clientName: "Client",
      currency: "USD",
      hourlyRateCents: 10000,
      originalBudgetCents: 500000,
      revisionLimit: 2,
    });

    const source = evidenceRepo.createSource({
      projectId: project.id,
      filename: "emails.md",
      fileType: "MARKDOWN",
      rawContent: "Some raw email content",
      sourceHash: "hash123",
    });

    const chunks = evidenceRepo.createChunks([
      {
        sourceId: source.id,
        projectId: project.id,
        chunkIndex: 0,
        stableId: "SRC-01#C01",
        textContent: "Add multi-language localization.",
      },
    ]);

    const run = findingsRepo.createRun({
      projectId: project.id,
      modelName: "gemma3:4b",
    });

    const [finding] = findingsRepo.createFindings([
      {
        runId: run.id,
        projectId: project.id,
        evidenceChunkId: chunks[0].id,
        classification: "POTENTIALLY_OUT_OF_SCOPE",
        title: "Multi-language localization requested",
        reasoning: "Not mentioned in agreed single-locale deliverable.",
        citedRequestQuote: "Add multi-language localization.",
        isRequestQuoteVerified: true,
        isClauseQuoteVerified: false,
        confidenceScore: 0.9,
        estHoursMin: 15,
        estHoursMax: 25,
      },
    ]);

    expect(finding.humanStatus).toBe("PENDING");
    expect(finding.estimateSource).toBe("MODEL");

    // Human overrides finding to ACCEPTED with adjusted hours
    const updated = findingsRepo.updateFindingDecision(finding.id, {
      humanStatus: "ACCEPTED",
      humanNotes: "Confirmed with client in phone call.",
      estHoursMin: 18,
      estHoursMax: 20,
    });

    expect(updated?.humanStatus).toBe("ACCEPTED");
    expect(updated?.estHoursMin).toBe(18);
    expect(updated?.humanNotes).toBe("Confirmed with client in phone call.");
    expect(updated?.estimateSource).toBe("HUMAN");
  });

  it("cascades deletion of clauses and findings when project is deleted", () => {
    const project = projectRepo.create({
      name: "To Delete",
      clientName: "Client",
      currency: "USD",
      hourlyRateCents: 10000,
      originalBudgetCents: 500000,
      revisionLimit: 2,
    });

    clauseRepo.create({
      projectId: project.id,
      clauseType: "DELIVERABLE",
      title: "Some Deliverable",
      content: "Content",
    });

    expect(clauseRepo.findByProjectId(project.id)).toHaveLength(1);

    projectRepo.delete(project.id);

    expect(projectRepo.findById(project.id)).toBeNull();
    expect(clauseRepo.findByProjectId(project.id)).toHaveLength(0);
  });
});
