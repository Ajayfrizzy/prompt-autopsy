# Prompt Autopsy

Prompt Autopsy is an evidence-backed investigation tool for failed AI coding sessions.

Instead of treating every coding-agent failure as a reason to add more instructions, Prompt Autopsy helps a developer reconstruct what happened, separate evidence from assumptions, compare the incident against the historical `AGENTS.md` or `CLAUDE.md`, and decide whether a rule should actually be added, edited, left unchanged, or deferred until more evidence is available.

The core principle is:

> AI interprets. Application code verifies. Developer decides.

## The problem

AI coding agents can produce fixes that look correct, pass automated checks, and still fail in a real browser or production-like environment.

When that happens, developers often respond by adding another instruction to an agent rules file.

That creates a second problem: instruction files can slowly become collections of speculative rules written after individual failures, even when the existing guidance was already sufficient or the evidence does not justify a new rule.

Prompt Autopsy provides a structured review process before those changes are made.

## What Prompt Autopsy does

Prompt Autopsy investigates one coding incident at a time.

The developer supplies:

- a description of the observed incident;
- a structured plain-text excerpt of the coding-agent session;
- the historical `AGENTS.md` or `CLAUDE.md` that existed during that incident.

Before AI processing, the developer reviews the exact inputs and can remove or redact sensitive material.

After explicit consent, Prompt Autopsy analyzes the reviewed evidence and produces:

- an annotated incident timeline;
- evidence-backed findings;
- documented requirements;
- observations linked to exact transcript passages;
- possible explanations kept separate from established facts;
- missing-evidence warnings;
- comparison against historical instructions;
- an add, edit, no-change, or needs-evidence recommendation;
- a proposed instruction change when justified.

Nothing is automatically written back to a repository.

The developer makes the final decision.

## Who it is for

Prompt Autopsy is designed for developers who use AI coding agents and maintain instruction files such as:

- `AGENTS.md`
- `CLAUDE.md`

It is especially useful when:

- an AI-generated implementation passed tests but failed during hands-on testing;
- it is unclear whether the failure came from missing instructions or implementation judgment;
- a developer wants evidence before adding another permanent agent rule;
- historical instructions need to be reviewed against a real incident;
- a team wants a record of why an instruction was accepted or rejected.

## Workflow

### 1. Import

The developer describes one observed incident and imports:

- a structured transcript;
- the historical instruction file.

Prompt Autopsy parses the transcript and assigns stable message references.

### 2. Privacy Review

The developer reviews every input before it leaves the browser.

Transcript messages, incident text, and historical instructions can be edited or removed.

Prompt Autopsy itself keeps the investigation in the current session only.

Provider processing does not begin until the developer explicitly consents.

### 3. Investigation

Prompt Autopsy sends the reviewed context to OpenAI and asks the model to interpret the incident.

The resulting analysis is not accepted blindly.

Application code validates:

- exact source-message references;
- exact evidence quotes;
- quote occurrences;
- historical-rule references;
- proposal relationships;
- edit targets;
- replacement boundaries;
- structured-output invariants.

If those checks fail, no partial investigation is accepted.

### 4. Decision & Export

The developer reviews any proposed instruction change and chooses whether to:

- approve it;
- reject it;
- accept no change;
- mark it as needing more evidence.

Only explicitly approved and export-eligible changes appear in the final revised rules file.

Prompt Autopsy can export:

- the revised `AGENTS.md` or `CLAUDE.md`;
- a Markdown investigation report containing the evidence, findings, decisions, limitations, and proposal history.

## Evidence-first design

Prompt Autopsy deliberately separates different levels of certainty.

### Observed

Claims directly supported by reviewed transcript evidence.

### Possible explanation

Interpretations that fit the evidence but are not established as fact.

### Evidence still needed

Information that would be required to make a stronger conclusion.

### Historical instruction comparison

A comparison between the finding and the rules that actually existed during the incident.

Uploading a historical rules file proves only what that file contained. It does not prove that the coding agent loaded, read, or followed it.

## Rule recommendations

A finding can result in one of four outcomes.

### Add

A relevant instruction did not exist and the evidence supports adding one.

### Edit

Existing guidance is relevant but needs a specific revision.

### No change

The existing instructions already cover the failure, or another rule would not be justified.

### Needs evidence

The supplied material is insufficient to justify a permanent instruction change.

Prompt Autopsy treats no-change as a valid successful outcome.

## Developer control

Prompt Autopsy never automatically modifies the developer's repository.

Approval is an explicit developer decision.

An approved proposal is marked as ready for export only when it also passes the export-eligibility checks. Conflicts or stale semantic review can still block export. Approval does not establish that the instruction will prevent every future recurrence.

If the developer edits or merges a generated proposal, that change becomes stale and requires another semantic comparison before it can be approved.

## Semantic recheck

Developer-edited or merged proposals can trigger a targeted semantic recheck.

The recheck compares the current proposal against:

- the complete reviewed historical rules;
- relevant coexisting approved proposals.

This helps identify possible duplicates or conflicts introduced by manual editing.

The entire original transcript is not resent for this recheck.

## AI usage

Prompt Autopsy uses OpenAI's Responses API with structured outputs.

Current model:

`gpt-5.6-sol`

The AI is used for interpretation tasks such as:

- grouping evidence into findings;
- distinguishing observations from possible explanations;
- comparing the incident semantically with historical guidance;
- proposing narrowly scoped instruction changes.

The model does not determine whether its own references are valid.

Deterministic application code verifies the resulting structure and references before the investigation is accepted.

## Provider and validation safeguards

Prompt Autopsy uses several fail-closed checks around provider output.

Examples include:

- structured-output validation;
- exact message citation verification;
- exact rule citation verification;
- occurrence checking;
- proposal/finding relationship validation;
- edit-anchor validation;
- Unicode and CRLF boundary protection;
- replacement length and byte limits;
- no-op edit rejection;
- semantic-context binding;
- safe typed validation diagnostics.

Unknown or invalid provider output is not silently repaired into an accepted investigation.

## Privacy model

Prompt Autopsy is designed around explicit review and consent.

The application:

- keeps investigation state in the current browser session;
- does not implement recovery persistence;
- lets the developer redact inputs before processing;
- sends only reviewed content after explicit consent;
- does not automatically write changes to repositories.

Provider-side retention and data handling remain separate from Prompt Autopsy's own session-only storage behavior.

## Cost controls

The app verifies input size before generation and tracks estimated AI usage within the active session.

The current in-session AI budget is:

`$0.40`

Investigation and semantic-recheck operations have separate input and output limits.

The displayed budget is an application-level safeguard and is not an account-wide OpenAI spending limit.

## Example real investigation

One real test involved a browser-restoration fix that attempted to keep React-controlled form values synchronized by repeatedly writing directly to textarea DOM values.

The implementation passed offline tests, typecheck, and production build checks, but hands-on browser testing found static or unresponsive controls and inconsistent transcript state.

Prompt Autopsy:

1. identified the imperative DOM synchronization as the central failure;
2. linked the finding to exact transcript evidence;
3. kept the precise browser mechanism as a possible explanation rather than a proven fact;
4. detected that the historical `AGENTS.md` contained only unrelated generated Next.js guidance;
5. recommended a new React-controlled-input instruction;
6. placed the new rule outside the generated Next.js block;
7. required developer approval before export.

The resulting revised instruction emphasized React-owned controlled state, narrowly scoped browser-restoration resets, and explicit real-browser verification even after automated checks pass.

## Architecture

Prompt Autopsy is a Next.js application using a server-side OpenAI adapter and deterministic domain validation.

Main layers:

```text
Browser UI
   |
   | reviewed inputs + explicit consent
   v
Next.js API routes
   |
   | input-size verification
   v
OpenAI Responses API
   |
   | structured output
   v
Schema validation
   |
   v
Deterministic domain validation
   |
   v
Developer review and decision
   |
   v
Deterministic diff + export
```

The investigation and semantic-recheck routes use separate contracts and limits.

## Tech stack

- Next.js 16
- React 19
- TypeScript
- OpenAI Responses API
- Zod
- Tailwind CSS
- Vitest
- Testing Library
- jsdom
- `diff`
- Lucide React

Development runtime:

`Node 24.21.0`

## Running locally

Install dependencies:

```bash
npm ci
```

Copy the environment example:

```bash
cp .env.example .env.local
```

Add an OpenAI API key if you want to use live provider processing:

```text
OPENAI_API_KEY=...
```

Start development:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The Import and Privacy Review stages can be explored without an API key.

A valid API key and explicit consent are required for live investigation or semantic-recheck processing.

## Development checks

Run the offline test suite:

```bash
npm test
```

Typecheck:

```bash
npm run typecheck
```

Production build:

```bash
npm run build
```

The project currently passes:

- 206 offline tests;
- TypeScript validation;
- production webpack build.

Offline tests do not make real OpenAI requests.

## Transcript format

Prompt Autopsy uses a deliberately explicit plain-text transcript format.

Example:

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

Supported speakers:

- `developer`
- `agent`
- `system`

The Import screen also provides a fictional sample transcript.

Fictional fixtures should not be presented as recovered or real coding-session evidence.

## Current limitations

Prompt Autopsy currently focuses on one coding incident at a time.

Other limitations include:

- manually prepared transcript excerpts;
- no automatic repository-history reconstruction;
- no automatic retrieval of commit diffs or browser logs;
- no guarantee that an uploaded historical instruction file was actually loaded by the coding agent;
- AI findings remain interpretations of supplied evidence;
- approved instructions are not guarantees against future failures;
- current-session state is not recoverable after the session is discarded;
- public deployment with a paid provider key would require additional abuse and account-level spending controls.

## What I learned

Building Prompt Autopsy changed how I think about using AI for developer tooling.

The main lesson was that structured model output is not enough by itself.

A response can be valid JSON and still contain invalid evidence references, inconsistent proposal relationships, or edit targets that do not match the reviewed source material.

That led to an architecture where the model is responsible for interpretation but deterministic application code verifies what can actually be verified.

I also learned that successful automated checks do not replace hands-on browser verification. One of the real incidents used to test Prompt Autopsy passed offline tests, typecheck, and production build before a browser-level regression was discovered.

The project therefore treats uncertainty as part of the result rather than something the model should hide.

Sometimes the correct outcome is a new instruction.

Sometimes it is no change.

Sometimes it is simply: more evidence is required.

## Repository

Public repository:

`https://github.com/Ajayfrizzy/prompt-autopsy`

## Demo

Demo video: **Add final demo link before submission.**
