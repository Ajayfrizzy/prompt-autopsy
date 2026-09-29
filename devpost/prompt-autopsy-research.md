# Prompt Autopsy: focused competitive check

Reviewed 2026-09-29. Public documentation and a paper abstract, not hands-on product tests or an exhaustive search. No novelty or market-demand claim is established.

| Related work | Documented overlap | Implication |
|---|---|---|
| [Claude-Mem](https://docs.claude-mem.ai/) | Captures coding-session observations, semantic summaries, searchable history, observation-ID citations and automatically generated folder CLAUDE.md files with activity timelines | Memory, timelines, citations and instruction-file generation are already overlapping capabilities. None alone distinguishes Prompt Autopsy. The introduction reviewed does not establish a developer-approved failure-to-rule diff workflow or historical-rule contradiction checking; absence from this page is not evidence of absence from the product. |
| [Agentic Context Engineering (ACE)](https://arxiv.org/abs/2510.04618) | Research framework using generation, reflection and curation to incrementally improve contextual playbooks from feedback | Learning instructions from failures is established research territory. The reviewed abstract does not establish this specific interactive investigation workflow. Paper performance claims are not results for our product. |
| [Promptfoo](https://www.promptfoo.dev/docs/intro/) | Test cases, prompt comparisons, assertions, model evaluations and a results viewer | Before-and-after prompt evaluation is established. Building a competing execution/evaluation system would expand scope unnecessarily. |
| General-purpose assistant with a detailed prompt | Candidate baseline, not tested for Prompt Autopsy | Could already diagnose transcripts and suggest instruction changes. Dedicated-app advantage must be assessed through traceability, review effort, duplicate/conflict handling and export correctness, not assumed superior reasoning. |

Candidate distinction: a compact, developer-controlled investigation connecting an observed failure to exact transcript evidence, comparing a proposed minimal correction with the supplied historical rules, allowing no change, and separating approval from manual test evidence. This is a proposed workflow distinction, not proof that no tool offers it.

Important limits: a transcript is evidence of recorded events, not privileged access to why a model acted. A rule supplied today does not prove it was active during the failed session. Presence in a supplied historical file does not establish that the agent loaded or obeyed it. Missing evidence should remain visible. Repeated failure requires multiple cited occurrences; one incident is sufficient for an investigation but not a repetition claim.

Independent checks before claiming product value: use anonymized own sessions and labelled fictional controls; include an already-covered requirement, ambiguous requirement, contradictory proposal, insufficient evidence and no-change case. Compare the same inputs with a general-purpose assistant. Review grounding, unnecessary rule additions and export fidelity. The earlier print-shop baseline is a methodological precedent, not a benchmark result for Prompt Autopsy.
