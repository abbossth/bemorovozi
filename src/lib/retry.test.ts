import { describe, it, expect, vi } from "vitest";
import { withRetry } from "./retry";

describe("withRetry", () => {
  it("returns the result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries transient errors and eventually succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("503 UNAVAILABLE"))
      .mockResolvedValueOnce("recovered");
    await expect(withRetry(fn, 3, 1)).resolves.toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-transient errors", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("400 Bad Request"));
    await expect(withRetry(fn, 3, 1)).rejects.toThrow("400 Bad Request");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("gives up after the configured attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("503 UNAVAILABLE"));
    await expect(withRetry(fn, 3, 1)).rejects.toThrow("503 UNAVAILABLE");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
