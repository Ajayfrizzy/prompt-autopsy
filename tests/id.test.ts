import { afterEach, expect, it, vi } from "vitest";
import { newId } from "../src/domain/id";
afterEach(() => vi.unstubAllGlobals());
it("generates UUIDv4 identities without the secure-context-only randomUUID API", () => {
  const getRandomValues = crypto.getRandomValues.bind(crypto);
  vi.stubGlobal("crypto", { getRandomValues });
  const first = newId();
  expect(first).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  expect(newId()).not.toBe(first);
});
