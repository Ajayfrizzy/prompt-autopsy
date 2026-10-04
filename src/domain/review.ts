import {
  DomainValidationError,
  type DomainValidationCode,
  withDomainLocation,
} from "./validation-category";
import { newId } from "./id";
import type { AnalysisWire, SemanticRecheckWire } from "../server/ai/schemas";
import { segmentRules, type Snapshot } from "./inputs";
export type Decision =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "No change accepted"
  | "Needs evidence";
export type Edit = {
  version: number;
  start: number;
  end: number;
  expectedText: string;
  replacementText: string;
  affectedRuleIds: string[];
};
export type Proposal = {
  id: string;
  findingIds: string[];
  original: AnalysisWire["proposals"][number] | null;
  current: Edit;
  decision: Decision;
  reason: string;
  history: {
    edit: Edit;
    decision: Decision;
    reason: string;
    semantic?: Proposal["semantic"];
  }[];
  superseded: boolean;
  semantic: {
    state: "initial" | "stale" | "pending" | "reviewed";
    binding: string;
    result: SemanticRecheckWire | null;
    disposition: string;
  };
};
export type Review = {
  snapshot: Snapshot;
  analysis: AnalysisWire;
  findings: {
    id: string;
    source: AnalysisWire["findings"][number];
    decision: Decision;
    reason: string;
  }[];
  proposals: Proposal[];
  relations: { left: string; right: string; reason: string }[];
};
const id = () => newId();
function requireThat(
  value: unknown,
  code: DomainValidationCode,
  message: string,
): asserts value {
  if (!value) throw new DomainValidationError(code, message);
}
export function exactOccurrence(
  text: string,
  quote: string,
  occurrence: number,
): number {
  requireThat(
    quote.length && Number.isInteger(occurrence) && occurrence > 0,
    "EVIDENCE_OCCURRENCE_INVALID",
    "Invalid quote occurrence",
  );
  let at = -1;
  for (let n = 0; n < occurrence; n++) {
    at = text.indexOf(quote, at + 1);
    requireThat(
      at >= 0,
      "EVIDENCE_QUOTE_MISMATCH",
      "Exact reviewed quote was not found",
    );
  }
  return at;
}
function boundary(text: string, n: number) {
  requireThat(
    Number.isInteger(n) && n >= 0 && n <= text.length,
    "EDIT_BOUNDARY_INVALID",
    "Invalid edit boundary",
  );
  if (n > 0 && n < text.length) {
    const a = text.charCodeAt(n - 1),
      b = text.charCodeAt(n);
    requireThat(
      !(a >= 0xd800 && a <= 0xdbff && b >= 0xdc00 && b <= 0xdfff) &&
        !(a === 13 && b === 10),
      "EDIT_BOUNDARY_INVALID",
      "Edit splits a Unicode character or CRLF",
    );
  }
}
export function validateEdit(snapshot: Snapshot, edit: Edit) {
  boundary(snapshot.rulesText, edit.start);
  boundary(snapshot.rulesText, edit.end);
  requireThat(
    edit.end >= edit.start &&
      snapshot.rulesText.slice(edit.start, edit.end) === edit.expectedText,
    "EDIT_ANCHOR_INVALID",
    "Edit anchor no longer matches reviewed rules",
  );
  requireThat(
    edit.replacementText.trim() &&
      [...edit.replacementText].length <= 1200 &&
      new TextEncoder().encode(edit.replacementText).length <= 4096,
    "REPLACEMENT_LIMIT_INVALID",
    "Replacement must contain 1–1,200 characters and at most 4,096 bytes",
  );
  requireThat(
    edit.expectedText !== edit.replacementText,
    "NO_OP_EDIT",
    "No-op edit is not exportable",
  );
}
export function createReview(
  analysis: AnalysisWire,
  snapshot: Snapshot,
): Review {
  const rules = segmentRules(snapshot.rulesText);
  const messageEvidence = (ref: {
    messageId: string;
    quote: string;
    occurrence: number;
  }) => {
    const m = snapshot.messages.find((m) => m.id === ref.messageId);
    requireThat(
      m,
      "UNKNOWN_MESSAGE_REFERENCE",
      "Unknown or retired message reference",
    );
    exactOccurrence(m.body, ref.quote, ref.occurrence);
  };
  analysis.findings.forEach((f, findingIndex) =>
    withDomainLocation({ domainArea: "finding", findingIndex }, () => {
      for (const o of [
        ...f.observations,
        ...(f.documentedRequirement ? [f.documentedRequirement] : []),
      ])
        o.evidence.forEach(messageEvidence);
      for (const h of f.hypotheses)
        h.supportingEvidence.forEach(messageEvidence);
      f.comparisons.forEach((c, comparisonIndex) =>
        withDomainLocation(
          { domainArea: "finding.comparison", findingIndex, comparisonIndex },
          () => {
            for (const ref of c.rules) {
              const rule = rules.find((r) => r.id === ref.ruleId);
              requireThat(
                rule,
                "UNKNOWN_RULE_REFERENCE",
                "Unknown rule reference",
              );
              exactOccurrence(rule.text, ref.quote, ref.occurrence);
            }
          },
        ),
      );
    }),
  );
  analysis.timeline.forEach((t, timelineIndex) =>
    withDomainLocation({ domainArea: "timeline", timelineIndex }, () =>
      t.evidence.forEach(messageEvidence),
    ),
  );
  const findings = analysis.findings.map((source) => ({
    id: id(),
    source,
    decision: "Pending" as Decision,
    reason: "",
  }));
  const proposals: Proposal[] = analysis.proposals.map(
    (original, proposalIndex) =>
      withDomainLocation({ domainArea: "proposal", proposalIndex }, () => {
        const target = original.target,
          rule = rules.find((r) => r.id === target.ruleId);
        let start: number, end: number;
        if (target.placement === "end_of_file") {
          start = end = snapshot.rulesText.length;
        } else {
          requireThat(rule, "EDIT_RULE_REFERENCE_INVALID", "Unknown edit rule");
          if (original.operation === "replace") {
            requireThat(
              target.quote && target.occurrence,
              "EDIT_ANCHOR_INVALID",
              "Missing replacement anchor",
            );
            start =
              rule.start +
              exactOccurrence(rule.text, target.quote, target.occurrence);
            end = start + target.quote.length;
          } else
            start = end = target.placement === "before" ? rule.start : rule.end;
        }
        const current: Edit = {
          version: 1,
          start,
          end,
          expectedText: snapshot.rulesText.slice(start, end),
          replacementText: original.replacementText,
          affectedRuleIds: rule ? [rule.id] : [],
        };
        validateEdit(snapshot, current);
        return {
          id: id(),
          findingIds: original.findingKeys.map((key) => {
            const f = findings.find((f) => f.source.key === key);
            requireThat(f, "PROPOSAL_REFERENCE_INVALID", "Unknown finding");
            return f.id;
          }),
          original,
          current,
          decision: "Pending",
          reason: "",
          history: [],
          superseded: false,
          semantic: {
            state: "initial",
            binding: "",
            result: null,
            disposition: "",
          },
        };
      }),
  );
  const order = new Map(snapshot.messages.map((m, i) => [m.id, i]));
  const timeline = [...analysis.timeline].sort(
    (a, b) =>
      Math.min(...a.evidence.map((e) => order.get(e.messageId)!)) -
      Math.min(...b.evidence.map((e) => order.get(e.messageId)!)),
  );
  return {
    snapshot,
    analysis: { ...analysis, timeline },
    findings,
    proposals,
    relations: analysis.proposalRelations.map((r, relationIndex) =>
      withDomainLocation(
        { domainArea: "proposal.relation", relationIndex },
        () => {
          const left = proposals.find(
              (p) => p.original?.key === r.leftProposalKey,
            ),
            right = proposals.find(
              (p) => p.original?.key === r.rightProposalKey,
            );
          requireThat(
            left && right,
            "PROPOSAL_REFERENCE_INVALID",
            "Unknown relation proposal",
          );
          return { left: left.id, right: right.id, reason: r.reasoning };
        },
      ),
    ),
  };
}
function get(review: Review, id: string) {
  const p = review.proposals.find((p) => p.id === id);
  requireThat(p, "PROPOSAL_REFERENCE_INVALID", "Unknown proposal");
  return p;
}
function update(
  review: Review,
  id: string,
  fn: (p: Proposal) => Proposal,
): Review {
  get(review, id);
  return {
    ...review,
    proposals: review.proposals.map((p) => (p.id === id ? fn(p) : p)),
  };
}
export function editProposal(review: Review, id: string, text: string): Review {
  return update(review, id, (p) => {
    const current = {
      ...p.current,
      version: p.current.version + 1,
      replacementText: text,
    };
    return {
      ...p,
      current,
      decision: "Pending",
      reason: "",
      history: [
        ...p.history,
        {
          edit: p.current,
          decision: p.decision,
          reason: p.reason,
          semantic: p.semantic,
        },
      ],
      semantic: { state: "stale", binding: "", result: null, disposition: "" },
    };
  });
}
export function semanticContext(review: Review, id: string) {
  const p = get(review, id);
  validateEdit(review.snapshot, p.current);
  const describe = (q: Proposal) => ({
    id: q.id,
    version: q.current.version,
    findingIds: q.findingIds,
    replacementText: q.current.replacementText,
    start: q.current.start,
    end: q.current.end,
    expectedText: q.current.expectedText,
  });
  const peers = review.proposals
    .filter((q) => q.id !== id && !q.superseded && q.decision === "Approved")
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(describe);
  const context = {
    investigationId: review.snapshot.investigationId,
    version: review.snapshot.version,
    proposal: describe(p),
    rulesText: review.snapshot.rulesText,
    rules: segmentRules(review.snapshot.rulesText),
    peers,
    evidence: [] as { messageId: string; quote: string; occurrence: number }[],
  };
  return { context, binding: JSON.stringify(context) };
}
export function applySemanticResult(
  review: Review,
  id: string,
  binding: string,
  result: SemanticRecheckWire,
): Review {
  return withDomainLocation(
    {
      domainArea: "semantic",
      proposalIndex: review.proposals.findIndex((p) => p.id === id),
    },
    () => {
      requireThat(
        semanticContext(review, id).binding === binding,
        "SEMANTIC_RESPONSE_STALE",
        "Semantic response is stale",
      );
      const ruleIds = segmentRules(review.snapshot.rulesText).map((r) => r.id),
        peerIds = semanticContext(review, id).context.peers.map((p) => p.id);
      for (const c of result.comparisons)
        requireThat(
          c.ruleIds.every((r) => ruleIds.includes(r)) &&
            c.proposalIds.every((p) => peerIds.includes(p)),
          "SEMANTIC_REFERENCE_INVALID",
          "Unknown semantic reference",
        );
      return update(review, id, (p) => ({
        ...p,
        decision: "Pending",
        semantic: { state: "reviewed", binding, result, disposition: "" },
      }));
    },
  );
}

export function markSemanticPending(
  review: Review,
  id: string,
  reason: string,
) {
  return update(review, id, (p) => ({
    ...p,
    decision: "Pending",
    reason,
    semantic: { ...p.semantic, state: "pending" },
  }));
}
export function disposeSemanticIssue(
  review: Review,
  id: string,
  reason: string,
) {
  requireThat(
    reason.trim(),
    "REVIEW_DECISION_INVALID",
    "A disposition requires a reason",
  );
  const p = get(review, id);
  requireThat(
    p.semantic.state === "initial" ||
      (p.semantic.state === "reviewed" &&
        p.semantic.result?.status !== "uncertain" &&
        p.semantic.binding === semanticContext(review, id).binding),
    "REVIEW_DECISION_INVALID",
    "A current conclusive semantic review is required",
  );
  return update(review, id, (p) => ({
    ...p,
    semantic: { ...p.semantic, disposition: reason },
  }));
}
export function semanticBlock(review: Review, p: Proposal): string | null {
  if (p.semantic.state === "stale") return "Stale — recheck required";
  if (p.semantic.state === "pending") return "Semantic review pending";
  if (p.semantic.state === "reviewed") {
    if (p.semantic.binding !== semanticContext(review, p.id).binding)
      return "Stale — comparison context changed";
    if (p.semantic.result?.status === "uncertain")
      return "Semantic review uncertain";
    if (p.semantic.result?.status !== "no_issue" && !p.semantic.disposition)
      return "Semantic issue requires review";
  } else if (
    !p.semantic.disposition &&
    review.findings.some(
      (f) =>
        p.findingIds.includes(f.id) &&
        f.source.comparisons.some((c) =>
          ["equivalent", "possible_conflict"].includes(c.relation),
        ),
    )
  )
    return "Historical instruction issue requires review";
  return null;
}
export function overlaps(a: Edit, b: Edit) {
  return (
    a.affectedRuleIds.some((r) => b.affectedRuleIds.includes(r)) ||
    (a.start === a.end
      ? a.start >= b.start && a.start <= b.end
      : b.start === b.end
        ? b.start >= a.start && b.start <= a.end
        : a.start < b.end && b.start < a.end)
  );
}
export function exportPlan(review: Review) {
  const candidates = review.proposals.filter(
    (p) => p.decision === "Approved" && !p.superseded,
  );
  const conflicts: { left: string; right: string; reason: string }[] = [];
  for (let i = 0; i < candidates.length; i++)
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i],
        b = candidates[j];
      const semantic = review.relations.find(
        (r) =>
          (r.left === a.id && r.right === b.id) ||
          (r.right === a.id && r.left === b.id),
      );
      if (overlaps(a.current, b.current))
        conflicts.push({
          left: a.id,
          right: b.id,
          reason: "Overlapping targets or same historical passage",
        });
      else if (
        [a, b].some(
          (p) =>
            p.semantic.state === "reviewed" &&
            !p.semantic.disposition &&
            p.semantic.result?.comparisons.some((c) =>
              c.proposalIds.includes(p.id === a.id ? b.id : a.id),
            ),
        )
      )
        conflicts.push({
          left: a.id,
          right: b.id,
          reason: "Targeted semantic issue requires review",
        });
      else if (
        semantic &&
        a.current.version === 1 &&
        b.current.version === 1 &&
        !(a.semantic.disposition && b.semantic.disposition)
      )
        conflicts.push(semantic);
    }
  const eligible: Proposal[] = [],
    excluded: { proposal: Proposal; reason: string }[] = [];
  for (const p of review.proposals) {
    let reason = p.superseded
      ? "Superseded"
      : p.decision !== "Approved"
        ? p.decision
        : semanticBlock(review, p);
    if (!reason && conflicts.some((c) => c.left === p.id || c.right === p.id))
      reason = "Conflict requires review";
    try {
      validateEdit(review.snapshot, p.current);
    } catch (e) {
      reason = (e as Error).message;
    }
    if (reason) excluded.push({ proposal: p, reason });
    else eligible.push(p);
  }
  let text = review.snapshot.rulesText;
  for (const p of [...eligible].sort(
    (a, b) => b.current.start - a.current.start,
  ))
    text =
      text.slice(0, p.current.start) +
      p.current.replacementText +
      text.slice(p.current.end);
  return { text, eligible, excluded, conflicts };
}
export function decideProposal(
  review: Review,
  id: string,
  decision: Decision,
  reason = "",
): Review {
  const p = get(review, id);
  requireThat(
    !p.superseded,
    "REVIEW_DECISION_INVALID",
    "Proposal is superseded",
  );
  if (decision === "Rejected")
    requireThat(
      reason.trim(),
      "REVIEW_DECISION_INVALID",
      "Rejection requires a reason",
    );
  if (decision === "Approved") validateEdit(review.snapshot, p.current);
  if (decision === "Approved")
    requireThat(
      !semanticBlock(review, p),
      "REVIEW_DECISION_INVALID",
      semanticBlock(review, p) || "Semantic review required",
    );
  return update(review, id, (p) => ({ ...p, decision, reason }));
}
export function decideFinding(
  review: Review,
  id: string,
  decision: Decision,
  reason = "",
): Review {
  const f = review.findings.find((f) => f.id === id);
  requireThat(f, "PROPOSAL_REFERENCE_INVALID", "Unknown finding");
  requireThat(
    decision !== "Approved",
    "REVIEW_DECISION_INVALID",
    "Approve a proposal, not a finding",
  );
  if (decision === "Rejected")
    requireThat(
      reason.trim(),
      "REVIEW_DECISION_INVALID",
      "Rejection requires a reason",
    );
  let next = {
    ...review,
    findings: review.findings.map((f) =>
      f.id === id ? { ...f, decision, reason } : f,
    ),
  };
  for (const p of next.proposals.filter(
    (p) => p.findingIds.includes(id) && !p.superseded,
  ))
    next = decideProposal(next, p.id, decision, reason);
  return next;
}
export function mergeProposals(
  review: Review,
  ids: string[],
  text: string,
): Review {
  requireThat(
    new Set(ids).size >= 2,
    "REVIEW_DECISION_INVALID",
    "Choose two or more proposals",
  );
  const sources = ids.map((id) => get(review, id));
  requireThat(
    sources.every((p) => !p.superseded),
    "REVIEW_DECISION_INVALID",
    "Cannot merge superseded proposals",
  );
  const start = Math.min(...sources.map((p) => p.current.start)),
    end = Math.max(...sources.map((p) => p.current.end));
  const current: Edit = {
    version: 1,
    start,
    end,
    expectedText: review.snapshot.rulesText.slice(start, end),
    replacementText: text,
    affectedRuleIds: segmentRules(review.snapshot.rulesText)
      .filter((r) => r.start <= end && r.end >= start)
      .map((r) => r.id),
  };
  validateEdit(review.snapshot, current);
  const merged: Proposal = {
    id: id(),
    findingIds: [...new Set(sources.flatMap((p) => p.findingIds))],
    original: null,
    current,
    decision: "Pending",
    reason: "Developer-merged revision",
    history: sources.flatMap((p) => [
      ...p.history,
      { edit: p.current, decision: p.decision, reason: p.reason },
    ]),
    superseded: false,
    semantic: { state: "stale", binding: "", result: null, disposition: "" },
  };
  return {
    ...review,
    proposals: [
      ...review.proposals.map((p) =>
        ids.includes(p.id) ? { ...p, superseded: true } : p,
      ),
      merged,
    ],
  };
}

/** Review-time conflicts include candidates awaiting a decision. Export-time
 * conflicts remain limited to coexisting approved proposals, so a pending
 * competitor cannot silently remove an independent approval from export. */
export function reviewConflicts(
  review: Review,
): { left: string; right: string; reason: string }[] {
  const active = review.proposals.filter(
    (p) =>
      !p.superseded && (p.decision === "Pending" || p.decision === "Approved"),
  );
  const result: { left: string; right: string; reason: string }[] = [];
  for (let i = 0; i < active.length; i++)
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i],
        b = active[j];
      if (overlaps(a.current, b.current)) {
        result.push({
          left: a.id,
          right: b.id,
          reason: "Overlapping targets or same historical passage",
        });
        continue;
      }
      const original = review.relations.find(
        (r) =>
          (r.left === a.id && r.right === b.id) ||
          (r.left === b.id && r.right === a.id),
      );
      if (
        original &&
        a.current.version === 1 &&
        b.current.version === 1 &&
        !(a.semantic.disposition && b.semantic.disposition)
      ) {
        result.push(original);
        continue;
      }
      for (const target of [a, b]) {
        if (target.semantic.state !== "reviewed" || target.semantic.disposition)
          continue;
        let current = false;
        try {
          current =
            target.semantic.binding ===
            semanticContext(review, target.id).binding;
        } catch {
          /* Invalid drafts need correction before semantic review. */
        }
        if (!current) continue;
        const issue = target.semantic.result?.comparisons.find((c) =>
          c.proposalIds.includes(target.id === a.id ? b.id : a.id),
        );
        if (issue) {
          result.push({ left: a.id, right: b.id, reason: issue.reasoning });
          break;
        }
      }
    }
  return result;
}
