import { describe, expect, it } from "vitest";
import {
  parseTranscript,
  TranscriptParseError,
} from "../../src/domain/transcript";
import {
  bytes,
  readUtf8File,
  segmentRules,
  validateSnapshot,
  type Snapshot,
} from "../../src/domain/inputs";

const block = (body = "Body", speaker = "developer", provenance = "") =>
  `@@MESSAGE\nspeaker: ${speaker}\n${provenance}@@BODY\n${body}\n@@END`;
const snapshot = (): Snapshot => ({
  investigationId: "550e8400-e29b-41d4-a716-446655440000",
  version: 1,
  incident: "One item removal removed unrelated items.",
  messages: parseTranscript(block()),
  rulesFilename: "AGENTS.md",
  rulesText: "Preserve unrelated items.\r\n",
  rulesBom: false,
});

describe("strict transcript import", () => {
  it("preserves body whitespace, three roles and repeated optional provenance", () => {
    const result = parseTranscript(
      `\n${block("  First\n\nSecond  \n", "developer", "original_ref: source:turn1\n")}\n\n${block("Agent", "agent", "original_ref: source:turn1\n")}\n${block("System", "system")}\n`,
    );
    expect(result.map((message) => message.id)).toEqual([
      "M001",
      "M002",
      "M003",
    ]);
    expect(result[0]).toEqual({
      id: "M001",
      speaker: "developer",
      originalRef: "source:turn1",
      body: "  First\n\nSecond  \n",
    });
    expect(result[2].speaker).toBe("system");
  });
  it("accepts BOM/CRLF and normalizes transcript line endings", () => {
    expect(
      parseTranscript(
        `\uFEFF${block("first\nsecond").replaceAll("\n", "\r\n")}`,
      )[0].body,
    ).toBe("first\nsecond");
  });
  it("decodes one escaping layer and leaves inline/indented markers alone", () => {
    const body = [
      "\\@@MESSAGE",
      "\\@@BODY",
      "\\@@END",
      "\\\\example",
      "\\\\@@END",
      "inline @@END",
      " @@BODY",
      "speaker: agent",
    ].join("\n");
    expect(parseTranscript(block(body))[0].body).toBe(
      [
        "@@MESSAGE",
        "@@BODY",
        "@@END",
        "\\example",
        "\\@@END",
        "inline @@END",
        " @@BODY",
        "speaker: agent",
      ].join("\n"),
    );
  });
  it.each([
    "",
    " \n",
    "preamble\n" + block(),
    block().replace("speaker: developer", "speaker: tool"),
    block().replace("speaker: developer", "speaker:  developer"),
    block().replace("speaker: developer", "speaker: developer "),
    block().replace("@@BODY", "speaker: agent\n@@BODY"),
    block().replace("@@BODY", "unknown: value\n@@BODY"),
    block("text", "agent", "original_ref: \n"),
    block("text", "agent", "original_ref:  source\n"),
    block("text", "agent", "original_ref: source \n"),
    block("text", "agent", "original_ref: source\noriginal_ref: duplicate\n"),
    block().replace("@@BODY", "\n@@BODY"),
    block().replace("\n@@END", ""),
    block("@@MESSAGE"),
    block("@@BODY"),
    block("\\bad"),
    block("\\@@END suffix"),
    block("   \n\t"),
    block() + "\ntrailing text",
    block().replace("\n", "\r"),
    block("nul\0"),
  ])(
    "rejects malformed input atomically with actionable location (%#)",
    (input) => {
      try {
        parseTranscript(input);
        throw new Error("Expected parse failure");
      } catch (error) {
        expect(error).toBeInstanceOf(TranscriptParseError);
        const failure = error as TranscriptParseError;
        expect(failure.line).toBeGreaterThan(0);
        expect(failure.guidance.length).toBeGreaterThan(10);
      }
    },
  );
  it("does not salvage a valid prefix", () => {
    expect(() =>
      parseTranscript(`${block()}\n${block("bad", "tool")}`),
    ).toThrow();
  });
  it("enforces byte and message boundaries", () => {
    expect(parseTranscript(block("😀".repeat(4_096)))[0].body.length).toBe(
      8_192,
    );
    expect(() => parseTranscript(block("😀".repeat(4_096) + "x"))).toThrow(
      /Message too large/,
    );
    expect(parseTranscript(Array(200).fill(block()).join("\n"))).toHaveLength(
      200,
    );
    expect(() => parseTranscript(Array(201).fill(block()).join("\n"))).toThrow(
      /Too many/,
    );
    expect(
      parseTranscript(
        Array(6)
          .fill(block("x".repeat(16_384)))
          .join("\n"),
      ),
    ).toHaveLength(6);
    expect(() =>
      parseTranscript(
        Array(6)
          .fill(block("x".repeat(16_384)))
          .join("\n") +
          "\n" +
          block("x"),
      ),
    ).toThrow(/Decoded transcript too large/);
    expect(() => parseTranscript("x".repeat(131_073))).toThrow(
      /Transcript too large/,
    );
  });
});

describe("reviewed input contracts", () => {
  it("preserves stable gaps through body edits and removal", () => {
    const value = snapshot();
    value.messages = parseTranscript(
      [block("one"), block("two"), block("three")].join("\n"),
    );
    value.messages.splice(1, 1);
    value.messages[1].body = "redacted three";
    expect(() => validateSnapshot(value)).not.toThrow();
    expect(value.messages.map((message) => message.id)).toEqual([
      "M001",
      "M003",
    ]);
  });
  it("rejects reordered/duplicated IDs and empty reviewed transcript", () => {
    const value = snapshot();
    value.messages = parseTranscript(`${block()}\n${block()}`).reverse();
    expect(() => validateSnapshot(value)).toThrow(/order/);
    value.messages = [value.messages[0], value.messages[0]];
    expect(() => validateSnapshot(value)).toThrow(/unique/);
    value.messages = [];
    expect(() => validateSnapshot(value)).toThrow();
  });
  it("preserves exact rules text and allows explicit empty reviewed baseline", () => {
    const value = snapshot();
    expect(() => validateSnapshot(value)).not.toThrow();
    expect(value.rulesText).toBe("Preserve unrelated items.\r\n");
    value.rulesText = "";
    expect(() => validateSnapshot(value)).not.toThrow();
  });
  it("bounds incident/rules UTF-8 bytes and actual encoded input", () => {
    const value = snapshot();
    value.incident = "😀".repeat(512);
    value.rulesText = "x".repeat(16_384);
    expect(() => validateSnapshot(value)).not.toThrow();
    value.incident += "x";
    expect(() => validateSnapshot(value)).toThrow(/Incident/);
    value.incident = "Incident";
    value.rulesText += "x";
    expect(() => validateSnapshot(value)).toThrow(/Historical rules/);
    value.rulesText = "Rules";
    value.messages[0].originalRef = "x".repeat(262_144);
    expect(() => validateSnapshot(value)).toThrow(/Request/);
    expect(bytes("😀")).toBe(4);
  });
  it.each(["\r", "\0", "\ud800"])("rejects invalid text %j", (text) => {
    const value = snapshot();
    value.rulesText = text;
    expect(() => validateSnapshot(value)).toThrow();
  });
  it("segments exact UTF-16 ranges without normalizing CRLF or Unicode", () => {
    const text = "\r\n# Rules\r\n😀 keep items\r\n \t\r\nNext instruction\r\n";
    const passages = segmentRules(text);
    expect(passages.map((passage) => passage.id)).toEqual(["R001", "R002"]);
    expect(passages.map((passage) => passage.text)).toEqual([
      "# Rules\r\n😀 keep items",
      "Next instruction",
    ]);
    for (const passage of passages)
      expect(text.slice(passage.start, passage.end)).toBe(passage.text);
    expect(segmentRules("")).toEqual([]);
    expect(segmentRules("  \n\t\n")).toEqual([]);
  });
  it("decodes UTF-8 strictly, separates BOM, and preserves rules CRLF", async () => {
    const file = new File(
      [new Uint8Array([0xef, 0xbb, 0xbf]), "Rules\r\n"],
      "AGENTS.md",
    );
    expect(await readUtf8File(file)).toEqual({ text: "Rules\r\n", bom: true });
    await expect(
      readUtf8File(new File([new Uint8Array([0xc3, 0x28])], "bad.txt")),
    ).rejects.toThrow(/UTF-8/);
    await expect(
      readUtf8File(new File(["bare\rreturn"], "bad.md")),
    ).rejects.toThrow(/bare CR/);
    await expect(readUtf8File(new File(["nul\0"], "bad.md"))).rejects.toThrow(
      /NUL/,
    );
  });
});
