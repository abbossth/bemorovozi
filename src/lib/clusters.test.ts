import { describe, expect, it } from "vitest";
import { buildClusters, tagWords } from "./clusters";

const NOW = new Date("2026-09-19T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
let seq = 0;
const report = (issueTag: string, days = 1) => ({ id: `r${++seq}`, issueTag, createdAt: daysAgo(days) });

describe("tagWords", () => {
  it("drops filler words and treats a ward as a room", () => {
    expect([...tagWords("xona_juda_sovuq")].sort()).toEqual(["sovuq", "xona"]);
    expect([...tagWords("palata_sovuq")].sort()).toEqual(["sovuq", "xona"]);
    expect([...tagWords("xonada_sovuq")].sort()).toEqual(["sovuq", "xona"]);
  });
});

describe("buildClusters", () => {
  it("makes a systemic cluster from 3+ identical tags", () => {
    const items = [report("navbat_uzoq_kutildi"), report("navbat_uzoq_kutildi"), report("navbat_uzoq_kutildi")];
    const { systemic, clusterOf } = buildClusters(items, NOW);
    expect(systemic).toHaveLength(1);
    expect(systemic[0]).toMatchObject({ tag: "navbat_uzoq_kutildi", count: 3 });
    expect(clusterOf.get(items[0].id)?.count).toBe(3);
  });

  it("does not flag a problem reported only twice", () => {
    const { systemic } = buildClusters([report("lift_ishlamaydi"), report("lift_ishlamaydi")], NOW);
    expect(systemic).toHaveLength(0);
  });

  it("groups very similar tags into one problem", () => {
    const items = [report("palata_sovuq"), report("xona_juda_sovuq"), report("palata_sovuq"), report("xonada_sovuq")];
    const { systemic } = buildClusters(items, NOW);
    expect(systemic).toHaveLength(1);
    expect(systemic[0].count).toBe(4);
    expect(systemic[0].tag).toBe("palata_sovuq"); // named after its most common wording
    expect(systemic[0].tags.sort()).toEqual(["palata_sovuq", "xona_juda_sovuq", "xonada_sovuq"]);
  });

  it("keeps different problems apart, even when they share a word or the same verb", () => {
    const items = [
      report("palata_sovuq"), report("palata_sovuq"), report("xona_sovuq"),
      report("ovqat_sovuq"), report("ovqat_sovuq"), report("ovqat_sovuq"),
      report("dori_vaqtida_berilmadi"), report("dori_noto_g_ri_berildi"), report("dori_vaqtida_berilmadi"),
    ];
    const { systemic } = buildClusters(items, NOW);
    const named = systemic.map((c) => `${c.tag}:${c.count}`).sort();
    expect(named).toEqual(["ovqat_sovuq:3", "palata_sovuq:3"]); // food ≠ rooms; wrong-medicine ≠ late-medicine (only 2 late)
  });

  it("ignores the placeholder tag used when the AI could not analyse a report", () => {
    const items = Array.from({ length: 5 }, () => report("tahlil_qilinmagan"));
    expect(buildClusters(items, NOW).systemic).toHaveLength(0);
  });

  it("only counts reports inside the 14-day window", () => {
    const items = [report("navbat_uzoq", 1), report("navbat_uzoq", 5), report("navbat_uzoq", 20), report("navbat_uzoq", 30)];
    expect(buildClusters(items, NOW).systemic).toHaveLength(0);
    const inWindow = [...items, report("navbat_uzoq", 10)];
    const { systemic, clusterOf } = buildClusters(inWindow, NOW);
    expect(systemic[0].count).toBe(3);
    expect(clusterOf.has(items[3].id)).toBe(false); // an old report is not part of the current cluster
  });

  it("orders the clusters by size", () => {
    const items = [...Array(3)].map(() => report("lift_buzilgan")).concat([...Array(5)].map(() => report("navbat_uzoq_kutildi")));
    expect(buildClusters(items, NOW).systemic.map((c) => c.tag)).toEqual(["navbat_uzoq_kutildi", "lift_buzilgan"]);
  });
});
