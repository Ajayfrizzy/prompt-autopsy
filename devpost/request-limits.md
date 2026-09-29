# Prompt Autopsy — Request Limits

Normative limits of the approved [specification](spec.md). Counting is unbilled preprocessing per the learner's authoritative clarification at final approval; generation remains billed normally. No billing experiment was performed. All limits, consent and fail-closed rules remain unchanged.

## Exact Limits

Bytes mean UTF-8 bytes, not JavaScript string length. KiB means 1,024 bytes. Every applicable gate must pass; being within a file's byte cap does not guarantee token-budget acceptance.

| Limit | Initial analysis | Targeted semantic recheck |
|---|---:|---:|
| Total input admission cap, including prompt/schema and safety allowance | 35,000 tokens | 6,000 tokens |
| Total generated-token cap, including reasoning | 5,500 | 2,000 |
| Reasoning effort | low | low |
| Planning allocation within input cap for fixed prompt + JSON Schema + framing | 5,000 tokens | 1,500 tokens |
| Maximum HTTP JSON request body | 262,144 bytes (256 KiB) | 65,536 bytes (64 KiB) |
| Maximum generated-token reservation at recorded standard rates | USD 0.110 | USD 0.040 |
| Maximum combined token reservation | USD 0.250 | USD 0.064 |

The fixed-overhead allocations are included in total input caps, never additional. They are build-time ceilings to check against the actual shipped prompt/schema, not measurements already performed. If the bounded analysis schema cannot fit its allocation, simplify the contract or revisit the allocation explicitly while retaining the total cap. Do not assume JSON Schema consumes zero tokens.

Local source limits:

| Content | Maximum |
|---|---:|
| Raw transcript upload/paste, including structural markers | 131,072 UTF-8 bytes (128 KiB) |
| Reviewed transcript, sum of surviving decoded message bodies | 98,304 UTF-8 bytes (96 KiB) |
| Messages | 200 |
| Individual reviewed message body | 16,384 UTF-8 bytes (16 KiB) |
| Historical rules upload and reviewed rules text, each | 16,384 UTF-8 bytes (16 KiB) |
| Incident description | 2,048 UTF-8 bytes (2 KiB) |
| Current proposal replacement text | 4,096 UTF-8 bytes (4 KiB) |
| Evidence added to one recheck, total quoted text | 2,048 UTF-8 bytes (2 KiB) |

These are the product-supported maxima, not model context-window limits. They cover manually prepared excerpts and deliberately keep individual instructions short. Full rules and peer proposals still have to fit the recheck token gate; an investigation can fit initial analysis yet have an edited proposal whose complete recheck context is too large. Explain this limitation before starting a paid recheck. Never remove peers or rules to make it fit. Necessary evidence exceeding its own cap must cause a visible failure, not silent truncation.

The HTTP byte gate applies to the actual encoded JSON body, including escaping and metadata. A source within its individual cap can still exceed the combined request-body cap. Enforce a running read limit server-side before JSON parsing; Content-Length is an early hint, not trusted enforcement. Reject unsupported content encodings so decompression cannot bypass the limit. The server reconstructs a single canonical model payload from validated fields; avoid transmitting the rules twice as both full text and copied passage strings. Supply passage IDs/ranges with the one exact file representation.

## Reasoning and Output Tradeoff

Use explicit `reasoning: { effort: "low" }` for both operations initially. Official model documentation supports low as well as medium and higher settings. Low gives the limited generated-token budget more room for complete structured output; it is not a measured quality guarantee. Medium/default could consume more of the same cap on reasoning and return incomplete JSON. If later controlled live tests show inadequate interpretation or incomplete output, revisit the schema/settings within the approved budget rather than silently raise limits or retry. All such live tests remain future work.

The 5,500/2,000 generated-token caps include reasoning and visible JSON together. There is no guaranteed minimum number of visible tokens. Treat provider incomplete output, refusal or invalid schema as failed output; do not approve partially parsed findings. Disable automatic SDK generation retries.

## Conservative Counting — Conditionally Approved

### What the Documentation Establishes

Official OpenAI documentation fetched on 2026-09-29 documents `POST /v1/responses/input_tokens`, returning `input_tokens`. Its request supports model, input, instructions, reasoning and `text.format`, including JSON Schema. This offers provider-side counting of the request context without generating an investigation result. The model page confirms USD 4/M input, USD 20/M output and the supported reasoning settings. The Responses reference says the generation cap includes reasoning.

Sources:

- [Input token count endpoint](https://developers.openai.com/api/reference/resources/responses/subresources/input_tokens/methods/count)
- [GPT-5.6 Sol model and pricing](https://developers.openai.com/api/docs/models/gpt-5.6-sol)
- [Responses create configuration](https://developers.openai.com/api/reference/resources/responses/methods/create)

The endpoint reference establishes request/response behaviour; the learner's authoritative clarification resolves counting as unbilled preprocessing. General API privacy disclosure remains unchanged; endpoint-specific application-state retention is not asserted.

### Approved Admission Sequence

1. Browser validates UTF-8 bytes, transcript grammar, message count, individual fields, reviewed rules, encoded request-body estimate and current consent state.
2. No provider request occurs during Import or Privacy Review.
3. After explicit consent to the reviewed snapshot, the server validates the request and constructs the exact canonical model context for generation.
4. Send that context to `POST /v1/responses/input_tokens`.
5. Validate `input_tokens` as a finite nonnegative integer and apply the approved margin below.
6. If admission passes, generate with the same context/configuration. Do not add hidden prompt text after counting.
7. If admission fails, return an actionable oversized-input result without starting generation; retain the reviewed investigation.

The count is the final token gate. Local byte/shape checks remain mandatory early rejection and server-protection gates, not substitutes for provider counting. The sequence applies to initial analysis, targeted semantic rechecks and explicit retries within the existing stateless handlers.

### Payload Identity and Margin

The counted and generated contexts must use the same model, system/developer instructions, reviewed input, JSON/Structured Output schema, reasoning configuration, tools configuration and all other token-bearing context. Build one immutable canonical context and derive endpoint-specific request envelopes from it. Transport differences must not introduce token-bearing differences. If anything token-bearing changes, recount before generation. Bind count and generation to the same snapshot/request identity; never generate from a count for an obsolete context.

```text
margin = max(256, ceil(N * 0.05))
admissionTokens = N + margin
require admissionTokens <= operationInputCap
```

Retain this formula unless implementation verification supplies a concrete reason to revise it. The allowance is conservative headroom, not a mathematical guarantee about provider internals. With the selected caps, initial requests pass at N <= 33,333 and rechecks at N <= 5,714. Fixed prompt/schema overhead is part of the counted context, not an extra uncounted allowance. Never automatically fall back to characters/4, another rough estimate or a local tokenizer when provider counting fails.

### Consent Disclosure

Use wording such as:

> After you consent, Prompt Autopsy sends the reviewed content to OpenAI to verify request size before AI analysis. If the request fits the supported limit, analysis can proceed.

Counting is an external provider transmission, not local validation. One explicit consent covers counting and generation for the same reviewed snapshot and investigation purpose; no separate count-consent ceremony. The targeted-recheck action similarly discloses counting and analysis of its limited reviewed context. Changed reviewed input still requires renewed consent. Preserve the existing distinction between application non-persistence and provider-side handling.

### Counting Billing — Resolved

The learner supplied authoritative clarification: `POST /v1/responses/input_tokens` is an unbilled preprocessing utility, not model inference. Returned input tokens are not charged at the model's input rate. Subsequent Responses generation is billed normally. Source provenance: learner-provided clarification at final specification approval; no live billing experiment or independently supplied support URL.

Counting consumes no monetary ledger. Retain maximum generation reservations of USD 0.250 and USD 0.064 and the USD 0.40 in-session AI-generation ceiling. Release the generation hold when generation demonstrably never started; unknown generation dispatch/billing retains it. Count errors/timeouts still prevent generation and preserve reviewed work.

### Data Handling — Resolved Disclosure

Use this wording for the application:

> After consent, reviewed content may be sent to OpenAI for token counting and AI analysis. OpenAI API data is not used for model training by default. Standard abuse-monitoring controls may retain customer content for up to 30 days. Prompt Autopsy itself does not persist the investigation.

The [general API data policy](https://developers.openai.com/api/docs/guides/your-data), re-read on 2026-09-29, describes abuse monitoring for API feature usage generally and the no-training default unless opted in. It also documents exceptions allowing longer retention; link the policy and do not present 30 days as an absolute maximum. The retention table does not separately enumerate `/v1/responses/input_tokens`. Do not claim endpoint-specific application-state retention, extend generation's `store: false` to counting, or claim ZDR. This known documentation limit does not block the agreed general disclosure.

The [token-counting guide](https://developers.openai.com/api/docs/guides/token-counting), re-read on 2026-09-29, supports counting full Responses context, including instructions, tools and schemas. No generation or count call was made to verify these facts.

### Counting Failures

Counting failure, timeout, invalid count or inability to establish safe admission stops the sequence before generation. Preserve reviewed inputs and current proposal edits; show an actionable error and permit explicit retry only when the known budget policy allows it. A recheck remains Semantic review pending and non-exportable; independent eligible changes are unaffected. Disable automatic counting retries as well as generation retries.

Track count and generation dispatch separately. Counting is unbilled. Release generation reservations only when generation demonstrably never began; if generation dispatch is uncertain, retain its full reservation.

## Rejection Behaviour

1. Browser checks source bytes, strict parsing, message count, per-field caps and encoded request bytes before consent/dispatch. Show actual amount, supported limit and the offending input; keep all text available for manual correction. No network calls during Import or Privacy Review.
2. Normal-session reducer reserves conservative maximum permitted spend before dispatch for generation. Insufficient headroom means no outbound request.
3. Server applies streamed body cap, strict request schema and the same source constraints. Reject client attempts to configure model, prices, reasoning or output limits.
4. Construct the complete canonical prompt/schema/context. Use the approved provider-count sequence, fixed-overhead budget and operation cap. Reject if a safe count cannot be established. This step occurs after consented provider transmission but before generation.
5. For an oversized full analysis, ask the developer to manually prepare a smaller context-preserving excerpt or smaller historical file, review it and consent again. Do not decide which evidence to discard. For an oversized recheck, preserve the edit as Semantic review pending; no rules or peers may be omitted automatically. Independent eligible changes remain exportable.
6. Before generation, use fixed `gpt-5.6-sol`, standard tier, `store: false`, no tools, disabled truncation and the approved caps. Retain the already documented cache configuration requirement to avoid unaccounted cache-write premiums.

No hidden summarization, automatic repair calls, fallback models or increased budgets. Record no generation charge when generation demonstrably never started; uncertain billing retains its conservative reservation.

## Planned Boundary Tests

Test exact byte/token limits and one-unit overflow; multibyte Unicode and escaped JSON; one oversized message; excess message count; rules fitting initial analysis but failing complete-context recheck; schema/prompt changes exceeding overhead allocation; unavailable/invalid provider count with no local fallback; client configuration injection; no network before consent; counted-versus-dispatched payload identity; fees/reservations across explicit retries. These are planned tests, not implemented checks.
