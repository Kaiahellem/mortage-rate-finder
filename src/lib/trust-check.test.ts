import { describe, expect, it } from "vitest";
import { checkOfferTrust } from "./trust-check";
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
    const result = checkOfferTrust(offer({ effectiveRatePercent: 5.1 }), policyRate, now);

    expect(result.flags).toHaveLength(0);
  });

  it("flags, but does not reject, an offer below the policy rate", () => {
    const result = checkOfferTrust(offer({ effectiveRatePercent: 3.9 }), policyRate, now);

    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].type).toBe("below_policy_rate");
  });

  it("flags an offer whose spread over the policy rate is unreasonably high", () => {
    const result = checkOfferTrust(offer({ effectiveRatePercent: 12 }), policyRate, now);

    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].type).toBe("spread_too_high");
  });

  it("does not flag spread at exactly the reasonable ceiling", () => {
    const result = checkOfferTrust(offer({ effectiveRatePercent: 9.25 }), policyRate, now);

    expect(result.flags).toHaveLength(0);
  });

  it("flags stale data older than the threshold", () => {
    const result = checkOfferTrust(
      offer({ effectiveRatePercent: 5.1, sourceUpdatedAt: "2026-05-01T08:00:00.000Z" }),
      policyRate,
      now,
    );

    expect(result.flags.some((f) => f.type === "stale_data")).toBe(true);
  });

  it("can raise both a spread flag and a staleness flag at once", () => {
    const result = checkOfferTrust(
      offer({ effectiveRatePercent: 12, sourceUpdatedAt: "2026-05-01T08:00:00.000Z" }),
      policyRate,
      now,
    );

    expect(result.flags.map((f) => f.type).sort()).toEqual(
      ["spread_too_high", "stale_data"].sort(),
    );
  });
});
