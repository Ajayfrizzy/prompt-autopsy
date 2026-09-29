export type Speaker = "developer" | "agent" | "system";
export type Message = { id: string; speaker: Speaker; body: string; originalRef?: string };

export class TranscriptParseError extends Error {
  readonly name = "TranscriptParseError";
  constructor(public readonly line: number, public readonly category: string, public readonly guidance: string) {
    super(`Line ${line}: ${category}. ${guidance}`);
  }
}

const markers = new Set(["@@MESSAGE", "@@BODY", "@@END"]);
const size = (value: string) => new TextEncoder().encode(value).length;

/** Strict import is atomic. Privacy Review edits these records without reparsing
 * or assigning IDs, so deleting a record leaves all surviving IDs unchanged. */
export function parseTranscript(source: string): Message[] {
  const fail = (line: number, category: string, guidance: string): never => { throw new TranscriptParseError(line, category, guidance); };
  if (size(source) > 131_072) fail(1, "Transcript too large", "Use a manually prepared UTF-8 transcript no larger than 128 KiB; nothing was imported.");
  if (source.includes("\0")) fail(1, "Invalid character", "Remove NUL characters and save as UTF-8 text.");
  if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(source)) fail(1, "Invalid Unicode", "Replace unpaired Unicode surrogates with valid UTF-8 text.");
  if (/\r(?!\n)/.test(source)) fail(source.slice(0, source.search(/\r(?!\n)/)).split("\n").length, "Invalid line endings", "Save the transcript with LF or CRLF line endings, not bare CR.");
  const lines = source.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").split("\n");
  const parsed: Omit<Message, "id">[] = [];
  let index = 0;
  let totalBytes = 0;
  while (index < lines.length) {
    if (lines[index] === "") { index++; continue; }
    const opening = index + 1;
    if (lines[index++] !== "@@MESSAGE") fail(opening, "Unexpected text outside a message", "Start each message on an exact @@MESSAGE line; only empty separator lines are allowed.");
    const speakerLine = lines[index++];
    if (!/^speaker: (developer|agent|system)$/.test(speakerLine ?? "")) fail(index, "Invalid speaker header", "Immediately follow @@MESSAGE with exactly speaker: developer, speaker: agent, or speaker: system.");
    const speaker = speakerLine.slice(9) as Speaker;
    let originalRef: string | undefined;
    if (lines[index]?.startsWith("original_ref:")) {
      const provenance = lines[index++];
      const value = provenance.slice("original_ref: ".length);
      if (!provenance.startsWith("original_ref: ") || !value || value.trim() !== value) fail(index, "Invalid original_ref", "Use original_ref: source-reference with no leading/trailing whitespace, or remove the optional line.");
      originalRef = value;
    }
    if (lines[index++] !== "@@BODY") fail(index, "Missing or out-of-order body marker", "Use speaker: agent, optional original_ref: source-reference, then an exact @@BODY line with no extra headers.");
    const bodyLines: string[] = [];
    let ended = false;
    while (index < lines.length) {
      const lineNumber = index + 1;
      const line = lines[index++];
      if (line === "@@END") { ended = true; break; }
      if (markers.has(line)) fail(lineNumber, "Unescaped message marker", "Escape literal markers as \\@@MESSAGE or \\@@BODY, or close the previous message with @@END.");
      if (line.startsWith("\\\\")) bodyLines.push(line.slice(1));
      else if (line.startsWith("\\")) {
        if (!markers.has(line.slice(1))) fail(lineNumber, "Invalid body escape", "Use \\@@END for a literal marker; double a literal leading backslash, for example \\\\example.");
        bodyLines.push(line.slice(1));
      } else bodyLines.push(line);
    }
    if (!ended) fail(opening, "Missing end marker", "Close the message opened here with an exact @@END line.");
    const body = bodyLines.join("\n");
    if (!body.trim()) fail(opening, "Empty message", "Add non-whitespace body content or remove this entire message.");
    const bodyBytes = size(body);
    if (bodyBytes > 16_384) fail(opening, "Message too large", "Each decoded message must be at most 16 KiB; manually prepare a smaller context-preserving excerpt.");
    totalBytes += bodyBytes;
    if (totalBytes > 98_304) fail(opening, "Decoded transcript too large", "All message bodies together must fit 96 KiB; manually select a smaller excerpt.");
    parsed.push({ speaker, body, ...(originalRef !== undefined ? { originalRef } : {}) });
    if (parsed.length > 200) fail(opening, "Too many messages", "Use at most 200 messages from one session.");
  }
  if (parsed.length === 0) fail(1, "Empty transcript", "Add at least one @@MESSAGE block with speaker: developer, @@BODY, nonempty content, and @@END.");
  return parsed.map((message, index) => ({ id: `M${String(index + 1).padStart(3, "0")}`, ...message }));
}
