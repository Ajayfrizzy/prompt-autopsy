# Prompt Autopsy

**Investigate what went wrong with your AI coding session—before adding another permanent rule.**

Prompt Autopsy helps developers trace a failed coding-agent session to exact transcript evidence, compare it with historical `AGENTS.md` or `CLAUDE.md` instructions, and review whether a rule should be added, edited, left unchanged, or deferred until more evidence is available.

> AI interprets. Application code verifies. Developer decides.

[Repository](https://github.com/Ajayfrizzy/prompt-autopsy) · [Transcript format](devpost/transcript-format.md) · [Fictional sample](public/samples/transcript.txt)

## The problem

AI-generated implementations can pass automated checks and still fail during hands-on browser testing. Adding another instruction after every failure can turn an agent rules file into a collection of speculative, duplicate, or contradictory rules.

Prompt Autopsy provides a review process before those changes are made. It helps distinguish missing guidance from failures that existing instructions already addressed, while making gaps in the evidence visible.

## What it does

Each investigation covers **one incident, one manually prepared session excerpt, and one historical rules file**. It produces an annotated timeline, evidence-backed findings, historical instruction comparisons, and proposed changes when justified.

Every finding links to reviewed source messages. Developers review and decide; nothing is automatically written to their repository.

## Who it is for

Developers and teams using AI coding agents, especially those maintaining `AGENTS.md` or `CLAUDE.md` files who want to:

- understand an implementation that failed despite passing tests;
- distinguish overlooked guidance from missing or ambiguous instructions;
- avoid accumulating unnecessary rules;
- keep an evidence-linked record of instruction decisions.

## Workflow

**Import → Privacy Review → Investigation → Decision & Export**

### 1. Import

Describe the observed failure and expected behaviour. Paste or upload a structured plain-text transcript, then supply the historical instruction file that existed during the incident. The parser validates message boundaries and assigns stable references such as `M001`.

### 2. Privacy Review

Inspect and redact the incident description, transcript, and historical instructions locally. Explicit consent is required before reviewed content is sent to OpenAI for input-token counting and analysis. Import and Privacy Review do not send investigation content to the server.

### 3. Investigation

Review the main conclusion, annotated timeline, and findings alongside an evidence inspector. OpenAI interprets the supplied evidence; application code checks the structured response, exact citations, proposal relationships, and edit targets. Invalid results fail closed—no partial findings are accepted.

### 4. Decision & Export

Approve a proposed instruction, edit it for further review, reject it with a reason, accept no change, or mark it as needing more evidence.

Download eligible changes as a revised `AGENTS.md` or `CLAUDE.md`, and export a Markdown investigation report with findings, evidence, decisions, limitations, and proposal history. Independent approved changes may be exported while other findings remain unresolved; export does not mean the investigation is complete or verified.

## Evidence-first design

| Section                           | What it means                                                                                                   |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Documented requirement            | What the reviewed transcript explicitly requested.                                                              |
| Observed                          | Claims directly supported by exact reviewed evidence.                                                           |
| Possible explanation              | An interpretation that is not established as fact.                                                              |
| Evidence still needed             | Missing information needed for a stronger conclusion.                                                           |
| Historical instruction comparison | Whether supplied historical guidance already addressed, related to, or conflicted with the proposed correction. |

An uploaded historical rules file establishes its supplied contents—not that the coding agent loaded, read, or followed it. A transcript report of a successful test is evidence of that report, not an independently executed verification by Prompt Autopsy.

## Rule recommendations

| Outcome        | When it is appropriate                                                                 |
| -------------- | -------------------------------------------------------------------------------------- |
| Add            | The supplied rules lack relevant guidance and the evidence supports a new instruction. |
| Edit           | Existing guidance is relevant but needs a specific revision.                           |
| No change      | Existing instructions already cover the issue, or another rule is not justified.       |
| Needs evidence | The supplied material does not justify an instruction change yet.                      |

**No change is a valid successful outcome.** A later correction or successful test normally belongs to the original finding's history, rather than becoming a separate failure finding.

## Developer control and semantic rechecks

Only explicitly approved, export-eligible changes enter the revised rules file. Conflicting proposals are not silently merged. Approval does not guarantee that an instruction is correct, will be obeyed, or will prevent recurrence.

Editing or merging a proposal invalidates its previous approval and semantic comparison. A targeted semantic recheck is required before approval becomes available again. It compares the current wording with the **complete reviewed historical rules** and coexisting approved proposals; it does not resend the full transcript. If the required context cannot fit, the request is rejected rather than silently shortened.

Semantic findings remain advisory. The model cannot approve proposals or decide what is exportable.

## OpenAI usage and deterministic safeguards

Prompt Autopsy uses the **OpenAI Responses API**, model **`gpt-5.6-sol`**, with Zod-backed Structured Outputs. Credentials stay server-side. Investigation calls use standard processing, `store: false`, and no provider tools or autonomous code execution.

AI handles semantic interpretation and suggestions. Deterministic application code verifies:

- message and historical-rule IDs, exact quotes, and quote occurrences;
- proposal/finding relationships and legal edit-target combinations;
- exact edit anchors and Unicode/CRLF boundaries;
- replacement character/UTF-8 limits and no-op edits;
- semantic-review bindings, approval state, conflicts, and export eligibility.

Output is not fuzzy-matched, automatically repaired, or silently retried. Development diagnostics use safe typed codes and structural indexes rather than logging investigation contents. These safeguards validate structure and grounding; they do not prove every interpretation correct.

## Privacy and session-only state

Investigations live only in browser memory for the current session. There are no accounts, recovery storage, or investigation history. Refreshing or closing the session discards unfinished work; export what you want to keep. Browser-supported leave-page warnings are used where available.

Rules exports start from the **privacy-reviewed/redacted baseline**, preserve unrelated reviewed content, and apply only eligible approved modifications. Removed sensitive text is never restored automatically.

Privacy review is manual; the application does not guarantee secret detection or complete anonymization. Provider-side data handling is separate from Prompt Autopsy's own non-persistence. Do not interpret session-only storage or `store: false` as an end-to-end zero-retention guarantee.

## Cost controls

The current investigation has a **USD 0.40 in-session AI-generation budget**. The application reserves conservative maximum generation cost before dispatch and settles against trusted usage when available; uncertain billing retains the reservation.

- Initial investigation: maximum USD 0.250 generation reservation.
- Targeted semantic recheck: maximum USD 0.064 generation reservation.
- Explicit retries and rechecks share the same session ledger.

Consented provider input-token counting is unbilled preprocessing and checks the complete canonical request against operation-specific limits before generation. Oversized inputs are rejected without silently truncating evidence.

This is a safeguard within the normal application session, **not an account-wide spending limit**. It does not prevent deliberate API replay, modified clients, or spending across separate sessions. Public deployment using a paid key requires additional abuse and account-level spending protections that are outside this MVP.

## Architecture

```text
Browser: import → privacy review → explicit consent
                         ↓
Stateless Next.js Route Handler → OpenAI input-token count
                         ↓
OpenAI Responses generation → schema and domain validation
                         ↓
Browser: evidence review → developer decision
                         ↓
Deterministic diff, rules export, and Markdown report
```

The investigation and semantic-recheck routes have separate contracts and limits. There is no database, source-file storage service, or automatic repository modification.

## Tech stack

- **Runtime:** Node 24.21.0
- **Application:** Next.js 16 App Router, React 19, TypeScript
- **UI:** Tailwind CSS and Lucide React
- **AI and contracts:** OpenAI Responses API and Zod
- **Verification:** Vitest, Testing Library, and jsdom
- **Diffs:** `diff`

Exact dependency versions are pinned in [package.json](package.json) and the lockfile.

## Running locally

Use Node **24.21.0** (`nvm use` if available), then:

```bash
npm ci
cp .env.example .env.local
```

For live investigation or semantic recheck, set your key in `.env.local`:

```dotenv
OPENAI_API_KEY=your_api_key_here
```

Keep the key private. Import and Privacy Review work without it; live processing requires a configured key with model access and explicit in-app consent.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Development and production builds use webpack mode.

### Development checks

```bash
npm test
npm run typecheck
npm run build
```

Latest successful verification: **206 offline tests**, typecheck, and production webpack build. Offline tests use controlled fixtures and mocks, not real OpenAI requests. Passing them does not establish live-model consistency or replace real-browser testing.

## Transcript format

Prepare a relevant excerpt manually, preserving requirements, decisions, implementation discussion, failures, and corrections where available. Prompt Autopsy does not parse agent-specific exports.

```text
@@MESSAGE
speaker: developer
original_ref: optional-source-reference
@@BODY
Describe the developer message here.
@@END

@@MESSAGE
speaker: agent
@@BODY
Describe the coding agent response here.
@@END
```

Supported speakers are `developer`, `agent`, and `system`. The `original_ref` header is optional; application citations use assigned message IDs. Privacy edits preserve those IDs, and removing a message does not renumber the remaining messages.

See the [complete grammar and escaping rules](devpost/transcript-format.md) and [fictional sample transcript](public/samples/transcript.txt). Fictional fixtures must not be presented as recovered or real coding-session evidence. Supply the historical rules appropriate to the incident; this repository's own generated instructions are not automatically the historical rules for the fictional sample.

## Current limitations

- One incident, one session excerpt, and one historical rules file per investigation.
- No automatic retrieval of repository history, commit diffs, or browser logs.
- No proof that supplied historical instructions were loaded or followed by an agent.
- AI findings remain interpretations of supplied evidence; selected excerpts may omit important context.
- No autonomous execution or guarantee that approved instructions prevent future failures.
- No recovery after the session is discarded.
- Public deployment requires additional abuse/spend protections.

## What I learned

Building Prompt Autopsy taught me that **structured AI output is not automatically verified output**. Valid JSON can still contain invalid evidence references, inconsistent proposal relationships, or edit targets that do not match the reviewed source.

That led me to separate interpretation from deterministic checks and developer decisions. I also learned that automated tests do not establish real-browser behaviour: one incident used during development passed offline tests, typecheck, and build before a regression was found through hands-on testing.

Uncertainty should be represented explicitly rather than hidden. Sometimes a new instruction is justified; sometimes the right outcome is no change or a request for more evidence.

> AI interprets. Application code verifies. Developer decides.

## Repository

[github.com/Ajayfrizzy/prompt-autopsy](https://github.com/Ajayfrizzy/prompt-autopsy)

## Demo

**Placeholder: add the final demo-video link before submission.**
