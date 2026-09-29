---
doc: prd
status: approved
---

# Prompt Autopsy — Product Requirements

A polished desktop-friendly investigation workspace for developers reviewing one failed AI coding session and deciding whether to change the historical AGENTS.md or CLAUDE.md.

Sources: `scope.md > The Unique Kernel`, `The Core Loop`, `Acceptance Tests`, and `The POC Boundary`. Scope and this PRD are approved by the learner. Proceed to technical specification within these product boundaries; do not expand the MVP. Implementation must wait until the technical specification has also been reviewed and approved.

## The Core Journey

Import → Privacy Review → Investigation → Decision & Export.

1. Describe one incident, import one structured plain-text transcript, and upload one historical rules file.
2. Validate and preview the inputs. Review/redact every supplied input before consenting to AI processing.
3. Start investigation explicitly. Read an evidence-linked account of the failure, possible explanations, missing evidence and relevant historical instructions.
4. Select a finding and inspect its source messages and historical rules without leaving the investigation workspace.
5. Review an advisory recommendation: add an instruction, edit an existing instruction, no rules change, or needs more evidence.
6. Review findings independently, preview export-eligible approved changes, and download the resulting rules revision and investigation report, or a report alone when no modifications are eligible. Pending or conflicting findings do not block unrelated approved changes and remain visible in the report.

Success means an informed, evidence-backed reviewed export. It does not mean that the original incident is fixed or the instructions are verified. An optional manual checklist is not required for initial MVP completion.

**Current session only. Export what you want to keep.** Refreshing, closing or leaving ends the working session; the next visit starts at an empty Import workspace.

## Screens and Layout

These are stages of one investigation, not dashboards or separate product areas.

### Import Workspace

Source: `scope.md > The Core Loop`, steps 1–2.

Display the exact heading:

> Investigate what went wrong with your AI coding session.

Supporting text:

> Trace a coding-agent failure to its source messages, review possible instruction improvements and decide what to carry into your next session.

Use two responsive columns. The left contains three clearly marked input sections; the right previews the active input and shows an input-completeness checklist.

- **A. Describe the incident:** a short text area for what went wrong and what was expected. Include an illustrative example showing the useful level of detail; do not pass example text off as the developer's incident.
- **B. Import the coding session:** drag-and-drop upload or paste structured plain text. Provide a downloadable sample of the single supported format. Validate clear message boundaries and speaker labels, display the recognized message count and assign stable message references. Show actionable format errors rather than proceeding with unreliable partial parsing.
- **C. Upload historical instructions:** accept one AGENTS.md or CLAUDE.md. Explain that today's rules may differ from those at the time of the failure, and that a supplied file does not establish what the agent loaded or followed.

The transcript preview presents individual messages, speakers and stable references. The rules preview uses readable Markdown formatting. All three valid inputs are required to enable **Review sensitive content**. Results stages are unavailable before successful analysis.

### Privacy Review

Source: `scope.md > The Core Loop`, step 2; `Acceptance Tests > Review before processing`.

A dedicated stage lets the developer inspect and redact the incident description, transcript and rules file. Warn clearly about credentials, private source code and personal information. Do not claim automatic detection of every secret or guaranteed anonymization.

Show the exact resulting content to be analyzed. Modified transcripts must still be valid. Preserve surviving message IDs when content is edited or removed; references must never silently resolve to a different message or removed passage. Removed/redacted content cannot be used as evidence.

Show a compact summary of validated inputs. Require explicit confirmation that the reviewed content may be processed by AI before enabling **Start Investigation**. No supplied input is sent for AI processing before that step.

Conditionally approved token-admission disclosure: **“After you consent, Prompt Autopsy sends the reviewed content to OpenAI to verify request size before AI analysis. If the request fits the supported limit, analysis can proceed.”** Counting is an external transmission, not local validation. The same consent covers counting and generation for the same reviewed snapshot and investigation purpose. No provider requests occur during Import or Privacy Review. Counting failure or oversized input blocks generation, preserves reviewed work and allows an explicit retry or correction; no rough-estimate fallback. Counting is unbilled preprocessing; the learner has given final technical-spec approval.

### Investigation Workspace

Source: `scope.md > The Core Loop`, steps 3–4; `The Unique Kernel`.

Use a three-panel desktop layout with a compact header showing incident name, investigation status and the progress indicator. Presentation assumption for the draft: derive a short display label from the incident description; do not add a required naming step. Exact truncation/display treatment can be specified later.

- **Left, approximately 25% — Annotated timeline:** relevant requirements, important decisions, confirmed changes, observed mistakes, reported failures and subsequent corrections/actions, where supported. Each event has a short description, stable message reference and an indicator distinguishing documented evidence from possible explanation. Chronological ordering does not imply causation.
- **Centre, approximately 45% — Findings:** a concise investigation summary followed by findings. Each finding contains a descriptive title, observation, documented agreement/instruction, what the evidence establishes, explicitly labelled hypotheses, missing evidence and clickable source references. Use labels such as **Observed**, **Possible explanation**, and **Insufficient evidence**. No artificial confidence percentages.
- **Right, approximately 30% — Evidence inspector:** **Source Messages** and **Historical Instructions** tabs. Display the reviewed/redacted source with stable references and speaker labels, or the supplied rules with relevant passages highlighted. Clearly identify historical instructions as user-supplied and not proof of agent access or compliance.

Selecting a finding highlights it, highlights its associated timeline events and exposes the supporting messages in the inspector. Relevant historical rules remain accessible in their tab. Selecting a different finding updates the connected views without navigation to another page.

Selecting a source reference scrolls to the exact message, highlights the quoted passage and preserves enough surrounding conversation for context. Original reviewed messages and hypotheses must remain visually distinguishable. When there is no relevant historical rule, state that explicitly rather than inventing one. Surface equivalent instructions, possible contradictions and missing coverage. A no-change conclusion is visible here; approval/edit/export occurs in the next stage.

Sources are read-only during investigation. Changes require returning to Privacy Review. On narrower screens the inspector can collapse into a drawer instead of squeezing three panels together.

### Decision & Export Workspace

Source: `scope.md > The Core Loop`, step 5; `Acceptance Tests > Faithful export` and `No change`.

Enter from a selected finding. Show its title, observed failure, supporting references, relevant historical rule if any, and advisory recommendation: **Add instruction**, **Edit existing instruction**, **No rules change**, or **Needs more evidence**. Developers can always return to Investigation to inspect the evidence.

For proposed changes, use a side-by-side comparison:

- **Current historical instructions:** the relevant section, highlighting related rules, potential duplicates/conflicts and the exact proposed insertion or replacement location.
- **Proposed revision:** the instruction, rationale, associated finding, source references and whether it adds or edits an instruction.

Avoid promises that the rule prevents future mistakes. Explain its intended purpose and the limits of the available evidence.

For no-change recommendations, use a dedicated **No rules change recommended** state instead of an empty or disabled editor. Show the finding, evidence, applicable existing instruction, redundancy/insufficient-support rationale and any possible clarification. Allow accepting no change, requesting more evidence, or returning to Investigation.

### Final Preview and Completion

Within Decision & Export, provide a final code-review-style diff preview before export. Show additions, modified lines and unchanged surrounding context so the developer can confirm there are no unrelated changes. Combine only currently export-eligible approved changes; the downloadable-file diff must match the resulting file exactly. Each included change remains traceable to its source finding or findings.

Clearly distinguish three categories: **Original unchanged content** (historical text that survived Privacy Review unchanged), **Developer privacy redactions** (passages removed or masked before analysis), and **Approved Prompt Autopsy changes** (explicitly approved additions or edits). Redactions are not AI recommendations and do not count toward approved rule-change totals. Indicate removed passages without exposing their sensitive original text; display reviewed masking text where applicable.

Before export, show a visible decision/eligibility summary: approved changes ready to export, accepted no-change decisions, pending findings not included, and conflicting changes requiring resolution. Separately show a **Not included** section listing pending, rejected, needs-evidence and unresolved-conflict proposals with their reasons. No blocked changes appear in the downloadable-file diff. Accepted no-change decisions remain visible in the summary and report, without implying they are unresolved.

After export, show findings reviewed, changes actually exported, rejected findings, accepted no-change results, findings needing evidence, pending findings, unresolved conflicts and generated files, with clear download actions. Distinguish historically approved but blocked proposals from changes actually exported. When pending findings, needs-evidence findings or unresolved conflicts remain, say **Export completed with unresolved findings.** Export alone never marks the investigation complete, fixed or verified.

## Look and Feel

Source: `scope.md > Inspiration & Identity`; developer's explicit PRD direction.

Professional developer debugging tool: restrained dark theme, clear typography, thoughtful spacing, restrained accent colours, clear status indicators and minimal distractions. Use subtle synchronized highlighting to connect findings and evidence. Distinguish observed evidence from hypotheses through explicit labels as well as visual treatment. Prioritize readable source text and dependable selection/scrolling over elaborate visual effects.

Import uses a responsive two-column layout; Investigation uses the 25/45/30 arrangement with a collapsible evidence inspector on smaller screens. Historical rules render readably; source messages and diff content retain useful formatting. Specific fonts and colour values are not yet prescribed and need not become a new design interview.

## Decisions and Approval Behaviour

One incident can yield multiple findings, each with its own state: **Pending**, **Approved**, **Rejected**, **No change accepted**, or **Needs evidence**.

| Action | Behaviour |
|---|---|
| Approve | Capture the current approved text, addressed finding and evidence references. It becomes eligible for export only if it is current and not blocked by a conflict; it is not tested or verified. Local approval metadata may be included if available. |
| Edit and approve | Allow editing the proposal; visibly distinguish developer edits from the AI suggestion and preserve the original suggestion and prior semantic review in the investigation record. Any edit revokes approval, reruns local overlap checks and marks semantic review stale. Require a fresh targeted semantic recheck, resolution of any issues, and explicit approval of the edited version. A later edit invalidates both approval and semantic review again. |
| Reject | Capture a short reason and exclude the proposal from the rules export. The approved scope requires a reason; use that stricter requirement rather than silently making it optional. |
| Needs more evidence | Mark the finding unresolved, show what evidence is missing and exclude its rule change from export. |
| Accept no change | Record the no-change decision and rationale. Generate a report rather than a duplicate unmodified rules file for this outcome. |

Recommendations remain advisory. Every finding appears in the report, including rejected, pending and unresolved findings. Only approved, current, export-eligible modifications may enter the rules export. No conversational AI chat or automatic rule accumulation is introduced.

## Pending Findings and Conflicting Changes

Source: `scope.md > Acceptance Tests > Faithful export`; resolved developer export policy.

### Independent Export Eligibility

Findings marked Pending, Rejected, No change accepted or Needs evidence do not block unrelated approved changes. Pending findings never contribute a rules modification. Combine approved proposals affecting separate parts of the reviewed rules when they do not conflict, preserving each change's finding/evidence traceability.

### Conflict Conditions

Never silently merge proposals. Require resolution when proposals modify the same existing instruction; target overlapping text or ambiguous insertion locations; propose contradictory instructions; or would make one another redundant or invalid. This includes semantic conflicts even when the proposed locations differ.

If affected proposals are already approved, mark both **Conflict requires review** for export purposes. Keep previous approval records visible, but neither enters the export while the conflict is unresolved. This is an export-eligibility status separate from the finding's decision/approval history. Unrelated approved changes remain exportable.

### Developer Conflict Resolution

Present competing proposals side by side, including source findings, supporting evidence, the affected historical rule and the resulting text each would produce. Do not automatically ask the AI to choose a winner.

| Resolution | Result |
|---|---|
| Keep one proposal | Keep the selected approved change and explicitly reject or remove its competitor from export. Preserve the decision record; the retained change becomes eligible if no other conflict remains. |
| Create a merged revision | Let the developer write one combined instruction/revision. Preserve links to the contributing findings and original proposals. Treat it as a new developer-edited proposal: no previous approvals or semantic results carry over. Require a targeted semantic recheck and explicit approval before export. Superseded proposals do not also enter the export. |
| Reject both | Export neither change and record the developer's rejection reasons in the report. |
| Needs more evidence | Export neither affected change; record the unresolved conflict and missing evidence in the report. |

Reassess export eligibility after a resolution or edit. A proposal is not eligible merely because it was approved before its conflict became apparent. The final preview contains only the eligible result, while the report retains the review record.

## Export Contents

### Targeted Semantic Review After Editing

User-approved technical-interview refinement: an edited or merged proposal requires a new targeted semantic recheck before final approval/export eligibility. Do not rerun the full investigation or trigger calls on every keystroke. Trigger only when the developer explicitly moves the edited proposal toward approval, with disclosure that its limited comparison payload goes to OpenAI.

Use the current proposal, the entire reviewed/redacted historical rules file, all approved/export-eligible proposals that would coexist with it, associated finding IDs and only minimal reviewed evidence genuinely necessary to understand intent. Do not use semantic retrieval, embeddings or heuristic passage ranking. If the complete required context exceeds the targeted recheck limit, fail closed with an actionable error; never silently omit or summarize rules or peers. Bind results to exact reviewed rules/version, proposal version and included peer proposals; later context changes make them stale. Do not resend the full transcript, restore pre-redaction text or let AI rewrite the developer's proposal. Structured advisory results are **no_issue**, **possible_duplicate**, **possible_conflict**, or **uncertain**, with referenced application IDs, reasoning and limitations.

For no_issue, show **No duplicate or conflict was identified in the supplied comparison context.** Allow explicit developer approval only if deterministic checks also permit it. Potential duplicates/conflicts use the existing review workflow. Uncertain results remain non-export-eligible; the developer can revise again or request more evidence. A recheck does not establish correctness, prevention or agent compliance.

Edits immediately show **Stale — recheck required**. If budget is insufficient or the provider call fails, preserve the edited text, show **Semantic review pending** with the reason, and keep the proposal non-export-eligible. Never reuse an old semantic result. Unrelated eligible changes can still export. Rechecks and explicit retries share the USD 0.40 investigation ceiling; no automatic paid retry or repair loops.

### Updated Rules File

Preserve the supplied filename, AGENTS.md or CLAUDE.md. Start from the reviewed/redacted historical rules, preserve all unrelated reviewed content unchanged, and apply only explicitly approved, current, export-eligible Prompt Autopsy modifications. Do not insert Prompt Autopsy commentary unless the developer explicitly included it in their approved text. Do not write into the developer's repository.

### Redacted Historical Rules Policy

The version reviewed before AI processing is the baseline for the final rules export. Never automatically restore text removed or masked during Privacy Review. Privacy redactions remain separate from approved instruction changes in the preview, report and change counts.

If the developer wants sensitive original text restored, they must return to Privacy Review and restore it themselves. This changes the reviewed input, invalidates prior analysis and its derived decisions, and requires renewed consent and fresh analysis before a current rules revision can be exported.

### Investigation Report

Export `prompt-autopsy-report.md`. Include:

- Incident description and investigation date/local metadata if available.
- Finding titles and observed facts.
- Possible explanations explicitly labelled as hypotheses and missing evidence.
- Supporting message references with quoted reviewed text, so references are useful outside the app.
- Relevant historical instructions and original proposals.
- Final developer decisions and final approved text where applicable.
- Every finding's state at export, including pending and non-exported findings; clearly identify which approved changes were actually included and link each exported change to its originating finding or findings.
- Conflicting proposals, the reason they conflicted, approval history where applicable, and the developer's resolution or an explicit statement that the conflict remains unresolved. Historical approval must not imply inclusion in the rules file.
- Rejection reasons, no-change rationale and explanation of why no rule edit was exported where appropriate.
- Manual verification status only if the optional feature was used.
- When historical rules were redacted, a notice that the exported rules revision derives from the privacy-reviewed version. Do not reproduce removed sensitive text in this notice, quotations or other report content.

Include the statement:

> Approval means the developer accepted this instruction change for export. It does not establish that the instruction prevents recurrence of the original failure.

With export-eligible approved modifications, generate the revised rules file and report. When none are eligible, generate only the report, even if some proposals were previously approved but are now blocked. Never manufacture an unchanged rules download to make the investigation look productive. Pending, rejected, no-change, needs-evidence or conflicting findings do not prevent unrelated eligible findings from producing a rules export.

## States and Boundaries

Source: `scope.md > Acceptance Tests` and `The POC Boundary`.

- **First use/incomplete input:** show explanatory examples, sample download, active preview and readiness checklist; unavailable actions explain what is missing.
- **Invalid import:** identify the parsing problem and how to fix it; do not proceed with silently dropped messages or guessed structure.
- **Privacy review incomplete:** no AI processing; Start Investigation stays unavailable until validation and consent are complete.
- **Analysis in progress:** meaningful loading feedback without displaying results prematurely or inventing conclusions.
- **Analysis failure:** clear error and retry; preserve reviewed inputs within the current session so the developer does not have to start over. This does not imply recovery after refresh or close.
- **Insufficient evidence:** retain available observations and identify missing evidence rather than inventing a diagnosis.
- **No justified rule change:** dedicated evidence-backed no-change experience and report export.
- **No relevant historical instruction:** clearly say no relevant instruction was identified; do not claim the entire historical context is known.
- **Changed reviewed input:** invalidate prior analysis, require renewed consent and fresh analysis, and do not present old results as current. Decisions derived from stale results must not be exportable as current approved changes.
- **Changed proposal:** revoke approval, refresh preview, rerun local overlap checks and mark semantic review stale. Require a targeted recheck before explicit reapproval. Preserve original proposal and earlier semantic results for the record.
- **Semantic review pending:** budget exhaustion or provider failure leaves edited text intact but non-export-eligible. Retry is explicit and must fit the remaining budget. Other eligible changes are unaffected.
- **Conflict requires review:** exclude affected proposals from the rules diff/export while retaining their approval history. Show them in Not included and in the report; independent eligible changes remain exportable.
- **Partial export:** preserve pending and unresolved finding states; exporting eligible changes does not resolve or complete the remaining investigation.
- **Session lifetime/refresh:** current-session-only work. Refresh, tab/window/browser close, navigation out of the application or application restart discards the investigation. Return to an empty Import workspace without history, recovery prompts or silent restoration; apply the warnings described below where supported.

## Session Lifetime and Unsaved Work

Resolved policy: **Current session only. Export what you want to keep.** The MVP does not persist investigations across refreshes, tab/window/browser closes, navigation out of the application or application restarts. Normal movement among the four stages retains work within the current session and follows the existing input-change invalidation rules.

### When Work Is Unsaved

Treat the investigation as unsaved once the developer enters meaningful content or progresses beyond the empty Import state. Empty first use does not need a loss warning. Downloading files does not make the full interactive investigation recoverable or disable its session-loss protection.

For deliberate application navigation that would leave or discard the session, show:

> Your current investigation is stored only in this session. Leaving or refreshing will discard the transcript, reviewed rules, findings and decisions.

Use browser-supported unsaved-changes protection for refresh, tab/window close, navigation away and other supported leave-page attempts. The browser may show its standard message rather than this wording, or may not show a warning at all. Do not promise a custom browser message, guaranteed interruption or recovery after a browser/application exit. Offer a way to stay when the application controls the departure prompt.

### What Session End Discards

Discard the incident description, imported transcript, historical rules, privacy-review edits/redactions, analysis results, findings, approvals/rejections and other decisions, conflict resolutions, and unexported reports or rules revisions. Do not restore any of this on the next visit. Previously downloaded files remain the developer's copies; downloading is not an application save/recovery feature. This policy describes the application's working state, not a promise about external AI-provider retention.

### Reminder to Download Reviewed Results

Before leaving Decision & Export, if the developer has reviewed findings but has not downloaded the available current files, show:

> You have reviewed results that have not been downloaded. Leaving will discard this investigation.

This is a reminder, not an automatic export. Do not create or download files without the developer's action. Track available files individually so downloading only the rules file does not imply that the report was downloaded. Newly revised outputs are not covered by a previous download. Browser-controlled departures use available standard leave-page protection; do not promise that an in-app reminder can appear during every close/refresh. Returning to Investigation within the application preserves the session; make clear that the discard warning concerns leaving the session, not ordinary stage navigation.

### Next Visit

Refresh or reopening returns to the clean Import workspace. No accounts, cloud persistence, investigation history, automatic recovery or previous-investigation list is included.

## Acceptance Criteria

These are observable proof-of-concept checks, not claims about real-world model accuracy.

1. All three valid inputs show ready status; invalid message boundaries/speakers yield an actionable error and block investigation.
2. The developer can inspect/redact every supplied input before any AI processing and explicitly consent to the reviewed version.
3. Redaction preserves surviving message IDs; analysis and exported evidence never cite text removed from the reviewed transcript.
4. Selecting a finding connects its timeline events, source messages and historical rules. Selecting a reference highlights the exact reviewed passage with surrounding context.
5. Findings distinguish evidence-backed observations, hypotheses and missing evidence. A controlled incomplete case produces an explicit insufficiency result without invented messages.
6. Equivalent-rule and conflicting-rule controls show the relevant historical instruction. An equivalent rule can yield an explained no-change outcome.
7. Each finding retains its own decision. Edited approved text becomes unapproved; rejected and unresolved changes never enter a rules export.
8. Final preview distinguishes original unchanged content, developer privacy redactions and approved Prompt Autopsy changes. The downloaded rules use the reviewed/redacted baseline, preserve unrelated reviewed content, apply only approved modifications and retain the original filename. Redactions are not counted as approved changes; removed sensitive text is never automatically restored or exposed in the final preview/report.
9. An accepted no-change investigation exports a report with evidence/rationale and no redundant rules file. An approved-change investigation exports both files.
10. The report preserves the distinction between observed facts and hypotheses and includes the approval disclaimer. Source quotes are from reviewed inputs.
11. Failed analysis retains inputs for retry. Changed inputs require fresh consent and analysis, and old results cannot masquerade as current findings.
12. Completion reports decisions and files without suggesting that approval establishes testing or a fix. The optional checklist does not block completion.
13. A rules export derived from redacted historical instructions includes a report notice without reproducing removed content. Manually restoring text through Privacy Review invalidates previous analysis and requires renewed consent and fresh analysis.
14. Independent approved changes export together while pending, rejected, accepted no-change and needs-evidence findings remain visible in the preview summary and report. Pending findings contribute no rules edits, and every included modification traces to its source finding or findings.
15. Same-instruction edits, ambiguous overlapping targets, contradictions and changes that invalidate or duplicate one another require conflict review. Previously approved affected proposals are excluded from the diff and download; unrelated eligible changes remain exportable.
16. The conflict view shows both proposals, source findings/evidence, affected rules and proposed resulting text. Keeping one, rejecting both or requesting evidence updates eligibility and the report. A merged revision requires fresh explicit approval and does not export superseded originals. AI does not automatically choose the resolution.
17. Not included lists blocked proposals separately from the downloadable-file diff. The report includes every finding, conflict rationale and resolution/unresolved state. An export with unresolved findings uses **Export completed with unresolved findings.** and does not mark the investigation complete.
18. Entering meaningful content or progressing beyond empty Import activates unsaved-work protection where supported. Application-controlled departures explain the loss and allow the developer to stay; browser-controlled departures use supported standard warnings without promising custom text or guaranteed display.
19. Refreshing or reopening starts with empty Import and restores none of the prior inputs, redactions, findings, decisions, conflicts or unexported outputs. Ordinary stage navigation and analysis retry retain work only within the current session.
20. Leaving Decision & Export with reviewed but undownloaded current results presents the download reminder where the application can do so. It never automatically exports. A prior or partial download does not conceal remaining undownloaded outputs.
21. Editing or merging a proposal invalidates approval and prior semantic review. Local overlap checks run immediately; one limited, disclosed semantic recheck runs only on an explicit move toward approval. No complete transcript or removed content is sent. Only a current validated result can satisfy the semantic-review requirement; issues follow the conflict workflow and uncertain results remain unapproved. Failed or unaffordable rechecks preserve the edit as Semantic review pending without exporting it or exceeding the shared budget.

Recall is the candidate demonstration only if adequate original evidence is retrieved. Otherwise demonstrate an explicitly fictional controlled scenario. Use anonymized own sessions and controlled examples with inspectable expected results; do not present a reconstruction as original Recall evidence.

## Provider Data Disclosure

> After consent, reviewed content may be sent to OpenAI for token counting and AI analysis. OpenAI API data is not used for model training by default. Standard abuse-monitoring controls may retain customer content for up to 30 days. Prompt Autopsy itself does not persist the investigation.

Link OpenAI's general API data policy; it includes retention exceptions. Do not claim endpoint-specific application-state retention for input-token counting, that generation's `store: false` governs counting, or Zero Data Retention. This disclosure is resolved; counting billing is resolved as unbilled preprocessing.

## In-Session AI Budget

Resolved technical-interview policy: **“This investigation has a USD 0.40 in-session AI budget.”** All analysis calls, targeted semantic rechecks and explicit retries share it. Reserve conservatively before dispatch; unavailable budget blocks the affected request while preserving reviewed work and unrelated export-eligible changes. Unknown billing after timeout/cancellation retains the reservation; stale or rejected results do not refund incurred spend.

This is a limit enforced in the normal current-session workflow, not an account-wide guarantee across API replay, modified requests, refresh/reset, multiple tabs/sessions or repeated investigations. The server independently enforces each call's trusted configuration and limits. No persistence or accounts are added. Public-deployment abuse/spend controls are a separate production concern outside this MVP.

## Product Decisions

- One incident, one session and one historical rules file; multiple findings within that incident do not imply cross-session analytics.
- One structured plain-text transcript format with validation, stable references and a sample; no universal agent parsers.
- No AI processing until content review/redaction and explicit consent.
- Reviewed/redacted historical rules are the export baseline. Privacy redactions are separate from approved instruction changes; original sensitive content is never restored automatically. Manual restoration requires a new consented analysis.
- Four-stage guided workspace; no tutorial requirement, accounts, dashboard or previous-investigation history.
- Linked three-panel investigation; timeline position is not proof of causality.
- User-supplied historical rules are not proof the agent loaded or followed them.
- Per-finding developer decisions, exact change preview, and report-only no-change outcome.
- Pending/non-exported findings do not block independent approved changes. Export eligibility is distinct from approval history; conflicts require developer resolution, and merged revisions require new approval.
- Edited/merged proposal wording needs a targeted semantic recheck, then explicit approval. Semantic outcomes remain advisory; rechecks and explicit retries share the investigation cost ceiling and never trigger automatically while typing.
- Final preview separates eligible changes from Not included proposals; reports include all findings and conflict outcomes. Partial export never implies a completed investigation.
- Current-session-only working state, supported unsaved-work warnings and a reminder to download reviewed results. Refresh/reopen returns to empty Import with no recovery, persistence or history.
- Approval and manual verification remain separate. The checklist is optional and non-blocking.
- Markdown-only planning reviews. Implementation waits for approved PRD and technical specification.

## What We're Building

The validated input/review flow, evidence-linked investigation, historical-rule comparison, developer decision states, final diff, faithful rules/report exports and a simple completion summary. Prioritize this connected workflow over optional testing or visual effects. The curriculum's 2–4-hour target requires keeping each stage compact rather than expanding into a full diagnostics platform.

## Deferred and Non-Goals

- Manual checklist and reported outcomes: optional enhancement only after the core workflow works.
- Controlled before-and-after testing and richer test history: outside initial completion requirements.
- Additional transcript formats and cross-session analysis: deferred to preserve the single-investigation boundary.
- GitHub/other integrations and automatic repository modifications: excluded; users supply files and download reviewed results.
- Autonomous code execution and automatic testing: excluded; no live coding-agent replay.
- Automatic rule accumulation, conversational AI chat, dashboards, accounts, investigation history and unnecessary settings: excluded.
- Persistence across refresh/close/restart, cloud saves and automatic recovery: excluded; developers export files they want to keep.
- Guaranteed anonymization, complete secret detection, causal certainty, artificial confidence percentages and claims of prevention: not product promises.

## Open Questions

None blocking PRD approval. Redacted-rule export, pending/conflicting changes and session lifetime policies are resolved.

Details for later specification: the exact syntax of the one documented transcript format and sizing/layout details consistent with this product contract. The incident display-name assumption is labelled in Investigation Workspace and introduces no new required input.
