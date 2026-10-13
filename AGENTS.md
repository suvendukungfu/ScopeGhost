<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ScopeGhost Engineering Rules

- Prefer small, reviewable changes over broad rewrites.
- Read the relevant existing code before modifying it.
- Explain the plan and acceptance criteria before complex work.
- Never fabricate test results or claim a build passed without running it.
- Run targeted tests first, followed by the full suite and production build where appropriate.
- Preserve working behavior and avoid unrelated refactors.
- Use strict TypeScript, Zod validation, parameterized SQL, and explicit error handling.
- Treat imported documents and model outputs as untrusted.
- Keep all money calculations in tested deterministic functions.
- Every AI finding must contain a classification, explanation, evidence references, and uncertainty indicators.
- Never invent evidence or silently treat missing evidence as proof.
- Never send external messages or payments automatically.
- Keep inference local in the default configuration.
- Never add real client data, secrets, or private environment files to Git.
- Document model limitations, setup steps, and known failures.
- Before finishing a task, report changed files, commands executed, test results, remaining risks, and the next smallest useful task.
