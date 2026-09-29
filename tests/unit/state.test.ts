import { describe, expect, it } from "vitest";
import { initialState, reducer, type State } from "../../src/state/investigation";
import { usedBudget } from "../../src/domain/budget";
import { createReview } from "../../src/domain/review";
import type { AnalysisWire } from "../../src/server/ai/schemas";

const analysis: AnalysisWire = {
  summary: "Fictional incomplete evidence fixture.", coverage: { status: "within_capacity", reason: null },
  findings: [{ key: "F1", title: "More evidence needed", evidenceState: "insufficient", observations: [], documentedRequirement: null, hypotheses: [], missingEvidence: ["Original implementation discussion absent."], comparisons: [], recommendation: "needs_evidence", rationale: "The excerpt cannot establish the cause.", proposalKey: null }],
  timeline: [], proposals: [], proposalRelations: [], limitations: [],
};
function ready(): State {
  let state = initialState();
  state = reducer(state, { type: "input", patch: { incident: "An item action removed other items.", messages: [{ id: "M001", speaker: "developer", body: "Observed failure." }], rulesText: "Preserve unrelated content." } });
  return reducer(state, { type: "consent", value: true });
}

describe("investigation state/version bindings", () => {
  it("starts empty with a fresh identity and no recovery data", () => {
    const first = initialState(), second = initialState();
    expect(first.snapshot.investigationId).not.toBe(second.snapshot.investigationId);
    expect(first.stage).toBe(0);
    expect(first.snapshot.messages).toEqual([]);
    expect(first.snapshot.rulesText).toBe("");
    expect(first.consent).toBe(false);
    expect(first.review).toBeNull();
    expect(first.ledger).toEqual([]);
  });
  it("blocks result-stage navigation until an analysis exists", () => {
    const state = ready();
    expect(reducer(state, { type: "stage", stage: 2 })).toBe(state);
    expect(reducer(state, { type: "stage", stage: 3 })).toBe(state);
  });
  it("requires current consent and validated inputs before reserving a call", () => {
    expect(() => reducer(initialState(), { type: "start", id: "unconsented", operation: "analysis" })).toThrow();
    const invalid = reducer(initialState(), { type: "consent", value: true });
    expect(() => reducer(invalid, { type: "start", id: "invalid", operation: "analysis" })).toThrow();
  });
  it("invalidates analysis, decisions, consent and downloads when reviewed input changes", () => {
    let state = ready();
    const review = createReview(analysis, state.snapshot);
    state = reducer(state, { type: "start", id: "request-1", operation: "analysis" });
    state = reducer(state, { type: "finish", id: "request-1", generationStarted: true, usage: { inputTokens: 1_000, outputTokens: 100 }, review });
    state = reducer(state, { type: "download", name: "prompt-autopsy-report.md", content: "report" });
    const previousVersion = state.snapshot.version;
    const spent = usedBudget(state.ledger);
    state = reducer(state, { type: "input", patch: { rulesText: "[REDACTED]" } });
    expect(state.snapshot.version).toBe(previousVersion + 1);
    expect(state.stage).toBe(1);
    expect(state.review).toBeNull();
    expect(state.consent).toBe(false);
    expect(state.downloaded).toEqual({});
    expect(usedBudget(state.ledger)).toBe(spent);
  });
  it("settles a late paid result but never restores stale findings", () => {
    let state = ready();
    const obsoleteReview = createReview(analysis, state.snapshot);
    state = reducer(state, { type: "start", id: "late", operation: "analysis" });
    state = reducer(state, { type: "input", patch: { incident: "Redacted incident." } });
    state = reducer(state, { type: "finish", id: "late", review: obsoleteReview, generationStarted: true, usage: { inputTokens: 20_000, outputTokens: 2_000 } });
    expect(usedBudget(state.ledger)).toBe(120_000);
    expect(state.review).toBeNull();
    expect(state.consent).toBe(false);
    expect(state.active).toBeNull();
    expect(state.snapshot.incident).toBe("Redacted incident.");
  });
  it("retains the reservation after unknown billing, including source replacement", () => {
    let state = ready();
    state = reducer(state, { type: "start", id: "timeout", operation: "analysis" });
    state = reducer(state, { type: "finish", id: "timeout", error: "Request timed out." });
    expect(usedBudget(state.ledger)).toBe(250_000);
    state = reducer(state, { type: "input", patch: { investigationId: crypto.randomUUID(), messages: [{ id: "M001", speaker: "agent", body: "New source session." }] } });
    expect(usedBudget(state.ledger)).toBe(250_000);
    expect(state.consent).toBe(false);
  });
  it("releases generation reservation when unbilled counting fails before generation", () => {
    let state = ready();
    state = reducer(state, { type: "start", id: "count-failure", operation: "analysis" });
    state = reducer(state, { type: "finish", id: "count-failure", generationStarted: false, error: "Count failed. Retry explicitly." });
    expect(usedBudget(state.ledger)).toBe(0);
    expect(state.error).toMatch(/Count failed/);
    expect(state.snapshot.messages).toHaveLength(1);
  });
});
