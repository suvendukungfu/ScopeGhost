import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "./connection";
import { ProjectRepository } from "./repositories/projects";
import { BaselineClauseRepository } from "./repositories/clauses";
import { EvidenceRepository } from "./repositories/evidence";
import { FindingsRepository } from "./repositories/findings";
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

    const foundChunk = evidenceRepo.findChunkByStableId(project.id, "SRC-01#C01");
    expect(foundChunk).not.toBeNull();
    expect(foundChunk?.textContent).toBe("Can we support Ethereum payments?");
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
