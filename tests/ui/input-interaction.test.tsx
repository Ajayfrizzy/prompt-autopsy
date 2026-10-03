// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { Workspace } from "../../src/components/workspace";
const sample = readFileSync("public/samples/transcript.txt", "utf8");
function file(name: string, text: string) {
  const result = new File([text], name, {
    type: name.endsWith(".txt") ? "text/plain" : "text/markdown",
  });
  Object.defineProperty(result, "arrayBuffer", {
    value: async () => new TextEncoder().encode(text).buffer,
  });
  return result;
}
function windowReturn() {
  act(() => {
    window.dispatchEvent(new Event("blur"));
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
  });
}
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  const getRandomValues = crypto.getRandomValues.bind(crypto);
  vi.stubGlobal("crypto", { getRandomValues });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("normal input interaction after the hydration remount", () => {
  it("types, deletes and pastes without rewriting or remounting controls on focus", async () => {
    const user = userEvent.setup();
    render(<Workspace />);
    const incident = screen.getByLabelText("Incident description");
    await user.type(incident, "Item ₦");
    expect(incident).toHaveValue("Item ₦");
    expect(screen.getByText("8 / 2,048 bytes")).toBeInTheDocument();
    await user.keyboard("{Backspace}");
    await user.type(incident, "A");
    expect(incident).toHaveValue("Item A");
    expect(screen.getByText("6 / 2,048 bytes")).toBeInTheDocument();
    const transcript = screen.getByLabelText("Structured transcript");
    await user.click(transcript);
    await user.paste(sample);
    expect(transcript).toHaveValue(sample);
    expect(screen.getByText(/5 recognized messages/)).toBeInTheDocument();
    expect(screen.getByText("M001")).toBeInTheDocument();
    await user.tab();
    windowReturn();
    await user.click(incident);
    await user.type(incident, " remains");
    expect(screen.getByLabelText("Incident description")).toBe(incident);
    expect(screen.getByLabelText("Structured transcript")).toBe(transcript);
    expect(incident).toHaveValue("Item A remains");
    expect(screen.getByText("14 / 2,048 bytes")).toBeInTheDocument();
    expect(transcript).toHaveValue(sample);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("uploads and reselects files with accepted filenames and parsed content together", async () => {
    const user = userEvent.setup();
    render(<Workspace />);
    await user.type(
      screen.getByLabelText("Incident description"),
      "One item removed four",
    );
    const transcript = screen.getByLabelText("Upload transcript");
    const source = file("transcript.txt", sample);
    await user.upload(transcript, source);
    await waitFor(() =>
      expect(
        screen.getByLabelText("Upload transcript filename"),
      ).toHaveTextContent("transcript.txt"),
    );
    expect(screen.getByLabelText("Structured transcript")).toHaveValue(sample);
    expect(screen.getByText(/5 recognized messages/)).toBeInTheDocument();
    expect(screen.getByText("M005")).toBeInTheDocument();
    expect((transcript as HTMLInputElement).value).toBe("");
    windowReturn();
    const rules = screen.getByLabelText("Historical instructions");
    await user.upload(rules, file("AGENTS.md", "Preserve unrelated items."));
    await waitFor(() =>
      expect(
        screen.getByLabelText("Historical instructions filename"),
      ).toHaveTextContent("AGENTS.md"),
    );
    expect(screen.getByText("Preserve unrelated items.")).toBeInTheDocument();
    windowReturn();
    expect(screen.getByLabelText("Incident description")).toHaveValue(
      "One item removed four",
    );
    expect(screen.getByLabelText("Structured transcript")).toHaveValue(sample);
    expect(
      screen.getByRole("button", { name: /Review sensitive content/ }),
    ).toBeEnabled();
    await user.upload(transcript, source);
    await waitFor(() =>
      expect(screen.getByText(/5 recognized messages/)).toBeInTheDocument(),
    );
    await user.click(
      screen.getByRole("button", { name: /Review sensitive content/ }),
    );
    await user.clear(screen.getByLabelText("Reviewed incident"));
    await user.type(
      screen.getByLabelText("Reviewed incident"),
      "Still editable",
    );
    windowReturn();
    expect(screen.getByLabelText("Reviewed incident")).toHaveValue(
      "Still editable",
    );
    expect(screen.getByLabelText("Reviewed historical rules")).toHaveValue(
      "Preserve unrelated items.",
    );
    expect(
      (screen.getByLabelText("Review M001") as HTMLTextAreaElement).value,
    ).toContain("fictional controlled example");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("invalid user uploads clear previous accepted sources and block readiness", async () => {
    const user = userEvent.setup();
    render(<Workspace />);
    await user.type(screen.getByLabelText("Incident description"), "Incident");
    await user.upload(
      screen.getByLabelText("Upload transcript"),
      file("transcript.txt", sample),
    );
    await user.upload(
      screen.getByLabelText("Historical instructions"),
      file("AGENTS.md", "Historical instruction"),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Review sensitive content/ }),
      ).toBeEnabled(),
    );
    await user.upload(
      screen.getByLabelText("Upload transcript"),
      file("broken.txt", "broken"),
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText("Upload transcript filename"),
      ).toHaveTextContent("No file selected"),
    );
    expect(screen.queryByText(/5 recognized messages/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Review sensitive content/ }),
    ).toBeDisabled();
    await user.upload(
      screen.getByLabelText("Historical instructions"),
      file("AGENTS.md", ""),
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText("Historical instructions filename"),
      ).toHaveTextContent("No file selected"),
    );
    await user.click(screen.getByRole("button", { name: "rules" }));
    expect(
      screen.queryByText("Historical instruction"),
    ).not.toBeInTheDocument();
  });
  it("BFCache remounts clean controls without reading or writing recovery storage", async () => {
    const storageGet = vi.spyOn(Storage.prototype, "getItem");
    const storageSet = vi.spyOn(Storage.prototype, "setItem");
    const user = userEvent.setup();
    render(<Workspace />);
    const previous = screen.getByLabelText("Incident description");
    await user.type(previous, "Old session");
    await user.upload(
      screen.getByLabelText("Upload transcript"),
      file("transcript.txt", sample),
    );
    await user.upload(
      screen.getByLabelText("Historical instructions"),
      file("AGENTS.md", "Keep items."),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Review sensitive content/ }),
      ).toBeEnabled(),
    );
    act(() => {
      const event = new Event("pageshow");
      Object.defineProperty(event, "persisted", { value: true });
      window.dispatchEvent(event);
    });
    expect(screen.getByLabelText("Incident description")).not.toBe(previous);
    expect(screen.getByLabelText("Incident description")).toHaveValue("");
    expect(screen.getByText("0 / 2,048 bytes")).toBeInTheDocument();
    expect(screen.getByLabelText("Structured transcript")).toHaveValue("");
    expect(
      screen.getByLabelText("Upload transcript filename"),
    ).toHaveTextContent("No file selected");
    expect(
      screen.getByLabelText("Historical instructions filename"),
    ).toHaveTextContent("No file selected");
    expect(
      screen.getByRole("button", { name: /Review sensitive content/ }),
    ).toBeDisabled();
    expect(storageGet).not.toHaveBeenCalled();
    expect(storageSet).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
