// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash, webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Workspace } from "../../src/components/workspace";
import type { AnalysisWire } from "../../src/server/ai/schemas";

const sample = readFileSync(
  resolve(process.cwd(), "public/samples/transcript.txt"),
  "utf8",
);
const requirement =
  "Ignore should remove only the selected product, leaving the other three and the bundle identity unchanged.";
const observation =
  "Testing found that ignoring one product made all four disappear.";
const suggested =
  "\nDistinguish item, screenshot and bundle operations. Preserve unrelated items.\n";
const revised =
  "\nFor grouped content, confirm the operation targets one item and test unrelated items remain.\n";
const fetchMock = vi.fn();
let downloads: { name: string; blob: Blob }[];
let blobs: Blob[];

function findingOutput(noChange = false): AnalysisWire {
  return {
    summary:
      "Fictional example: screenshot-level removal affected four products.",
    coverage: { status: "within_capacity", reason: null },
    findings: [
      {
        key: "F1",
        title: "Item action affected the screenshot",
        evidenceState: "supported",
        observations: [
          {
            text: "Removal affected unrelated products.",
            evidence: [
              { messageId: "M003", quote: observation, occurrence: 1 },
            ],
          },
        ],
        documentedRequirement: {
          text: "Remove only the selected product.",
          evidence: [{ messageId: "M001", quote: requirement, occurrence: 1 }],
        },
        hypotheses: [
          {
            text: "The agent may have conflated item and screenshot scope.",
            supportingEvidence: [],
            limitation:
              "The transcript does not establish the agent's internal reasoning.",
          },
        ],
        missingEvidence: ["Independent browser verification is not supplied."],
        comparisons: noChange
          ? [
              {
                relation: "equivalent",
                rules: [{ ruleId: "R001", quote: "Keep logs.", occurrence: 1 }],
                reasoning:
                  "Controlled no-change UI fixture; existing guidance was selected for review.",
              },
            ]
          : [],
        ...(noChange
          ? { recommendation: "no_change" as const, proposalKey: null }
          : { recommendation: "add" as const, proposalKey: "P1" }),
        rationale: noChange
          ? "No addition recommended in this controlled fixture."
          : "Require explicit operation scope before implementation.",
      },
    ],
    timeline: [
      {
        kind: "requirement",
        description: "The developer requested item-only removal.",
        interpretation: "observed",
        evidence: [{ messageId: "M001", quote: requirement, occurrence: 1 }],
        findingKeys: ["F1"],
      },
    ],
    proposals: noChange
      ? []
      : [
          {
            key: "P1",
            findingKeys: ["F1"],
            rationale: "Clarify operation scope.",
            operation: "insert",
            target: {
              ruleId: null,
              quote: null,
              occurrence: null,
              placement: "end_of_file",
            },
            replacementText: suggested,
          },
        ],
    proposalRelations: [],
    limitations: [
      "This synthetic fixture tests application behavior, not model accuracy.",
    ],
  };
}

beforeEach(() => {
  downloads = [];
  blobs = [];
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("crypto", webcrypto);
  vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    blobs.push(blob as Blob);
    return `blob:offline-${blobs.length - 1}`;
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push({
      name: this.download,
      blob: blobs[Number(this.href.split("-").at(-1))],
    });
  });
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}
async function investigate(noChange = false) {
  fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    return {
      ok: true,
      json: async () => ({
        requestId: body.requestId,
        generationStarted: true,
        usage: { inputTokens: 1_000, outputTokens: 100 },
        result:
          url === "/api/investigate"
            ? findingOutput(noChange)
            : {
                status: "no_issue",
                comparisons: [],
                reasoning:
                  "No duplicate or conflict identified in the supplied comparison context.",
                limitations: [],
              },
      }),
    };
  });
  render(<Workspace />);
  fireEvent.change(screen.getByLabelText("Incident description"), {
    target: { value: "Fictional: one product removal affected four products." },
  });
  fireEvent.change(screen.getByLabelText("Structured transcript"), {
    target: { value: sample },
  });
  const rules = new File(["Keep logs.\n"], "AGENTS.md", {
    type: "text/markdown",
  });
  Object.defineProperty(rules, "arrayBuffer", {
    value: async () => new TextEncoder().encode("Keep logs.\n").buffer,
  });
  fireEvent.change(screen.getByLabelText("Historical instructions"), {
    target: { files: [rules] },
  });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /Review sensitive content/ }),
    ).toBeEnabled(),
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Review sensitive content/ }),
  );
  fireEvent.click(screen.getByRole("checkbox", { name: /consent to OpenAI/ }));
  fireEvent.click(screen.getByRole("button", { name: /Start Investigation/ }));
  await screen.findByRole("heading", { name: "Evidence inspector" });
}

describe("evidence, decisions and exports", () => {
  it("links exact reviewed evidence and exports only an explicitly approved revision", async () => {
    await investigate();
    expect(screen.getByText("INVESTIGATION SUMMARY")).toBeInTheDocument();
    for (const name of [
      "Documented requirement",
      "Observed",
      "Possible explanation",
      "Evidence still needed",
      "Historical instruction comparison",
    ])
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    expect(
      screen.getByText("Independent browser verification is not supplied."),
    ).toBeInTheDocument();
    expect(screen.getByText("EVIDENCE SUPPORTED")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Possible explanation" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "M001" }));
    expect(document.querySelector("#source-M001 mark")).toHaveTextContent(
      requirement,
    );
    fireEvent.click(screen.getByRole("button", { name: /Review decisions/ }));
    expect(
      screen.queryByRole("button", { name: "Download AGENTS.md" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Approve instruction/ }),
    );
    expect(screen.getByText("1 CHANGES READY")).toBeInTheDocument();
    expect(document.querySelector(".diff .added")).toHaveTextContent(
      "Distinguish item, screenshot and bundle operations.",
    );
    expect(document.querySelector(".diff .unchanged")).toHaveTextContent(
      "Keep logs.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Download AGENTS.md" }));
    expect(downloads).toHaveLength(1);
    expect(downloads[0].name).toBe("AGENTS.md");
    expect(await readBlob(downloads[0].blob)).toBe("Keep logs.\n" + suggested);
    expect(
      screen
        .getAllByRole("status")
        .some((status) =>
          status.textContent?.includes("Approval is not verification"),
        ),
    ).toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("revokes edited approval and requires a bound targeted recheck plus new approval", async () => {
    await investigate();
    fireEvent.click(screen.getByRole("button", { name: /Review decisions/ }));
    fireEvent.click(
      screen.getByRole("button", { name: /Approve instruction/ }),
    );
    fireEvent.change(screen.getByLabelText("Proposed instruction"), {
      target: { value: revised },
    });
    expect(
      screen.queryByRole("button", { name: "Approved" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("APPROVED · READY FOR EXPORT"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "Recorded decision" }),
    ).toHaveTextContent("PENDING");
    expect(
      screen.getByRole("status", { name: "Recorded decision" }),
    ).toHaveTextContent("previous approval is no longer current");
    expect(screen.getByText("Stale — recheck required")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Approve instruction/ }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Download AGENTS.md" }),
    ).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole("button", { name: "Review edited proposal" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [url, init] = fetchMock.mock.calls[1];
    const body = JSON.parse(init.body);
    expect(url).toBe("/api/semantic-recheck");
    expect(body.context.rulesText).toBe("Keep logs.\n");
    expect(body.context.proposal.replacementText).toBe(revised);
    expect(body.contextHash).toBe(
      createHash("sha256").update(JSON.stringify(body.context)).digest("hex"),
    );
    expect(body.context).not.toHaveProperty("messages");
    expect(init.body).not.toContain(observation);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Approve instruction/ }),
      ).toBeEnabled(),
    );
    expect(
      screen.queryByRole("button", { name: "Download AGENTS.md" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Approve instruction/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Download AGENTS.md" }));
    expect(await readBlob(downloads[0].blob)).toBe("Keep logs.\n" + revised);
  });
  it("supports a no-change decision with report-only export", async () => {
    await investigate(true);
    fireEvent.click(screen.getByRole("button", { name: /View instruction/ }));
    expect(document.querySelector("#source-R001 mark")).toHaveTextContent(
      "Keep logs.",
    );
    fireEvent.click(screen.getByRole("button", { name: /Review decisions/ }));
    expect(
      screen.getByRole("heading", { name: "No rules change recommended" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Accept no change" }));
    expect(
      screen.queryByRole("button", { name: "Download AGENTS.md" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Download investigation report" }),
    );
    expect(downloads).toHaveLength(1);
    expect(downloads[0].name).toBe("prompt-autopsy-report.md");
    const report = await readBlob(downloads[0].blob);
    expect(report).toContain("No change accepted");
    expect(report).toContain("M001");
    expect(report).toContain(requirement);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("local recorded decision feedback", () => {
  it("confirms approval, prevents repeat approval and permits needs-evidence reversal without requests", async () => {
    await investigate();
    fireEvent.click(screen.getByRole("button", { name: /Review decisions/ }));
    const approve = screen.getByRole("button", { name: /Approve instruction/ });
    expect(approve).toBeEnabled();
    expect(
      screen.getByRole("status", { name: "Recorded decision" }),
    ).toHaveTextContent("PENDING");
    fireEvent.click(approve);
    expect(
      screen.queryByRole("button", { name: /Approve instruction/ }),
    ).not.toBeInTheDocument();
    const recorded = screen.getByRole("button", {
      name: "Approved",
    });
    expect(recorded).toBeDisabled();
    expect(
      screen.getByRole("status", { name: "Recorded decision" }),
    ).toHaveTextContent("APPROVED · READY FOR EXPORT");
    expect(
      screen.getByRole("status", { name: "Recorded decision" }),
    ).toHaveTextContent("Instruction approved and ready for export.");
    expect(screen.getByText("1 CHANGES READY")).toBeInTheDocument();
    fireEvent.click(recorded);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Needs evidence" }));
    expect(
      screen.getByRole("button", { name: "Needs evidence" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("status", { name: "Recorded decision" }),
    ).toHaveTextContent("NEEDS EVIDENCE");
    expect(screen.queryByText("1 CHANGES READY")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Download AGENTS.md" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Approve instruction/ }),
    ).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each([false, true])(
    "shows reversible rejection/no-change/evidence decisions (no proposal: %s)",
    async (noChange) => {
      await investigate(noChange);
      fireEvent.click(screen.getByRole("button", { name: /Review decisions/ }));
      fireEvent.click(screen.getByRole("button", { name: "Reject" }));
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Rejection requires a reason",
      );
      expect(
        screen.getByRole("status", { name: "Recorded decision" }),
      ).toHaveTextContent("PENDING");
      fireEvent.change(
        screen.getByLabelText(
          noChange ? "No-change rationale" : "Decision reason",
        ),
        { target: { value: "Not appropriate for this incident." } },
      );
      fireEvent.click(screen.getByRole("button", { name: "Reject" }));
      expect(screen.getByRole("button", { name: "Rejected" })).toBeDisabled();
      expect(
        screen.getByRole("status", { name: "Recorded decision" }),
      ).toHaveTextContent("REJECTED");
      fireEvent.click(screen.getByRole("button", { name: "Accept no change" }));
      expect(
        screen.getByRole("button", { name: "No change accepted" }),
      ).toBeDisabled();
      expect(
        screen.getByRole("status", { name: "Recorded decision" }),
      ).toHaveTextContent("NO CHANGE ACCEPTED");
      expect(screen.getByRole("button", { name: "Reject" })).toBeEnabled();
      fireEvent.click(screen.getByRole("button", { name: "Needs evidence" }));
      expect(
        screen.getByRole("status", { name: "Recorded decision" }),
      ).toHaveTextContent("NEEDS EVIDENCE");
      expect(
        screen.getByRole("button", { name: "Accept no change" }),
      ).toBeEnabled();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
});
