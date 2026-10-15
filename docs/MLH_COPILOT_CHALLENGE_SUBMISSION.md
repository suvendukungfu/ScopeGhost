# ScopeGhost — MLH GitHub Copilot Challenge Submission Package

**Challenge:** Use GitHub Copilot to complete any of this week's challenges  
**Challenge ID:** `01a11b48-8554-f273-f6e4-2ace7ad19a36`  
**Submission Portal:** [https://www.mlh.com/challenges/01a11b48-8554-f273-f6e4-2ace7ad19a36/submissions/new](https://www.mlh.com/challenges/01a11b48-8554-f273-f6e4-2ace7ad19a36/submissions/new)  
**Repository:** [https://github.com/suvendukungfu/ScopeGhost](https://github.com/suvendukungfu/ScopeGhost)

---

## Part 1: Submission Form Fields (Copy-Paste)

### Project Name

ScopeGhost — Local-First AI Scope-Creep Detection & Change-Order Drafting

### GitHub Repository URL

`https://github.com/suvendukungfu/ScopeGhost`

### Technologies Used (Built With)

`Next.js 16 (Turbopack), React 19, TypeScript, Tailwind CSS v4, native node:sqlite, Ollama (Google Gemma 3), Zod, Vitest, Playwright, Tiger Cloud (TimescaleDB), GitHub Copilot`

---

### Project Description (Markdown)

````markdown
### What ScopeGhost Does

ScopeGhost is a local-first, privacy-respecting AI assistant engineered for independent software engineers, consultants, and boutique agencies. It solves one of the most costly leaks in freelance business: **unbilled scope creep**.

Clients regularly introduce "minor tweaks", expansion requests, and out-of-scope features across email and Slack threads. Freelancers absorb hundreds of hours in unpaid labor because digging through contractual clauses, verifying evidence, and calculating change-order pricing is tedious and confrontational.

ScopeGhost ingests signed agreements and client communication threads, extracts structured message chunks with stable IDs (`SRC-AERO#C01`), runs local inference using Google Gemma 3 (`gemma3:4b` via Ollama), programmatically verifies citations against source documents, deterministically computes additional costs in integer cents, and generates professional, editable change orders for human review.

Zero client data or contract clauses ever leave your local machine.

---

### Core Engineering Invariants

1. **Privacy by Default:** All contract records, client communications, and SQLite databases remain strictly on your local machine (`127.0.0.1:11434`). Zero cloud data transfer, zero third-party AI APIs.
2. **Citation Verification Engine:** Every finding must cite its exact source excerpt and stable chunk ID (`SRC-01#C02`). An exact and normalized string matcher programmatically verifies quotes against raw ingested text, immediately rejecting fabricated quotes.
3. **Deterministic Financial Math:** The LLM is never permitted to calculate dollar totals. Labor hours are multiplied by your billing rate exclusively via deterministic integer arithmetic (`cents`) in TypeScript, eliminating floating-point drift.
4. **Human in the Loop:** ScopeGhost never automatically dispatches emails, invoices, or change orders. It produces customizable, professional drafts with legal advisory disclaimers for human review.
5. **Prompt Injection Containment:** Untrusted client messages are structurally isolated inside `<untrusted_evidence_chunk>` XML tags. The system prompt instructs the model that content inside these tags is untrusted external data to be audited, not instructions to execute.
6. **Telemetry Separation:** Optional observability via Tiger Cloud (TimescaleDB hypertable `agent_events`) receives only anonymized operational metrics (latency, token counts) without ever transmitting client PII or contract text.

---

### Verification & Test Results

- **Strict Typecheck:** `npm run typecheck` (TypeScript 7.0.2 strict compilation, 0 errors).
- **Unit & Invariant Suite:** `npm test` (101 passed across 10 test files).
- **Synthetic Evaluation Benchmark:** `npm run test:eval` (36 test cases, 10 baseline contract clauses, 97.2% strict accuracy, 100% acceptable classification rate, 0.0% false exclusion rate, 100% positive citation grounding).
- **Live Ollama Integration Suite:** `RUN_OLLAMA_INTEGRATION=1 npm run test:integration` (4 live integration tests passing in 121.7s against local `gemma3:4b`).
- **End-to-End Browser Automation:** `npm run test:e2e` (2 Playwright tests exercising full contract-to-change-order workflow and telemetry in 7.6s).
- **Production Build:** `npm run build` (Next.js 16.4.0 Turbopack compiled in 783ms, 8/8 routes generated cleanly).

---

### Getting Started

```bash
git clone https://github.com/suvendukungfu/ScopeGhost.git
cd ScopeGhost
npm install
npm run dev
```

Open `http://localhost:3000` and click **"Load Synthetic Demo"** to explore the complete end-to-end audit with pre-seeded contracts, communication threads, and change orders!
````

---

## Part 2: Screenshot Evidence Checklist

When submitting on the MLH portal or sharing in discussions, capture the following UI states:

- [ ] **1. Portfolio Dashboard (`01_portfolio_dashboard.png`):** Landing page displaying project cards, hourly rates, original budgets, and the "Load Synthetic Demo" button.
- [ ] **2. Baseline Agreement Clauses (`02_baseline_clauses.png`):** Project detail view with categorized contractual clauses (`DELIVERABLE`, `EXCLUSION`, `REVISION_LIMIT`, `ASSUMPTION`).
- [ ] **3. Ingested Evidence Library (`03_evidence_library.png`):** Chunked communication messages with stable chunk IDs (`SRC-AERO#C01`, etc.) and author metadata.
- [ ] **4. Scope Audit & Review Workbench (`04_scope_audit_review.png`):** AI classification cards (`IN_SCOPE`, `POTENTIALLY_OUT_OF_SCOPE`, `AMBIGUOUS`) with verified citation quotes and review controls (Accept, Adjust, Dismiss).
- [ ] **5. Change Order Generator (`05_change_order_workspace.png`):** Compiled change order draft showing itemized scope additions, deterministic pricing ($150.00/hr * hours = integer cents), and advisory disclaimer.
- [ ] **6. Tiger Cloud Telemetry Dashboard (`06_tiger_telemetry.png`):** `/tiger-demo` route showing TimescaleDB agent metrics, latency distribution, and operational health.

---

## Part 3: GitHub Discussion Draft (For Repository Showcase)

*Post this draft in your GitHub Discussion once enabled:*

````markdown
### 👻 ScopeGhost — Local-First AI Scope-Creep Detection & Change-Order Generator

Hey everyone! 👋

For this week's **MLH Global Hack Week: Hacktoberfest**, I built **ScopeGhost**—an open-source, local-first AI assistant engineered to help independent software developers, consultants, and boutique agencies stop leaving thousands of dollars in unbilled scope creep on the table.

- 🔗 **GitHub Repository:** https://github.com/suvendukungfu/ScopeGhost
- 📜 **License:** MIT Open Source

---

#### 💡 The Problem

In freelance client work, clients constantly ask for "quick favors" across email, Slack, and calls:
- *"Can you add dynamic cryptocurrency checkout?"*
- *"We need a native iOS app alongside the web portal!"*
- *"Please do a 4th full redesign of the homepage from scratch."*

Before long, freelancers absorb dozens of unbilled hours because finding contract clauses, proving scope boundaries, and calculating change orders feels awkward and confrontational.

---

#### 🛠️ How ScopeGhost Solves It

1. **Local-First Privacy:** Runs 100% locally on your laptop using Google Gemma 3 (`gemma3:4b` via Ollama) and native `node:sqlite`. Zero client contracts or communication text ever touches external servers.
2. **Citation Verification Engine:** Quotes are programmatically verified against raw source text with normalized fuzzy matching. Hallucinated quotes are strictly rejected.
3. **Deterministic Financial Math:** The AI never computes dollar totals. All pricing calculations use strict integer arithmetic in `cents` ($H \times \text{Rate}$) in TypeScript.
4. **Prompt Injection Containment:** Untrusted client messages are enclosed in structural XML tags (`<untrusted_evidence_chunk>`) with explicit system prompt guards.
5. **Human-in-the-Loop Change Orders:** Produces customizable, itemized change-order proposals for freelancer approval.

---

#### 🧪 Testing & Rigor

- **101 unit tests passed** across 10 test files (Vitest).
- **36 synthetic benchmark cases** evaluated with 97.2% accuracy and 100% citation grounding.
- **4 live Ollama integration tests** passed against local `gemma3:4b`.
- **Playwright browser E2E tests** passed across the full workflow.
- **Production Next.js 16 build** compiles in 783ms with 0 warnings.

Check out our documentation in the repo:
- [`README.md`](https://github.com/suvendukungfu/ScopeGhost#readme)
- [`docs/MLH_COPILOT_CHALLENGE_AUDIT.md`](https://github.com/suvendukungfu/ScopeGhost/blob/main/docs/MLH_COPILOT_CHALLENGE_AUDIT.md)
- [`docs/MLH_COPILOT_CHALLENGE_QA.md`](https://github.com/suvendukungfu/ScopeGhost/blob/main/docs/MLH_COPILOT_CHALLENGE_QA.md)

Happy Hacktoberfest! 🍂🍁
````

---

## Part 4: Required Manual Actions

1. **Enable GitHub Discussions:**
   - Open `https://github.com/suvendukungfu/ScopeGhost/settings`.
   - In **Features**, enable **Discussions**.
2. **Perform Genuine Copilot Work (Mandatory for Copilot Challenge):**
   - Pair with GitHub Copilot to add a genuine extension (e.g. TimescaleDB continuous aggregates or export utility) and log the session in `docs/COPILOT-LOG.md`.
3. **Publish Discussion Post:**
   - Post the markdown draft from Part 3 into your repository's Discussions tab.
4. **Submit on MLH Portal:**
   - Open `https://www.mlh.com/challenges/01a11b48-8554-f273-f6e4-2ace7ad19a36/submissions/new`.
   - Submit the repository URL, description, and discussion link.
