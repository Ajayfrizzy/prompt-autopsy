import { expect, it } from "vitest";
import {
  analysisTextFormat,
  analysisWireSchema,
  proposalWireSchema,
} from "../../src/server/ai/schemas";
import { historicalRulesAnalysis } from "../fixtures/historical-rules";
import { canonicalContext } from "../../src/server/ai/provider";

it.each(["replace", "before", "after", "end_of_file"] as const)(
  "accepts controlled %s variant",
  (placement) => {
    expect(
      analysisWireSchema.safeParse(historicalRulesAnalysis(placement)).success,
    ).toBe(true);
  },
);
it.each([
  ["insert", "end_of_file", "R001", null, null],
  ["insert", "before", null, null, null],
  ["insert", "after", null, null, null],
  ["replace", "replace", "R001", null, 1],
  ["replace", "replace", "R001", "Exact text", undefined],
  ["insert", "replace", "R001", "Exact text", 1],
  ["replace", "before", "R001", null, null],
  ["replace", "after", "R001", null, null],
])(
  "rejects illegal %s/%s in the provider schema",
  (operation, placement, ruleId, quote, occurrence) => {
    const proposal = {
      ...historicalRulesAnalysis("replace").proposals[0],
      operation,
      target: {
        placement,
        ruleId,
        quote,
        ...(occurrence === undefined ? {} : { occurrence }),
      },
    };
    expect(proposalWireSchema.safeParse(proposal).success).toBe(false);
    expect(
      analysisWireSchema.safeParse({
        ...historicalRulesAnalysis("replace"),
        proposals: [proposal],
      }).success,
    ).toBe(false);
  },
);
it("publishes strict nested anyOf branches with required literal targets", () => {
  const schema = analysisTextFormat.schema as any;
  expect(schema.type).toBe("object");
  expect(schema.anyOf).toBeUndefined();
  const branches = schema.properties.proposals.items.anyOf;
  expect(branches).toHaveLength(3);
  for (const b of branches) {
    expect(b.additionalProperties).toBe(false);
    expect(b.required).toContain("target");
    expect(b.required).toContain("operation");
    expect(b.properties.target.additionalProperties).toBe(false);
    expect(b.properties.target.required.sort()).toEqual([
      "occurrence",
      "placement",
      "quote",
      "ruleId",
    ]);
  }
  expect(branches[0].properties.operation.const).toBe("replace");
  expect(branches[0].properties.target.properties.placement.const).toBe(
    "replace",
  );
  expect(branches[0].properties.target.properties.quote.type).toBe("string");
  expect(branches[0].properties.target.properties.occurrence.minimum).toBe(1);
  expect(branches[1].properties.operation.const).toBe("insert");
  expect(branches[1].properties.target.properties.placement.enum).toEqual([
    "before",
    "after",
  ]);
  expect(branches[1].properties.target.properties.ruleId.type).toBe("string");
  expect(branches[2].properties.operation.const).toBe("insert");
  expect(branches[2].properties.target.properties.placement.const).toBe(
    "end_of_file",
  );
  for (const field of ["ruleId", "quote", "occurrence"])
    expect(branches[2].properties.target.properties[field].type).toBe("null");
  for (const field of ["quote", "occurrence"])
    expect(branches[1].properties.target.properties[field].type).toBe("null");
});
it("guides additions away from unrelated generated blocks without forcing changes", () => {
  const prompt = canonicalContext("investigate", {}).instructions;
  expect(prompt).toContain("prefer insert with end_of_file");
  expect(prompt).toContain("Never invent an existing rule anchor");
  expect(prompt).toContain("unrelated framework-generated block");
  expect(prompt).toContain("exact supplied quote and occurrence");
  expect(prompt).toContain("no_change and needs_evidence remain valid");
});
