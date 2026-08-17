import { describe, expect, it } from "vitest";
import { DirectBankMockSource } from "./direct-bank-mock";

describe("DirectBankMockSource", () => {
  it("returns four LTV-tiered offers, all clearly flagged as mock", async () => {
    const offers = await new DirectBankMockSource().fetchOffers();

    expect(offers).toHaveLength(4);
    expect(offers.every((o) => o.isMock === true)).toBe(true);
    expect(offers.every((o) => o.sourceName.toLowerCase().includes("mock"))).toBe(
      true,
    );
  });

  it("covers 0-90 % LTV in four contiguous, non-overlapping tiers", () => {
    return new DirectBankMockSource().fetchOffers().then((offers) => {
      const tiers = offers
        .map((o) => o.ltvTier)
        .sort((a, b) => a.minLtvPercent - b.minLtvPercent);

      expect(tiers).toEqual([
        { minLtvPercent: 0, maxLtvPercent: 60 },
        { minLtvPercent: 60, maxLtvPercent: 75 },
        { minLtvPercent: 75, maxLtvPercent: 85 },
        { minLtvPercent: 85, maxLtvPercent: 90 },
      ]);
    });
  });

  it("has nominal rate strictly below effective rate for every tier", async () => {
    const offers = await new DirectBankMockSource().fetchOffers();

    for (const offer of offers) {
      expect(offer.nominalRatePercent).toBeDefined();
      expect(offer.nominalRatePercent!).toBeLessThan(offer.effectiveRatePercent);
    }
  });

  it("uses a fixed, non-live sourceUpdatedAt, but a live retrievedAt", async () => {
    const before = Date.now();
    const offers = await new DirectBankMockSource().fetchOffers();
    const after = Date.now();

    const uniqueSourceUpdatedAt = new Set(offers.map((o) => o.sourceUpdatedAt));
    expect(uniqueSourceUpdatedAt.size).toBe(1);
    expect(Number.isNaN(Date.parse([...uniqueSourceUpdatedAt][0]))).toBe(false);

    const uniqueRetrievedAt = new Set(offers.map((o) => o.retrievedAt));
    expect(uniqueRetrievedAt.size).toBe(1);
    const retrievedAtMs = Date.parse([...uniqueRetrievedAt][0]);
    expect(retrievedAtMs).toBeGreaterThanOrEqual(before);
    expect(retrievedAtMs).toBeLessThanOrEqual(after);
  });
});
