import { describe, it, expect } from "vitest";
import { generateTrackingCode } from "./trackingCode";

describe("generateTrackingCode", () => {
  it("matches the BO-#### shape", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateTrackingCode()).toMatch(/^BO-\d{4}$/);
    }
  });
});
