export type Operation = "analysis" | "recheck";
export const RESERVATION = { analysis: 250_000, recheck: 64_000 } as const;
export type Attempt = {
  id: string;
  operation: Operation;
  held: number;
  spent: number;
  settled: boolean;
};
export type Ledger = Attempt[];
export const usedBudget = (ledger: Ledger) =>
  ledger.reduce((sum, a) => sum + a.held + a.spent, 0);
export function reserve(
  ledger: Ledger,
  id: string,
  operation: Operation,
): Ledger {
  if (ledger.some((a) => a.id === id)) throw new Error("Duplicate request");
  if (ledger.some((a) => !a.settled))
    throw new Error("Wait for the active request to finish.");
  if (usedBudget(ledger) + RESERVATION[operation] > 400_000)
    throw new Error(
      "Not enough of this investigation’s USD 0.40 budget remains. Independent approved changes can still be exported.",
    );
  return [
    ...ledger,
    { id, operation, held: RESERVATION[operation], spent: 0, settled: false },
  ];
}
export function settle(
  ledger: Ledger,
  id: string,
  result: {
    generationStarted?: boolean;
    usage?: { inputTokens: number; outputTokens: number };
  },
): Ledger {
  return ledger.map((a) => {
    if (a.id !== id || a.settled) return a;
    const usage = result.usage;
    if (
      usage &&
      Number.isSafeInteger(usage.inputTokens) &&
      Number.isSafeInteger(usage.outputTokens) &&
      usage.inputTokens >= 0 &&
      usage.outputTokens >= 0
    )
      return {
        ...a,
        held: 0,
        spent: usage.inputTokens * 4 + usage.outputTokens * 20,
        settled: true,
      };
    if (result.generationStarted === false)
      return { ...a, held: 0, settled: true };
    return { ...a, settled: true };
  });
}
export const money = (micro: number) => `$${(micro / 1_000_000).toFixed(3)}`;
