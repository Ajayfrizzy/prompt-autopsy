import { describe, expect, it } from "vitest";
import { analysisTextFormat, analysisWireSchema, parseAnalysisWire, parseSemanticRecheckWire, semanticRecheckTextFormat, type AnalysisWire } from "../../src/server/ai/schemas";

const example = (): AnalysisWire => ({
  summary: "Fictional controlled example: removal affected unrelated items.",
  coverage: { status: "within_capacity", reason: null },
  findings: [{ key: "F1", title: "Operation scope", evidenceState: "supported", observations: [{ text: "The developer reported four items disappearing.", evidence: [{ messageId: "M002", quote: "All four disappeared.", occurrence: 1 }] }], documentedRequirement: null, hypotheses: [], missingEvidence: [], comparisons: [], recommendation: "add", rationale: "Clarify operation scope.", proposalKey: "P1" }],
  timeline: [], proposals: [{ key: "P1", findingKeys: ["F1"], rationale: "Clarify scope.", operation: "insert", target: { ruleId: null, quote: null, occurrence: null, placement: "end_of_file" }, replacementText: "Identify item-level operations before implementing them." }],
  proposalRelations: [], limitations: [],
});
const recheck = () => ({ status: "no_issue", comparisons: [], reasoning: "No issue identified in supplied context.", limitations: [] });
const context = { ruleIds: ["R001"], proposalIds: ["550e8400-e29b-41d4-a716-446655440000"] };

describe("offline Structured Output schemas", () => {
  for (const [name, format] of [["analysis", analysisTextFormat], ["recheck", semanticRecheckTextFormat]] as const) {
    it(`${name} generates a strict bounded object schema without unsupported composition`, () => {
      expect(format.type).toBe("json_schema");
      expect(format.strict).toBe(true);
      expect(format.schema.type).toBe("object");
      let propertyCount = 0;
      function visit(node: Record<string, unknown>, depth: number) {
        expect(depth).toBeLessThanOrEqual(10);
        for (const forbidden of ["allOf", "if", "then", "else", "not", "dependentRequired", "dependentSchemas"]) expect(node).not.toHaveProperty(forbidden);
        if (node.type === "object") {
          expect(node.additionalProperties).toBe(false);
          const properties = node.properties as Record<string, Record<string, unknown>>;
          expect([...(node.required as string[])].sort()).toEqual(Object.keys(properties).sort());
          propertyCount += Object.keys(properties).length;
          for (const child of Object.values(properties)) visit(child, depth + 1);
        }
        if (node.type === "array") {
          expect(node.maxItems).toBeTypeOf("number");
          visit(node.items as Record<string, unknown>, depth + 1);
        }
        if (node.anyOf) for (const child of node.anyOf as Record<string, unknown>[]) visit(child, depth);
      }
      visit(format.schema, 1);
      expect(propertyCount).toBeLessThan(5_000);
    });
  }
  it("accepts explicit nulls and rejects omitted and extra properties", () => {
    expect(parseAnalysisWire(example())).toEqual(example());
    const omitted = { ...example(), coverage: { status: "within_capacity" } };
    expect(() => parseAnalysisWire(omitted)).toThrow();
    expect(() => parseAnalysisWire({ ...example(), approved: true })).toThrow();
    expect(() => parseAnalysisWire({ ...example(), coverage: { status: "within_capacity", reason: null, hidden: true } })).toThrow();
  });
  it("measures astral characters as Unicode code points, and UTF-8 separately", () => {
    const value = example();
    value.summary = "😀".repeat(600);
    expect(() => parseAnalysisWire(value)).not.toThrow();
    value.summary += "😀";
    expect(() => parseAnalysisWire(value)).toThrow();
    value.summary = "Summary";
    value.proposals[0].replacementText = "😀".repeat(1_024);
    expect(() => parseAnalysisWire(value)).not.toThrow();
    value.proposals[0].replacementText += "😀";
    expect(() => parseAnalysisWire(value)).toThrow(/byte limit/);
  });
  it("rejects list overflow and incomplete JSON rather than salvaging", () => {
    expect(() => parseAnalysisWire({ ...example(), findings: [] })).toThrow();
    expect(() => parseAnalysisWire({ ...example(), findings: Array(5).fill(example().findings[0]) })).toThrow();
    expect(() => parseAnalysisWire('{"summary":')).toThrow();
    expect(() => parseAnalysisWire({ ...example(), limitations: Array(5).fill("limitation") })).toThrow();
  });
  it("requires a limitation for limited coverage", () => {
    const value = example();
    value.coverage = { status: "limited", reason: null };
    expect(() => parseAnalysisWire(value)).toThrow();
    value.coverage.reason = "Additional findings exceed supported output capacity.";
    expect(parseAnalysisWire(value).coverage.status).toBe("limited");
  });
  it("keeps unsupported findings from creating corrections", () => {
    const value = example();
    value.findings[0].evidenceState = "insufficient";
    expect(() => parseAnalysisWire(value)).toThrow();
    value.findings[0].missingEvidence = ["Original requirement absent."];
    value.findings[0].recommendation = "needs_evidence";
    value.findings[0].proposalKey = null;
    value.proposals = [];
    expect(() => parseAnalysisWire(value)).not.toThrow();
  });
  it("rejects duplicate/dangling keys and self relations", () => {
    const value = example();
    value.findings.push(value.findings[0]);
    expect(() => parseAnalysisWire(value)).toThrow(/Duplicate/);
    value.findings.pop();
    value.proposals[0].findingKeys = ["absent"];
    expect(() => parseAnalysisWire(value)).toThrow();
    value.proposals[0].findingKeys = ["F1"];
    value.proposalRelations = [{ leftProposalKey: "P1", rightProposalKey: "P1", relation: "possible_conflict", reasoning: "Conflict" }];
    expect(() => parseAnalysisWire(value)).toThrow();
  });
  it("requires replacements to name an exact passage target", () => {
    const value = example();
    value.proposals[0].operation = "replace";
    expect(() => parseAnalysisWire(value)).toThrow();
    value.proposals[0].target = { placement: "replace", ruleId: "R001", quote: "Old instruction", occurrence: 1 };
    expect(() => parseAnalysisWire(value)).not.toThrow();
  });
  it.each([0, 16_385, 1.5])("rejects invalid quote occurrence %s", (occurrence) => {
    const value = example();
    value.findings[0].observations[0].evidence[0].occurrence = occurrence;
    expect(() => parseAnalysisWire(value)).toThrow();
  });
  it("does not confuse structural parsing with complete application validation", () => {
    const value = example();
    value.summary = "x".repeat(601);
    // The separate pass implements Unicode-code-point semantics.
    expect(analysisWireSchema.safeParse(value).success).toBe(true);
    expect(() => parseAnalysisWire(value)).toThrow();
  });
});

describe("targeted semantic output", () => {
  it("accepts no-issue without creating approvals or replacement text", () => {
    expect(parseSemanticRecheckWire(recheck(), context).status).toBe("no_issue");
    expect(() => parseSemanticRecheckWire({ ...recheck(), replacementText: "Rewrite" }, context)).toThrow();
    expect(() => parseSemanticRecheckWire({ ...recheck(), approved: true }, context)).toThrow();
  });
  it("requires known unique targets and matching status", () => {
    const comparison = { relation: "possible_duplicate", ruleIds: ["R001"], proposalIds: [], reasoning: "Same instruction." };
    expect(() => parseSemanticRecheckWire({ ...recheck(), comparisons: [comparison] }, context)).toThrow();
    expect(() => parseSemanticRecheckWire({ ...recheck(), status: "possible_duplicate", comparisons: [comparison] }, context)).not.toThrow();
    for (const ruleIds of [[], ["R002"], ["R001", "R001"]]) expect(() => parseSemanticRecheckWire({ ...recheck(), status: "possible_duplicate", comparisons: [{ ...comparison, ruleIds }] }, context)).toThrow();
  });
  it("keeps uncertainty representable and bounds all output", () => {
    expect(parseSemanticRecheckWire({ ...recheck(), status: "uncertain", limitations: ["Cannot establish intent."] }, context).status).toBe("uncertain");
    expect(() => parseSemanticRecheckWire({ ...recheck(), reasoning: "x".repeat(501) }, context)).toThrow();
    expect(() => parseSemanticRecheckWire({ ...recheck(), limitations: Array(4).fill("Limit") }, context)).toThrow();
  });
});
