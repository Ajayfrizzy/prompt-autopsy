import { createHash } from "node:crypto";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ count: vi.fn(), generate: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("openai", () => ({
  default: class {
    responses = { inputTokens: { count: mocks.count }, create: mocks.generate };
  },
}));
import { POST as investigate } from "../../src/app/api/investigate/route";
import { POST as recheck } from "../../src/app/api/semantic-recheck/route";
import { segmentRules } from "../../src/domain/inputs";
const uuid = () => crypto.randomUUID();
function snapshot() {
  return {
    investigationId: uuid(),
    version: 1,
    incident: "Fictional failure",
    messages: [{ id: "M001", speaker: "developer", body: "Keep siblings." }],
    rulesFilename: "AGENTS.md",
    rulesText: "Keep logs.",
    rulesBom: false,
  };
}
function analysis() {
  return {
    summary: "Controlled example",
    coverage: { status: "within_capacity", reason: null },
    findings: [
      {
        key: "f",
        title: "Preserve siblings",
        evidenceState: "supported",
        observations: [
          {
            text: "Sibling preservation requested",
            evidence: [
              { messageId: "M001", quote: "Keep siblings.", occurrence: 1 },
            ],
          },
        ],
        documentedRequirement: null,
        hypotheses: [],
        missingEvidence: [],
        comparisons: [],
        recommendation: "no_change",
        rationale: "More context is needed",
        proposalKey: null,
      },
    ],
    timeline: [],
    proposals: [],
    proposalRelations: [],
    limitations: [],
  };
}
function output(result: unknown) {
  return {
    status: "completed",
    usage: { input_tokens: 100, output_tokens: 120 },
    output: [
      {
        type: "message",
        content: [{ type: "output_text", text: JSON.stringify(result) }],
      },
    ],
  };
}
function request(body: unknown) {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function recheckBody(rulesText = "Keep logs.") {
  const investigationId = uuid(),
    proposalId = uuid();
  const context = {
    investigationId,
    version: 1,
    proposal: {
      id: proposalId,
      version: 2,
      findingIds: [uuid()],
      replacementText: "Preserve other items.",
      start: 0,
      end: rulesText.length,
      expectedText: rulesText,
    },
    rulesText,
    rules: segmentRules(rulesText),
    peers: [] as unknown[],
    evidence: [],
  };
  return {
    requestId: uuid(),
    investigationId,
    version: 1,
    proposalId,
    proposalVersion: 2,
    contextHash: hash(context),
    consent: true,
    context,
  };
}
function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "test-not-a-real-key");
  mocks.count.mockReset().mockResolvedValue({ input_tokens: 100 });
  mocks.generate.mockReset().mockResolvedValue(output(analysis()));
});
afterEach(() => vi.unstubAllEnvs());
describe("stateless route contracts", () => {
  it("validates and returns exact initial bindings with no caching", async () => {
    const body = { requestId: uuid(), snapshot: snapshot(), consent: true };
    const response = await investigate(request(body));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      requestId: body.requestId,
      generationStarted: true,
      usage: { inputTokens: 100, outputTokens: 120 },
    });
  });
  it("rejects unknown settings and absent consent before counting", async () => {
    for (const patch of [{ model: "alternate" }, { consent: false }]) {
      const response = await investigate(
        request({
          requestId: uuid(),
          snapshot: snapshot(),
          consent: true,
          ...patch,
        }),
      );
      expect(response.status).toBe(400);
    }
    expect(mocks.count).not.toHaveBeenCalled();
  });
  it("rejects malformed bodies", async () => {
    const response = await investigate(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
    );
    expect(response.status).toBe(400);
    expect(mocks.count).not.toHaveBeenCalled();
  });
  it("sanitizes missing credentials and fails before network", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const response = await investigate(
      request({ requestId: uuid(), snapshot: snapshot(), consent: true }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      generationStarted: false,
    });
    expect(mocks.count).not.toHaveBeenCalled();
  });
  it("fails closed on count error and oversized tokens", async () => {
    mocks.count.mockRejectedValueOnce(
      new Error("private reviewed credentials"),
    );
    const failed = await investigate(
      request({ requestId: uuid(), snapshot: snapshot(), consent: true }),
    );
    expect(failed.status).toBe(502);
    expect(JSON.stringify(await failed.json())).not.toContain(
      "private reviewed credentials",
    );
    mocks.count.mockResolvedValueOnce({ input_tokens: 33334 });
    const oversized = await investigate(
      request({ requestId: uuid(), snapshot: snapshot(), consent: true }),
    );
    expect(oversized.status).toBe(413);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("rejects initial source references without hiding billed usage", async () => {
    const invalid = analysis();
    invalid.findings[0].observations[0].evidence[0].messageId = "M009";
    mocks.generate.mockResolvedValue(output(invalid));
    const response = await investigate(
      request({ requestId: uuid(), snapshot: snapshot(), consent: true }),
    );
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      code: "ANALYSIS_CONTRACT_INVALID",
      generationStarted: true,
      usage: { inputTokens: 100, outputTokens: 120 },
    });
  });
  it("validates exact recheck hash and returns it unchanged", async () => {
    const body = recheckBody();
    mocks.generate.mockResolvedValue(
      output({
        status: "no_issue",
        comparisons: [],
        reasoning: "No issue in supplied context.",
        limitations: [],
      }),
    );
    const response = await recheck(request(body));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      requestId: body.requestId,
      contextHash: body.contextHash,
    });
    const wrong = await recheck(
      request({ ...body, contextHash: "0".repeat(64) }),
    );
    expect(wrong.status).toBe(400);
  });
  it("rejects binding, duplicate IDs and forged passage IDs before count", async () => {
    const mismatch = recheckBody();
    mismatch.proposalVersion = 3;
    expect((await recheck(request(mismatch))).status).toBe(400);
    const duplicate = recheckBody();
    duplicate.context.peers.push(duplicate.context.proposal);
    duplicate.contextHash = hash(duplicate.context);
    expect((await recheck(request(duplicate))).status).toBe(400);
    const forged = recheckBody();
    forged.context.rules[0].id = "R009";
    forged.contextHash = hash(forged.context);
    expect((await recheck(request(forged))).status).toBe(400);
    expect(mocks.count).not.toHaveBeenCalled();
  });
  it("rejects ranges splitting a Unicode surrogate or CRLF pair", async () => {
    for (const rules of ["😀 Keep logs.", "A\r\nB"]) {
      const body = recheckBody(rules);
      body.context.proposal.start = rules.startsWith("😀") ? 1 : 2;
      body.context.proposal.expectedText = rules.slice(
        body.context.proposal.start,
      );
      body.contextHash = hash(body.context);
      const response = await recheck(request(body));
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: "INVALID_ANCHOR" });
    }
    expect(mocks.count).not.toHaveBeenCalled();
  });
  it("rejects recheck provider unknown IDs with billed usage retained", async () => {
    mocks.generate.mockResolvedValue(
      output({
        status: "possible_conflict",
        comparisons: [
          {
            relation: "possible_conflict",
            ruleIds: ["R009"],
            proposalIds: [],
            reasoning: "Conflict",
          },
        ],
        reasoning: "Conflict",
        limitations: [],
      }),
    );
    const response = await recheck(request(recheckBody()));
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      code: "ANALYSIS_CONTRACT_INVALID",
      generationStarted: true,
      usage: { inputTokens: 100, outputTokens: 120 },
    });
  });
});

// Controlled outputs exercise actual request construction and strict validation.
import {
  historicalRulesSnapshot,
  historicalRulesAnalysis,
} from "../fixtures/historical-rules";
describe("historical passage context and exact anchors (offline)", () => {
  it.each([undefined, "end_of_file", "before", "after", "replace"] as const)(
    "accepts exact citations and %s edits with explicit passage context",
    async (placement) => {
      mocks.generate.mockResolvedValue(
        output(historicalRulesAnalysis(placement)),
      );
      const response = await investigate(
        request({
          requestId: uuid(),
          snapshot: historicalRulesSnapshot,
          consent: true,
        }),
      );
      expect(response.status).toBe(200);
      const counted = mocks.count.mock.calls[0][0];
      const generated = mocks.generate.mock.calls[0][0];
      expect(generated.input).toBe(counted.input);
      const input = JSON.parse(counted.input);
      expect(input.rulesText).toBe(historicalRulesSnapshot.rulesText);
      expect(input.rules).toEqual(segmentRules(input.rulesText));
      expect(input.rules).toHaveLength(3);
      expect(input.rules.map((r: { id: string }) => r.id)).toEqual([
        "R001",
        "R002",
        "R003",
      ]);
      for (const r of input.rules)
        expect(r.text).toBe(input.rulesText.slice(r.start, r.end));
    },
  );
  it.each([
    [
      "UNKNOWN_RULE_REFERENCE",
      (a: ReturnType<typeof historicalRulesAnalysis>) => {
        a.findings[0].comparisons[0].rules[0].ruleId = "R999";
      },
    ],
    [
      "EVIDENCE_QUOTE_MISMATCH",
      (a: ReturnType<typeof historicalRulesAnalysis>) => {
        a.findings[0].comparisons[0].rules[0].ruleId = "R001";
      },
    ],
    [
      "UNKNOWN_MESSAGE_REFERENCE",
      (a: ReturnType<typeof historicalRulesAnalysis>) => {
        a.findings[0].observations[0].evidence[0].messageId = "M999";
      },
    ],
    [
      "EVIDENCE_QUOTE_MISMATCH",
      (a: ReturnType<typeof historicalRulesAnalysis>) => {
        a.findings[0].observations[0].evidence[0].quote = "private paraphrase";
      },
    ],
    [
      "EDIT_RULE_REFERENCE_INVALID",
      (a: ReturnType<typeof historicalRulesAnalysis>) => {
        a.proposals[0].target.ruleId = "R999";
      },
    ],
    [
      "EVIDENCE_QUOTE_MISMATCH",
      (a: ReturnType<typeof historicalRulesAnalysis>) => {
        a.proposals[0].target.quote = "private invented anchor";
      },
    ],
    [
      "EDIT_ANCHOR_INVALID",
      (a: ReturnType<typeof historicalRulesAnalysis>) => {
        a.proposals[0].target.quote = null;
      },
    ],
    [
      "PROPOSAL_REFERENCE_INVALID",
      (a: ReturnType<typeof historicalRulesAnalysis>) => {
        a.findings[0].proposalKey = "unknown";
      },
    ],
  ])(
    "rejects with safe %s metadata and retains usage",
    async (category, mutate) => {
      vi.stubEnv("NODE_ENV", "development");
      const log = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        const fixture = historicalRulesAnalysis("replace");
        mutate(fixture);
        mocks.generate.mockResolvedValue(output(fixture));
        const response = await investigate(
          request({
            requestId: uuid(),
            snapshot: historicalRulesSnapshot,
            consent: true,
          }),
        );
        expect(response.status).toBe(502);
        expect(await response.json()).toMatchObject({
          code: "ANALYSIS_CONTRACT_INVALID",
          usage: { inputTokens: 100, outputTokens: 120 },
        });
        expect(log).toHaveBeenCalledWith(
          "Prompt Autopsy provider validation",
          expect.objectContaining({
            stage: "domain",
            domainCategory: category,
          }),
        );
        expect(JSON.stringify(log.mock.calls)).not.toMatch(
          /private|Grouped actions|fictional controlled/,
        );
        expect(mocks.generate).toHaveBeenCalledTimes(1);
      } finally {
        log.mockRestore();
      }
    },
  );
  it("rejects the expanded complete context at the existing token gate without generation", async () => {
    mocks.count.mockResolvedValue({ input_tokens: 33334 });
    const response = await investigate(
      request({
        requestId: uuid(),
        snapshot: historicalRulesSnapshot,
        consent: true,
      }),
    );
    expect(response.status).toBe(413);
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(JSON.parse(mocks.count.mock.calls[0][0].input).rules).toEqual(
      segmentRules(historicalRulesSnapshot.rulesText),
    );
  });
});
