# Prompt Autopsy

## What the project does

Prompt Autopsy investigates failed AI coding sessions before developers add another permanent agent rule. Developers describe an incident, import a structured transcript and historical `AGENTS.md` or `CLAUDE.md`, then review and redact the inputs before consenting to AI processing.

OpenAI interprets the reviewed evidence. Findings link to exact transcript passages, distinguish observations from possible explanations, and compare the incident with historical instructions. Recommendations can be **add, edit, no change, or needs evidence**—a new rule is not always the right answer.

Deterministic application code verifies evidence references and edit targets. The developer makes the final decision, reviewing changes before exporting eligible approved instructions and an investigation report. Prompt Autopsy never automatically modifies the repository.

## Who it is for

Developers and teams using AI coding agents who want to understand failures, avoid accumulating speculative or duplicate rules, and keep an evidence-backed record of instruction decisions.

## What I learned

Structured AI output is not automatically verified output. Valid JSON can still contain invalid evidence references or edit targets, so interpretation needs deterministic checks and human review.

I also learned that automated tests do not establish real-browser behaviour; hands-on testing exposed failures after offline checks passed. Uncertainty should be shown explicitly rather than hidden, including when no change or more evidence is the appropriate outcome.

These lessons shaped the project's principle:

> AI interprets. Application code verifies. Developer decides.
