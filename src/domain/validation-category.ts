// Codes and location fields are the only domain diagnostics that may be logged.
export const DOMAIN_VALIDATION_CODES = [
  "COVERAGE_REASON_REQUIRED",
  "EDIT_ANCHOR_INVALID",
  "EDIT_BOUNDARY_INVALID",
  "EDIT_RULE_REFERENCE_INVALID",
  "EVIDENCE_OCCURRENCE_INVALID",
  "EVIDENCE_QUOTE_MISMATCH",
  "INSUFFICIENT_FINDING_INVALID_RECOMMENDATION",
  "NO_OP_EDIT",
  "PROPOSAL_REFERENCE_INVALID",
  "REPLACEMENT_LIMIT_INVALID",
  "REVIEW_DECISION_INVALID",
  "RULE_COMPARISON_REFERENCE_MISMATCH",
  "SEMANTIC_CONFLICT_PRECEDENCE",
  "SEMANTIC_NO_ISSUE_HAS_COMPARISONS",
  "SEMANTIC_REFERENCE_INVALID",
  "SEMANTIC_RESPONSE_STALE",
  "SEMANTIC_STATUS_MISMATCH",
  "SEMANTIC_TARGET_REQUIRED",
  "STRUCTURED_TEXT_LIMIT",
  "SUPPORTED_FINDING_MISSING_OBSERVATION",
  "UNKNOWN_MESSAGE_REFERENCE",
  "UNKNOWN_RULE_REFERENCE",
] as const;
export type DomainValidationCode = (typeof DOMAIN_VALIDATION_CODES)[number];
export type DomainLocation = {
  domainArea:
    | "analysis"
    | "coverage"
    | "finding"
    | "finding.comparison"
    | "proposal"
    | "timeline"
    | "proposal.relation"
    | "semantic"
    | "semantic.comparison";
  findingIndex?: number;
  comparisonIndex?: number;
  proposalIndex?: number;
  timelineIndex?: number;
  relationIndex?: number;
};
export class DomainValidationError extends Error {
  constructor(
    public readonly code: DomainValidationCode,
    message: string,
    public location?: DomainLocation,
  ) {
    super(message);
  }
}
export function withDomainLocation<T>(
  location: DomainLocation,
  run: () => T,
): T {
  try {
    return run();
  } catch (error) {
    if (error instanceof DomainValidationError && !error.location)
      error.location = location;
    throw error;
  }
}
export function domainValidationCategory(error: unknown): string {
  return error instanceof DomainValidationError &&
    DOMAIN_VALIDATION_CODES.includes(error.code)
    ? error.code
    : "OTHER_DOMAIN_VALIDATION";
}
export function domainValidationLocation(
  error: unknown,
): Partial<DomainLocation> {
  if (!(error instanceof DomainValidationError) || !error.location) return {};
  const l = error.location;
  if (
    ![
      "analysis",
      "coverage",
      "finding",
      "finding.comparison",
      "proposal",
      "timeline",
      "proposal.relation",
      "semantic",
      "semantic.comparison",
    ].includes(l.domainArea)
  )
    return {};
  const safe: Partial<DomainLocation> = { domainArea: l.domainArea };
  for (const key of [
    "findingIndex",
    "comparisonIndex",
    "proposalIndex",
    "timelineIndex",
    "relationIndex",
  ] as const) {
    const v = l[key];
    if (typeof v === "number" && Number.isSafeInteger(v) && v >= 0)
      safe[key] = v;
  }
  return safe;
}
