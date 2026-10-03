import { z } from "zod";
import { validateSnapshot, segmentRules } from "@/domain/inputs";
import { createReview } from "@/domain/review";
import { parseAnalysisWire } from "@/server/ai/schemas";
import { analyze, readBoundedJson, errorResponse } from "@/server/ai/provider";
import { openAIProvider } from "@/server/ai/openai";
import { AI_CONFIG } from "@/server/config";
export const runtime = "nodejs";
export const maxDuration = 150;
const schema = z.strictObject({
  requestId: z.uuid(),
  consent: z.literal(true),
  snapshot: z.strictObject({
    investigationId: z.uuid(),
    version: z.number().int().positive(),
    incident: z.string(),
    messages: z.array(
      z.strictObject({
        id: z.string(),
        speaker: z.enum(["developer", "agent", "system"]),
        body: z.string(),
        originalRef: z.string().optional(),
      }),
    ),
    rulesFilename: z.enum(["AGENTS.md", "CLAUDE.md"]),
    rulesText: z.string(),
    rulesBom: z.boolean(),
  }),
});
export async function POST(request: Request) {
  let requestId: string | undefined;
  try {
    const body = schema.parse(
      await readBoundedJson(request, AI_CONFIG.investigate.bodyBytes),
    );
    requestId = body.requestId;
    validateSnapshot(body.snapshot);
    const snapshot = body.snapshot;
    const input = {
      investigationId: snapshot.investigationId,
      version: snapshot.version,
      incident: snapshot.incident,
      messages: snapshot.messages.map(({ id, speaker, body }) => ({
        id,
        speaker,
        body,
      })),
      rulesText: snapshot.rulesText,
      rules: segmentRules(snapshot.rulesText).map(({ id, start, end }) => ({
        id,
        start,
        end,
      })),
    };
    const response = await analyze(
      openAIProvider(),
      "investigate",
      input,
      undefined,
      request.signal,
      (result) => {
        createReview(parseAnalysisWire(result), snapshot);
      },
    );
    return Response.json(
      { requestId, ...response },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
