# Prompt Autopsy — Domain Contracts and Verification Draft

Part of the draft [technical specification](spec.md). This normative supplement records the retained domain contracts for the final draft; it is not application code or authorization to build. Implements the approved PRD's core journey, decision/export behaviour and acceptance criteria.

## Ownership and Identity

All working records live in browser memory. Request-local server objects disappear after processing; no content logging or recovery storage. Use application-generated opaque IDs for investigations, analyses, findings, proposals, requests, approvals and resolutions. Human-readable message IDs remain M001-style IDs scoped to their investigation. Rule IDs are R001-style IDs scoped to the reviewed-input version. IDs are references, not authentication credentials.

The provider returns temporary finding/proposal keys within one response. Validate uniqueness and all cross-references, then map them to application IDs. Rechecks receive already-assigned application IDs. Never accept provider-authored decisions, approvals, export flags or new source-message IDs.

## Reviewed Rules and Passage Identity

Keep historical rules as exact decoded text, including original LF/CRLF choices, whitespace and terminal newline. Unlike transcript structural parsing, do not normalize rules line endings. Strip a UTF-8 BOM from the text editor representation but retain a separate BOM flag for the downloaded rules. Reject undecodable UTF-8, bare CR and NUL bytes. Accept only the case-sensitive basenames AGENTS.md and CLAUDE.md; MIME types are hints, not authority. An initially empty rules file is invalid; a file explicitly emptied during Privacy Review is a valid reviewed baseline, with a visible notice that no historical instructions remain for comparison.

Derive reference passages mechanically as maximal runs of nonblank lines, with whitespace-only separator lines left outside passages. Preserve offsets into the exact rules string. A run can contain several instructions; it is a source passage, not a claim that Markdown semantics were parsed. Assign rule-passage IDs in source order on a new reviewed version. Each stores `{ruleId, start, end, text}`. Offsets are zero-based UTF-16 code-unit positions with half-open ranges `[start,end)`, matching JavaScript slicing. Reject positions inside surrogate pairs or between CR and LF.

A reviewed snapshot freezes `{investigationId, reviewedInputVersion, incident, messages, rulesFilename, rulesText, rulesBom, rulePassages}`. Consent binds to that exact version. Source-role changes or full transcript replacement require a new source identity; a separate session-budget ledger survives source replacement within the same workspace so reimport cannot reset normal UI spending. Only explicitly discarding the entire session starts a new ledger, with the documented budget limitation.

## Evidence and Analysis Shape

All API contracts use strict Zod objects, bounded strings/arrays, enums, and explicit nullable fields. Reject unexpected fields and dangling references. The following defines domain fields; quantitative wire bounds and schema-compatibility requirements are now specified in [provider-contracts.md](provider-contracts.md) for final review. Generated-schema verification remains an authorized-build check.

```text
MessageEvidence = { messageId, quote, occurrence }
RuleEvidence = { ruleId, quote, occurrence }
Observation = { text, evidence: MessageEvidence[] }
Hypothesis = { text, supportingEvidence: MessageEvidence[], limitation }
RuleComparison = {
  relation: equivalent | possible_conflict | related | no_relevant_rule,
  rules: RuleEvidence[], reasoning
}
Finding = {
  key, title,
  evidenceState: supported | insufficient,
  observations: Observation[],
  documentedRequirement: Observation | null,
  hypotheses: Hypothesis[],
  missingEvidence: string[],
  comparisons: RuleComparison[],
  recommendation: add | edit | no_change | needs_evidence,
  rationale,
  proposalKey: string | null
}
TimelineEvent = {
  kind: requirement | decision | change | failure | correction,
  description, interpretation: observed | hypothesis,
  evidence: MessageEvidence[], findingKeys: string[]
}
AnalysisOutput = {
  summary,
  coverage: { status: within_capacity | limited, reason: string | null },
  findings: Finding[],
  timeline: TimelineEvent[],
  proposals: ProposedEdit[],
  proposalRelations: [{
    leftProposalKey, rightProposalKey,
    relation: possible_duplicate | possible_conflict,
    reasoning
  }],
  limitations: string[]
}
```

Observations require at least one exact source citation. A supplied incident narrative can guide investigation but cannot masquerade as a transcript quote. If the failure is only asserted in that narrative, findings must state the transcript limitation. Hypotheses are never promoted to facts by valid citations. `insufficient` requires missing-evidence text and cannot propose an edit as though a supported diagnosis had been established. `no_change` and `needs_evidence` require a null proposal key. Comparisons other than `no_relevant_rule` require cited rules; that relation requires an empty rules list and a limitation on the conclusion. No-change rationale can cite an equivalent existing instruction without generating a redundant proposal.

Quotes must match exact reviewed substrings, without whitespace folding, fuzzy matching or ellipsis expansion. `occurrence` is a positive, one-based index among matches scanned left-to-right, including overlapping matches. Resolve to offsets deterministically; reject unavailable occurrences, empty quotes, retired IDs or stale versions. The provider never supplies trusted character offsets. This supports repeated literal text while keeping highlighting reproducible. Sort timeline events by the earliest cited message's source order; equal positions retain response order. Timeline order does not establish causation.

Initial output must compare its proposed changes with supplied historical passages and with one another. Absence of a relation is only “no issue identified,” never a proof of semantic compatibility. Schema/citation validation failure rejects the analysis as a unit; preserve inputs for explicit retry, without silently discarding invalid findings or doing a paid repair call.

## Exact Edits and Safe Application

Keep one atomic insertion or replacement per proposal in the MVP. A merged revision can replace one contiguous region spanning the contributing changes; the full replacement text, including any retained intervening content, must be reviewed. Do not invent disjoint edits behind one approved instruction.

```text
ProposedEdit = {
  key, findingKeys, rationale,
  operation: insert | replace,
  target: {
    ruleId: string | null,
    quote: string | null,
    occurrence: integer | null,
    placement: before | after | end_of_file | replace
  },
  replacementText
}
ResolvedEdit = {
  proposalId, proposalVersion, reviewedInputVersion,
  start, end, expectedText, replacementText, affectedRuleIds
}
```

Replace targets one exact occurrence inside a cited rule passage. Insert targets a cited passage boundary, or explicit end-of-file. Empty reviewed rules allow end-of-file insertion only. For inserts, `start == end` and expected text is empty. For replacement, require a nonempty exact target. No standalone delete operation; an empty replacement is invalid for this instruction-improvement MVP. A no-op edit is not exportable. All separators/newlines that will be added are part of the displayed, approved replacement text; do not add formatting or commentary after approval.

Resolve targets before displaying the proposal. Approval binds to exact resolved edit, version and reviewed baseline. Any target/text change revokes approval and requires targeted semantic review. At preview and download, independently validate every edit's source version, bounds and exact expected substring. Never fuzzy-relocate a failed anchor or rebase onto a different rules revision.

Block intersecting replacement ranges, multiple modifications to the same affected historical passage, two insertions at the same position, and an insertion on or within another edit's boundaries. These deliberately conservative syntactic blocks can occur even when an AI says no issue. Validated semantic duplicate/conflict relations can block nonoverlapping changes too. Application code controls eligibility; semantic explanations cannot override a range violation.

Apply eligible edits in descending start-offset order to an untouched copy of the reviewed baseline. Require the final plan to have no unresolved pairwise conflicts. Recompute the plan atomically for both preview and export; UI must not maintain a separate downloadable version. Record proposal/finding IDs alongside edits for provenance, never as unsolicited text inside the downloaded rules.

## Decisions, Invalidation and Requests

Reducer state separates stage, source version, consent, active analysis, proposal revisions, decision history, semantic reviews, conflicts, budget ledger and per-output download markers. Finding decisions are Pending, Approved, Rejected, No change accepted or Needs evidence. Semantic state and export eligibility are separate derived fields; historical approval is never equivalent to present eligibility.

| Event | Required transition |
|---|---|
| Valid import | Commit parsed records atomically; advance only when all three inputs validate. |
| Privacy edit | Increment input version, revoke consent, detach active analysis and all derived decisions; clear current output/download markers. Keep budget charges/reservations. |
| Consent | Bind consent to current validated reviewed version. |
| Start/retry | Require current consent, valid inputs, no concurrent provider operation and sufficient reservation headroom. |
| Analysis response | Settle usage even if obsolete. Activate only when request ID, investigation ID and input version still match; validate all output first. |
| Proposal edit/merge | Preserve prior revisions; revoke approval; rerun local checks; semantic review becomes stale. |
| Recheck response | Settle usage; accept only for exact current proposal and context binding. Never approve automatically. |
| Approve | Require current review and resolved issues, capture explicit decision; recompute conflicts and export eligibility across approved candidates. |
| Reject | Require nonblank reason; preserve record and exclude proposal. |
| Keep one | Exclude competitor explicitly, preserve resolution; unchanged survivor still requires current semantic/range validity. |
| Export | Regenerate current eligible plan/report; downloading does not resolve pending findings. |

On source changes, old findings must not remain available as current downloadable reports containing newly removed sensitive text. Clear their export eligibility and remove them from current report generation. A late obsolete response can settle its usage but its content must not repopulate the UI. Ordinary stage navigation changes none of the above. Abort is best effort and never evidence of zero billing.

## Diff, Privacy Markers and Report

Use a maintained text-diff library's line-diff operation (selected dependency: [diff/jsdiff](https://github.com/kpdecker/jsdiff)); do not use its patch application as the authority for approved edits. Exact edit application uses the range algorithm above. Raw text equality is the export invariant; Markdown rendering is a view only.

Generate the downloadable-file diff between reviewed baseline and computed revised text. Show privacy provenance alongside it in a separately labelled layer: unchanged historical content, reviewed masking/replacement text and removed-passage markers without original deleted values. Compute privacy provenance locally during review, not with the model. Never feed a raw-original deletion diff to the final preview or report. If changed redaction spans overlap an approved edit, retain both labels and distinguish the two operations rather than conflating counts.

Generate Markdown reports from a fixed application template, not another model call. Include every finding, reviewed quotes, hypotheses, missing evidence, rule comparisons, original/current proposals, decisions and rejection reasons, semantic review history, conflicts/resolutions, and IDs of edits actually exported. Include the PRD approval disclaimer and redacted-baseline notice when applicable. Omit raw original content, credentials/configuration and obsolete-input analyses. Semantic history is retained for proposal revisions within the same reviewed snapshot only.

Treat imported/model text as untrusted display content: disable raw HTML in Markdown, external image loading and unsafe links. Source/diff panes render text, not HTML. Reports escape Markdown syntax in prose and place source/proposal text in dynamically sized fences longer than any contained backtick run. Exported Markdown must not inadvertently activate injected images or raw HTML outside fences. Do not automatically open links.

Generate both files locally with UTF-8 Blob downloads and revoked object URLs. Rules preserve filename and BOM policy; report uses `prompt-autopsy-report.md`. A download marker means the browser download was initiated, not that disk persistence was verified. Bind markers to a digest of actual file bytes; a changed report or revision requires a new download reminder. No eligible modifications means report only, with no unchanged-rules download.

## API/Error Boundaries

Only the two explicit application analysis/recheck endpoints exist. Each follows local validation with consented OpenAI input-token counting, then generation only if the exact counted context passes admission. Counting is internal to the stateless handler, not a third public application endpoint. Counting/schema/context failures stop generation with reviewed work preserved and no estimate fallback. Counting billing is resolved as unbilled preprocessing; see request-limits.md. Client request objects contain reviewed content and request bindings, not provider settings or claimed costs. Server checks strict schema, source IDs/quotes where applicable, byte/token limits and trusted per-call configuration before generation. Set response `Cache-Control: no-store`; no provider conversation continuation, background tasks or content-bearing telemetry. Return trusted usage separately from model-authored JSON.

Application errors distinguish invalid input (400), oversized input (413), rate limiting (429), provider failure (502), timeout (504), and invalid/incomplete structured output (502 with a stable application error code). Missing credentials/configuration are sanitized service-unavailable errors. Surface correction/retry advice without exposing request bodies or provider exception dumps. Browser budget exhaustion is a local blocked action, not a fabricated provider failure. No automatic retries; disable SDK retries. On any provider uncertainty, preserve the maximum reservation unless trusted usage or reliable pre-dispatch failure is available.

## PRD Acceptance-Test Mapping

Test names below are planned fixtures/cases, not implemented or passing tests. Pure domain tests use Vitest; important user transitions use React Testing Library. Browser leave/download checks additionally need a small manual browser pass because simulated DOM tests cannot establish browser warning behaviour.

| PRD criterion | Planned verification |
|---|---|
| 1 | `import-valid`, `parser-malformed-boundaries`, `unsupported-role`: all-or-nothing import, readiness and actionable errors. |
| 2 | `privacy-network-gate`: inspect/redact all inputs; no transmission without consent to current version. |
| 3 | `stable-message-ids`, `retired-citation`, `redacted-quote`: no renumbering or removed-text evidence. |
| 4 | `linked-evidence-navigation`, `repeated-quote-occurrence`: finding/timeline/inspector target exact reviewed sources. |
| 5 | `observations-versus-hypotheses`, `incomplete-evidence`: controlled insufficiency and no invented sources. |
| 6 | `equivalent-rule-no-change`, `historical-contradiction`: display real cited rules and rationale. |
| 7 | `independent-decisions`, `edit-revokes-approval`, `rejection-requires-reason`: excluded states produce no edits. |
| 8 | `redacted-baseline-export`, `unicode-crlf-edits`, `unrelated-text-preserved`: exact filename/content, separate privacy labels. |
| 9 | `report-only-no-change`, `approved-two-downloads`: no manufactured unchanged rules download. |
| 10 | `report-facts-hypotheses-disclaimer`, `hostile-markdown`: correct reviewed quotes, disclaimer and inert embedded content. |
| 11 | `failure-preserves-input`, `late-analysis-response`, `source-edit-reconsent`: fresh snapshot required, paid obsolete calls still counted. |
| 12 | `completion-copy`, `optional-checklist-absent`: no fixed/verified claim or manual-testing gate. |
| 13 | `privacy-notice-no-leak`, `manual-restoration-invalidates`: no restoration through exports or stale reports. |
| 14 | `partial-independent-export`: all decisions visible, pending contributes no edits, included changes retain provenance. |
| 15 | `same-rule-conflict`, `insertion-collision`, `semantic-conflict`: block affected approvals while allowing independent changes. |
| 16 | `keep-one`, `reject-both`, `needs-evidence`, `merge-new-approval`: explicit resolution, original history and side-by-side evidence. |
| 17 | `eligible-only-diff`, `not-included-list`, `unresolved-export-report`: exact partial-completion wording. |
| 18 | `dirty-leave-guard`: initial empty state unguarded; dirty state protected, in-app cancel retains session; manual browser check. |
| 19 | `fresh-provider-empty-state`, `stage-navigation-retains`: fresh page contains no recovery state; manual refresh/reopen check. |
| 20 | `per-file-download-reminder`, `output-change-invalidates-marker`: no auto-download, partial download doesn't dismiss remaining reminder. |
| 21 | `targeted-recheck-only`, `stale-recheck-response`, `recheck-unknown-id`, `budget-pending`, `uncertain-not-approved`: limited reviewed payload, explicit approval and independent exports. |

Additional budget tests: initial/recheck/retry reservation; exact-ceiling acceptance; one-micro-USD overflow rejection; one request at a time; usage settlement; uncertain cancellation; stale/rejected result no-refund; reimport retains session ledger; tampered provider configuration rejected server-side. Test deterministic context changes independently of model interpretation.

Controlled fixtures cover a supported grouped-item failure, an equivalent rule already present, conflicting historical guidance, insufficient original evidence, independent proposals and overlapping/merged proposals. Label all invented examples fictional. Live model quality is evaluated separately against human-authored expectations; fixed structured-output fixtures prove application enforcement, not model accuracy or product superiority.

## Conflict Resolution and Semantic Freshness

Initial unedited proposals derive semantic coverage from the validated full analysis, which compares all initial proposals with the reviewed historical file. Approvals do not change those original texts; an explicitly rejected initial peer can be excluded without inventing a new no-issue conclusion. Edits/merges require the dedicated current targeted result as specified in spec.md. Initial coverage cannot validate new wording.

For a targeted result, the exact whole rules version, target revision and included peer IDs/versions/text define freshness. Keeping one proposal excludes the competing proposal and records the reason. If that changes a previously counted comparison context, mark the survivor's targeted result stale and require explicit recheck before export; retaining an approval record does not bypass that gate. Approval of a new peer can likewise stale existing targeted results. Rechecking an unchanged peer does not itself change peer text or membership and therefore does not create a recursive recheck loop. Neither staleness nor budget failure silently removes an approved peer from other comparison contexts.

An advisory issue remains unresolved until a developer records a resolution against that exact result and text. For proposal-to-proposal issues, use keep one, merge, reject both or Needs evidence, with all existing version/recheck rules. For a historical equivalent rule, accept no change or revise the proposal; for a historical contradiction, edit to an explicitly reviewed replacement/clarification or choose rejection/Needs evidence. If the developer concludes an advisory semantic flag does not apply, record the explanation against the exact compared text before permitting separate explicit approval; this is a developer disposition, not a model-certified no-issue result. Never allow such a disposition to override deterministic range overlaps, stale review, invalid citations or an uncertain/pending result. Later text/context changes invalidate the disposition. Historical rules are never silently deleted to resolve an issue.

A merge creates a new proposal and supersedes the sources, linking every contributing finding. Its developer-selected single contiguous range must pass the same reviewed-baseline checks; its complete replacement text is previewed and rechecked. Individual model proposals retain the narrower passage-bound anchor contract. A new merge receives no inherited approval.

Export eligibility is a pure function of current input/analysis bindings, proposal version, validated target, explicit approval, applicable fresh semantic coverage, recorded issue dispositions, supersession and unresolved deterministic/semantic conflicts. Recompute for every preview and download; retain blocked approvals in the report. No new provider call occurs just because export was clicked.

## API Envelopes and Session Records

Application requests are strict objects with `requestId`, `investigationId`, `reviewedInputVersion`, and an operation-specific reviewed payload plus the current consent/disclosure binding. Initial payload contains incident, surviving messages, rules filename/text and rules BOM policy; recheck payload contains target/version, full rules and passage identifiers, peer proposals and necessary exact evidence. The server rederives passage ranges rather than trusting client offsets. The server is stateless: consent is enforced by the normal application flow and validated request shape, not claimed as authentication against malicious API clients.

Success envelopes contain those server-associated request bindings, the validated result and trusted usage/accounting metadata. Error envelopes contain stable code, safe message, retryability, offending field/limit where applicable and known dispatch/usage status. Never expose provider exception bodies or sensitive content. Stale responses can update only their existing budget attempt record, not current results. Record request attempts separately for count and generation so provably unstarted generation is not billed in the ledger while uncertain actual dispatch remains reserved.

Canonical context hashes use SHA-256 over deterministic JSON serialization: fixed object-key order, ordered message/rule arrays, peers sorted by immutable ID, explicit nulls and exact text, with no Unicode or whitespace normalization. Include target version/operation, rules version and evidence. Hashes bind identity within the normal flow, not authenticate clients. IDs for investigations/findings/proposals/requests use application-generated UUIDs; message/rule display references use their documented stable formats. Reject unknown or duplicated IDs and nonpositive versions.

All 21 acceptance criteria above remain planned checks. Domain implementation and offline tests now run; see checklist.md for actual evidence and remaining hands-on checks. Provider-contracts.md and request-limits.md supply the retained bounds/runtime/cost admission details; counting is unbilled preprocessing and spec.md is approved.
