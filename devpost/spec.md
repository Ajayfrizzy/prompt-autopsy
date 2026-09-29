---
doc: spec
status: approved
---

# Prompt Autopsy — Technical Specification

Approved technical specification. The learner supplied authoritative clarification that OpenAI `POST /v1/responses/input_tokens` is unbilled preprocessing: returned counts are not charged at model-input rates; subsequent generation is billed normally. This resolution is recorded from the learner's clarification, not an independently performed billing experiment.

`4-spec` is complete. Final approval authorizes implementation, beginning with Node 24.21.0 environment/compatibility checks, exact dependency installation and committed lockfile, TypeScript/Next verification, offline Zod schema checks, build and non-provider tests. No live generation calls during this verification.

## Billing Resolution and Approval

No external specification blocker remains. Counting consumes no monetary ledger. Generation reservations remain USD 0.250 for initial analysis and USD 0.064 for a targeted recheck, within a USD 0.40 in-session AI-generation ceiling. Count errors/timeouts still fail closed. Counting still transmits reviewed content to OpenAI after consent, so disclosure and privacy rules are unchanged. No other architecture, product, schema, limit or semantic-review decision changes.

## Specification Map

| Document | Authoritative detail |
|---|---|
| [transcript-format.md](transcript-format.md) | Exact v1 grammar, escaping, errors and stable message IDs. |
| [technical-contracts.md](technical-contracts.md) | Domain records, reducer transitions, citations, edits, conflicts, reports and all 21 acceptance-test mappings. |
| [request-limits.md](request-limits.md) | Exact byte/token caps, counting/generation identity, consent, admission and ledger conditions. |
| [provider-contracts.md](provider-contracts.md) | Bounded schemas, coverage, SDK/runtime baseline, timeouts and first-build verification. |

Scope and PRD govern product behaviour. This specification and its normative supplements govern implementation. technical-decisions.md is interview history; stale historical suggestions never override this consolidated set.

## How This Works, In Plain Language

The browser parses the manually prepared transcript, holds the investigation in memory and lets the developer review/redact it. After consent, a stateless Next.js endpoint sends reviewed text to OpenAI. The application validates the structured response, verifies citations and presents findings alongside historical instructions.

Model proposals do not modify files. The developer reviews them; deterministic code binds decisions to exact versions, blocks overlapping/conflicting changes and creates the final diff and downloads from the reviewed rules baseline. Editing or merging a proposal invalidates its approval and semantic review. A small, explicitly requested semantic recheck compares the new wording without resending the whole transcript. The developer still makes the final decision.

All provider calls share one investigation budget. If a recheck cannot complete within that budget, its proposal stays pending while independent approved changes remain exportable. Refreshing ends the workspace; only downloaded files are kept by the user.

## Stack and Runtime

Learner-selected: Next.js App Router, React, TypeScript, Tailwind, shadcn/ui or comparable lightweight accessible components, Lucide, Zod, Context/useReducer, Vitest and React Testing Library. Use native browser file/download and leave-page APIs. Stateless server Route Handlers; no database, persistence, object storage, separate backend or automatic recovery.

Dependency documentation: [Next.js](https://nextjs.org/docs/app), [React](https://react.dev/reference/react), [Tailwind](https://tailwindcss.com/docs), [shadcn/ui](https://ui.shadcn.com/docs), [Lucide](https://lucide.dev/guide/packages/lucide-react), [Zod](https://zod.dev/), [Vitest](https://vitest.dev/guide/), [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/). The selected Node 24.21.0 baseline and verified package metadata are recorded in [provider-contracts.md](provider-contracts.md). Engine/peer compatibility was checked from published metadata; installation/build compatibility has not been tested.

## Where It Runs and How Someone Tries It

Use Node 24.21.0 LTS. At first authorized setup, create package.json and the lockfile with exact compatible dependencies; subsequent checkouts use `npm ci`.

Planned local workflow: install project dependencies, set server-only OPENAI_API_KEY in an ignored local environment file, run `npm run dev`, open `http://localhost:3000`. Planned checks: `npm test` and `npm run build`. These are intended commands, not existing scripts or executed results. No public environment variable may contain the key. Vercel is an optional deployment target, not a requirement or authorization to deploy. Demo video and public source repository remain the submission requirements.

## Core Journey and State

Implements `prd.md > The Core Journey`, `States and Boundaries` and `Session Lifetime and Unsaved Work`.

1. Import validates all three inputs locally and displays parsed message IDs; invalid parsing commits no partial records.
2. Privacy Review edits the in-memory records. Freeze the validated reviewed snapshot and bind explicit consent to its version. No provider transmission occurs in the first two stages.
3. Investigation reserves the session budget, validates/counts the canonical context after consent, then generates only if admitted. Validate the entire result before opening linked timeline/findings/inspector panels.
4. Decision & Export reviews each finding, compares rules, records decisions, performs explicit rechecks where required and computes eligible edits. Download only the reviewed-baseline revision and/or an evidence-backed report.

The reducer owns stage, source identity/version, consent, active request, active analysis, proposal revisions, semantic results, decision/conflict history, budget reservations and download markers. Every asynchronous response binds to request ID, investigation ID and input version; rechecks also bind proposal/version and context hash. Late responses may settle cost but cannot repopulate stale content. Input edits invalidate consent and all derived exports. Proposal edits revoke approval and semantic freshness without rerunning full analysis.

All working content is memory-only. Register supported `beforeunload` protection after meaningful input, clean it up on empty state/unmount, and use the PRD's explicit in-app discard warning for controlled departures. Ordinary stage navigation preserves state. Track each current output's download separately; reminders never download automatically. Refresh/reopen starts empty, with no localStorage, IndexedDB, recovery cookies, accounts or history.

## Exact Input and Admission Limits

| Constraint | Selected limit |
|---|---:|
| Raw transcript bytes / reviewed decoded body bytes | 131,072 / 98,304 |
| Messages / individual reviewed body bytes | 200 / 16,384 |
| Historical rules bytes, uploaded and reviewed | 16,384 each |
| Incident bytes / proposal replacement bytes | 2,048 / 4,096 |
| Recheck evidence bytes | 2,048 total |
| HTTP request bytes: analysis / recheck | 262,144 / 65,536 |
| Input tokens: analysis / recheck, including overhead and margin | 35,000 / 6,000 |
| Generated tokens: analysis / recheck, including reasoning | 5,500 / 2,000 |
| Reasoning effort | low for both |

All byte caps use UTF-8. Apply byte/grammar/count/field/body/consent checks in the browser and independently validate body/fields on the server. Count only after consent, using the exact model, instructions, reviewed input, schema, reasoning, tools and other token-bearing context that generation will receive. Require `N + max(256, ceil(N * 0.05)) <= operationInputCap`. Recount any changed context; never add hidden prompt text afterward. On unavailable/invalid count or oversized context, fail before generation and preserve reviewed work. No estimate fallback, truncation or summarization.

## Bounded Analysis and Coverage

Implements `prd.md > Investigation Workspace` and `Targeted Semantic Review After Editing`. Strict Zod wire objects have all required keys, explicit nulls and no unknown properties. Initial analysis has 1–4 findings, 0–4 proposals, 0–8 timeline events and at most six unique proposal-pair relations. Findings distinguish observations, hypotheses, missing evidence, historical comparisons and a recommendation. Quotes resolve exactly to reviewed message/rule IDs and occurrences; model-authored offsets are never trusted.

Use the exact field/array bounds in provider-contracts.md. Required coverage is `within_capacity` or `limited`; limited coverage requires a reason, a visible notice and inclusion in the report. Neither status proves exhaustive discovery. A recheck returns only advisory status/comparisons/reasoning/limitations, with at most eight comparisons. Capacity uncertainty cannot become `no_issue`. Incomplete, refused or invalid output fails as a whole; no partial salvage or hidden repair calls.

## Look and Feel

Implements `prd.md > Look and Feel`. Restrained dark developer-tool interface, readable typography, subtle accents, explicit evidence/hypothesis labels and source highlighting. Import uses two columns. Investigation uses roughly 25/45/30 panels; the inspector becomes a drawer on narrow screens. Native file interactions and compact accessible controls take priority over elaborate effects. Use system sans-serif for prose and system monospace for source/diffs, a neutral dark background, subtle bordered panels and restrained blue accents. Use text/icons as well as colour for status; keyboard-operable controls, visible focus and accessible labels are required. These are implementation styling defaults, not new product features.

## Transcript Parser and Reviewed Snapshot

Implements `prd.md > Import Workspace` and `Privacy Review`. The exact grammar, escaping and error rules are in [transcript-format.md](transcript-format.md), which is part of this draft. Parsing is local and all-or-nothing. Internal M001-style IDs remain stable through body editing; removed IDs are retired. Optional source provenance is not identity.

The grammar is exactly `@@MESSAGE`, then `speaker: developer|agent|system`, optional `original_ref: value`, `@@BODY`, multiline body, and `@@END`, each structural marker/header on its own line. Header order/case/spacing are strict. UTF-8 decoding is strict; remove one initial transcript BOM, normalize CRLF to LF, reject bare CR. Escape a literal whole-line marker with one leading backslash and double a literal leading backslash; invalid escapes, empty bodies, unsupported speakers and missing markers fail the entire import with line-specific correction guidance. The exact escape table and newline semantics in transcript-format.md are normative. Imported system messages remain data, never application instructions.

A reviewed snapshot contains investigationId, reviewedInputVersion, incident text, ordered surviving messages with IDs/speakers/bodies, and the reviewed rules filename/text. Redaction provenance must mark removed/masked locations without putting removed content into the model payload, preview report or exports. Changing any reviewed input invalidates consent, analysis and derived approval/recheck results. No application recovery storage is used.

## Domain Contracts and Acceptance Coverage

[technical-contracts.md](technical-contracts.md) is part of this specification draft. It defines application/source identity, reviewed-rule passage segmentation, full-analysis domain fields, exact citation resolution, edit anchoring/application, reducer transitions, diff/privacy/report generation, API errors and a test mapping for all 21 PRD acceptance criteria. These are derived implementation details for review, not implemented code. Bounded wire-schema proposals and runtime checks are in [provider-contracts.md](provider-contracts.md). Quantitative bounds, coverage behaviour and Node baseline are retained as reviewed; first-build verification is scheduled, not an open design question.

## Proposal State and Targeted Semantic Recheck

Implements `prd.md > Decisions and Approval Behaviour`, `Pending Findings and Conflicting Changes`, and `Targeted Semantic Review After Editing`.

### Identity and Version Binding

Application code owns immutable investigation, finding, rule-passage and proposal IDs. Model output may refer to supplied IDs or schema-defined temporary result keys that the application validates and maps; the model cannot mint application authority or approval.

Each proposal retains its original AI text, current developer text, finding IDs, proposalVersion, edit target, and current decision. Historical semantic results/approvals are immutable session records. Rule references bind to a specific reviewed-baseline version and exact source text. Replacing source inputs invalidates these bindings; a coincidentally identical display ID is insufficient.

Each recheck binds to investigationId, reviewedInputVersion, proposalId, proposalVersion, comparisonContextHash and requestId. The context hash covers the entire exact reviewed rules file/version, target proposal/version/operation, all included peer proposal IDs/versions/text/targets and any minimal reviewed evidence, using canonical serialization. Bind approvals to that same current proposal/review context. Do not trust a model-echoed version as proof: the server/client associate the output with the actual submitted request.

### Edit and Merge Transitions

1. A proposal-text or edit-target change increments its version and revokes previous approval.
2. Immediately rerun local exact-range, expected-text and overlap validation without a model call.
3. Set semantic state to `stale` with **Stale — recheck required**. Preserve the original proposal and prior results for the report.
4. A merged revision receives a new proposal ID/version, links to all contributing findings and proposals, and supersedes those source proposals for export. Neither approval nor semantic review carries over.
5. A disclosed, explicit **Review edited proposal** action starts a targeted recheck if local structure and budget permit. Never call on every keystroke and never silently run the whole investigation.
6. If the developer edits again while a request is running, the old response cannot validate the new revision. Cancel best-effort, but still account conservatively for possible provider cost.

### Recheck Input Contract

Endpoint: `POST /api/semantic-recheck`. Zod validates the exact contract before a provider call. Payload contains:

- Request/snapshot/proposal identities and versions, plus a disclosure-confirmation flag tied to the limited payload.
- The edited proposal: ID, current text, operation/target identifiers and associated finding IDs.
- Historical rule context: the entire reviewed/redacted rules file, its reviewed-baseline version and immutable passage references. Include whitespace and passages with no identified relevance; no semantic retrieval, embeddings or heuristic ranking.
- All other currently approved/export-eligible proposals that would coexist with the target: IDs, versions, exact text and targets. Do not filter them by guessed semantic relevance. Superseded merge-source proposals are retained in the investigation record but are not active coexistence peers.
- Minimal reviewed evidence only when necessary: message IDs and exact reviewed passages, with the purpose of their inclusion.

No complete transcript, original unredacted file, provider file ID, arbitrary tools or provider-side conversation history. Build the payload from the consented snapshot and current proposal records, not by reading raw uploaded files again. Expose what categories of text will be sent before the developer starts the recheck.

### Complete Comparison Context — Resolved

Compare edited/merged wording with the entire reviewed/redacted historical rules file whenever it fits the supported targeted budget, and include all approved/export-eligible proposals that would coexist with it. Include only minimal exact reviewed transcript evidence genuinely necessary to understand intent. Do not resend the complete transcript, implement semantic retrieval/embeddings/heuristic passage ranking, summarize rules or silently drop peers/passages.

If the complete required context cannot fit, fail closed before generation with `RECHECK_CONTEXT_TOO_LARGE`. Preserve the proposal as Semantic review pending and explain the limiting component and measured limit. The developer can keep unrelated eligible changes, defer this proposal or explicitly prepare a smaller investigation; changing reviewed inputs requires fresh consent/analysis and does not refund prior session spend. Removing required evidence automatically is not an acceptable remedy.

Bind results to exact rules/version, proposal/version and included peer identities/versions/content. Any later comparison-context change makes the result stale. Compute peer membership from approved candidate decisions and explicit exclusions, before semantic-staleness filtering, so marking a peer stale does not silently remove it from another proposal's context. An unresolved conflicting approved candidate cannot be quietly omitted to obtain a clean recheck. Approval of the target itself does not change its own peer set. Peer additions/removals/edits do change it; preserve histories and require an explicit fresh check rather than triggering paid loops. Show affected approvals as stale/non-exportable until explicitly rechecked; never launch paid rechecks automatically.

### Structured Result Contract

Provider output has no revised text, approval field, executable instructions or export flags. Strict shape:

```text
status: no_issue | possible_duplicate | possible_conflict | uncertain
comparisons: [{
  relation: possible_duplicate | possible_conflict,
  ruleIds: string[],
  proposalIds: string[],
  reasoning: string
}]
reasoning: string
limitations: string[]
```

Every referenced ID must exist in the submitted context. Reject unknown IDs, invalid combinations or extra output properties. A no_issue result cannot also carry conflict/duplicate comparisons. Issue results require a corresponding comparison with a target reference. Uncertain permits insufficient-context reasoning without inventing IDs. Exact list/text bounds and cross-field rules are in provider-contracts.md. Implementing the Zod schemas waits for technical-spec approval.

Validated response envelope is assembled by application code: request binding, validated semantic result, provider usage when available, and sanitized error information. Structured syntax does not prove reasoning quality.

### Applying a Recheck Result

| Outcome | State and permitted next action |
|---|---|
| Current, validated no_issue | Show “No duplicate or conflict was identified in the supplied comparison context.” Permit separate explicit approval only if local checks and other conflict constraints pass. |
| Current possible_duplicate/possible_conflict | Show compared text and rationale; invoke the existing developer conflict/review workflow. Never let the provider choose a winner or rewrite text. |
| Current uncertain | Show limitations; allow revision or Needs evidence. Do not allow export approval based on this result. |
| Budget insufficient, provider failure, refusal, incomplete output or invalid schema/reference | Preserve text; set pending with **Semantic review pending** and an actionable reason. Remain non-export-eligible; explicit retry only if budget permits. |
| Response for stale input/proposal/context | Do not attach it as the current review or approval. Account for usage, preserve a superseded request record if needed, and require a current recheck. |

Successful semantic review is not correctness, prevention or agent-obedience verification. No prior result can be silently reused for new wording. Developer conflict resolutions retain traceability; edited/merged text must pass the same freshness rules again.

### Comparison Context Changes

Changing an interacting proposal or its eligibility can invalidate an earlier pairwise semantic conclusion even if the target wording is unchanged. Recompute the deterministic context signature at the approval/export boundary. Preserve local conflict blocks and never label an old review as current for a changed context. Avoid a self-triggering loop: approving the target itself does not change its own comparison context; only actual compared input changes matter. Use the complete-context policy above. A changed peer set must not be concealed by filtering stale peers out of the comparison.

## Edit Anchoring, Conflict Resolution and Exports

Implements `prd.md > Pending Findings and Conflicting Changes` and `Export Contents`. Use exact reviewed text throughout. Rule passages have immutable version-scoped IDs and UTF-16 half-open offsets. Model targets specify a rule ID, exact quote/occurrence and placement; deterministic code resolves the range. One atomic insertion or replacement per proposal; a developer merge may select one contiguous region. Never fuzzy-match or silently rebase an edit.

Approval binds to baseline, proposal version and exact resolved edit. Block same-instruction modifications, overlapping replacement ranges, colliding insertions and validated unresolved semantic relations. Conflict resolutions retain reasons and source links. If keeping one changes a targeted comparison context, its prior result is stale and explicit recheck is required; an unchanged recheck does not itself change peer text/membership. A developer disposition of an advisory issue is recorded against exact compared versions and cannot override a syntactic conflict, uncertainty or stale review. Detailed initial-versus-targeted coverage and resolution rules are in technical-contracts.md.

Apply only eligible edits in descending offset order after revalidating expected text against the reviewed baseline. The preview and download consume the same computed revision. Preserve all unrelated reviewed text, line endings and rules filename/BOM policy. Use jsdiff for display only. Keep privacy markers separate from approved edits and never display deleted original secrets in the final diff. Reports include every finding, coverage limitation, reviewed evidence, hypotheses, decisions, original/current proposals, semantic histories, conflicts and included-edit provenance, with the PRD disclaimer. Report-only is the outcome when no edit is eligible.

Use native UTF-8 Blob downloads, revoke object URLs, and track the exact bytes offered for each file. Render imported/model text inertly; no raw HTML or external images. Pending/rejected/no-change/Needs-evidence/conflicted findings remain visible outside the eligible-only diff. Export with pending, Needs-evidence or unresolved conflict states says **Export completed with unresolved findings.** Approval and download never establish testing or prevention.

## Aggregate Cost Accounting

Implements the learner's shared ceiling for the initial analysis, targeted rechecks and explicit retries. Rates verified in official documentation on 2026-09-29: USD 4/M uncached input tokens and USD 20/M output tokens, including reasoning. See [model documentation](https://developers.openai.com/api/docs/models/gpt-5.6-sol) and [Responses reference](https://developers.openai.com/api/reference/resources/responses/methods/create). Rates are promotional and must be rechecked before implementation/deployment.

### Per-Call Generation Budgets

Selected design limits, with unbilled count preprocessing; these are not measured quality guarantees:

| Call | Maximum total input tokens | Maximum generated tokens, including reasoning | Maximum token charge at recorded rates |
|---|---:|---:|---:|
| Initial investigation | 35,000 | 5,500 | USD 0.250 |
| Targeted semantic recheck | 6,000 | 2,000 | USD 0.064 |

Input totals include every prompt, schema and payload overhead. Approximate visible-output goals are not additional allowances. The initial cap leaves USD 0.150 for rechecks; two maximum-sized targeted calls total USD 0.128, yielding USD 0.378 overall. A third would exceed USD 0.40 and is blocked unless actual earlier usage leaves sufficient headroom. A second full-sized investigation cannot be assumed affordable.

Do not silently reduce the evidence, raise output caps, choose a fallback model, perform repair calls or rely on cache discounts. Refusal/incomplete/invalid output remains an error, not a partially valid approved analysis. Reasoning effort and these output ceilings must be validated with the finalized schemas on limited live examples.

### Ledger and Reservation

Use integer micro-USD arithmetic: input tokens cost 4 micro-USD each; output tokens cost 20. Normal target is 250,000; ceiling is 400,000. One in-memory ledger belongs to the investigation, not an individual proposal or API route.

Before dispatch, reserve the conservative maximum cost of the request. Allow dispatch only if accounted spend plus unresolved reservations plus the new reservation does not exceed 400,000. Serialize provider operations per investigation to avoid racing reservations; UI state changes still work while a call is pending. Disable implicit SDK/transport retries for billed model generation. Every explicit retry is a new accounted attempt.

When trusted usage is available, replace the reservation with its measured token charge. A completed stale response still costs money and must settle its reservation. If usage is unknown after timeout/disconnect/cancellation, retain the full reservation; do not assume cancelling prevented billing. Release a generation reservation when generation demonstrably never started (including count failure) or there is reliable evidence of non-billing. A lost response after possible generation dispatch retains its full reservation; counting itself is unbilled. No extra provider call solely to repair a malformed response.

Resetting semantic status, rejecting a proposal or editing reviewed inputs does not refund spend. Keep the ledger through reanalysis of the same investigation and conservatively account for any already-running calls. Refresh discards session state under the PRD; it is not an account-level spend limit.

### Enforceability Boundary — Resolved

Learner-approved: the USD 0.40 ceiling is enforced within one normal Prompt Autopsy investigation session. The browser's in-memory ledger is the authoritative cumulative guard for normal UI actions, including the initial analysis, semantic rechecks and explicit retries. Conservative reservation, trusted-usage settlement and unknown-cost reservation retention are mandatory. Stale, rejected and superseded results never refund incurred spend.

Each stateless Route Handler independently enforces its allowed operation, fixed model, standard service tier, no tools, `store: false`, request/schema validity, input/token limits, generated-token cap, allowed reasoning/configuration and every per-call ceiling. Derive these values and prices from trusted server configuration. Never use client-supplied model names, limits, prices or computed costs as authority; reject extra configuration fields.

This architecture does not provide a tamper-proof aggregate USD 0.40 limit across direct API replay, deliberately modified requests, refresh/session reset, multiple tabs or independent sessions, or repeated new investigations on the same deployment. A stateless server cannot reliably enforce that aggregate limit without trusted server-side state or an external quota mechanism. A signed client ledger would not resolve replay and is not part of the MVP.

No database, accounts, Redis, durable server ledger or other persistence is added for this purpose. This boundary is acceptable for local development and the hackathon demo. Public access using the developer's paid OpenAI key would require a separate production decision about provider/project spending controls, authentication, rate limiting or trusted accounting; those protections are outside this MVP and public deployment is not authorized here.

Product wording: **“This investigation has a USD 0.40 in-session AI budget.”** Never claim that Prompt Autopsy guarantees the account can never spend more than USD 0.40. Display spent, reserved and available amounts separately; reservations are conservative budget holds, not confirmed charges.

### Token Counting and Pricing Configuration

See [request-limits.md](request-limits.md) for the exact selected limits and the approved local-validation plus consented provider-count admission design. No counting or generation API calls have been made.

The counting architecture and margin are selected: local validation, then consented `/v1/responses/input_tokens`, then generation only when `N + max(256, ceil(N * 0.05))` fits the operation cap. Count and generation share identical token-bearing context, including model, instructions, reviewed input, schema, reasoning and tools; any context change requires recounting. Counting errors fail closed without local-estimate fallback. Use low reasoning effort for both operations and the exact caps in request-limits.md. Fixed prompt/schema/framing allocations are 5,000 input tokens for analysis and 1,500 for recheck, inside the overall caps. These are design ceilings; measuring the actual generated schema is a first-build verification task during the authorized build, not a claim that measurement already occurred. Character counts are not exact token counts and cannot substantiate the ceiling. Server revalidates total request limits before generation; pre-consent previews must remain local. If counting cannot safely establish that a request fits, reject it with an actionable message rather than truncate.

Counting is unbilled preprocessing as clarified by the learner at final approval. It consumes no monetary reservation. Preserve the generation budget and all fail-closed admission checks; consent still covers the provider transmission.

Consent must disclose that reviewed content is sent to OpenAI first for size verification and then, if it fits, for analysis. One consent covers both for the same reviewed snapshot; there is no provider transmission during Import or Privacy Review. Counting failure preserves work, blocks generation and permits only explicit retry. See request-limits.md for staged reservation settlement when generation has not started.

Standard processing is explicit `service_tier: "default"`; no tools; `store: false`; no automatic truncation. Use `prompt_cache_options: { mode: "explicit" }` with no breakpoints to avoid cache-write premiums. The documented configuration and published SDK surface were inspected; actual endpoint acceptance remains a first-build integration check. Provider-rate changes require updating the budget calculation, not silently spending more.

## Provider Boundary and Error Handling

Use one server-side provider interface with `analyze(reviewedSnapshot)` and `recheck(targetedContext)` operations. Both call OpenAI `gpt-5.6-sol` via `POST /v1/responses`, using Zod-backed Structured Outputs and server-only credentials. UI and domain modules never import provider credentials or SDK clients. Responses cannot select model, tools, approval or file operations on behalf of the application.

Server returns sanitized errors for invalid input, excessive size/budget, rate limit, timeout, refusal, incomplete output, invalid schema or invalid reference. Preserve client reviewed state/edits, never log content, and do not substitute synthetic results for failed live calls. Count/generation/server/browser timeouts are 20/120/150/160 seconds, respectively, as recorded in provider-contracts.md. Cancellation never proves zero cost.

Disclose that application session state is not persisted, reviewed content is sent to OpenAI after consent, and provider data policy governs external retention. `store: false` is not ZDR. [Official API data handling](https://developers.openai.com/api/docs/guides/your-data) describes training defaults, abuse-monitoring retention and eligibility-based retention controls.

## Components and File Boundaries

Each component below has one narrow responsibility and uses the normative contracts above.

### ImportWorkspace and TranscriptParser

Implements PRD Import Workspace: local files/paste, format validation, sample and preview. No server calls.

### PrivacyReview and SnapshotBuilder

Implements PRD Privacy Review: parsed-record edits, redactions, consent binding and version invalidation. Only the reviewed snapshot can feed requests.

### InvestigationProvider and Reducer

Implements stages, IDs, versions, decisions, request bindings, semantic states and the budget ledger using Context/useReducer. No recovery storage. Reference/text checks and transitions are pure TypeScript functions outside visual components.

### InvestigationWorkspace and EvidenceInspector

Implements linked timeline/findings/source/rules panels. Source navigation uses validated IDs and exact reviewed text; AI cannot supply arbitrary navigation targets.

### DecisionWorkspace and ConflictReview

Implements proposal editing, targeted recheck action/disclosure, semantic status, explicit approval and existing conflict-resolution paths. Local overlap checks run immediately; model calls only run on explicit action.

### EditPlanner, ExportPreview and ReportBuilder

Implements exact edit validation, conflict/export eligibility and file generation. Apply eligible edits to the reviewed baseline, never the raw original. Require current baseline/expected text before applying ranges; reject ambiguous targets. Preview and file generation consume the same computed revision. Exact range representation, descending-order application, selected diff dependency and report contents are defined in technical-contracts.md. Package metadata was inspected; installation/build verification occurs in the first authorized build.

### LeaveProtection and DownloadActions

Implements current-session loss warnings, standard browser protection where available, no automatic exports and per-current-file download reminders. Files use native browser downloads; creating a new output revision invalidates its prior downloaded status.

### RouteHandlers and OpenAIProvider

Stateless `/api/investigate` and `/api/semantic-recheck` with shared request validation, privacy-safe errors and bounded provider execution. No generic arbitrary-model proxy or provider file storage.

Planned structure (not created application files):

```text
src/
  app/layout.tsx                       # Root shell and global metadata
  app/globals.css                      # Tailwind and accessible dark-theme tokens
  app/page.tsx                         # Single staged workspace
  app/api/investigate/route.ts         # Initial analysis boundary
  app/api/semantic-recheck/route.ts     # Targeted comparison boundary
  components/import/                  # Inputs and previews
  components/privacy/                 # Redaction and consent
  components/investigation/            # Timeline, findings, inspector
  components/decision/                 # Proposals, conflicts, diff, export
  state/                              # Context, reducer, version bindings
  domain/transcript.ts                # Strict local grammar
  domain/contracts.ts                 # Zod data contracts
  domain/references.ts                 # ID and quote checks
  domain/proposals.ts                 # Revisions, approvals, semantic freshness
  domain/conflicts.ts                 # Exact overlap and validated issue relations
  domain/edits.ts                     # Safe reviewed-baseline transformations
  domain/budget.ts                    # Cost reservations and accounting
  domain/diff.ts                      # Eligible revision diff and privacy labels
  domain/report.ts                    # Markdown from reviewed records
  browser/                           # Files, downloads and leave-page protection
  server/ai/provider.ts               # Narrow analysis/recheck interface
  server/ai/openai.ts                 # OpenAI implementation
  server/ai/prompts.ts                # Fixed instructions and output constraints
  server/ai/schemas.ts                # Strict bounded provider wire schemas
  server/ai/context.ts                # Identical counted/generated context
  server/config.ts                    # Trusted model, pricing and caps
public/samples/transcript.txt          # Explicitly fictional format example
package.json                          # Exact dependency pins and scripts
package-lock.json                     # Reproducible dependency resolution
.nvmrc                                # Node 24.21.0
.env.example                          # Variable names only; no key
README.md                             # Local startup, privacy and demo guidance
tests/
  fixtures/                          # Explicitly fictional inputs and fixed outputs
  unit/                              # Pure deterministic contract/state tests
  ui/                                # Critical stage/decision interactions
devpost/                             # Planning documents, including transcript grammar
```

## Testing Strategy

Vitest covers parser/ID invariants, quote validation, stale responses, review/approval transitions, exact overlaps, edit application, diff/report consistency, privacy baseline and ledger arithmetic. React Testing Library covers stage gating, review disclosure, linked evidence, conflict decisions, eligible-only export and session/download warnings. Fixed structured responses test application enforcement without live charges.

Recheck-specific cases: unchanged successful result permits separate approval; editing invalidates it; merging never inherits approval; late response cannot approve new wording; unknown IDs/refusal/incomplete output fail closed; duplicate/conflict routes to review; uncertain cannot approve; budget exhaustion retains text and blocks only affected proposals; explicit retry reserves again; unknown-cost timeouts remain reserved; changed comparison context cannot reuse stale conclusions. Test that no complete transcript or pre-redaction text enters a recheck payload.

Limited live OpenAI checks assess schema completion, actual total token use and interpretation separately from deterministic correctness. Preserve the distinction between fixtures and real responses. technical-contracts.md maps all 21 PRD acceptance criteria to named planned tests. No tests or model calls have been run as part of writing this draft.

## Verification Status and Final Review

| Evidence | Status |
|---|---|
| Official provider documentation, published package engines/peers and OpenAI SDK source | Read-only source verification performed; recorded in provider-contracts.md. |
| Document links, Markdown structure, budget arithmetic and acceptance mapping | Checked during planning; these are documentation checks only. |
| Dependency install, TypeScript checks, Next build, generated-schema checks, Vitest and RTL | Not executed. Required first-build checks after specification approval. |
| Browser leave warnings, download fidelity and responsive UI | Not executed. Required build/manual checks; browser support limitations remain explicit. |
| Provider account access, schema acceptance, measured prompt overhead and model quality | Not tested. No live count/generation calls made; later controlled evaluation requires authorization and resolved billing. |

All 21 PRD criteria have named planned tests in technical-contracts.md. These mappings define verification work, not passing results. A successful schema check cannot establish diagnosis accuracy, and a fixture is never presented as a real provider response.

The technical interview is consolidated. The retained choices cover the single-incident/session/file boundary, manual transcript preparation, stable IDs, privacy-reviewed baseline, full-context rechecks, deterministic decisions/exports, session-only state and the generation budget. No persistence, integrations, autonomous execution or new product questions are introduced. Manual verification remains optional and non-blocking.

Recall is the demonstration candidate only if adequate original evidence is retrieved; otherwise use a clearly fictional controlled example. Installation and compatibility checks are first-build work, not additional pre-approval research blockers. The counting billing blocker is resolved as recorded at the top. This document is `approved`; implementation is authorized under the foundation-first verification sequence.
