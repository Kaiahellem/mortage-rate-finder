import { describe, expect, it } from "vitest";
import { selectBestOffer } from "./selection";
import type { RateOffer } from "./types";

function offer(overrides: Partial<RateOffer> & Pick<RateOffer, "id">): RateOffer {
  return {
    sourceId: "test-source",
    sourceName: "Test Source",
    isMock: false,
    bankName: "Test Bank",
    ltvTier: { minLtvPercent: 0, maxLtvPercent: 60 },
    effectiveRatePercent: 5,
    fetchedAt: "2026-08-01T00:00:00.000Z",
    sourceUrl: "https://example.com",
    assumptions: [],
    ...overrides,
  };
}

const realUnder60 = offer({
  id: "real-under-60",
  sourceName: "Renteportalen.no",
  bankName: "Ukjent bank",
  ltvTier: { minLtvPercent: 0, maxLtvPercent: 60 },
  effectiveRatePercent: 5.07,
});

const realUnder75 = offer({
  id: "real-under-75",
  sourceName: "Renteportalen.no",
  bankName: "Ukjent bank",
  ltvTier: { minLtvPercent: 60, maxLtvPercent: 75 },
  effectiveRatePercent: 5.1,
});

const mockUnder60 = offer({
  id: "mock-under-60",
  isMock: true,
  sourceName: "Fiktiv direktebank (mock)",
  bankName: "Fiktiv Bank AS",
  ltvTier: { minLtvPercent: 0, maxLtvPercent: 60 },
  nominalRatePercent: 4.95,
  effectiveRatePercent: 5.2,
  referenceLoanAmount: 3_000_000,
  assumptions: ["Dette er mock-data."],
});

const mock85to90 = offer({
  id: "mock-85-90",
  isMock: true,
  sourceName: "Fiktiv direktebank (mock)",
  bankName: "Fiktiv Bank AS",
  ltvTier: { minLtvPercent: 85, maxLtvPercent: 90 },
  effectiveRatePercent: 5.67,
});

const allOffers = [realUnder60, realUnder75, mockUnder60, mock85to90];

describe("selectBestOffer", () => {
  it("picks the lowest effective rate among offers covering the LTV, across sources", () => {
    const result = selectBestOffer(allOffers, { ltvPercent: 50, loanAmount: 3_000_000 });

    expect(result.winner?.id).toBe("real-under-60");
    expect(result.consideredOffers.map((o) => o.id)).toEqual([
      "real-under-60",
      "mock-under-60",
    ]);
    expect(result.reasoning).toContain("Renteportalen.no");
  });

  it("treats an LTV exactly on a tier boundary as belonging to the lower tier", () => {
    const result = selectBestOffer(allOffers, { ltvPercent: 60, loanAmount: 2_000_000 });

    expect(result.winner?.ltvTier).toEqual({ minLtvPercent: 0, maxLtvPercent: 60 });
  });

  it("moves to the next tier just above the boundary", () => {
    const result = selectBestOffer(allOffers, { ltvPercent: 60.01, loanAmount: 2_000_000 });

    expect(result.winner?.ltvTier).toEqual({ minLtvPercent: 60, maxLtvPercent: 75 });
  });

  it("falls back to the only source that covers a gap in the other source's data", () => {
    const result = selectBestOffer(allOffers, { ltvPercent: 88, loanAmount: 2_000_000 });

    expect(result.winner?.id).toBe("mock-85-90");
    expect(result.consideredOffers).toHaveLength(1);
  });

  it("returns no winner when no tier covers the requested LTV", () => {
    const result = selectBestOffer(allOffers, { ltvPercent: 95, loanAmount: 2_000_000 });

    expect(result.winner).toBeNull();
    expect(result.consideredOffers).toHaveLength(0);
    expect(result.reasoning).toContain("Fant ingen tilbud");
  });

  it("flags mock offers and reference loan amount mismatches in the reasoning", () => {
    const result = selectBestOffer([mockUnder60], { ltvPercent: 50, loanAmount: 5_000_000 });

    expect(result.reasoning).toContain("mock-kilde");
    expect(result.reasoning).toContain("referert lånebeløp");
    expect(result.reasoning).toContain("Antakelser fra kilden");
  });
});
