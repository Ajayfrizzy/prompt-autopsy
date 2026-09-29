---
doc: checklist
status: approved
---

# Prompt Autopsy Build Checklist

Implementation order follows the learner's explicit authorization: verify foundation first, then implement the approved core journey. No additional planning approval gate is introduced. Execution uses concise automated verification/commits; hands-on review remains pending, not presumed completed.

## Slices

- [x] **1. Foundation compatibility verification**
  Becomes usable: A runnable Next shell and offline bounded schema checks.
  Why now: User explicitly required environment evidence before features.
  PRD ref: `prd.md > The Core Journey`
  Spec ref: `spec.md > Stack and Runtime`
  Build: Initialize Node 24.21.0, exact dependencies, lockfile, strict Zod schemas and offline checks.
  Verify (mechanical): npm run typecheck; npm test; npm run build
  Learner check: Run npm run dev and open localhost:3000.
  Commit: `Verify approved runtime and provider schema foundation`

- [x] **2. Import and private review**
  Becomes usable: Validate a fictional transcript and inspect/redact it with stable IDs.
  Why now: Proves the source/evidence boundary before model integration.
  PRD ref: `prd.md > Import Workspace`
  Spec ref: `spec.md > Transcript Parser and Reviewed Snapshot`
  Build: Parser, files, limits, review editors, session reducer and leave guard.
  Verify (mechanical): Parser/state/RTL tests and typecheck.
  Learner check: Import the sample, redact a message and check that IDs remain unchanged.
  Commit: `Add validated import and privacy review`

- [x] **3. Evidence-backed investigation**
  Becomes usable: Count and analyze consented content through bounded stateless routes, then inspect linked evidence.
  Why now: Introduces the unique kernel early.
  PRD ref: `prd.md > Investigation Workspace`
  Spec ref: `spec.md > Provider Boundary and Error Handling`
  Build: Canonical contexts, mocked provider tests, source validation, timeline/inspector and budget accounting.
  Verify (mechanical): Mocked endpoint/schema/citation tests; no live calls.
  Learner check: Inspect controlled evidence and confirm that facts differ from hypotheses.
  Commit: `Add bounded investigation and evidence inspection`

- [x] **4. Reviewed corrections and faithful exports**
  Becomes usable: Review proposals, recheck edited wording and download eligible rules/report files.
  Why now: Completes the approved core journey.
  PRD ref: `prd.md > Decision & Export Workspace`
  Spec ref: `spec.md > Edit Anchoring, Conflict Resolution and Exports`
  Build: Decisions, conflicts/merges, semantic review, exact edit/diff/report generation and reminders.
  Verify (mechanical): All deterministic and UI tests, typecheck, production build.
  Learner check: Try no-change, rejection and partial export; compare downloaded text.
  Commit: `Add reviewed corrections and deterministic exports`

## Hands-on Checkpoints

- [ ] Early import/evidence workflow explored by learner.
- [ ] Final core-journey exploration and feedback completed.

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship.

## Code Tour and App Map

- [ ] Learning activity and code tour completed.
- [ ] Optional reflection addressed.
- [ ] App map prepared from finished code.

## Revisions

- Foundation is a separate risk-verification step because the learner explicitly required it before product features.

- Use Next.js webpack mode for build/dev: Turbopack CSS processing attempted a subprocess port blocked by this environment even on the escalated retry. Same Next/React architecture and versions.

Foundation evidence: Node 24.21.0 archive SHA256 verified; exact npm install completed; TypeScript passed; 16 offline schema tests passed; production Next webpack build passed. No provider calls.

- Slices 2–4 were integrated as one connected workflow checkpoint after the foundation passed. Shared reducer/API/review contracts were verified together; hands-on learner checkpoints remain unchecked rather than represented as completed.

## Mechanical Verification Evidence

- Node 24.21.0 used for installation, TypeScript, tests and production build. Lockfile committed in foundation checkpoint `4ab7325`.
- `npm run typecheck`: passed.
- `npm test`: 100 tests passed across nine files: bounded schemas, parser/input limits, session budget, review/export, reducer, import/privacy UI, result/recheck/export UI, provider mocks and real-handler mocked route contracts.
- `npm run build`: passed with Next 16.3.7 webpack; both stateless POST routes built.
- Local HTTP smoke check: initial workspace renders successfully at 127.0.0.1:3000.
- No live OpenAI count/generation requests. Provider quality, account access and actual count/schema overhead are not measured by mocked tests.
- Browser visual inspection and actual browser leave/download behaviour remain hands-on checks. RTL validates behaviour in a simulated DOM; it does not prove browser warning display.

## Next Hands-on Review

Open http://127.0.0.1:3000 (or run `npm run dev` under Node 24.21.0). Download the fictional transcript sample, upload a local AGENTS.md/CLAUDE.md and review the import/privacy layout. Live investigation requires configuring OPENAI_API_KEY and explicit in-app consent; no synthetic response is passed off as live analysis. After learner feedback, address requested fixes and complete final review/code tour before 6-ship.
