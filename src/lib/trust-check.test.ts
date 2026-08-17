import { describe, expect, it } from "vitest";
import { checkOfferTrust, checkOffersTrust } from "./trust-check";
import type { RateOffer } from "./types";

const policyRate = { ratePercent: 4.25, asOfDate: "2026-08-14", sourceUrl: "https://data.norges-bank.no" };
const now = new Date("2026-08-17T12:00:00.000Z");

function offer(overrides: Partial<RateOffer>): RateOffer {
  return {
    id: "test",
    sourceId: "test-source",
    sourceName: "Test Source",
    isMock: false,
    bankName: "Test Bank",
    ltvTier: { minLtvPercent: 0, maxLtvPercent: 60 },
    effectiveRatePercent: 5.1,
    sourceUpdatedAt: "2026-08-17T06:00:00.000Z",
    retrievedAt: "2026-08-17T06:01:00.000Z",
    sourceUrl: "https://example.com",
    assumptions: [],
    ...overrides,
  };
}

describe("checkOfferTrust", () => {
  it("raises no flags for a normal offer within the reasonable spread and fresh data", () => {
    const flags = checkOfferTrust(offer({ effectiveRatePercent: 5.1 }), policyRate, now);

    expect(flags).toHaveLength(0);
  });

  it("flags, but does not reject, an offer below the policy rate", () => {
    const flags = checkOfferTrust(offer({ effectiveRatePercent: 3.9 }), policyRate, now);

    expect(flags).toHaveLength(1);
    expect(flags[0].type).toBe("below_policy_rate");
  });

  it("flags an offer whose spread over the policy rate is unreasonably high", () => {
    const flags = checkOfferTrust(offer({ effectiveRatePercent: 12 }), policyRate, now);

    expect(flags).toHaveLength(1);
    expect(flags[0].type).toBe("spread_too_high");
  });

  it("does not flag spread at exactly the reasonable ceiling", () => {
    const flags = checkOfferTrust(offer({ effectiveRatePercent: 9.25 }), policyRate, now);

    expect(flags).toHaveLength(0);
  });

  it("flags stale data older than the threshold", () => {
    const flags = checkOfferTrust(
      offer({ effectiveRatePercent: 5.1, sourceUpdatedAt: "2026-05-01T08:00:00.000Z" }),
      policyRate,
      now,
    );

    expect(flags.some((f) => f.type === "stale_data")).toBe(true);
  });

  it("can raise both a spread flag and a staleness flag at once", () => {
    const flags = checkOfferTrust(
      offer({ effectiveRatePercent: 12, sourceUpdatedAt: "2026-05-01T08:00:00.000Z" }),
      policyRate,
      now,
    );

    expect(flags.map((f) => f.type).sort()).toEqual(
      ["spread_too_high", "stale_data"].sort(),
    );
  });

  // Deliberately wrong values, not just "somewhat off", to prove the
  // garbage-collector check actually fires rather than just never
  // triggering in normal runs (absence of flags proves nothing on its own).
  it("flags an obviously wrong low rate (0.5%) as below the policy rate", () => {
    const flags = checkOfferTrust(offer({ effectiveRatePercent: 0.5 }), policyRate, now);

    expect(flags).toEqual([expect.objectContaining({ type: "below_policy_rate" })]);
  });

  it("flags an obviously wrong high rate (50%) as spread too high", () => {
    const flags = checkOfferTrust(offer({ effectiveRatePercent: 50 }), policyRate, now);

    expect(flags).toEqual([expect.objectContaining({ type: "spread_too_high" })]);
  });
});

describe("checkOffersTrust", () => {
  it("flags every considered offer independently, not just the cheapest one", () => {
    // Regression case: previously only the winner (cheapest) was checked,
    // so a stale offer that lost on price was silently never flagged.
    const cheapButStale = offer({
      id: "cheap-stale",
      effectiveRatePercent: 5.0,
      sourceUpdatedAt: "2026-05-01T08:00:00.000Z",
    });
    const pricierButFresh = offer({
      id: "pricier-fresh",
      effectiveRatePercent: 5.3,
      sourceUpdatedAt: "2026-08-17T06:00:00.000Z",
    });

    const result = checkOffersTrust([cheapButStale, pricierButFresh], policyRate, now);

    expect(result.offerChecks).toEqual([
      {
        offerId: "cheap-stale",
        flags: [expect.objectContaining({ type: "stale_data" })],
      },
      { offerId: "pricier-fresh", flags: [] },
    ]);
  });
});
