# Prompt Autopsy — Bounded Provider and Runtime Contract

Approved supplement to [spec.md](spec.md), based on the approved product boundaries. The learner retained these bounded contracts and the Node baseline for the final draft; they are not a claim of successful model evaluation. Foundation dependencies are now installed and committed; TypeScript, schema tests and production build passed under Node 24.21.0. No model/count calls have been made. See checklist.md for execution evidence.

## Runtime Compatibility Baseline

Public package metadata and the published OpenAI SDK source were inspected on 2026-09-29. Selected starting baseline (first-build peer verification remains required):

| Component | Version | Compatibility evidence |
|---|---|---|
| Node.js | 24.21.0 LTS | Official Node release index; satisfies the engine ranges below. |
| Next.js | 16.3.7 | Requires Node >=20.9; accepts React 19. |
| React / React DOM | 19.3.0 | Both exact releases installed; React/Next production build passed. |
| TypeScript | 7.0.2 | Published metadata requires Node >=16.20; actual Next compilation still needs a build check. |
| OpenAI JS SDK | 7.25.0 | Requires Node >=22; supports Zod ^3.25 or ^4.0. |
| Zod | 4.6.5 | Compatible with the SDK's declared Zod 4 range. |
| Tailwind CSS | 4.3.3 | Matching @tailwindcss/postcss 4.3.3 installed; CSS production build passed. |
| Vitest | 5.0.2 | Supports Node ^22.12, ^24 or >=26; use compatible Vite peer. |
| React Testing Library | 16.3.3 | Supports React/React DOM 18 or 19; requires Testing Library DOM ^10. |
| jsdom | 30.1.1 | Requires Node ^22.22.2, ^24.15 or >=26; chosen Node qualifies. |
| diff (jsdiff) | 9.0.0 | Supports the chosen Node baseline; use line diff only, not patch authority. |

Sources: [Node release index](https://nodejs.org/dist/index.json), [Next metadata](https://registry.npmjs.org/next/latest), [React metadata](https://registry.npmjs.org/react/latest), [OpenAI metadata](https://registry.npmjs.org/openai/latest), [Zod metadata](https://registry.npmjs.org/zod/latest), [TypeScript metadata](https://registry.npmjs.org/typescript/latest), [Tailwind metadata](https://registry.npmjs.org/tailwindcss/latest), [Vitest metadata](https://registry.npmjs.org/vitest/latest), [RTL metadata](https://registry.npmjs.org/@testing-library/react/latest), [jsdom metadata](https://registry.npmjs.org/jsdom/latest), [diff metadata](https://registry.npmjs.org/diff/latest). These URLs change; the table records the versions returned on the research date.

Use Next's Node runtime for both handlers, not Edge. Keep OpenAI imports behind a server-only module; secrets stay out of public environment variables and client bundles. Use npm with exact direct dependency pins and a committed lockfile during the authorized build. Select Lucide and any shadcn component dependencies compatibly then; shadcn is copied UI component source, not a separate runtime service. No automatic upgrade to newer major versions during implementation.

Metadata inspection was followed by an actual successful first-build compatibility check, as recorded in checklist.md. After approval, the first setup check must install, typecheck, build and run fixed-schema tests without live provider calls. Resolve peer mismatches rather than using force/legacy-peer-deps. No Docker or separate backend is needed. Local startup remains `npm ci`, configure server-only `OPENAI_API_KEY`, then `npm run dev`; these are planned commands, not existing scripts.

## SDK and Schema Compatibility

Read-only inspection of the published [openai 7.25.0 source archive](https://registry.npmjs.org/openai/-/openai-7.25.0.tgz) confirmed the input-token counting resource, Responses parsing API, `zodTextFormat`, reasoning configuration and generation prompt-cache options. This verifies API surface, not account access or server acceptance.

Use one strict Zod wire schema per operation and `zodTextFormat` to produce the exact Structured Output format. Derive count and generation from the same canonical context and same schema artifact. Define all object keys as required; represent absent values using explicit null. Use an object root, `additionalProperties: false` on every object, enums, bounded strings/arrays and nullable nested objects. Do not use root discriminated unions or unsupported JSON Schema conditional keywords.

The [Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs) supports these constraints for the selected base model; fine-tuned-model restrictions are not assumed applicable. It documents required keys, a maximum of 10 nesting levels/5,000 object properties, and unsupported composition keywords including `if/then/else` and `allOf`. Keep well below these limits. Zod transforms/refinements for relationships and exact citations belong in a separate application validation pass, not the schema sent to OpenAI.

## Bounded Initial Analysis

Use the fields in technical-contracts.md with the following maxima. Text lengths here are Unicode code points, not bytes or tokens. Revalidate consistently in application code; UTF-8 request limits remain separate.

| Field | Bound |
|---|---|
| Summary | 1–600 characters |
| Findings | 1–4 |
| Finding title | 1–120 characters |
| Observations per finding | 0–3; supported finding requires at least 1 |
| Observation text / documented requirement text | 1–400 characters |
| Source references per observation, requirement or hypothesis | 0–2 for hypothesis; 1–2 for observation/requirement |
| Exact message/rule quote | 1–600 characters |
| Quote occurrence | Integer 1–16,384; actual occurrence must exist |
| Hypotheses per finding | 0–2; each text/limitation 1–400 characters |
| Missing-evidence entries per finding | 0–3; each 1–240 characters |
| Rule comparisons per finding | 0–3; each cites at most 2 rules |
| Comparison reasoning / finding rationale | 1–400 characters |
| Timeline events | 0–8; description 1–200 characters, 1–2 evidence references |
| Proposed edits | 0–4; at most one per finding, a proposal may link multiple findings |
| Replacement text | 1–1,200 characters and at most 4,096 UTF-8 bytes |
| Proposal rationale | 1–400 characters |
| Edit target quote | 1–1,200 characters when required, otherwise null |
| Proposal relations | 0–6 unique unordered pairs, no self-pairs |
| Relation reasoning | 1–400 characters |
| Global limitations | 0–4; each 1–300 characters |
| Provider temporary keys / application reference IDs | 1–64 ASCII characters using documented ID patterns |
| Finding-key references in one list | 1–4 unique existing keys |

Add required `coverage: { status: "within_capacity" | "limited", reason: string | null }` to the analysis wire schema. A limited response requires a nonempty reason (maximum 300 characters), displays that coverage is limited and adds it to the report. Ask the model to identify capacity overflow rather than present four findings as an exhaustive investigation. This does not prove the model found everything. Missing transcript evidence still uses the existing insufficient-evidence outcome, not a fabricated observation. No automatic pagination, second analysis call or silent source truncation.

These maxima are validation ceilings, not a request to fill every list. Prompt for short findings and short exact quotes; prefer a few supported findings to repeated descriptions. The full Cartesian maximum can exceed the 5,500 generated-token budget, particularly with reasoning. `max_output_tokens` remains the hard provider cap; incomplete output fails as a whole, without salvaged findings or hidden repair calls. Only later controlled evaluation can establish output-completion rates.

## Bounded Targeted Recheck

Keep the selected structured shape: status, comparisons, reasoning and limitations. Each comparison has relation, rule IDs, proposal IDs and reasoning; it never has replacement text or decision/export fields.

- Status is exactly `no_issue`, `possible_duplicate`, `possible_conflict` or `uncertain`.
- Up to 8 comparisons; each has up to 4 rule IDs and 4 proposal IDs, and at least one target reference. IDs must occur in the supplied complete context.
- Each comparison reasoning is 1–300 characters; overall reasoning is 1–500 characters.
- Up to 3 limitations of 1–240 characters each.
- `no_issue` requires no issue comparisons. Issue statuses require a matching comparison. If duplicate and conflict relations both occur, use `possible_conflict` and retain both kinds of comparison.
- If the model cannot express all necessary comparisons within the output bounds, it must return `uncertain` with the limitation; never turn capacity overflow into `no_issue`. An uncertain result may retain valid comparisons but cannot satisfy approval eligibility.

Always send the entire reviewed rules file and coexisting approved proposals. Output bounds do not authorize omission of comparison input. The 2,000 generated-token cap includes reasoning and may still yield incomplete output; handle it as Semantic review pending. The provider must not rewrite the proposal.

## Validation Order and Failure Contract

1. Enforce local/server request-byte and field bounds, consent/version binding and the session reservation.
2. Construct immutable canonical context using server-fixed configuration and the generated strict schema. The exact serialized schema contributes to counted input.
3. Count after consent. Apply the approved margin; no generation on count failure or oversized context. Counting is unbilled preprocessing; generation dispatch remains gated by admission and consent.
4. Generate once with no hidden retries. Check provider status/refusal/incomplete state before trusting parsed output.
5. Apply strict structural and quantitative validation, then cross-field rules, uniqueness, citation/quote resolution, edit anchoring and relation references.
6. Return validated application records plus trusted usage separately. Settle billed usage even when interpretation/output validation fails or the response becomes stale. Never derive usage from model-generated JSON.

Reject an invalid analysis atomically with `INVALID_ANALYSIS`; reject a bad recheck as pending with `INVALID_SEMANTIC_REVIEW`. Do not delete offending findings, shorten quotes, drop comparisons or adjust text to make output pass. Preserve reviewed inputs/current edits. Explicit retries must fit the ledger. Technical validity establishes format and source identity, not the truth of a diagnosis.

Timeouts: count 20 seconds, generation 120 seconds, overall server request 150 seconds, browser transport 160 seconds. Use abort signals and `maxRetries: 0`; a timeout is not proof of non-billing. These are local/demo runtime targets, not a claim about Vercel's plan-specific duration limits. Optional deployment must verify those limits before public use; do not introduce background execution to bypass them.

## Verification Planned for the Authorized Build

Pure tests will generate the wire JSON Schemas from Zod and check object roots, required keys, forbidden extras, nullable fields, property/depth bounds and the absence of unsupported refinements. Test every list/text boundary and one-unit overflow, unknown/duplicate IDs, relation consistency and exact evidence anchors. Test initial/recheck refusal and incomplete output without salvaging partial JSON.

Verify count/generation context identity with fixed payloads and mocked SDK calls, including the schema, reasoning and no-tools configuration. No real provider call is needed for those tests. Confirm compatible npm resolution and TypeScript build before any live provider evaluation. Prompt/schema overhead allocations are design ceilings, not measured token counts; count the actual final artifact only after billing verification and explicit authorization for live evaluation.
