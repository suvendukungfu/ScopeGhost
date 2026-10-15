# ScopeGhost — Quality Assurance & Test Verification Report

**MLH Global Hack Week: Hacktoberfest — GitHub Copilot Challenge**  
**Repository:** [https://github.com/suvendukungfu/ScopeGhost](https://github.com/suvendukungfu/ScopeGhost)  
**Verification Date:** October 14, 2026

---

## 1. Test Suite Summary Table

| Suite | Runner / Tool | Target | Verified Result | Execution Time |
| :--- | :--- | :--- | :--- | :--- |
| **Strict Typecheck** | TypeScript 7.0.2 (`tsc --noEmit`) | Entire TypeScript codebase | **0 errors (PASS)** | 1.1s |
| **Unit & Integration Suite** | Vitest 4.1.11 (`npm test`) | 10 unit test files | **101 passed, 4 opt-in skipped (PASS)** | 948ms |
| **Offline Evaluation Benchmark** | `scripts/evaluate.ts` (`npm run test:eval`) | 36 synthetic test cases | **36/36 passed, 97.2% accuracy, 100% acceptable, 0.0% false exclusion (PASS)** | 2.1s |
| **Live Ollama Integration Suite** | Vitest (`RUN_OLLAMA_INTEGRATION=1 npm run test:integration`) | Local `gemma3:4b` @ `127.0.0.1:11434` | **4/4 live model tests passed (PASS)** | 121.7s |
| **Browser End-to-End Suite** | Playwright 1.64.0 (`npm run test:e2e`) | Chrome / WebKit / Firefox | **2/2 end-to-end tests passed (PASS)** | 7.6s |
| **Production Build** | Next.js 16.4.0 Turbopack (`npm run build`) | All 8 application routes | **Compiled cleanly (PASS)** | 783ms |

---

## 2. Detailed Test Execution & Verifications

### 2.1 Strict TypeScript Compilation

```bash
npm run typecheck
```

- **Exit Code:** 0
- **Output:** Clean pass. Strict null checks, parameter types, Zod inference schemas, and component props all conform to TypeScript 7 without bypasses (`any`).

### 2.2 Unit & Invariant Testing (Vitest)

```bash
npm test
```

- **Files Tested:**
  - `src/lib/financial/financial.test.ts` (9 tests) — Integer-cent rounding, zero floating-point drift, currency formatting.
  - `src/lib/types/schemas.test.ts` (12 tests) — Zod schema validation on project, clause, chunk, and finding models.
  - `src/lib/ollama/ollama.test.ts` (12 tests) — Loopback host enforcement, SSRF defense, model tag sanitization.
  - `src/lib/analysis/service.test.ts` (16 tests) — Scope analysis orchestration, topic-mismatch downgrade, classification logic.
  - `src/lib/analysis/evaluation.test.ts` (4 tests) — Evaluation pipeline correctness.
  - `src/lib/db/db.test.ts` (10 tests) — Native SQLite repository queries, foreign key constraints, atomic transactions.
  - `src/lib/tiger/tiger.test.ts` (10 tests) — TimescaleDB client queries, error trapping, local snapshot fallback.
  - `src/lib/analysis/evaluation/metrics.test.ts` (7 tests) — Precision, recall, F1 score, confusion matrix calculations.
  - `src/lib/verification/citation.test.ts` (5 tests) — Exact substring matching, normalized token alignment, negative control rejection.
  - `src/lib/ingestion/ingestion.test.ts` (16 tests) — CSV parsing, formula sanitization, markdown and text chunking.
  - `src/lib/analysis/ollama-integration.test.ts` (4 tests skipped in offline run; verified separately below).
- **Total:** 101 passed, 4 skipped.

### 2.3 Synthetic Evaluation Benchmark (M4.9 Harness)

```bash
npm run test:eval
```

- **Corpus:** Version 2.0.0-synthetic (36 versioned test cases across 10 baseline contract clauses).
- **Grounding Rate:** 100.0% (34/34 positive excerpts verified).
- **Negative Control:** Fabricated citation rejected with `matchType: NOT_FOUND`.
- **Classification Performance:**
  - Strict Exact Match: 97.2% (35/36)
  - Acceptable Classification Rate: 100.0% (36/36)
  - False Exclusion Rate (In-Scope Miss): 0.0% (0/6)
  - Prompt Injection Acceptance: 0.0% (6/6 blocked)
  - Topic-Mismatch Downgrade: 100.0% (6/6 applied)

### 2.4 Live Ollama Integration Test Suite

```bash
RUN_OLLAMA_INTEGRATION=1 npm run test:integration
```

- **Prerequisites:** Local Ollama running on `http://127.0.0.1:11434` with model `gemma3:4b`.
- **Verified Tests:**
  1. Executes real local inference and verifies clause citations against baseline scope (40.0s).
  2. Runs orchestrator analysis and persists verified citations in SQLite (27.7s).
  3. Preserves honest uncertainty (`AMBIGUOUS` / `INSUFFICIENT_EVIDENCE`) when request lacks contract clause (23.2s).
  4. Defends against prompt injection in evidence without accepting fabricated clauses (30.4s).

### 2.5 Playwright Browser E2E Automation

```bash
npm run test:e2e
```

- **Test 1:** Loads synthetic demo project ("AeroTech Apparel"), inspects contract clauses, views chunked evidence, reviews scope findings, and opens change order workspace (2.6s).
- **Test 2:** Exercises Tiger Cloud telemetry dashboard, settings backup, and project deletion lifecycle with 0 console errors (1.5s).

---

## 3. Environment & Hardware Specifications

- **Operating System:** macOS Darwin (arm64, Apple Silicon)
- **Node.js:** v22+
- **Ollama:** `gemma3:4b` (GGUF Q4_K_M, 4.3B parameters, digest `a2af6cc3eb7fa8be8504abaf9b04e88f17a119ec3f04a3addf55f92841195f5a`)
- **Database:** Local native SQLite via `node:sqlite` (`./data/scopeghost.db` or `:memory:`)
