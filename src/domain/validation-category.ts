// Only fixed internal messages map to public diagnostic categories. Never return
// arbitrary exception text, rejected values, quotes, or source identifiers.
const categories = new Map<string, string>([
  ["Unknown or retired message reference", "UNKNOWN_MESSAGE_REFERENCE"],
  ["Exact reviewed quote was not found", "EVIDENCE_QUOTE_MISMATCH"],
  ["Invalid quote occurrence", "EVIDENCE_QUOTE_MISMATCH"],
  ["Unknown rule reference", "UNKNOWN_RULE_REFERENCE"],
  ["Unknown edit rule", "EDIT_RULE_REFERENCE_INVALID"],
  ...[
    "Missing replacement anchor",
    "Edit anchor no longer matches reviewed rules",
    "Invalid edit boundary",
    "Edit splits a Unicode character or CRLF",
    "Replacement needs an exact target",
    "End-of-file insertion has no passage target",
    "Insertion needs a passage boundary",
  ].map((message) => [message, "EDIT_ANCHOR_INVALID"] as [string, string]),
  ...[
    "Unknown finding",
    "Unknown proposal",
    "Unknown relation proposal",
    "Duplicate temporary key",
    "Invalid finding proposal reference",
    "Invalid finding keys",
    "Proposal and finding references disagree",
    "Proposal omits associated finding",
    "Invalid proposal relation pair",
  ].map(
    (message) => [message, "PROPOSAL_REFERENCE_INVALID"] as [string, string],
  ),
]);
export function domainValidationCategory(error: unknown): string {
  return error instanceof Error
    ? (categories.get(error.message) ?? "OTHER_DOMAIN_VALIDATION")
    : "OTHER_DOMAIN_VALIDATION";
}
