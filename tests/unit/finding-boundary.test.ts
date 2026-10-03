import { describe, it, expect, vi } from "vitest";
import {
  analyze,
  canonicalContext,
  type Provider,
} from "../../src/server/ai/provider";
import { parseAnalysisWire } from "../../src/server/ai/schemas";
import { createReview } from "../../src/domain/review";
import { segmentRules } from "../../src/domain/inputs";
import {
  productScopeSnapshot as snapshot,
  productScopeAnalysis as fixture,
} from "../fixtures/product-scope";

describe("finding boundary contract (controlled provider, not live consistency)", () => {
  it("instructs incident-level grouping without requiring a fixed count", () => {
    const instructions = canonicalContext("investigate", {}).instructions;
    for (const clause of [
      "A finding represents a distinct problem, requirement violation, or independently actionable evidence gap.",
      "Do not create a separate finding merely because the transcript later contains a correction, remediation, successful test, or confirmation of the same problem.",
      "Put those events in the same finding's observations/timeline unless they reveal a separate failure mode or independently actionable issue.",
      "Multiple observations about the same underlying failure should normally remain one finding.",
      "A correction can demonstrate resolution without becoming another finding.",
      "A manual verification result belongs to evidence/missing-evidence analysis unless it itself exposes another problem.",
      "Do not merge genuinely independent failure modes merely to reduce finding count.",
      "Finding count remains evidence-driven; do not require exactly one finding.",
    ])
      expect(instructions).toContain(clause);
  });
  it("accepts one grounded scope failure with correction and manual validation attached", async () => {
    const provider: Provider = {
      count: vi.fn().mockResolvedValue({ input_tokens: 100 }),
      generate: vi.fn().mockResolvedValue({
        status: "completed",
        usage: { input_tokens: 100, output_tokens: 120 },
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: JSON.stringify(fixture) }],
          },
        ],
      }),
    };
    const input = { ...snapshot, rules: segmentRules(snapshot.rulesText) };
    const response = await analyze(
      provider,
      "investigate",
      input,
      undefined,
      undefined,
      (result) => {
        createReview(parseAnalysisWire(result), snapshot);
      },
    );
    const review = createReview(parseAnalysisWire(response.result), snapshot);
    expect(review.findings).toHaveLength(1);
    const finding = review.findings[0].source;
    expect(
      finding.documentedRequirement?.evidence.map((e) => e.messageId),
    ).toEqual(["M001"]);
    expect(
      finding.observations.map((o) => o.evidence.map((e) => e.messageId)),
    ).toEqual([["M002", "M003"], ["M004"], ["M005"]]);
    expect(finding.recommendation).toBe("no_change");
    expect(review.proposals).toEqual([]);
    expect(
      review.analysis.timeline.every(
        (t) => t.findingKeys.length === 1 && t.findingKeys[0] === finding.key,
      ),
    ).toBe(true);
    expect(
      review.analysis.timeline
        .filter((t) => t.kind === "correction")
        .flatMap((t) => t.evidence.map((e) => e.messageId)),
    ).toEqual(["M004", "M005"]);
    const counted = vi.mocked(provider.count).mock.calls[0][0];
    expect(vi.mocked(provider.generate).mock.calls[0][0].instructions).toBe(
      counted.instructions,
    );
  });
  it("still rejects invented correction citations in the controlled fixture", () => {
    const invalid = structuredClone(fixture);
    invalid.findings[0].observations[1].evidence[0].quote =
      "Invented correction";
    expect(() => createReview(parseAnalysisWire(invalid), snapshot)).toThrow();
  });
});
