# Offline provider/domain contract audit

Completed without live OpenAI calls. The previous `OTHER_DOMAIN_VALIDATION` log cannot establish which invariant failed: missing coverage reasons, supported findings without observations, invalid insufficient findings, comparison/reference inconsistencies, replacement limits, and no-op edits were all previously unmapped candidates.

## Structural guarantees

The Zod-backed Structured Output schema now encodes:

- Limited coverage requires a non-null, non-empty reason.
- Supported findings require observations.
- Insufficient findings require missing evidence, no proposal key, and only no-change/needs-evidence recommendations.
- Supported add/edit recommendations require a proposal key; no-change/needs-evidence require null.
- No-relevant-rule comparisons contain zero references; other comparisons contain at least one.
- Semantic comparisons have at least one rule or peer proposal target.
- The previously added legal replacement/before/after/end-of-file variants remain enforced.

Insufficient findings cannot be associated with proposals through the deterministic bidirectional key checks. Existence and reciprocity of these keys cannot be guaranteed just by static field schemas.

The semantic response retains its flat object shape. No-issue/comparison consistency, status matching, and conflict precedence remain explicit typed deterministic checks: expressing that coupling would require changing the root layout or using root unions/conditionals outside the currently supported schema contract. No opaque fallback remains for these known cases.

## Strict deterministic checks

Exact source IDs, exact quotes and occurrence availability, rule existence, edit boundaries (including Unicode and CRLF), unchanged anchors, no-op replacement rejection, UTF-8 byte limits, graph/key consistency and semantic context freshness remain enforced. No fuzzy matching, repair, retries, model changes, budget increases, or acceptance of partial findings were introduced.

Schemas have additional branch overhead; the existing consented count of the canonical context and unchanged token admission caps still apply. No actual token overhead or model compliance has been measured offline.

## Safe codes

All codes originate in `DomainValidationError`, not exception-message matching. Unknown errors retain `OTHER_DOMAIN_VALIDATION`. Development logging includes only allowlisted code, fixed area and non-negative integer indexes, alongside the existing safe provider metadata.

- `COVERAGE_REASON_REQUIRED`
- `SUPPORTED_FINDING_MISSING_OBSERVATION`
- `INSUFFICIENT_FINDING_INVALID_RECOMMENDATION`
- `RULE_COMPARISON_REFERENCE_MISMATCH`
- `UNKNOWN_MESSAGE_REFERENCE`
- `EVIDENCE_OCCURRENCE_INVALID`
- `EVIDENCE_QUOTE_MISMATCH`
- `UNKNOWN_RULE_REFERENCE`
- `PROPOSAL_REFERENCE_INVALID`
- `EDIT_RULE_REFERENCE_INVALID`
- `EDIT_ANCHOR_INVALID`
- `EDIT_BOUNDARY_INVALID`
- `REPLACEMENT_LIMIT_INVALID`
- `NO_OP_EDIT`
- `STRUCTURED_TEXT_LIMIT`
- `SEMANTIC_TARGET_REQUIRED`
- `SEMANTIC_REFERENCE_INVALID`
- `SEMANTIC_NO_ISSUE_HAS_COMPARISONS`
- `SEMANTIC_STATUS_MISMATCH`
- `SEMANTIC_CONFLICT_PRECEDENCE`
- `SEMANTIC_RESPONSE_STALE`
- `REVIEW_DECISION_INVALID` (shared developer-decision assertions)

Schema violations still surface as `PROVIDER_SCHEMA_INVALID` with sanitized Zod paths/codes. Typed codes above cover the deterministic defenses, including direct offline tests of defenses that the stricter schema now prevents ordinary wire responses from reaching.

## Verification

203 offline tests across 17 files passed, as did TypeScript and the production webpack build under Node 24.21.0. The runtime's npm launcher was unavailable; the installed project binaries were invoked directly under that Node version.

The audit adds controlled failing cases for every registered code, structural rejection cases, valid investigation/add/recheck paths, citation/anchor checks, safe location/logging checks, and a registry coverage test requiring a failing fixture for every new code. A source guard checks the audited validators do not throw raw `Error` instances. Existing tests still verify schema generation, bounded output and fail-closed usage settlement.

These are authored fixtures, not live-model results. The next live-provider invocation belongs to the developer.
