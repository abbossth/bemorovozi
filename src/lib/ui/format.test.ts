import { describe, expect, it } from "vitest";
import { formatClock, formatDateTime, formatDayMonth, humanizeTag, shortName } from "./format";

describe("date formatting (independent of the browser's Uzbek locale data)", () => {
  const d = new Date(2026, 8, 19, 14, 5); // 19 September 2026, 14:05 local

  it("writes Uzbek month names by hand", () => {
    expect(formatDayMonth(d)).toBe("19-sentabr");
    expect(formatDayMonth(new Date(2026, 0, 3), "long")).toBe("3-yanvar");
    expect(formatDayMonth(new Date(2026, 8, 17), "short")).toBe("17-sen");
    expect(formatDayMonth(new Date(2026, 11, 1), "short")).toBe("1-dek");
  });

  it("formats the clock and date-time in 24-hour form", () => {
    expect(formatClock(d)).toBe("14:05");
    expect(formatClock(new Date(2026, 8, 19, 0, 7))).toBe("00:07");
    expect(formatDateTime(d)).toBe("19-sen 14:05");
  });
});

describe("names", () => {
  it("shortens a full name to first name + initial", () => {
    expect(shortName("Malika Aliyeva")).toBe("Malika A.");
    expect(shortName("Malika A.")).toBe("Malika A.");
    expect(shortName("Jasur")).toBe("Jasur");
  });

  it("humanizes an issue tag", () => {
    expect(humanizeTag("dori_vaqtida_berilmadi")).toBe("Dori vaqtida berilmadi");
  });
});
