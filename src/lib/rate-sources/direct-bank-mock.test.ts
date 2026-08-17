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

  it("uses a fixed, non-live fetchedAt timestamp", async () => {
    const offers = await new DirectBankMockSource().fetchOffers();
    const uniqueTimestamps = new Set(offers.map((o) => o.fetchedAt));

    expect(uniqueTimestamps.size).toBe(1);
    expect(Number.isNaN(Date.parse([...uniqueTimestamps][0]))).toBe(false);
  });
});
