export const AI_CONFIG = Object.freeze({
  model: "gpt-5.6-sol",
  countTimeoutMs: 20_000,
  generationTimeoutMs: 120_000,
  requestTimeoutMs: 150_000,
  inputMicroUsdPerToken: 4,
  outputMicroUsdPerToken: 20,
  investigate: { inputCap: 35_000, outputCap: 5_500, bodyBytes: 262_144 },
  recheck: { inputCap: 6_000, outputCap: 2_000, bodyBytes: 65_536 },
});
export type Operation = "investigate" | "recheck";
