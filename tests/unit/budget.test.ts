import { describe, it, expect } from "vitest";
import { reserve, settle, usedBudget } from "../../src/domain/budget";
describe("session budget", () => {
  it("retains unknown cost and allows only affordable explicit retries", () => {
    let l = settle(reserve([], "a", "analysis"), "a", {});
    l = settle(reserve(l, "b", "recheck"), "b", {});
    l = settle(reserve(l, "c", "recheck"), "c", {});
    expect(usedBudget(l)).toBe(378000);
    expect(() => reserve(l, "d", "recheck")).toThrow();
  });
  it("unbilled count failure releases only the unstarted generation hold", () => {
    expect(
      usedBudget(
        settle(reserve([], "a", "analysis"), "a", { generationStarted: false }),
      ),
    ).toBe(0);
  });
  it("settles trusted usage without refunding it on repeated settlement", () => {
    const l = settle(reserve([], "a", "analysis"), "a", {
      usage: { inputTokens: 35000, outputTokens: 5500 },
    });
    expect(usedBudget(settle(l, "a", { generationStarted: false }))).toBe(
      250000,
    );
  });
  it("serializes calls", () =>
    expect(() =>
      reserve(reserve([], "a", "analysis"), "b", "recheck"),
    ).toThrow());
});
