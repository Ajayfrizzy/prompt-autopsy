---
doc: scope
status: approved
---

# Prompt Autopsy

A desktop-friendly application for investigating a failed AI coding session and reviewing evidence-backed improvements to an existing AGENTS.md or CLAUDE.md.

## The Unique Kernel

Connect a reported failure to exact source messages, compare a proposed correction with the supplied historical rules, and let the developer decide whether any rules change is justified. Separate observed facts from explanations, and approval from evidence that a correction helps. “No rules change” is a useful result.

Related tools already offer memory, citations, instruction generation and prompt evaluation. Our proposed distinction is the complete review workflow, not novel model reasoning; see [focused research](prompt-autopsy-research.md).

## Who It's For

A developer reviewing a frustrating coding-agent session who can supply an anonymized transcript, describe the observed failure and provide the rules file that applied at the time. They want a small, defensible correction instead of accumulating speculative instructions.

## The Core Loop

1. Import one structured plain-text coding-session transcript and one historical AGENTS.md or CLAUDE.md, with a short description of the incident. Require clear message boundaries and speakers, assign stable message references, and show an error if parsing is unreliable rather than silently interpreting ambiguous input.
2. Before AI processing, warn that supplied content may contain credentials, private code or other sensitive information. Let the developer review and redact the transcript, rules and incident description, then explicitly proceed. Findings reference the reviewed content; redacted information cannot support a diagnosis.
3. Review a compact annotated timeline linking the requirement, relevant decisions and reported failure to exact messages. Separate observed facts, possible explanations and insufficient evidence.
4. Review a proposed instruction alongside its rationale and relevant existing rules. Highlight equivalent or potentially conflicting instructions. If the rules already address the problem, explain why no addition is recommended; clarification may be considered but is not automatic.
5. Approve, edit then approve, reject with a reason, or mark the investigation as needing more evidence. Preview changes before exporting only approved edits. A no-change outcome still supports exporting a short investigation report with the finding, rationale and supporting references.
6. As a non-blocking enhancement after the core workflow works, optionally use a short, reproducible manual verification checklist and record the developer's reported outcome separately from approval. Neither approval nor a single manual test establishes prevention of future failures. The checklist and outcome recording are not required to complete the initial working MVP.

Developers return after another problematic session; a cross-session analytics system is not required for this loop.

## Inspiration & Identity

Desktop-friendly, evidence-first investigation and review. Exact messages and understandable changes matter more than a polished summary. Detailed visual choices belong in the PRD.

## Why This Matters to the Learner

While building Recall, ignoring one product removed all four products sharing a screenshot. Item-level controls subsequently worked in Android testing. The learner wants to investigate what was actually instructed and avoid adding a duplicate rule or inventing a cause. The original transcript still needs retrieval; the verified implementation fix does not establish that a new instruction would have prevented the failure.

## What “Working” Looks Like

In a short demo, review the supplied content before AI processing, follow a finding to its exact messages, compare the proposed correction with existing rules, preview a minimal change and export it after approval. A control with an equivalent existing rule demonstrates no addition and an exportable investigation report. Missing evidence produces uncertainty rather than a fabricated explanation.

Recall remains the candidate demo only if enough original transcript evidence can be retrieved. Otherwise, use an explicitly fictional, controlled example. Test using own anonymized coding sessions and controlled examples with inspectable expected outcomes. Do not present fictional evidence as Recall's original conversation or claim that a proposed instruction prevents future failures.

## Acceptance Tests

The proof of concept must demonstrate:

1. **Grounded finding:** a supported failure links to exact messages in the reviewed transcript through stable references; quoted evidence matches its source.
2. **Facts versus explanations:** the observed failure and documented agreement are distinguished from possible causes; an inferred cause is never presented as established fact.
3. **Existing equivalent rule:** when an equivalent instruction is present, identify the relevant rule and explain why another addition is unnecessary.
4. **Potential conflict:** a proposal that conflicts with a supplied instruction highlights the relevant existing text and the conflict for developer review, without silently overriding it.
5. **No change:** an appropriate no-change result exports a short investigation report with its rationale and evidence, without introducing a rules edit.
6. **Faithful export:** preview and export only approved changes, preserving unrelated instructions. Rejected, unapproved or subsequently edited proposals do not enter the export without approval.
7. **Insufficient evidence:** an incomplete transcript produces an explicit limitation or request for more evidence rather than fabricated messages or a confident unsupported diagnosis.
8. **Reliable import:** supported message boundaries and speakers yield stable references; malformed or ambiguous structure produces an actionable error before analysis.
9. **Review before processing:** sensitive-content warning and review/redaction are available before any supplied content is sent for AI processing; analysis uses only the developer-reviewed content.
10. **Approval is not verification:** approving an instruction must not imply it has been tested. If the optional checklist and outcome recording are included, outcomes remain separate and may be unsuccessful or inconclusive; their implementation is not an initial-MVP acceptance requirement.

The curriculum targets roughly 2–4 hours of active work and requires a short demo video and public source repository; deployment is optional. This is a proof of concept, not a production diagnostics platform.

## The POC Boundary

- One incident, one coding session and one historical AGENTS.md or CLAUDE.md per investigation. One documented structured plain-text transcript format with clear message boundaries, speakers and stable references. No agent-specific parser collection.
- Findings with source references and a compact chronological view. Identify repeated mistakes only when multiple occurrences are evidenced within the supplied session.
- Minimal proposed additions or edits, comparison with the supplied historical rules, and an explained no-change outcome with a short exportable investigation report. File presence does not prove the agent loaded it.
- Developer review, change preview and export of the approved rules revision, preserving unrelated content. Editing an approved proposal requires renewed approval before export.
- Non-blocking enhancement: a lightweight checklist with user-recorded manual outcome, only after the core investigation/review/export workflow is working. If included, keep review disposition (proposed/approved/rejected/needs evidence) separate from test status (not tested/manually tested/inconclusive); a manual test records its outcome and does not certify general reliability. Omitting this enhancement does not block initial MVP completion.
- A sensitive-content warning and opportunity to review/redact all supplied content before AI processing. This is developer-controlled review, not a promise of automatic anonymization or complete secret detection.

## Later

Controlled before-and-after runs with preserved conditions and results; cross-session patterns; additional transcript formats; richer test-history management. These are unnecessary for demonstrating the first review/export loop.

## Explicitly Cut

- GitHub integration: unnecessary for reviewing supplied files and downloading a result.
- Automatic repository modifications: changes must be reviewed and exported.
- Universal coding-agent support: import complexity would dominate the proof of concept.
- Autonomous code execution: verification stays outside the application and under developer control.
- Automatic testing and a full evaluation system: the MVP supplies only a checklist and a manually reported outcome.
- Cross-session analytics: investigations stay limited to one incident in one session.
- Automatic rule accumulation: the product must justify minimal changes and permit no change.

## Approval

Approved by the learner on 2026-09-29, with the manual verification checklist explicitly non-blocking for the initial working MVP. Review format: Markdown only. Proceed to the PRD interview within these boundaries. Implementation must wait until both the PRD and technical specification have been reviewed and approved.
