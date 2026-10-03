import { createHash } from "node:crypto";
import { z } from "zod";
import { segmentRules, bytes } from "@/domain/inputs";
import {
  analyze,
  readBoundedJson,
  errorResponse,
  SafeError,
} from "@/server/ai/provider";
import { openAIProvider } from "@/server/ai/openai";
import { AI_CONFIG } from "@/server/config";
export const runtime = "nodejs";
export const maxDuration = 150;
const proposalSchema = z.strictObject({
  id: z.uuid(),
  version: z.number().int().positive(),
  findingIds: z.array(z.uuid()).min(1).max(4),
  replacementText: z.string().min(1),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  expectedText: z.string(),
});
const passageSchema = z.strictObject({
  id: z.string(),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  text: z.string(),
});
const schema = z.strictObject({
  requestId: z.uuid(),
  investigationId: z.uuid(),
  version: z.number().int().positive(),
  proposalId: z.uuid(),
  proposalVersion: z.number().int().positive(),
  contextHash: z.string().regex(/^[a-f0-9]{64}$/),
  consent: z.literal(true),
  context: z.strictObject({
    investigationId: z.uuid(),
    version: z.number().int().positive(),
    proposal: proposalSchema,
    rulesText: z.string(),
    rules: z.array(passageSchema),
    peers: z.array(proposalSchema).max(3),
    evidence: z
      .array(
        z.strictObject({
          messageId: z.string(),
          quote: z.string().min(1),
          occurrence: z.number().int().positive(),
        }),
      )
      .max(4),
  }),
});
export async function POST(request: Request) {
  let requestId: string | undefined;
  try {
    const body = schema.parse(
      await readBoundedJson(request, AI_CONFIG.recheck.bodyBytes),
    );
    requestId = body.requestId;
    const context = body.context;
    if (
      body.investigationId !== context.investigationId ||
      body.version !== context.version ||
      body.proposalId !== context.proposal.id ||
      body.proposalVersion !== context.proposal.version
    )
      throw new SafeError(
        "INVALID_BINDING",
        "The recheck does not match the current proposal and reviewed input version.",
      );
    if (
      createHash("sha256").update(JSON.stringify(context)).digest("hex") !==
      body.contextHash
    )
      throw new SafeError(
        "INVALID_BINDING",
        "The recheck context hash does not match.",
      );
    if (
      bytes(context.rulesText) > 16384 ||
      context.evidence.reduce((sum, e) => sum + bytes(e.quote), 0) > 2048
    )
      throw new SafeError(
        "INPUT_TOO_LARGE",
        "Complete reviewed rules or necessary evidence exceeds its supported byte limit.",
        false,
        undefined,
        413,
      );
    const rules = segmentRules(context.rulesText);
    if (JSON.stringify(rules) !== JSON.stringify(context.rules))
      throw new SafeError(
        "INVALID_REFERENCES",
        "Rule passages must match the complete reviewed rules.",
      );
    const all = [context.proposal, ...context.peers];
    if (new Set(all.map((p) => p.id)).size !== all.length)
      throw new SafeError("INVALID_REFERENCES", "Proposal IDs must be unique.");
    const splitsBoundary = (offset: number) =>
      offset > 0 &&
      offset < context.rulesText.length &&
      ((/[\uD800-\uDBFF]/.test(context.rulesText[offset - 1]) &&
        /[\uDC00-\uDFFF]/.test(context.rulesText[offset])) ||
        (context.rulesText[offset - 1] === "\r" &&
          context.rulesText[offset] === "\n"));
    for (const p of all)
      if (
        splitsBoundary(p.start) ||
        splitsBoundary(p.end) ||
        /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(
          p.replacementText,
        ) ||
        bytes(p.replacementText) > 4096 ||
        [...p.replacementText].length > 1200 ||
        p.start > p.end ||
        p.end > context.rulesText.length ||
        context.rulesText.slice(p.start, p.end) !== p.expectedText
      )
        throw new SafeError(
          "INVALID_ANCHOR",
          "A proposal range or text does not match the reviewed rules.",
        );
    const input = {
      ...context,
      rules: rules.map(({ id, start, end }) => ({ id, start, end })),
    };
    const response = await analyze(
      openAIProvider(),
      "recheck",
      input,
      {
        ruleIds: rules.map((r) => r.id),
        proposalIds: context.peers.map((p) => p.id),
      },
      request.signal,
    );
    return Response.json(
      { requestId, contextHash: body.contextHash, ...response },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
