import { afterAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  DOMAIN_VALIDATION_CODES,
  DomainValidationError,
  domainValidationCategory,
  domainValidationLocation,
} from "../../src/domain/validation-category";
import {
  analysisWireSchema,
  semanticRecheckWireSchema,
  parseAnalysisWire,
  parseSemanticRecheckWire,
  validateAnalysisContract,
  validateSemanticContract,
} from "../../src/server/ai/schemas";
import {
  createReview,
  exactOccurrence,
  validateEdit,
  applySemanticResult,
  semanticContext,
  decideFinding,
} from "../../src/domain/review";
import { analyze } from "../../src/server/ai/provider";
import {
  historicalRulesAnalysis,
  historicalRulesSnapshot as snapshot,
} from "../fixtures/historical-rules";
// Deliberately malformed controlled wire payloads bypass TS to exercise defenses.
const fixture = (): any => historicalRulesAnalysis("replace");
const semantic = (): any => ({
  status: "possible_conflict",
  comparisons: [
    {
      relation: "possible_conflict",
      ruleIds: ["R002"],
      proposalIds: [],
      reasoning: "Controlled",
    },
  ],
  reasoning: "Controlled",
  limitations: [],
});
const context = { ruleIds: ["R002"], proposalIds: [] };
const tested = new Set<string>();
function rejection(run: () => unknown, code: string) {
  try {
    run();
    throw new Error("Expected rejection");
  } catch (error) {
    expect(error).toBeInstanceOf(DomainValidationError);
    expect(domainValidationCategory(error)).toBe(code);
    tested.add(code);
    return error as DomainValidationError;
  }
}
const analysisCases: [string, string, (a: any) => void][] = [
  [
    "COVERAGE_REASON_REQUIRED",
    "limited reason",
    (a) => (a.coverage = { status: "limited", reason: null }),
  ],
  [
    "SUPPORTED_FINDING_MISSING_OBSERVATION",
    "observation",
    (a) => (a.findings[0].observations = []),
  ],
  [
    "INSUFFICIENT_FINDING_INVALID_RECOMMENDATION",
    "insufficient proposal",
    (a) => (a.findings[0].evidenceState = "insufficient"),
  ],
  [
    "RULE_COMPARISON_REFERENCE_MISMATCH",
    "empty related rules",
    (a) => (a.findings[0].comparisons[0].rules = []),
  ],
  [
    "RULE_COMPARISON_REFERENCE_MISMATCH",
    "no-relevant with rules",
    (a) => (a.findings[0].comparisons[0].relation = "no_relevant_rule"),
  ],
  [
    "PROPOSAL_REFERENCE_INVALID",
    "duplicate finding",
    (a) => a.findings.push(a.findings[0]),
  ],
  [
    "PROPOSAL_REFERENCE_INVALID",
    "dangling proposal",
    (a) => (a.findings[0].proposalKey = "absent"),
  ],
  [
    "PROPOSAL_REFERENCE_INVALID",
    "unknown timeline key",
    (a) => (a.timeline[0].findingKeys = ["absent"]),
  ],
  [
    "PROPOSAL_REFERENCE_INVALID",
    "proposal disagreement",
    (a) => {
      a.findings.push({
        ...a.findings[0],
        key: "other",
        proposalKey: null,
        recommendation: "no_change",
      });
      a.proposals[0].findingKeys = ["other"];
    },
  ],
  [
    "PROPOSAL_REFERENCE_INVALID",
    "proposal omitted finding",
    (a) => a.findings.push({ ...a.findings[0], key: "other" }),
  ],
  [
    "PROPOSAL_REFERENCE_INVALID",
    "invalid relation",
    (a) =>
      (a.proposalRelations = [
        {
          leftProposalKey: "scope_rule",
          rightProposalKey: "scope_rule",
          relation: "possible_conflict",
          reasoning: "Controlled",
        },
      ]),
  ],
  [
    "REPLACEMENT_LIMIT_INVALID",
    "UTF8 limit",
    (a) => (a.proposals[0].replacementText = "😀".repeat(1025)),
  ],
  [
    "EDIT_ANCHOR_INVALID",
    "replace anchor",
    (a) => (a.proposals[0].target.quote = null),
  ],
  [
    "EDIT_ANCHOR_INVALID",
    "EOF target",
    (a) => {
      a.proposals[0].operation = "insert";
      a.proposals[0].target.placement = "end_of_file";
    },
  ],
  [
    "EDIT_ANCHOR_INVALID",
    "boundary target",
    (a) => {
      a.proposals[0].operation = "insert";
      a.proposals[0].target.placement = "before";
    },
  ],
];
describe("all deterministic analysis invariants", () => {
  it.each(analysisCases)("%s: %s", (code, _name, mutate) => {
    const a = fixture();
    mutate(a);
    rejection(() => validateAnalysisContract(a), code);
  });
  it.each([
    [
      "UNKNOWN_MESSAGE_REFERENCE",
      (a: any) =>
        (a.findings[0].observations[0].evidence[0].messageId = "M999"),
    ],
    [
      "EVIDENCE_QUOTE_MISMATCH",
      (a: any) =>
        (a.findings[0].observations[0].evidence[0].quote =
          "Private non-exact quote"),
    ],
    [
      "EVIDENCE_OCCURRENCE_INVALID",
      (a: any) => (a.findings[0].observations[0].evidence[0].occurrence = 0),
    ],
    [
      "UNKNOWN_RULE_REFERENCE",
      (a: any) => (a.findings[0].comparisons[0].rules[0].ruleId = "R999"),
    ],
    [
      "EVIDENCE_QUOTE_MISMATCH",
      (a: any) => (a.findings[0].comparisons[0].rules[0].occurrence = 2),
    ],
    [
      "EDIT_RULE_REFERENCE_INVALID",
      (a: any) => (a.proposals[0].target.ruleId = "R999"),
    ],
    ["EDIT_ANCHOR_INVALID", (a: any) => (a.proposals[0].target.quote = null)],
    [
      "NO_OP_EDIT",
      (a: any) =>
        (a.proposals[0].replacementText = a.proposals[0].target.quote),
    ],
    [
      "REPLACEMENT_LIMIT_INVALID",
      (a: any) => (a.proposals[0].replacementText = "   "),
    ],
    [
      "PROPOSAL_REFERENCE_INVALID",
      (a: any) => (a.proposals[0].findingKeys = ["absent"]),
    ],
    [
      "PROPOSAL_REFERENCE_INVALID",
      (a: any) =>
        (a.proposalRelations = [
          { leftProposalKey: "absent", rightProposalKey: "scope_rule" },
        ]),
    ],
  ] as [string, (a: any) => void][])("snapshot defense %s", (code, mutate) => {
    const a = fixture();
    mutate(a);
    rejection(() => createReview(a, snapshot), code);
  });
  it("validates offsets, boundaries and expected text", () => {
    const edit = createReview(fixture(), snapshot).proposals[0].current;
    rejection(
      () => validateEdit(snapshot, { ...edit, start: -1 }),
      "EDIT_BOUNDARY_INVALID",
    );
    rejection(
      () =>
        validateEdit(
          { ...snapshot, rulesText: "😀x" },
          { ...edit, start: 1, end: 2 },
        ),
      "EDIT_BOUNDARY_INVALID",
    );
    rejection(
      () =>
        validateEdit(
          { ...snapshot, rulesText: "a\r\nb" },
          { ...edit, start: 2, end: 3 },
        ),
      "EDIT_BOUNDARY_INVALID",
    );
    rejection(
      () =>
        validateEdit(snapshot, {
          ...edit,
          expectedText: "private changed text",
        }),
      "EDIT_ANCHOR_INVALID",
    );
    rejection(
      () =>
        validateEdit(snapshot, { ...edit, replacementText: "😀".repeat(1025) }),
      "REPLACEMENT_LIMIT_INVALID",
    );
  });
  it("reports missing occurrences and code point limits", () => {
    rejection(
      () => exactOccurrence("one", "one", 2),
      "EVIDENCE_QUOTE_MISMATCH",
    );
    rejection(
      () => parseAnalysisWire({ ...fixture(), summary: "x".repeat(601) }),
      "STRUCTURED_TEXT_LIMIT",
    );
  });
  it("provides safe nested indexes for citations and proposals", () => {
    const a = fixture();
    a.findings[0].comparisons[0].rules[0].ruleId = "R999";
    expect(
      domainValidationLocation(
        rejection(() => createReview(a, snapshot), "UNKNOWN_RULE_REFERENCE"),
      ),
    ).toEqual({
      domainArea: "finding.comparison",
      findingIndex: 0,
      comparisonIndex: 0,
    });
    const b = fixture();
    b.proposals[0].replacementText = b.proposals[0].target.quote;
    expect(
      domainValidationLocation(
        rejection(() => createReview(b, snapshot), "NO_OP_EDIT"),
      ),
    ).toEqual({ domainArea: "proposal", proposalIndex: 0 });
  });
});
const semanticCases: [string, (a: any) => void][] = [
  ["SEMANTIC_TARGET_REQUIRED", (a) => (a.comparisons[0].ruleIds = [])],
  ["SEMANTIC_REFERENCE_INVALID", (a) => (a.comparisons[0].ruleIds = ["R999"])],
  [
    "SEMANTIC_REFERENCE_INVALID",
    (a) => (a.comparisons[0].ruleIds = ["R002", "R002"]),
  ],
  ["SEMANTIC_NO_ISSUE_HAS_COMPARISONS", (a) => (a.status = "no_issue")],
  ["SEMANTIC_STATUS_MISMATCH", (a) => (a.comparisons = [])],
  [
    "SEMANTIC_CONFLICT_PRECEDENCE",
    (a) => {
      a.status = "possible_duplicate";
      a.comparisons.push({
        ...a.comparisons[0],
        relation: "possible_duplicate",
      });
    },
  ],
];
describe("semantic invariants and review application", () => {
  it.each(semanticCases)("%s", (code, mutate) => {
    const a = semantic();
    mutate(a);
    rejection(() => validateSemanticContract(a, context), code);
  });
  it("applies a valid parsed recheck and rejects stale bindings or unknown sources", () => {
    const review = createReview(parseAnalysisWire(fixture()), snapshot);
    const id = review.proposals[0].id;
    const binding = semanticContext(review, id).binding;
    const result = parseSemanticRecheckWire(semantic(), context);
    expect(
      applySemanticResult(review, id, binding, result).proposals[0].semantic
        .state,
    ).toBe("reviewed");
    rejection(
      () => applySemanticResult(review, id, "stale", result),
      "SEMANTIC_RESPONSE_STALE",
    );
    const invalid = semantic();
    invalid.comparisons[0].ruleIds = ["R999"];
    rejection(
      () => applySemanticResult(review, id, binding, invalid),
      "SEMANTIC_REFERENCE_INVALID",
    );
    rejection(
      () => decideFinding(review, review.findings[0].id, "Approved"),
      "REVIEW_DECISION_INVALID",
    );
  });
});
it.each(["replace", "before", "after", "end_of_file"] as const)(
  "valid %s reaches review",
  (placement) => {
    expect(
      createReview(
        parseAnalysisWire(historicalRulesAnalysis(placement)),
        snapshot,
      ).proposals,
    ).toHaveLength(1);
  },
);
it.each([
  (a: any) => (a.coverage = { status: "limited", reason: null }),
  (a: any) => (a.findings[0].observations = []),
  (a: any) => {
    a.findings[0].evidenceState = "insufficient";
  },
  (a: any) => {
    a.findings[0].evidenceState = "insufficient";
    a.findings[0].proposalKey = null;
    a.findings[0].recommendation = "needs_evidence";
  },
  (a: any) => (a.findings[0].comparisons[0].rules = []),
  (a: any) => (a.findings[0].comparisons[0].relation = "no_relevant_rule"),
  (a: any) => {
    a.findings[0].recommendation = "no_change";
  },
])("rejects provider-expressible illegal combinations in schema", (mutate) => {
  const a = fixture();
  mutate(a);
  expect(analysisWireSchema.safeParse(a).success).toBe(false);
});
it("requires a target in the semantic schema and accepts insufficient no-change", () => {
  const a = semantic();
  a.comparisons[0].ruleIds = [];
  expect(semanticRecheckWireSchema.safeParse(a).success).toBe(false);
  const b = fixture();
  Object.assign(b.findings[0], {
    evidenceState: "insufficient",
    observations: [],
    missingEvidence: ["Need more context"],
    recommendation: "needs_evidence",
    proposalKey: null,
  });
  b.proposals = [];
  expect(createReview(parseAnalysisWire(b), snapshot).proposals).toEqual([]);
});
it("logs only typed code and safe index location, not private error messages", async () => {
  vi.stubEnv("NODE_ENV", "development");
  const log = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    for (const code of DOMAIN_VALIDATION_CODES) {
      const error = new DomainValidationError(code, "PRIVATE error text", {
        domainArea: "proposal",
        proposalIndex: 0,
      });
      const provider = {
        count: vi.fn().mockResolvedValue({ input_tokens: 100 }),
        generate: vi
          .fn()
          .mockResolvedValue({
            status: "completed",
            usage: { input_tokens: 100, output_tokens: 100 },
            output: [
              {
                type: "message",
                content: [
                  { type: "output_text", text: JSON.stringify(fixture()) },
                ],
              },
            ],
          }),
      };
      await expect(
        analyze(provider, "investigate", {}, undefined, undefined, () => {
          throw error;
        }),
      ).rejects.toMatchObject({
        code: "ANALYSIS_CONTRACT_INVALID",
        usage: { inputTokens: 100, outputTokens: 100 },
      });
      expect(log).toHaveBeenLastCalledWith(
        "Prompt Autopsy provider validation",
        expect.objectContaining({
          domainCategory: code,
          domainArea: "proposal",
          proposalIndex: 0,
        }),
      );
    }
    expect(JSON.stringify(log.mock.calls)).not.toMatch(
      /PRIVATE|Grouped actions|replacementText|Preserve unrelated/,
    );
  } finally {
    log.mockRestore();
    vi.unstubAllEnvs();
  }
});
it("does not classify arbitrary messages as deterministic errors", () => {
  expect(domainValidationCategory(new Error("Unknown rule reference"))).toBe(
    "OTHER_DOMAIN_VALIDATION",
  );
});
afterAll(() => {
  // New codes require a deliberately authored failing fixture, not just a log test.
  expect([...tested].sort()).toEqual([...DOMAIN_VALIDATION_CODES].sort());
});

it("keeps audited validators on typed assertions, never raw Error throws", () => {
  for (const file of ["src/domain/review.ts", "src/server/ai/schemas.ts"]) {
    const source = readFileSync(file, "utf8");
    expect(source).not.toMatch(/throw\s+new\s+Error\s*\(/);
    expect(source).toContain("throw new DomainValidationError(code, message)");
  }
});
it("filters forged location fields without exposing their contents", () => {
  const error = new DomainValidationError("NO_OP_EDIT", "PRIVATE");
  error.location = {
    domainArea: "proposal",
    proposalIndex: NaN,
    comparisonIndex: -1,
    secret: "PRIVATE",
  } as any;
  expect(domainValidationLocation(error)).toEqual({ domainArea: "proposal" });
  error.location = { domainArea: "PRIVATE", proposalIndex: 0 } as any;
  expect(domainValidationLocation(error)).toEqual({});
});
