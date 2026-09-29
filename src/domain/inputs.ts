import type { Message } from "./transcript";

export type RulePassage = { id: string; start: number; end: number; text: string };
export type Snapshot = {
  investigationId: string;
  version: number;
  incident: string;
  messages: Message[];
  rulesFilename: "AGENTS.md" | "CLAUDE.md";
  rulesText: string;
  rulesBom: boolean;
};

export const bytes = (value: string): number => new TextEncoder().encode(value).length;
export class InputValidationError extends Error {
  readonly name = "InputValidationError";
  constructor(public readonly field: string, message: string) { super(`${field}: ${message}`); }
}
function requireInput(condition: boolean, field: string, message: string): asserts condition {
  if (!condition) throw new InputValidationError(field, message);
}
function validateText(value: string, field: string) {
  requireInput(typeof value === "string", field, "Expected plain text.");
  requireInput(!value.includes("\0"), field, "Remove NUL characters.");
  requireInput(!/\r(?!\n)/.test(value), field, "Use LF or CRLF line endings, not bare CR.");
  requireInput(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value), field, "Text contains an unpaired Unicode surrogate; replace it with valid Unicode text.");
}

/** Fatal UTF-8 decoding preserves line endings. The caller enforces the selected
 * input's smaller file cap (16 KiB for a rules upload) before accepting it. */
export async function readUtf8File(file: File): Promise<{ text: string; bom: boolean }> {
  requireInput(file.size <= 131_072, "File", "Maximum upload size is 128 KiB.");
  const data = new Uint8Array(await file.arrayBuffer());
  requireInput(data.byteLength <= 131_072, "File", "Maximum upload size is 128 KiB.");
  const bom = data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf;
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bom ? data.subarray(3) : data); }
  catch { throw new InputValidationError("File", "Invalid UTF-8 encoding. Save the file as UTF-8 and import it again."); }
  validateText(text, "File");
  return { text, bom };
}

/** Passages are maximal nonblank-line runs, not parsed Markdown instructions.
 * Separating whitespace and the final line terminator stay outside each range. */
export function segmentRules(text: string): RulePassage[] {
  validateText(text, "Historical rules");
  const passages: RulePassage[] = [];
  let offset = 0;
  let start: number | null = null;
  let end = 0;
  const finish = () => {
    if (start !== null) {
      passages.push({ id: `R${String(passages.length + 1).padStart(3, "0")}`, start, end, text: text.slice(start, end) });
      start = null;
    }
  };
  for (const line of text.split("\n")) {
    const content = line.endsWith("\r") ? line.slice(0, -1) : line;
    if (content.trim().length === 0) finish();
    else { start ??= offset; end = offset + content.length; }
    offset += line.length + 1;
  }
  finish();
  return passages;
}

export function validateSnapshot(snapshot: Snapshot): void {
  requireInput(typeof snapshot.investigationId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(snapshot.investigationId), "Investigation", "Expected an application-generated UUID.");
  requireInput(Number.isSafeInteger(snapshot.version) && snapshot.version > 0, "Version", "Expected a positive integer.");
  validateText(snapshot.incident, "Incident");
  requireInput(snapshot.incident.trim().length > 0 && bytes(snapshot.incident) <= 2_048, "Incident", "Provide an incident description no larger than 2 KiB.");
  requireInput(Array.isArray(snapshot.messages) && snapshot.messages.length >= 1 && snapshot.messages.length <= 200, "Transcript", "Provide 1–200 messages.");
  const seen = new Set<string>();
  let previous = 0;
  let totalBytes = 0;
  for (const message of snapshot.messages) {
    requireInput(/^M(?:00[1-9]|0[1-9]\d|[1-9]\d{2,})$/.test(message.id) && message.id.length <= 64 && !seen.has(message.id), "Message ID", "Use unique immutable M001-style message references.");
    const number = Number(message.id.slice(1));
    requireInput(Number.isSafeInteger(number) && number > previous, "Message order", "Preserve original message order and IDs; removed IDs must not be reused or renumbered.");
    previous = number;
    seen.add(message.id);
    requireInput(["developer", "agent", "system"].includes(message.speaker), "Speaker", "Supported speakers are developer, agent and system.");
    validateText(message.body, `Message ${message.id}`);
    requireInput(message.body.trim().length > 0 && bytes(message.body) <= 16_384, `Message ${message.id}`, "Provide nonempty content no larger than 16 KiB, or explicitly remove the message.");
    totalBytes += bytes(message.body);
    if (message.originalRef !== undefined) {
      validateText(message.originalRef, "Original reference");
      requireInput(message.originalRef.length > 0 && message.originalRef.trim() === message.originalRef && !/[\r\n]/.test(message.originalRef), "Original reference", "Use nonempty single-line provenance without outer whitespace, or remove it.");
    }
  }
  requireInput(totalBytes <= 98_304, "Transcript", "Reviewed message bodies together must fit 96 KiB.");
  requireInput(snapshot.rulesFilename === "AGENTS.md" || snapshot.rulesFilename === "CLAUDE.md", "Historical rules", "Use exactly AGENTS.md or CLAUDE.md as the filename.");
  validateText(snapshot.rulesText, "Historical rules");
  requireInput(bytes(snapshot.rulesText) <= 16_384, "Historical rules", "Reviewed rules must fit 16 KiB.");
  requireInput(typeof snapshot.rulesBom === "boolean", "Historical rules", "Missing BOM preservation flag.");
  requireInput(bytes(JSON.stringify(snapshot)) <= 262_144, "Request", "Encoded input exceeds 256 KiB. Manually reduce content; nothing will be truncated.");
}
