import { describe, it, expect } from "vitest";
import { normalizeIssueTag } from "./index";

describe("normalizeIssueTag", () => {
  it("lowercases and snake_cases arbitrary model output", () => {
    expect(normalizeIssueTag("Dori_kechikishi")).toBe("dori_kechikishi");
    expect(normalizeIssueTag("Navbat Juda Uzun")).toBe("navbat_juda_uzun");
    expect(normalizeIssueTag("  --leading-- ")).toBe("leading");
  });
});
