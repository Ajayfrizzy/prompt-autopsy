"use client";
import { useState } from "react";
import { diffLines } from "diff";
import {
  ArrowRight,
  Download,
  Link as LinkIcon,
  FileText,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useInvestigation } from "./workspace";
import { segmentRules } from "../domain/inputs";
import {
  reviewConflicts,
  exportPlan,
  editProposal,
  decideProposal,
  decideFinding,
  semanticBlock,
  semanticContext,
  applySemanticResult,
  markSemanticPending,
  disposeSemanticIssue,
  mergeProposals,
  exactOccurrence,
  type Review,
  type Decision,
  type Proposal,
} from "../domain/review";
import { generateReport } from "../domain/report";
import type { SemanticRecheckWire } from "../server/ai/schemas";
import { downloadFile } from "../browser/files";
export function Results() {
  const { state, send, run } = useInvestigation();
  const review = state.review!;
  const [tab, setTab] = useState<"messages" | "rules">("messages");
  const [citation, setCitation] = useState<{
    id: string;
    quote: string;
    occurrence: number;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [merged, setMerged] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const [exported, setExported] = useState(false);
  const selected =
    review.findings.find((f) => f.id === state.selected) ?? review.findings[0];
  const plan = exportPlan(review);
  const visibleConflicts = reviewConflicts(review);
  const privacy = state.originalRules !== state.snapshot.rulesText;
  const report = generateReport(review, { privacyRedacted: privacy });
  const guard = (fn: () => Review) => {
    try {
      send({ type: "review", review: fn() });
    } catch (e) {
      send({
        type: "error",
        message: e instanceof Error ? e.message : "Review failed",
      });
    }
  };
  const show = (
    id: string,
    quote: string,
    occurrence: number,
    kind: "messages" | "rules",
  ) => {
    if (state.stage === 3) send({ type: "stage", stage: 2 });
    setTab(kind);
    setCitation({ id, quote, occurrence });
    setTimeout(
      () =>
        document
          .getElementById(`source-${id}`)
          ?.scrollIntoView({ block: "nearest", behavior: "smooth" }),
      0,
    );
  };
  const refs = (
    items: { messageId: string; quote: string; occurrence: number }[],
  ) =>
    items.map((ref, i) => (
      <button
        className="source-link"
        key={`${ref.messageId}-${i}`}
        onClick={(e) => {
          e.stopPropagation();
          show(ref.messageId, ref.quote, ref.occurrence, "messages");
        }}
      >
        <LinkIcon size={11} />
        {ref.messageId}
      </button>
    ));
  async function recheck(p: Proposal) {
    try {
      const { context, binding } = semanticContext(review, p.id);
      const contextHash = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(binding),
          ),
        ),
      )
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("");
      send({
        type: "review",
        review: markSemanticPending(review, p.id, "Semantic review requested"),
      });
      await run(
        "recheck",
        {
          investigationId: state.snapshot.investigationId,
          version: state.snapshot.version,
          proposalId: p.id,
          proposalVersion: p.current.version,
          contextHash,
          consent: true,
          context,
        },
        (result, current) => {
          if (!current.review) throw new Error("Investigation became stale");
          return applySemanticResult(
            current.review,
            p.id,
            binding,
            result as SemanticRecheckWire,
          );
        },
      );
    } catch (e) {
      send({
        type: "error",
        message:
          e instanceof Error ? e.message : "Semantic review could not start",
      });
    }
  }
  const save = (name: string, text: string) => {
    downloadFile(name, text);
    send({ type: "download", name, content: text });
    setExported(true);
  };
  function leave() {
    const missing =
      state.downloaded["prompt-autopsy-report.md"] !== report ||
      (plan.eligible.length > 0 &&
        state.downloaded[state.snapshot.rulesFilename] !==
          (review.snapshot.rulesBom ? "\uFEFF" : "") + plan.text);
    if (
      missing &&
      !window.confirm(
        "You have reviewed results that have not been downloaded. Returning to Privacy Review keeps this session, but changing inputs will invalidate the findings and decisions. Continue?",
      )
    )
      return;
    send({ type: "stage", stage: 1 });
  }
  return (
    <div className="results-workspace">
      <div className="between results-toolbar">
        <div>
          <span className="badge">{review.findings.length} FINDINGS</span>{" "}
          <span className="badge">
            {review.snapshot.messages.length} SOURCE MESSAGES
          </span>
        </div>
        <div className="actions">
          <button onClick={leave} disabled={!!state.active}>
            Return to Privacy Review
          </button>
          {state.stage === 2 && (
            <button
              className="primary compact"
              onClick={() => send({ type: "stage", stage: 3 })}
            >
              Review decisions <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
      {review.analysis.coverage.status === "limited" && (
        <div className="alert">
          <AlertTriangle size={18} />
          Limited coverage: {review.analysis.coverage.reason}
        </div>
      )}
      {state.stage === 2 ? (
        <div className="investigation-grid">
          <aside className="panel timeline">
            <p className="eyebrow">ANNOTATED TIMELINE</p>
            <h2>What the session records</h2>
            <p className="hint">Sequence does not establish causation.</p>
            {review.analysis.timeline.map((event, i) => (
              <button
                key={i}
                className={`timeline-event ${selected && event.findingKeys.includes(selected.source.key) ? "active" : ""}`}
                onClick={() => {
                  const finding = review.findings.find((f) =>
                    event.findingKeys.includes(f.source.key),
                  );
                  if (finding) send({ type: "select", id: finding.id });
                  const ref = event.evidence[0];
                  if (ref)
                    show(ref.messageId, ref.quote, ref.occurrence, "messages");
                }}
              >
                <span className="event-dot" />
                <span className="eyebrow">
                  {event.kind} ·{" "}
                  {event.interpretation === "observed"
                    ? "Observed"
                    : "Possible explanation"}
                </span>
                <p>{event.description}</p>
                <span className="source-link">
                  {event.evidence.map((e) => e.messageId).join(" · ")}
                </span>
              </button>
            ))}
            {!review.analysis.timeline.length && (
              <p className="hint">No timeline events could be supported.</p>
            )}
          </aside>
          <section className="stack">
            <div className="panel investigation-summary">
              <p className="eyebrow">INVESTIGATION SUMMARY</p>
              <p>{review.analysis.summary}</p>
              {review.analysis.limitations.map((l, i) => (
                <p className="hint" key={i}>
                  {l}
                </p>
              ))}
            </div>
            {review.findings.map((f) => (
              <article
                key={f.id}
                className={`panel finding ${f.id === selected?.id ? "selected" : ""}`}
                onClick={() => {
                  send({ type: "select", id: f.id });
                  const ref =
                    f.source.observations[0]?.evidence[0] ??
                    f.source.documentedRequirement?.evidence[0];
                  if (ref)
                    show(ref.messageId, ref.quote, ref.occurrence, "messages");
                }}
              >
                <div className="between">
                  <span className="badge">
                    {f.source.evidenceState === "supported"
                      ? "EVIDENCE SUPPORTED"
                      : "INSUFFICIENT EVIDENCE"}
                  </span>
                  <span className="muted">{f.source.key}</span>
                </div>
                <h2>{f.source.title}</h2>
                {f.source.documentedRequirement && (
                  <div className="observation documented-requirement">
                    <h3>Documented requirement</h3>
                    <p>{f.source.documentedRequirement.text}</p>
                    {refs(f.source.documentedRequirement.evidence)}
                  </div>
                )}
                {f.source.observations.map((o, i) => (
                  <div className="observation" key={i}>
                    <h3>Observed</h3>
                    <p>{o.text}</p>
                    {refs(o.evidence)}
                  </div>
                ))}
                {f.source.hypotheses.map((h, i) => (
                  <div className="hypothesis" key={i}>
                    <h3>Possible explanation</h3>
                    <p>{h.text}</p>
                    <p className="hint">{h.limitation}</p>
                    {refs(h.supportingEvidence)}
                  </div>
                ))}
                {f.source.missingEvidence.length > 0 && (
                  <div className="hypothesis missing-evidence">
                    <h3>Evidence still needed</h3>
                    {f.source.missingEvidence.map((e, i) => (
                      <p key={i}>{e}</p>
                    ))}
                  </div>
                )}
                <div className="rule-comparison">
                  <h3>Historical instruction comparison</h3>
                  {f.source.comparisons.map((c, i) => (
                    <div key={i}>
                      <span className="badge">
                        {c.relation.replaceAll("_", " ")}
                      </span>
                      <p>{c.reasoning}</p>
                      {c.rules.map((r, j) => (
                        <button
                          className="source-link"
                          key={j}
                          onClick={(e) => {
                            e.stopPropagation();
                            show(r.ruleId, r.quote, r.occurrence, "rules");
                          }}
                        >
                          {r.ruleId} · View instruction
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
          <aside className="panel inspector">
            <div className="between">
              <h2>Evidence inspector</h2>
              <FileText size={17} />
            </div>
            <div className="tabs">
              <button
                className={tab === "messages" ? "active" : ""}
                onClick={() => setTab("messages")}
              >
                Source messages
              </button>
              <button
                className={tab === "rules" ? "active" : ""}
                onClick={() => setTab("rules")}
              >
                Historical rules
              </button>
            </div>
            <p className="hint">
              {tab === "rules"
                ? "User-supplied historical file; not proof of agent access or compliance."
                : "Exact reviewed text. Removed passages are not evidence."}
            </p>
            {tab === "messages"
              ? review.snapshot.messages.map((m) => (
                  <article id={`source-${m.id}`} key={m.id} className="message">
                    <div className="between">
                      <strong>{m.id}</strong>
                      <span className="badge">{m.speaker}</span>
                    </div>
                    <pre>
                      <Highlighted
                        text={m.body}
                        citation={citation?.id === m.id ? citation : null}
                      />
                    </pre>
                  </article>
                ))
              : segmentRules(review.snapshot.rulesText).map((r) => (
                  <article id={`source-${r.id}`} key={r.id} className="message">
                    <strong>{r.id}</strong>
                    <pre>
                      <Highlighted
                        text={r.text}
                        citation={citation?.id === r.id ? citation : null}
                      />
                    </pre>
                  </article>
                ))}
          </aside>
        </div>
      ) : (
        <>
          <div className="decision-grid">
            <aside className="panel">
              <p className="eyebrow">FINDINGS</p>
              {review.findings.map((f) => (
                <button
                  className={`finding-nav ${f.id === selected?.id ? "active" : ""}`}
                  key={f.id}
                  onClick={() => {
                    send({ type: "select", id: f.id });
                    setReason("");
                  }}
                >
                  <strong>{f.source.title}</strong>
                  <span>
                    {review.proposals.find(
                      (p) => p.findingIds.includes(f.id) && !p.superseded,
                    )?.decision ?? f.decision}
                  </span>
                </button>
              ))}
            </aside>
            <section className="stack">
              {selected && (
                <article className="panel decision-detail">
                  <span className="badge">
                    {selected.source.recommendation.replaceAll("_", " ")}
                  </span>
                  <h2>{selected.source.title}</h2>
                  <p>{selected.source.rationale}</p>
                  {selected.source.observations.map((o, i) => (
                    <p className="hint" key={i}>
                      {o.text} {refs(o.evidence)}
                    </p>
                  ))}
                  <button onClick={() => send({ type: "stage", stage: 2 })}>
                    Inspect evidence and historical rules
                  </button>
                  {review.proposals
                    .filter(
                      (p) =>
                        p.findingIds.includes(selected.id) && !p.superseded,
                    )
                    .map((p) => (
                      <div key={p.id} className="proposal">
                        <DecisionStatus
                          decision={p.decision}
                          eligible={plan.eligible.some(
                            (item) => item.id === p.id,
                          )}
                          stale={p.semantic.state === "stale"}
                        />
                        <div className="compare-grid">
                          <div>
                            <h3>Reviewed historical baseline</h3>
                            <pre>
                              {p.current.expectedText ||
                                "(Insertion — no existing text removed)"}
                            </pre>
                            <p className="hint">
                              Range {p.current.start}–{p.current.end}
                            </p>
                          </div>
                          <div className="proposed-revision">
                            <h3>Proposed revision</h3>
                            <textarea
                              className="code"
                              aria-label="Proposed instruction"
                              rows={8}
                              disabled={!!state.active}
                              value={p.current.replacementText}
                              onChange={(e) =>
                                guard(() =>
                                  editProposal(review, p.id, e.target.value),
                                )
                              }
                            />
                            <p className="hint">
                              {p.original && p.current.version > 1
                                ? "Developer-edited · original suggestion retained in report"
                                : "Review the exact text before approval."}
                            </p>
                          </div>
                        </div>
                        <p className="status-line">
                          {semanticBlock(review, p) ??
                            (p.semantic.state === "initial"
                              ? "Original analysis comparison available"
                              : "No duplicate or conflict was identified in the supplied comparison context.")}
                        </p>
                        {p.semantic.result && (
                          <div className="notice">
                            <div>
                              <strong>
                                {p.semantic.result.status.replaceAll("_", " ")}
                              </strong>
                              <p>{p.semantic.result.reasoning}</p>
                              {p.semantic.result.comparisons.map((c, i) => (
                                <p key={i}>
                                  {c.ruleIds.join(", ")}{" "}
                                  {c.proposalIds.join(", ")} — {c.reasoning}
                                </p>
                              ))}
                              {p.semantic.result.limitations.map((l, i) => (
                                <p key={i}>{l}</p>
                              ))}
                            </div>
                          </div>
                        )}
                        <label>
                          Decision reason / semantic issue disposition
                          <textarea
                            aria-label="Decision reason"
                            rows={2}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                          />
                        </label>
                        <div className="actions">
                          <button
                            className="primary compact"
                            disabled={
                              !!state.active ||
                              p.decision === "Approved" ||
                              !!semanticBlock(review, p)
                            }
                            onClick={() =>
                              guard(() =>
                                decideProposal(
                                  review,
                                  p.id,
                                  "Approved",
                                  reason,
                                ),
                              )
                            }
                          >
                            {p.decision === "Approved"
                              ? "Approved"
                              : "Approve instruction"}{" "}
                            <Check size={14} />
                          </button>
                          <button
                            disabled={
                              !!state.active || p.decision === "Rejected"
                            }
                            onClick={() =>
                              guard(() =>
                                decideProposal(
                                  review,
                                  p.id,
                                  "Rejected",
                                  reason,
                                ),
                              )
                            }
                          >
                            {p.decision === "Rejected" ? "Rejected" : "Reject"}
                          </button>
                          <button
                            disabled={
                              !!state.active ||
                              p.decision === "No change accepted"
                            }
                            onClick={() =>
                              guard(() =>
                                decideProposal(
                                  review,
                                  p.id,
                                  "No change accepted",
                                  reason || "No rules change accepted.",
                                ),
                              )
                            }
                          >
                            {p.decision === "No change accepted"
                              ? "No change accepted"
                              : "Accept no change"}
                          </button>
                          <button
                            disabled={
                              !!state.active || p.decision === "Needs evidence"
                            }
                            onClick={() =>
                              guard(() =>
                                decideProposal(
                                  review,
                                  p.id,
                                  "Needs evidence",
                                  reason || "Further evidence required.",
                                ),
                              )
                            }
                          >
                            Needs evidence
                          </button>
                        </div>
                        {p.semantic.state !== "initial" && (
                          <div className="recheck">
                            <p className="hint">
                              Review sends the complete reviewed rules, this
                              proposal and coexisting approved proposals to
                              OpenAI for unbilled counting, then budgeted
                              semantic analysis. No full transcript is resent.
                            </p>
                            <button
                              disabled={!!state.active}
                              onClick={() => void recheck(p)}
                            >
                              Review edited proposal
                            </button>
                          </div>
                        )}
                        {semanticBlock(review, p)?.includes("issue") && (
                          <button
                            disabled={!!state.active || !reason.trim()}
                            onClick={() =>
                              guard(() =>
                                disposeSemanticIssue(review, p.id, reason),
                              )
                            }
                          >
                            Record why this advisory flag does not apply
                          </button>
                        )}
                      </div>
                    ))}
                  {!review.proposals.some(
                    (p) => p.findingIds.includes(selected.id) && !p.superseded,
                  ) && (
                    <div className="no-change">
                      <DecisionStatus decision={selected.decision} />
                      <h3>
                        {selected.source.recommendation === "no_change"
                          ? "No rules change recommended"
                          : "More evidence is needed"}
                      </h3>
                      <p>{selected.source.rationale}</p>
                      <label>
                        Decision rationale
                        <textarea
                          aria-label="No-change rationale"
                          rows={2}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                      </label>
                      <div className="actions">
                        <button
                          disabled={
                            !!state.active || selected.decision === "Rejected"
                          }
                          onClick={() =>
                            guard(() =>
                              decideFinding(
                                review,
                                selected.id,
                                "Rejected",
                                reason,
                              ),
                            )
                          }
                        >
                          {selected.decision === "Rejected"
                            ? "Rejected"
                            : "Reject"}
                        </button>
                        <button
                          disabled={
                            !!state.active ||
                            selected.decision === "No change accepted"
                          }
                          onClick={() =>
                            guard(() =>
                              decideFinding(
                                review,
                                selected.id,
                                "No change accepted",
                                reason || selected.source.rationale,
                              ),
                            )
                          }
                        >
                          {selected.decision === "No change accepted"
                            ? "No change accepted"
                            : "Accept no change"}
                        </button>
                        <button
                          disabled={
                            !!state.active ||
                            selected.decision === "Needs evidence"
                          }
                          onClick={() =>
                            guard(() =>
                              decideFinding(
                                review,
                                selected.id,
                                "Needs evidence",
                                reason || "Further evidence required.",
                              ),
                            )
                          }
                        >
                          Needs evidence
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              )}
              {visibleConflicts.length > 0 && (
                <section className="panel">
                  <h2>Conflict requires review</h2>
                  {visibleConflicts.map((c, i) => (
                    <div className="conflict" key={i}>
                      <p>{c.reason}</p>
                      <div className="compare-grid">
                        {[c.left, c.right].map((id) => {
                          const p = review.proposals.find((p) => p.id === id)!;
                          return (
                            <div key={id}>
                              <strong>
                                {p.findingIds
                                  .map(
                                    (id) =>
                                      review.findings.find((f) => f.id === id)
                                        ?.source.title,
                                  )
                                  .join(" · ")}
                              </strong>
                              <h3 className="spaced">
                                Affected reviewed instruction
                              </h3>
                              <pre>
                                {p.current.expectedText || "(Insertion)"}
                              </pre>
                              <h3>Resulting revision</h3>
                              <pre>{p.current.replacementText}</pre>
                              <div>
                                {review.findings
                                  .filter((f) => p.findingIds.includes(f.id))
                                  .flatMap((f) => f.source.observations)
                                  .map((o, i) => (
                                    <p key={i}>
                                      {o.text} {refs(o.evidence)}
                                    </p>
                                  ))}
                              </div>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={chosen.includes(id)}
                                  onChange={(e) =>
                                    setChosen(
                                      e.target.checked
                                        ? [...new Set([...chosen, id])]
                                        : chosen.filter((v) => v !== id),
                                    )
                                  }
                                />
                                Include in merged revision
                              </label>
                              <button
                                onClick={() =>
                                  guard(() =>
                                    decideProposal(
                                      review,
                                      id === c.left ? c.right : c.left,
                                      "Rejected",
                                      reason ||
                                        "Competing proposal excluded; kept the selected proposal.",
                                    ),
                                  )
                                }
                              >
                                Keep this proposal
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <div className="actions">
                        <button
                          onClick={() =>
                            guard(() =>
                              decideProposal(
                                decideProposal(
                                  review,
                                  c.left,
                                  "Rejected",
                                  reason,
                                ),
                                c.right,
                                "Rejected",
                                reason,
                              ),
                            )
                          }
                        >
                          Reject both (reason required)
                        </button>
                        <button
                          onClick={() =>
                            guard(() =>
                              decideProposal(
                                decideProposal(
                                  review,
                                  c.left,
                                  "Needs evidence",
                                  reason || "Conflict needs more evidence",
                                ),
                                c.right,
                                "Needs evidence",
                                reason || "Conflict needs more evidence",
                              ),
                            )
                          }
                        >
                          Both need evidence
                        </button>
                      </div>
                    </div>
                  ))}
                  <label>
                    Merged revision — review all intervening text
                    <textarea
                      rows={5}
                      value={merged}
                      onChange={(e) => setMerged(e.target.value)}
                    />
                  </label>
                  <button
                    disabled={chosen.length < 2 || !!state.active}
                    onClick={() =>
                      guard(() => mergeProposals(review, chosen, merged))
                    }
                  >
                    Create merged proposal (requires recheck)
                  </button>
                </section>
              )}
            </section>
          </div>
          <section className="panel final-preview">
            <div className="between">
              <div>
                <p className="eyebrow">DECISION & EXPORT</p>
                <h2>Review the file you’ll carry forward</h2>
              </div>
              <span className="badge">
                {plan.eligible.length} CHANGES READY
              </span>
            </div>
            <div className="summary-cards">
              <div>
                <strong>{plan.eligible.length}</strong>Approved · export
                eligible
              </div>
              <div>
                <strong>
                  {review.findings.filter(
                    (f) => f.decision === "No change accepted",
                  ).length +
                    review.proposals.filter(
                      (p) =>
                        p.decision === "No change accepted" && !p.superseded,
                    ).length}
                </strong>
                No-change decisions
              </div>
              <div>
                <strong>{plan.excluded.length}</strong>Proposals not included
              </div>
              <div>
                <strong>{plan.conflicts.length}</strong>Unresolved conflicts
              </div>
            </div>
            <div className="diff-legend">
              <span>Original unchanged content</span>
              <span className="privacy-label">
                Developer privacy redactions
              </span>
              <span className="approved-label">
                Approved Prompt Autopsy changes
              </span>
            </div>
            {privacy && (
              <div className="notice privacy-label">
                Historical rules were changed during Privacy Review. Removed
                content is hidden and will not be restored. The diff below
                starts from the reviewed/redacted baseline; privacy changes are
                not approved instruction changes.
              </div>
            )}
            {privacy && (
              <details className="privacy-provenance">
                <summary>
                  Developer privacy edits (removed text stays hidden)
                </summary>
                {diffLines(state.originalRules, state.snapshot.rulesText)
                  .filter((part) => part.added || part.removed)
                  .map((part, i) => (
                    <pre key={i} className="privacy-label">
                      {part.removed
                        ? "[Historical passage removed or replaced during Privacy Review]"
                        : part.value}
                    </pre>
                  ))}
              </details>
            )}
            <div className="diff">
              <div className="diff-header">
                {review.snapshot.rulesFilename} · reviewed baseline → eligible
                revision
              </div>
              {diffLines(review.snapshot.rulesText, plan.text).map(
                (part, i) => (
                  <pre
                    key={i}
                    className={
                      part.added
                        ? "added"
                        : part.removed
                          ? "removed"
                          : "unchanged"
                    }
                  >
                    {part.added ? "+ " : part.removed ? "- " : "  "}
                    {part.value}
                  </pre>
                ),
              )}
            </div>
            <h3 className="spaced">Not included</h3>
            {plan.excluded.map((e) => (
              <p className="excluded" key={e.proposal.id}>
                <span className="badge">{e.proposal.decision}</span>{" "}
                {e.proposal.findingIds
                  .map(
                    (id) =>
                      review.findings.find((f) => f.id === id)?.source.title,
                  )
                  .join(" · ")}{" "}
                — {e.reason}
              </p>
            ))}
            {review.findings
              .filter(
                (f) =>
                  !review.proposals.some((p) => p.findingIds.includes(f.id)),
              )
              .map((f) => (
                <p className="excluded" key={f.id}>
                  {f.source.title} — {f.decision}; no rules modification
                </p>
              ))}
            <div className="actions spaced">
              {plan.eligible.length > 0 && (
                <button
                  className="primary compact"
                  disabled={!!state.active}
                  onClick={() =>
                    save(
                      review.snapshot.rulesFilename,
                      (review.snapshot.rulesBom ? "\uFEFF" : "") + plan.text,
                    )
                  }
                >
                  <Download size={16} />
                  Download {review.snapshot.rulesFilename}
                </button>
              )}
              <button
                disabled={!!state.active}
                onClick={() => save("prompt-autopsy-report.md", report)}
              >
                <Download size={16} />
                Download investigation report
              </button>
            </div>
            {exported && (
              <p role="status">
                {review.findings.some((f) =>
                  ["Pending", "Needs evidence"].includes(
                    review.proposals.find(
                      (p) => p.findingIds.includes(f.id) && !p.superseded,
                    )?.decision ?? f.decision,
                  ),
                ) ||
                plan.conflicts.length ||
                plan.excluded.some((e) => e.proposal.decision === "Approved")
                  ? "Export completed with unresolved findings."
                  : "Reviewed export downloaded. Approval is not verification."}
              </p>
            )}
            <p className="hint">
              Every finding and decision is included in the report. Downloading
              does not save this interactive session.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
function Highlighted({
  text,
  citation,
}: {
  text: string;
  citation: { quote: string; occurrence: number } | null;
}) {
  if (!citation) return <>{text}</>;
  try {
    const at = exactOccurrence(text, citation.quote, citation.occurrence);
    return (
      <>
        {text.slice(0, at)}
        <mark>{text.slice(at, at + citation.quote.length)}</mark>
        {text.slice(at + citation.quote.length)}
      </>
    );
  } catch {
    return <>{text}</>;
  }
}

function DecisionStatus({
  decision,
  eligible = false,
  stale = false,
}: {
  decision: Decision;
  eligible?: boolean;
  stale?: boolean;
}) {
  const label =
    decision === "Approved"
      ? eligible
        ? "APPROVED · READY FOR EXPORT"
        : "APPROVED · NOT READY FOR EXPORT"
      : decision.toUpperCase();
  const message =
    decision === "Approved"
      ? eligible
        ? "Instruction approved and ready for export."
        : "Approval recorded. This instruction is not currently eligible for export; review the outstanding requirements."
      : decision === "Rejected"
        ? "Rejection recorded. No instruction change will be exported."
        : decision === "No change accepted"
          ? "No-change decision recorded. No instruction change will be exported."
          : decision === "Needs evidence"
            ? "Needs evidence recorded. No instruction change will be exported."
            : stale
              ? "Wording changed. Any previous approval is no longer current; semantic recheck and explicit approval are required."
              : "No decision recorded yet.";
  return (
    <div
      className="notice decision-status"
      role="status"
      aria-label="Recorded decision"
      aria-atomic="true"
    >
      <div>
        <strong>{label}</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}
