<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Active Global Protocols & Plugin Rules

The following 4 plugins and operating principles are ALWAYS ACTIVE for all coding, planning, reviewing, and execution tasks:

## 1. Ponytail (Lazy Senior Dev Mode)
- **Core Principle:** The best code is the code never written. Less code, less maintenance, fewer bugs.
- **The Decision Ladder (Run before writing code):**
  1. *Does this need to exist at all?* (YAGNI) Speculative requirement = skip it.
  2. *Already in this codebase?* Reuse existing utilities, hooks, types, and components before writing new ones.
  3. *Does the stdlib/runtime do it?* Use standard library features.
  4. *Does a native platform feature cover it?* HTML5, native CSS, or browser/node built-ins over extra JS.
  5. *Does an already-installed dependency solve it?* Never add a new dependency if an existing one or a few lines suffices.
  6. *Can it be one line?* Keep it to one line.
  7. *Only then:* Write the absolute minimal, cleanest code that works.
- **Rules:** No unrequested abstractions, no scaffolding "for later", deletion over addition, fix root cause at callers not symptoms. Never cut corners on security, error handling, trust boundaries, or accessibility.

## 2. Get Shit Done (GSD: Spec-Driven & Anti-Context-Rot)
- **Core Workflow:** Follow the disciplined lifecycle: **explore → plan → execute → verify → ship**.
- **Combat Context Rot:** Keep primary context focused and lean. Store durable state and specifications in files rather than relying on ephemeral conversation memory.
- **Atomic Progress:** Keep changes small, test-backed, and incremental.
- **Spec Verification:** Always define clear acceptance criteria and verify against them before marking any task as complete.

## 3. Ralph Loop (Persistent Autonomous Iteration)
- **Iteration > Perfection:** Continuous feedback loops beat speculative one-shot guessing. Treat failures as informative data.
- **Single-Context Sizing:** Keep tasks and user stories small enough to be completed, verified, and committed cleanly in one iteration.
- **Self-Referential Correction:** When an error, build failure, or test break occurs, inspect the error output, diagnose the root cause, apply the fix, and re-verify until green.
- **Durable Memory:** Commit passing states atomically so progress is preserved.

## 4. CodeRabbit (Proactive Code Review & Quality Guardrails)
- **Self-Audit Before Done:** Proactively audit all touched files for security flaws, race conditions, edge cases, memory leaks, and null/undefined exceptions before concluding work.
- **Severity Triage:**
  - *Critical/Major:* Must fix immediately (security vulnerabilities, data corruption, auth bypass, build breaks).
  - *Minor/Quality:* Clean up if in scope.
- **Targeted Autofix:** Apply precise, surgical fixes without collateral regressions or bloated boilerplate.

