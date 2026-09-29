# Prompt Autopsy — Technical Interview Decisions

Working notes for `4-spec`, not an approved technical specification. The approved scope and PRD remain the product source of truth. No implementation is authorized yet.

## Agreed Architecture

Browser UI → validated, reviewed/redacted, explicitly consented payload → Next.js investigation Route Handler → AI provider → schema-validated structured analysis → deterministic application review logic → developer decisions → deterministic diff/report downloads.

AI interprets. Application code verifies and enforces. Developer decides.

## Stack

- Next.js App Router, React and TypeScript.
- Tailwind CSS; shadcn/ui or similarly lightweight accessible components where useful; Lucide icons.
- Native browser APIs for file reading, downloads and supported leave-page protection.
- Stateless Next.js server Route Handlers; no separate Express/Nest service, database or object storage.
- Zod contracts for application data and model responses.
- React Context plus useReducer/state-machine-style transitions for current-session state. No Zustand/Redux unless a concrete need is established.

## Privacy and Session State

Parse and preview uploaded files in the browser where possible. No incident, transcript or historical rules content goes to the server during Import or Privacy Review. Only validated, reviewed/redacted inputs with explicit consent may enter an investigation request.

Keep provider credentials server-side. The server processes requests without persisting supplied content; normal logs must not contain transcript/rules contents. Provider retention is a separate contract to verify when selecting the provider.

Investigation state exists only in browser memory. No localStorage, IndexedDB, recovery cookies, Supabase or other persistence. Refresh/close loss and warnings follow the approved PRD.

## Deterministic Responsibilities

TypeScript handles transcript parsing, stable message IDs, redaction state, citation existence and quote validation, version/staleness tracking, approvals and approval invalidation, exact edit ranges, syntactic overlap detection, export eligibility, applying approved edits, diff generation, Markdown report generation and downloads.

AI interprets evidence, suggests findings/hypotheses, compares semantic meaning of instructions and proposes minimal changes. Semantic equivalence/contradiction outputs are advisory. AI cannot directly modify files, select conflict winners or determine export eligibility. A valid citation proves source location/text, not the truth of a model's interpretation; the developer reviews that distinction.

Use one small server-side provider abstraction outside UI components and validate structured model output against Zod. The selected initial provider is OpenAI with `gpt-5.6-sol` through the Responses API. Detailed domain/API contracts remain to be designed.

## OpenAI Provider and Cost Decision

User-selected model: `gpt-5.6-sol`, chosen for nuanced interpretation of evidence, hypotheses, semantic equivalence/conflict and narrowly scoped corrections. No other provider, fallback model or multi-provider feature is in the MVP.

Use `POST https://api.openai.com/v1/responses`, server-side credentials, Structured Outputs backed by the analysis Zod schema, `store: false`, and explicit `service_tier: "default"` for standard processing. No Fast/Priority, provider tools, web/file search, code execution or file-storage upload. Send only reviewed/redacted text after validation and consent. Request schema and output validation remain separate from deterministic citation, conflict and export enforcement.

Cost target: normal investigation at or below approximately USD 0.25; hard initial design ceiling USD 0.40 per investigation. Starting sizing target: approximately 35,000 total input tokens including reviewed inputs, instructions and schema overhead, and approximately 4,000 tokens of structured analysis. Reject oversized inputs with an actionable error; do not silently truncate, summarize or discard evidence.

### Official Documentation Verification

Read official pages on 2026-09-29, without making any model calls:

- [Model](https://developers.openai.com/api/docs/models/gpt-5.6-sol): model exists, supports Responses and Structured Outputs, and lists standard short-context pricing of USD 4/M input tokens and USD 20/M output tokens. Current pricing is promotional, available at least through November 21, 2026; recheck before implementation/deployment. Account-specific access is not verified.
- [Pricing](https://developers.openai.com/api/docs/pricing): standard pricing includes distinct cache-write pricing. Do not treat promotional rates as permanent or assume caching is always cheaper.
- [Responses create](https://developers.openai.com/api/reference/resources/responses/methods/create): explicit `service_tier: "default"` selects standard processing; `store` otherwise defaults true; `max_output_tokens` includes visible output AND reasoning tokens. `truncation: "disabled"` prevents provider-side dropping of inputs. Application limits must be checked first.
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs): Responses examples use the SDK's `responses.parse` and `zodTextFormat` through `text.format`; validate semantic references and completion/refusal state beyond schema shape.
- [API data handling](https://developers.openai.com/api/docs/guides/your-data): no training on API data by default unless opted in. Standard abuse-monitoring logs may contain customer content and retain it up to 30 days, with documented exceptions for longer retention. Modified Abuse Monitoring/Zero Data Retention require eligibility and approval. `store: false` does not establish end-to-end Zero Data Retention.

### Budget Details to Resolve in the Blueprint

At the confirmed uncached rates, 35k total input plus 4k TOTAL generated tokens costs USD 0.22. Four thousand visible JSON tokens plus hidden reasoning costs more; a 4k output cap is shared with reasoning and may leave too little room for complete JSON. Select reasoning effort and total generation cap with the schema, then validate on limited live calls. Do not silently accept incomplete output.

At 35k input, USD 0.25 leaves 5,500 total generated tokens; USD 0.40 leaves 13,000 total generated tokens for a single call at these rates. These are arithmetic bounds, not promised visible-output allowances or finalized application caps. The investigation ceiling must account for all model calls, retries and any semantic recheck after developer edits. Two USD 0.22 calls exceed the ceiling. Unknown usage after a timeout needs conservative accounting; refreshing cannot serve as an account-wide spend control in a stateless app.

Derived recommendation for predictable cost: disable prompt caching using documented `prompt_cache_options: { mode: "explicit" }` without explicit breakpoints. The current Responses reference states this performs no prompt caching, avoiding cache-write premiums. Verify SDK compatibility during specification research. Do not count on cache discounts to meet the ceiling. Exact accounting, retries, reasoning effort, input token counting and caps remain to be finalized within the selected budget; no hidden paid repair loops.

### Budget-Enforcement Boundary — Resolved

The learner accepts an authoritative in-memory USD 0.40 cumulative guard within one normal investigation session, with independent server-enforced per-call limits. Reserve conservative maximum cost before dispatch; include all analyses, rechecks and explicit retries; settle using trusted usage; retain the full reservation for uncertain billing. Staleness, rejection and supersession do not refund spend.

Stateless handlers derive operation, model, standard tier, tools prohibition, `store: false`, schema, input/output limits, allowed reasoning and pricing from trusted application configuration. Client-provided model names, caps, prices or calculated costs are never authoritative.

The ceiling is not tamper-proof across replay, modified requests, refresh/reset, multiple tabs/sessions or repeated new investigations. No database, accounts, Redis, signed client-ledger scheme or persistence will be added to solve this. Local development/demo use accepts that boundary. Protection of a publicly exposed paid API key is a separate production requirement, outside MVP scope.

Approved wording: “This investigation has a USD 0.40 in-session AI budget.” Do not claim an account-wide guarantee. Detailed policy: `spec.md > Aggregate Cost Accounting`.

### Provider Data Disclosure

The application itself keeps investigation state only for the current session and does not persist supplied content server-side. After explicit consent, reviewed/redacted content is sent to OpenAI and is governed by its API data policy. Disclose no training by default unless opted in, and standard abuse-monitoring retention rather than claiming zero retention. Only claim ZDR if the actual API project is eligible and configured for it. Model credentials and sensitive content never belong in normal application logs.

## Files

One documented structured plain-text transcript format. One historical Markdown file named AGENTS.md or CLAUDE.md. Preserve that filename for revised rules and generate a Markdown investigation report. No cloud file storage.

### Manual Transcript Preparation and Grammar

The learner will manually prepare context-preserving excerpts, anonymize where practical, convert to the supported format and use Privacy Review for final redaction. No native agent export parsing. Recall requires original evidence; otherwise use a clearly fictional example in the same format.

The proposed exact v1 syntax is in [transcript-format.md](transcript-format.md): explicit message/body/end markers, fixed speaker header, optional provenance, three supported roles, multiline bodies, strict escaping and actionable errors. No parser implementation yet.

Confirmed identity policy: internally assigned immutable M001-style IDs, independent of source references; edits retain identity, removals retire IDs without renumbering/reuse. The format document derives parsed-record privacy editing and fresh investigation identity on whole-transcript replacement from those requirements.

## Targeted Semantic Recheck Policy

User-resolved policy, also recorded in `prd.md > Targeted Semantic Review After Editing`: edited or merged wording revokes approval, immediately reruns deterministic overlap checks and makes prior semantic conclusions stale. Preserve original proposals and past results in the session record. No full-investigation rerun or keystroke-triggered model calls.

An explicit action toward approval sends only the proposal, relevant reviewed historical rules, potentially interacting approved/export-eligible proposals, associated finding IDs and minimal reviewed evidence when necessary. Use immutable application IDs. Never restore pre-redaction content or permit AI to rewrite the user's revision.

Return validated advisory `no_issue`, `possible_duplicate`, `possible_conflict` or `uncertain` results with compared IDs, reasoning and limitations. `no_issue` permits explicit approval if deterministic checks pass, but means only that no issue was identified in the supplied context. Duplicate/conflict routes through developer resolution; uncertain allows revision or Needs evidence, not export.

Insufficient budget or provider failure preserves edited text as Semantic review pending and blocks only that proposal/dependencies, not unrelated eligible changes. Retries require explicit user action and remaining budget. Every analysis, recheck and retry counts against USD 0.40. Current detailed draft: [spec.md](spec.md), especially Proposal State and Targeted Semantic Recheck, and Aggregate Cost Accounting.

## Complete Semantic-Recheck Context — Resolved

Use the entire reviewed/redacted historical rules file and all approved/export-eligible proposals that would coexist with the target. Add only minimal reviewed transcript evidence genuinely needed to understand intent. No semantic retrieval, embeddings, heuristic ranking, summarization or silent omissions. If required complete context exceeds the supported recheck limit, fail closed with an actionable error and preserve pending text. Bind results to exact rules/version, target version and included peer identities/versions/content; subsequent context changes stale the result. This policy is resolved, not a remaining product question.

## Token Admission — Conditionally Approved

Use local validation followed, only after consent, by OpenAI `/v1/responses/input_tokens` as the final admission gate. Count the exact canonical generation context: model, instructions, reviewed input, Structured Output schema, reasoning, tools and all token-bearing context. No hidden additions after counting; changes require recount. Apply `N + max(256, ceil(N * 0.05)) <= operationInputCap`.

Consent discloses provider transmission for size verification and subsequent analysis; one consent covers both for the same reviewed content/purpose. No provider requests during Import or Privacy Review. Counting failure/timeout/invalid output blocks generation, preserves work and allows explicit retry; no rough-estimate fallback or automatic retries.

Architecture is conditionally approved; final specification approval and implementation remain blocked on authoritative verification of counting charges (including whether model input-token rates apply). General API privacy wording is resolved; no endpoint-specific application-state retention claim is made. Do not assume free counting or that generation's `store: false` covers it. Confirmed-unbilled counts do not consume the monetary ledger; documented costs must be reserved before dispatch within the same ceiling and may require revised budgets. Unknown billing stays open. No live billing-discovery call is authorized. Full policy: [request-limits.md](request-limits.md).

## Tests

Vitest for parsers, state transitions, citation validation, conflict/export logic and report generation. React Testing Library for important UI behaviours. Controlled transcript/rules and structured-response fixtures cover PRD acceptance cases without repeated model calls. Separately run a limited live-provider end-to-end check; fixed responses must not be represented as live AI results.

## Runtime and Hosting

Run locally with normal server environment variables for the provider key. Deployment is optional; Vercel is preferred if deployed. No DigitalOcean VPS, Docker or database is requested. No deployment is authorized by selecting a preferred hosting target.

## Domain Contract Draft

[technical-contracts.md](technical-contracts.md) now supplies the proposed reviewed-rule passage IDs, exact quote resolution, edit range semantics, source/proposal invalidation, faithful diff/report generation and named verification cases covering all 21 PRD acceptance criteria. These are derived draft implementation choices for review, not implemented features. Provider schema bounds, token accounting and semantic comparison-context dependencies still need closure.

## Consolidated Technical Decisions

The interview decisions are consolidated in spec.md and its normative supplements: transcript-format.md, technical-contracts.md, request-limits.md and provider-contracts.md. Bounded schemas/coverage, complete-context rechecks, exact anchors/exports, state/version bindings, admission, timeouts and the Node baseline are retained. No product questions remain. Earlier prospective wording in these chronological notes does not override the consolidated specification.

Counting-endpoint billing is the sole external verification blocker. Metadata/source inspection is complete as documented; installation/build/generated-schema/UI/live-provider checks have not run and belong to the first authorized build/evaluation. Specification status remains draft and implementation is not authorized.

## Counting Billing and Privacy Refinement

The learner chose to preserve the generation-quality budget and keep provider counting conditional on authoritative billing confirmation. Do not reserve an undocumented hypothetical model-input charge or silently assume zero. General API data-handling disclosure is now resolved using the wording in prd.md; no endpoint-specific application-state retention for counting is claimed. Counting billing is the remaining external verification blocker; continue the other specification contracts. No live billing test or implementation is authorized.

## Bounded Schemas and Runtime Research

Derived draft contracts are in [provider-contracts.md](provider-contracts.md): up to four findings/proposals, eight timeline events, bounded evidence and semantic comparisons, explicit limited-coverage/uncertain outcomes, strict Zod wire objects and separate deterministic relationship checks. Output caps still include reasoning and do not guarantee completion at every schema maximum. These numeric choices are proposals for review, not separately approved product decisions.

Published metadata inspected on 2026-09-29 supports a proposed Node 24.21.0 LTS baseline with Next 16.3.7, React 19.3.0, OpenAI SDK 7.25.0, Zod 4.6.5 and Vitest 5.0.2. Read-only SDK source inspection confirms counting, parse/Zod helpers and prompt-cache configuration APIs. No installation/build/live call was performed; integration checks wait for authorization to implement.

## Final Design Review — Implementation Still Blocked

The learner approved the consolidated architecture, domain contracts, request limits, state model, provider schemas, semantic rechecks, export safeguards, runtime baseline and planned tests. This supersedes earlier interview wording describing these choices as unreviewed proposals. No further product/architecture changes or technical-spec interview are requested.

Keep spec.md at `status: draft` until authoritative counting-endpoint billing resolution and subsequent final approval. Missing pricing is not proof that counting is free; no live billing experiment is authorized. If unbilled, retain the generation budget and present the specification for final approval. If billable, revise only affected cost-accounting/request-budget sections and present the narrow revision for approval. Implementation remains blocked until final specification approval.

## Final Approval and Build Authorization

The learner supplied authoritative billing clarification: counting is unbilled preprocessing, returned tokens do not incur model-input charges, subsequent generation is billed normally. No billing experiment was performed. Spec is now approved and 4-spec complete. Generation reservations remain USD 0.250/0.064 within USD 0.40. Counting consumes no ledger but still requires consent and fails closed. Earlier conditional/blocking notes are superseded. The learner explicitly authorizes environment verification, lockfile commit and subsequent implementation, without reopening the approved architecture.
