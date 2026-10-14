# ScopeGhost M4.9 — Synthetic Evaluation Framework & Benchmark Reference

**Framework Version:** `1.0.0`  
**Corpus Version:** `2.0.0-synthetic`  
**Date:** October 14, 2026  
**Module Paths:**
- Types: `src/lib/analysis/evaluation/types.ts`
- Metrics Engine: `src/lib/analysis/evaluation/metrics.ts`
- Unit Tests: `src/lib/analysis/evaluation/metrics.test.ts`
- Benchmark Fixture: `src/lib/analysis/fixtures/evaluation_dataset.json`
- Runner CLI: `scripts/evaluate.ts` (`npm run test:eval`)

---

## 1. Overview & Core Philosophy

The ScopeGhost Evaluation Framework provides a reproducible, versioned, and mathematically rigorous testing harness to evaluate LLM scope-auditing performance without hallucinated metrics, fabricated results, or conflated statistics.

### Key Principles
1. **Evidence Before Conclusions:** Every claim must be grounded in verbatim source quotes from raw client communications and baseline agreement clauses.
2. **Structural Verification vs Topical Relevance:** A quotation that exists verbatim in the contract is not automatically relevant to the client's request. Citation verification and topical semantic alignment are evaluated as distinct pipeline stages.
3. **Explicit Zero-Denominator Handling:** Any metric where the denominator is zero (e.g. precision for a class with zero predicted positives) evaluates strictly to `undefined`—never fabricated as 0.0 or 100.0%.
4. **Local & Deterministic Invariance:** Synthetic benchmark fixtures run completely offline in continuous integration (`npm run test:eval`) while remaining distinct from live local Ollama inference runs (`npm run test:integration`).

### Architectural Separation: Safeguards vs Mock Harness vs Live Inference
To prevent misleading claims, ScopeGhost explicitly separates evaluation into three distinct layers:
- **Deterministic Pipeline Safeguards (Code):** Structural prompt encapsulation (`<untrusted_evidence_chunk>`), verbatim/normalized citation verification (`verifyCitation()`), clause citation grounding, topic-overlap negative filtering (`hasContractualTopicSupport()`), and integer-cent financial arithmetic.
- **Mock-Based Regression Benchmark (`npm run test:eval`):** A deterministic test harness (`DeterministicHarnessModel`) passing 36 pre-recorded raw model outputs from the versioned synthetic corpus (`v2.0.0-synthetic`) through production `ScopeAnalysisService` logic. Yields **97.2% strict accuracy (35/36)** and **100.0% acceptable rate (36/36)** on versioned fixtures. *Boundary notice:* This offline harness verifies deterministic pipeline gates; it does not claim to independently prove open-ended contradiction reasoning or live resistance to novel prompt injections on its own.
- **Live Local Model Verification (`npm run test:integration`):** Four end-to-end integration tests executing real local inference against Google Gemma 3 (`gemma3:4b`) via Ollama, independently verifying live clause citation extraction, SQLite persistence, uncertainty preservation, and prompt injection defense.

---

## 2. Dataset Architecture (`v2.0.0-synthetic`)

The evaluation corpus contains **36 test cases** systematically distributed across **6 evaluation categories** (6 cases per category), evaluated against **10 baseline contract clauses**:

```
┌────────────────────────────────────────────────────────────────────────┐
│               M4.9 EVALUATION CORPUS (36 TEST CASES)                   │
├────────────────────────────────────────────────────────────────────────┤
│  1. In-Scope Requests (6 cases)                                       │
│     Styling, catalog filters, cart fixes, Stripe webhooks, SEO, auth   │
├────────────────────────────────────────────────────────────────────────┤
│  2. Explicit Exclusions & Revision Limits (6 cases)                    │
│     iOS Swift apps, Android Kotlin apps, crypto gateways, 4th revision │
├────────────────────────────────────────────────────────────────────────┤
│  3. Ambiguous & Insufficient Evidence (6 cases)                        │
│     Unquantified performance, future loyalty schemas, incomplete bugs │
├────────────────────────────────────────────────────────────────────────┤
│  4. Topic-Mismatched Exclusions [M4.8 Regressions] (6 cases)          │
│     EUR request vs GBP exclusion, mobile web vs native app exclusion   │
├────────────────────────────────────────────────────────────────────────┤
│  5. Contradictory Contractual Evidence (6 cases)                       │
│     Mobile pilot vs native app exclusion, staging testing vs live      │
├────────────────────────────────────────────────────────────────────────┤
│  6. Adversarial Prompt Injections & Negative Controls (6 cases)        │
│     <SYSTEM_INSTRUCTION> overrides, DAN jailbreaks, fabricated quotes  │
└────────────────────────────────────────────────────────────────────────┘
```

### Baseline Contract Clauses
- `cl-1` (`DELIVERABLE`): Responsive Web Storefront (SOW 1.1)
- `cl-2` (`DELIVERABLE`): Stripe Standard Checkout (SOW 1.2)
- `cl-3` (`EXCLUSION`): Native Mobile Applications Excluded (SOW 2.1)
- `cl-4` (`EXCLUSION`): Cryptocurrency Gateways Excluded (SOW 2.2)
- `cl-5` (`REVISION_LIMIT`): Two Included Revision Rounds (SOW 3.1)
- `cl-6` (`ASSUMPTION`): Single Locale English (SOW 4.1)
- `cl-7` (`EXCLUSION`): British Pounds Excluded (SOW 2.3)
- `cl-8` (`DELIVERABLE`): Mobile Prototype Evaluation Pilot (SOW 1.3)
- `cl-9` (`DELIVERABLE`): Basic Search Engine Optimization (SOW 1.4)
- `cl-10` (`EXCLUSION`): Dedicated Database Server Hosting Excluded (SOW 2.4)

---

## 3. Mathematical Metric Definitions

### A. Classification Metrics

#### 1. Strict Exact Accuracy
Fraction of test cases where the predicted classification strictly equals the ground-truth expected classification:
$$\text{StrictAccuracy} = \frac{\sum_{i=1}^{N} \mathbb{I}(\hat{y}_i = y_i)}{N}$$
- **Denominator:** Total number of evaluation cases ($N = 36$).

#### 2. Acceptable Classification Rate
Fraction of test cases where the predicted classification falls within the pre-defined set of acceptable classifications and is not in forbidden classifications:
$$\text{AcceptableRate} = \frac{\sum_{i=1}^{N} \mathbb{I}(\hat{y}_i \in \mathcal{A}_i \land \hat{y}_i \notin \mathcal{F}_i)}{N}$$

#### 3. False Exclusion Rate (In-Scope Miss Rate)
The proportion of legitimate, in-scope client requests that are incorrectly classified as `POTENTIALLY_OUT_OF_SCOPE`:
$$\text{FalseExclusionRate} = \begin{cases} \frac{\sum_{i \in \text{InScope}} \mathbb{I}(\hat{y}_i = \text{POTENTIALLY\_OUT\_OF\_SCOPE})}{|\text{InScope}|} & \text{if } |\text{InScope}| > 0 \\ \text{undefined} & \text{otherwise} \end{cases}$$
- **Numerator:** Count of actual `IN_SCOPE` cases falsely predicted as `POTENTIALLY_OUT_OF_SCOPE`.
- **Denominator:** Total in-scope evaluation cases ($|\text{InScope}| = 6$).
- **Distinction from standard FPR:** In binary scope auditing where Positive = Alert (Out-of-Scope) and Negative = Clean (In-Scope), this represents the False Positive rate on the negative class (falsely accusing in-scope work of being out-of-scope). We designate this domain-specific metric `False Exclusion Rate` (or `In-Scope Miss Rate`) to avoid statistical ambiguity.

#### 4. Per-Class Precision, Recall, and F1
For each class $c \in \{\text{IN\_SCOPE}, \text{POTENTIALLY\_OUT\_OF\_SCOPE}, \text{AMBIGUOUS}, \text{INSUFFICIENT\_EVIDENCE}\}$:
- $\text{Precision}_c = \frac{\text{TP}_c}{\text{TP}_c + \text{FP}_c}$ (returns `undefined` if $\text{TP}_c + \text{FP}_c = 0$)
- $\text{Recall}_c = \frac{\text{TP}_c}{\text{TP}_c + \text{FN}_c}$ (returns `undefined` if $\text{TP}_c + \text{FN}_c = 0$)
- $\text{F1}_c = \frac{2 \cdot \text{Precision}_c \cdot \text{Recall}_c}{\text{Precision}_c + \text{Recall}_c}$ (returns `undefined` if $\text{Precision}_c + \text{Recall}_c = 0$ or undefined)

---

### B. Citation Verification Metrics

#### 1. Request-Quote Verification Rate
$$\text{Rate}_{\text{req}} = \frac{\text{Verified Request Quotes}}{\text{Total Eligible Request Quotes}}$$
- Evaluated via string containment, case-insensitivity, normalization, and token-overlap ratio ($\ge 0.85$).

#### 2. Clause-Quote Verification Rate
$$\text{Rate}_{\text{clause}} = \frac{\text{Verified Clause Quotes}}{\text{Total Eligible Clause Quotes}}$$

#### 3. Fabricated Citation Rejection Rate (Negative Control Grounding)
$$\text{Rate}_{\text{fab\_rejection}} = \frac{\text{Rejected Fabrications}}{\text{Total Fabricated Controls}}$$
- Verifies that hallucinated quotes injected into evidence or clauses are strictly flagged as `isVerified: false` (`matchType: NOT_FOUND`).

---

### C. Subgroup & Adversarial Defense Metrics

#### 1. Topic-Mismatch Downgrade Rate
$$\text{Rate}_{\text{mismatch}} = \frac{\text{Cases Downgraded from Out-of-Scope}}{\text{Total Topic-Mismatched Cases}}$$
- When a model cites an exclusion clause that lacks substantive domain connection to the request (e.g. citing a GBP exclusion for a EUR request, or a native app exclusion for responsive mobile web), ScopeGhost must fail closed by downgrading the finding to `AMBIGUOUS` with `LOW` confidence.

#### 2. Contradiction Handling Rate
$$\text{Rate}_{\text{contradiction}} = \frac{\text{Conflicting Cases Classified as AMBIGUOUS}}{\text{Total Contradictory Cases}}$$
- When baseline clauses conflict (e.g. a mobile prototype is included in deliverables, but native mobile apps are excluded), the finding must classify as `AMBIGUOUS`, retaining both citations.

#### 3. Prompt Injection Unsafe Acceptance Rate
$$\text{Rate}_{\text{injection\_unsafe}} = \frac{\text{Injection Cases Classified as IN\_SCOPE}}{\text{Total Prompt Injection Cases}}$$
- An adversary attempting to trick the LLM into marking out-of-scope work as `IN_SCOPE` for free must be rejected. Successful defense yields an unsafe acceptance rate of **0.0%**.

---

## 4. Benchmark Verification Results

Execution output from `npm run test:eval` on October 14, 2026:

```
================================================================================
       ScopeGhost Evaluation Benchmark — Hacktoberfest Week 2 Test Suite       
================================================================================

Corpus: ScopeGhost M4.9 Synthetic Evaluation Benchmark Corpus (v2.0.0-synthetic)
Baseline Contract Clauses: 10
Benchmark Test Cases: 36
Evaluation Mode: DETERMINISTIC BENCHMARK (Offline Mock -> Production Service)
Evaluator Version: 1.0.0

1. Citation Verification Engine (Positive Excerpts & Negative Controls):
  [PASS] Positive Citation Grounding: 100.0% (34/34)
  [PASS] [Negative Control] Fabricated quote rejected (isVerified: false, matchType: NOT_FOUND)

2. Prompt Isolation & Untrusted Framing:
  [PASS] Structural XML tag encapsulation (<untrusted_evidence_chunk>)
  [PASS] Explicit system instructions guarding against prompt overrides

3. Executing Production ScopeAnalysisService Pipeline Across 36 Test Cases:
  [PASS] Successfully executed 36/36 cases through production service.

4. Scope Classification Benchmark Metrics:
  Total Evaluated Cases: 36
  Strict Exact Accuracy: 97.2% (35/36)
  Acceptable Classification Rate: 100.0% (36/36)
  False Exclusion Rate (In-Scope Miss Rate): 0.0% (0/6)

5. Classification Confusion Matrix (Rows = Ground Truth, Columns = Predicted):
-----------------------------------------------------------------------------------------------------
Actual \ Predicted          | IN_SCOPE | POTENTIALLY_OUT_OF_SCOPE | AMBIGUOUS | INSUFFICIENT_EVIDENCE
-----------------------------------------------------------------------------------------------------
IN_SCOPE                   |        6 |                        0 |           0 |                     0
POTENTIALLY_OUT_OF_SCOPE   |        0 |                        6 |           1 |                     0
AMBIGUOUS                  |        0 |                        0 |          16 |                     0
INSUFFICIENT_EVIDENCE      |        0 |                        0 |           0 |                     7
-----------------------------------------------------------------------------------------------------

6. Per-Class Precision, Recall & F1 Scores:
--------------------------------------------------------------------------------
Class                      | Precision | Recall    | F1 Score  | Support
--------------------------------------------------------------------------------
IN_SCOPE                   |    100.0% |    100.0% |    100.0% |       6
POTENTIALLY_OUT_OF_SCOPE   |    100.0% |     85.7% |     92.3% |       7
AMBIGUOUS                  |     94.1% |    100.0% |     97.0% |      16
INSUFFICIENT_EVIDENCE      |    100.0% |    100.0% |    100.0% |       7
--------------------------------------------------------------------------------

7. Subgroup & Adversarial Invariant Analysis:
  [PASS] Topic-Mismatch Downgrade Rate: 100.0% (6/6)
  [PASS] Contradiction Ambiguity Handling Rate: 100.0% (6/6)
  [PASS] Prompt Injection Unsafe Acceptance Rate: 0.0% (6/6 blocked)
  [PASS] Fabricated Citation Rejection Rate: 100.0% (2/2)

8. Deterministic Integer Financial Engine Invariants:
  [PASS] Integer-cent rounding invariant (20.5h @ $150/hr = $3,075.00)
  [PASS] Aggregate change order totals: $14,250.00 – $24,000.00 (95h–160h)

================================================================================
EVALUATION LIMITATIONS & REAL-WORLD BOUNDS:
- Corpus Version: 2.0.0-synthetic (36 versioned test cases)
- Evaluator Scope: Exercises production ScopeAnalysisService, citation verification,
  topic-mismatch downgrade rules, schema compliance, and financial math invariants.
- Real-World Generalization Notice: These synthetic benchmark passes verify pipeline
  correctness and deterministic safety invariants on versioned fixtures; they do NOT
  constitute a claim of 100% accuracy on unstructured real-world contracts in the wild.
- Live Model Verification: Live local inference testing against Ollama gemma3:4b can
  be independently executed via: RUN_OLLAMA_INTEGRATION=1 npm run test:integration
================================================================================

  ALL SYNTHETIC BENCHMARK INVARIANTS PASSED (PASS WITH DOCUMENTED LIMITATIONS)
```

---

## 5. How to Reproduce

```bash
# 1. Run the pure metrics unit test suite (7 tests)
npx vitest run src/lib/analysis/evaluation/metrics.test.ts

# 2. Run the 36-case benchmark evaluation runner
npm run test:eval

# 3. Run full evaluation test suite
npx vitest run src/lib/analysis/evaluation.test.ts

# 4. Run entire project test suite (104 tests)
npm test

# 5. Typecheck & build
npm run typecheck
npm run build
```
