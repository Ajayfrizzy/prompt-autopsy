import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

// JSON Schema measures Unicode code points; JavaScript/Zod max() measures UTF-16
// units. Publish the correct bound and enforce it in the separate validation pass.
const text = (maximum: number) => z.string().min(1).meta({ maxLength: maximum });
const key = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,63}$/);
const messageId = z.string().regex(/^M(?:00[1-9]|0[1-9]\d|[1-9]\d{2,})$/).max(64);
const ruleId = z.string().regex(/^R(?:00[1-9]|0[1-9]\d|[1-9]\d{2,})$/).max(64);
const applicationId = z.uuid();
const occurrence = z.number().int().min(1).max(16_384);
const messageEvidence = z.strictObject({ messageId, quote: text(600), occurrence });
const ruleEvidence = z.strictObject({ ruleId, quote: text(600), occurrence });
const observation = z.strictObject({ text: text(400), evidence: z.array(messageEvidence).min(1).max(2) });
const findingKeys = z.array(key).min(1).max(4);

export const analysisWireSchema = z.strictObject({
  summary: text(600),
  coverage: z.strictObject({ status: z.enum(["within_capacity", "limited"]), reason: text(300).nullable() }),
  findings: z.array(z.strictObject({
    key, title: text(120), evidenceState: z.enum(["supported", "insufficient"]),
    observations: z.array(observation).max(3), documentedRequirement: observation.nullable(),
    hypotheses: z.array(z.strictObject({ text: text(400), supportingEvidence: z.array(messageEvidence).max(2), limitation: text(400) })).max(2),
    missingEvidence: z.array(text(240)).max(3),
    comparisons: z.array(z.strictObject({ relation: z.enum(["equivalent", "possible_conflict", "related", "no_relevant_rule"]), rules: z.array(ruleEvidence).max(2), reasoning: text(400) })).max(3),
    recommendation: z.enum(["add", "edit", "no_change", "needs_evidence"]), rationale: text(400), proposalKey: key.nullable(),
  })).min(1).max(4),
  timeline: z.array(z.strictObject({ kind: z.enum(["requirement", "decision", "change", "failure", "correction"]), description: text(200), interpretation: z.enum(["observed", "hypothesis"]), evidence: z.array(messageEvidence).min(1).max(2), findingKeys })).max(8),
  proposals: z.array(z.strictObject({
    key, findingKeys, rationale: text(400), operation: z.enum(["insert", "replace"]),
    target: z.strictObject({ ruleId: ruleId.nullable(), quote: text(1_200).nullable(), occurrence: occurrence.nullable(), placement: z.enum(["before", "after", "end_of_file", "replace"]) }),
    replacementText: text(1_200),
  })).max(4),
  proposalRelations: z.array(z.strictObject({ leftProposalKey: key, rightProposalKey: key, relation: z.enum(["possible_duplicate", "possible_conflict"]), reasoning: text(400) })).max(6),
  limitations: z.array(text(300)).max(4),
});

export const semanticRecheckWireSchema = z.strictObject({
  status: z.enum(["no_issue", "possible_duplicate", "possible_conflict", "uncertain"]),
  comparisons: z.array(z.strictObject({ relation: z.enum(["possible_duplicate", "possible_conflict"]), ruleIds: z.array(ruleId).max(4), proposalIds: z.array(applicationId).max(4), reasoning: text(300) })).max(8),
  reasoning: text(500), limitations: z.array(text(240)).max(3),
});

export const analysisTextFormat = zodTextFormat(analysisWireSchema, "prompt_autopsy_analysis");
export const semanticRecheckTextFormat = zodTextFormat(semanticRecheckWireSchema, "prompt_autopsy_semantic_recheck");
export type AnalysisWire = z.infer<typeof analysisWireSchema>;
export type SemanticRecheckWire = z.infer<typeof semanticRecheckWireSchema>;

type JsonSchema = { maxLength?: number; properties?: Record<string, JsonSchema>; items?: JsonSchema; anyOf?: JsonSchema[] };
function checkCodePoints(value: unknown, schema: JsonSchema): void {
  if (typeof value === "string" && schema.maxLength !== undefined && [...value].length > schema.maxLength) throw new Error("Structured output exceeds a text limit");
  if (schema.anyOf) for (const branch of schema.anyOf) checkCodePoints(value, branch);
  if (Array.isArray(value) && schema.items) for (const item of value) checkCodePoints(item, schema.items);
  else if (value !== null && typeof value === "object" && schema.properties) for (const [name, child] of Object.entries(schema.properties)) checkCodePoints((value as Record<string, unknown>)[name], child);
}
export function validateWireShape(operation: 'investigate' | 'recheck', value: unknown): void {
  const schema = operation === 'investigate' ? analysisWireSchema : semanticRecheckWireSchema;
  const format = operation === 'investigate' ? analysisTextFormat : semanticRecheckTextFormat;
  const parsed = schema.parse(value);
  checkCodePoints(parsed, format.schema as JsonSchema);
}
function requireCondition(condition: boolean, message: string): asserts condition { if (!condition) throw new Error(message); }
function unique(values: string[]): boolean { return new Set(values).size === values.length; }

/** Structural/quantitative and intra-response checks; source citation and edit
 * anchoring against the reviewed snapshot MUST run separately before acceptance. */
export function parseAnalysisWire(value: unknown): AnalysisWire {
  const result = analysisWireSchema.parse(value);
  checkCodePoints(result, analysisTextFormat.schema as JsonSchema);
  requireCondition(result.coverage.status !== "limited" || result.coverage.reason !== null, "Limited coverage requires a reason");
  const findings = new Map(result.findings.map((finding) => [finding.key, finding]));
  const proposals = new Map(result.proposals.map((proposal) => [proposal.key, proposal]));
  requireCondition(findings.size === result.findings.length && proposals.size === result.proposals.length, "Duplicate temporary key");
  for (const finding of result.findings) {
    requireCondition(finding.evidenceState !== "supported" || finding.observations.length > 0, "Supported finding needs an observation");
    requireCondition(finding.evidenceState !== "insufficient" || (finding.missingEvidence.length > 0 && finding.proposalKey === null && ["needs_evidence", "no_change"].includes(finding.recommendation)), "Insufficient finding cannot propose a correction");
    const changesRules = finding.recommendation === "add" || finding.recommendation === "edit";
    requireCondition(changesRules ? finding.proposalKey !== null && proposals.has(finding.proposalKey) : finding.proposalKey === null, "Invalid finding proposal reference");
    for (const comparison of finding.comparisons) requireCondition((comparison.relation === "no_relevant_rule") === (comparison.rules.length === 0), "Rule comparison requires matching references");
  }
  for (const item of [...result.timeline, ...result.proposals]) requireCondition(unique(item.findingKeys) && item.findingKeys.every((id) => findings.has(id)), "Invalid finding keys");
  for (const proposal of result.proposals) {
    requireCondition(proposal.findingKeys.every((id) => findings.get(id)?.proposalKey === proposal.key), "Proposal and finding references disagree");
    requireCondition(result.findings.filter((finding) => finding.proposalKey === proposal.key).every((finding) => proposal.findingKeys.includes(finding.key)), "Proposal omits associated finding");
    requireCondition(new TextEncoder().encode(proposal.replacementText).length <= 4_096, "Replacement exceeds byte limit");
    const target = proposal.target;
    if (proposal.operation === "replace") requireCondition(target.placement === "replace" && target.ruleId !== null && target.quote !== null && target.occurrence !== null, "Replacement needs an exact target");
    else if (target.placement === "end_of_file") requireCondition(target.ruleId === null && target.quote === null && target.occurrence === null, "End-of-file insertion has no passage target");
    else requireCondition(["before", "after"].includes(target.placement) && target.ruleId !== null && target.quote === null && target.occurrence === null, "Insertion needs a passage boundary");
  }
  const pairs = new Set<string>();
  for (const relation of result.proposalRelations) {
    const pair = [relation.leftProposalKey, relation.rightProposalKey].sort().join(":");
    requireCondition(relation.leftProposalKey !== relation.rightProposalKey && proposals.has(relation.leftProposalKey) && proposals.has(relation.rightProposalKey) && !pairs.has(pair), "Invalid proposal relation pair");
    pairs.add(pair);
  }
  return result;
}

export function parseSemanticRecheckWire(value: unknown, context: { ruleIds: readonly string[]; proposalIds: readonly string[] }): SemanticRecheckWire {
  const result = semanticRecheckWireSchema.parse(value);
  checkCodePoints(result, semanticRecheckTextFormat.schema as JsonSchema);
  for (const comparison of result.comparisons) {
    requireCondition(comparison.ruleIds.length + comparison.proposalIds.length > 0, "Comparison needs a target");
    requireCondition(unique(comparison.ruleIds) && unique(comparison.proposalIds) && comparison.ruleIds.every((id) => context.ruleIds.includes(id)) && comparison.proposalIds.every((id) => context.proposalIds.includes(id)), "Unknown or duplicated comparison reference");
  }
  if (result.status === "no_issue") requireCondition(result.comparisons.length === 0, "No-issue result cannot contain issues");
  if (result.status === "possible_duplicate" || result.status === "possible_conflict") requireCondition(result.comparisons.some((comparison) => comparison.relation === result.status), "Issue status needs matching comparison");
  requireCondition(result.status !== "possible_duplicate" || !result.comparisons.some((comparison) => comparison.relation === "possible_conflict"), "Conflict takes precedence over duplicate");
  return result;
}
