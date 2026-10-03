import { expect, it } from "vitest";
import { domainValidationCategory } from "../../src/domain/validation-category";
it("never exposes unmapped exception messages or input values", () => {
  expect(
    domainValidationCategory(new Error("private transcript content")),
  ).toBe("OTHER_DOMAIN_VALIDATION");
  expect(
    domainValidationCategory({
      message: "Unknown rule reference",
      secret: "private",
    }),
  ).toBe("OTHER_DOMAIN_VALIDATION");
  expect(
    domainValidationCategory(
      new Error("Edit anchor no longer matches reviewed rules"),
    ),
  ).toBe("EDIT_ANCHOR_INVALID");
});
