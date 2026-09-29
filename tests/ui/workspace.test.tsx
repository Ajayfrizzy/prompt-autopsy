// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Workspace } from "../../src/components/workspace";

const sample = readFileSync(resolve(process.cwd(), "public/samples/transcript.txt"), "utf8");
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function prepareInputs() {
  fireEvent.change(screen.getByLabelText("Incident description"), { target: { value: "Fictional: removing one product removed the other three." } });
  fireEvent.change(screen.getByLabelText("Structured transcript"), { target: { value: sample } });
  const text = "Preserve unrelated saved items.\n";
  const rules = new File([text], "AGENTS.md", { type: "text/markdown" });
  // jsdom's File lacks arrayBuffer; provide the browser method, not a parser mock.
  Object.defineProperty(rules, "arrayBuffer", { value: async () => new TextEncoder().encode(text).buffer });
  fireEvent.change(screen.getByLabelText("Historical instructions"), { target: { files: [rules] } });
  await waitFor(() => expect(screen.getByRole("button", { name: /Review sensitive content/ })).toBeEnabled());
}

describe("Import and Privacy Review", () => {
  it("guards dirty session leave and returns to empty input on a fresh mount", () => {
    const { unmount } = render(<Workspace />);
    const cleanLeave = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(cleanLeave);
    expect(cleanLeave.defaultPrevented).toBe(false);
    fireEvent.change(screen.getByLabelText("Incident description"), { target: { value: "Unsaved incident" } });
    const dirtyLeave = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirtyLeave);
    expect(dirtyLeave.defaultPrevented).toBe(true);
    unmount();
    render(<Workspace />);
    expect(screen.getByLabelText("Incident description")).toHaveValue("");
    expect(screen.getByLabelText("Structured transcript")).toHaveValue("");
    expect(screen.getByRole("button", { name: /Review sensitive content/ })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("shows the documented sample and stable recognized message references locally", async () => {
    render(<Workspace />);
    expect(screen.getByRole("button", { name: /Review sensitive content/ })).toBeDisabled();
    expect(screen.getByRole("link", { name: /Download fictional sample/ })).toHaveAttribute("href", "/samples/transcript.txt");
    fireEvent.change(screen.getByLabelText("Structured transcript"), { target: { value: sample } });
    expect(screen.getByText("5 recognized messages · stable references assigned")).toBeInTheDocument();
    expect(screen.getByText("M001")).toBeInTheDocument();
    expect(screen.getByText("M005")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("requires valid inputs, privacy review and consent before any network request", async () => {
    render(<Workspace />);
    await prepareInputs();
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Review sensitive content/ }));
    const start = screen.getByRole("button", { name: /Start Investigation/ });
    expect(start).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Reviewed historical rules"), { target: { value: "[REDACTED] Preserve other items." } });
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox", { name: /consent to OpenAI counting and analysis/ }));
    expect(start).toBeEnabled();
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const request = JSON.parse(init.body as string);
      return { ok: false, json: async () => ({ requestId: request.requestId, generationStarted: false, message: "Count unavailable. Retry explicitly." }) };
    });
    fireEvent.click(start);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/investigate");
    const payload = JSON.parse(init.body);
    expect(payload.consent).toBe(true);
    expect(payload.snapshot.rulesText).toBe("[REDACTED] Preserve other items.");
    expect(payload.snapshot.messages).toHaveLength(5);
    expect(init.body).not.toContain("Preserve unrelated saved items.");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Count unavailable"));
    expect(screen.getByLabelText("Reviewed historical rules")).toHaveValue("[REDACTED] Preserve other items.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("revokes consent after a privacy edit and retains surviving message IDs", async () => {
    render(<Workspace />);
    await prepareInputs();
    fireEvent.click(screen.getByRole("button", { name: /Review sensitive content/ }));
    const consent = screen.getByRole("checkbox", { name: /consent to OpenAI counting and analysis/ });
    fireEvent.click(consent);
    fireEvent.click(screen.getAllByRole("button", { name: "Remove message" })[1]);
    expect(consent).not.toBeChecked();
    expect(screen.queryByLabelText("Review M002")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Review M003")).toBeInTheDocument();
    expect(screen.getByLabelText("Review M005")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start Investigation/ })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects malformed replacement input instead of retaining an older parsed session", () => {
    render(<Workspace />);
    const transcript = screen.getByLabelText("Structured transcript");
    fireEvent.change(transcript, { target: { value: sample } });
    fireEvent.change(transcript, { target: { value: "@@MESSAGE\nspeaker: tool\n@@BODY\nUnsupported\n@@END" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid speaker header");
    expect(screen.queryByText("M001")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Review sensitive content/ })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
