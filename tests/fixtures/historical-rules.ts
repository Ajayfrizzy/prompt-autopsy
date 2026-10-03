import { productScopeAnalysis, productScopeSnapshot } from "./product-scope";
import { segmentRules } from "../../src/domain/inputs";
import type { AnalysisWire } from "../../src/server/ai/schemas";
// Synthetic historical-file shape and authored provider output, not live results.
export const historicalRulesSnapshot = {
  ...productScopeSnapshot,
  rulesText:
    "<!-- BEGIN:example-rules -->\n\n# Grouped actions\nPreserve unrelated products when modifying a selected product.\n\n<!-- END:example-rules -->",
};
export function historicalRulesAnalysis(
  placement?: "before" | "after" | "end_of_file" | "replace",
): AnalysisWire {
  const result = structuredClone(productScopeAnalysis);
  const rule = segmentRules(historicalRulesSnapshot.rulesText)[1];
  result.findings[0].comparisons[0].rules = [
    { ruleId: rule.id, quote: rule.text, occurrence: 1 },
  ];
  if (placement) {
    result.findings[0].recommendation =
      placement === "replace" ? "edit" : "add";
    result.findings[0].proposalKey = "scope_rule";
    result.proposals = [
      {
        key: "scope_rule",
        findingKeys: ["product_scope"],
        rationale: "Controlled edit exercise.",
        operation: placement === "replace" ? "replace" : "insert",
        target: {
          ruleId: placement === "end_of_file" ? null : rule.id,
          quote: placement === "replace" ? rule.text : null,
          occurrence: placement === "replace" ? 1 : null,
          placement,
        },
        replacementText: "\nVerify action scope explicitly.\n",
      },
    ];
  }
  return result;
}
