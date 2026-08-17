import { afterEach, describe, expect, it, vi } from "vitest";
import { RenteportalenSource } from "./renteportalen";

const sampleResponse = {
  oppdatert: "2026-08-13T05:30:06.788Z",
  billigste_effektiv_per_belaningsgrad: {
    inntil_60: 5.07,
    inntil_75: 5.1,
    inntil_85: 5.1,
    ung_forstehjem: 4.68,
  },
};

function stubFetch(response: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status,
      statusText: ok ? "OK" : "Service Unavailable",
      json: async () => response,
    }),
  );
}

describe("RenteportalenSource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses the three LTV-tiered offers and excludes ung/førstehjem", async () => {
    stubFetch(sampleResponse);

    const offers = await new RenteportalenSource().fetchOffers();

    expect(offers).toHaveLength(3);
    expect(offers.every((o) => o.isMock === false)).toBe(true);
    expect(offers.every((o) => o.fetchedAt === sampleResponse.oppdatert)).toBe(
      true,
    );
    expect(offers.every((o) => o.nominalRatePercent === undefined)).toBe(
      true,
    );

    const under60 = offers.find((o) => o.ltvTier.maxLtvPercent === 60);
    expect(under60?.ltvTier).toEqual({ minLtvPercent: 0, maxLtvPercent: 60 });
    expect(under60?.effectiveRatePercent).toBe(5.07);

    const under75 = offers.find((o) => o.ltvTier.maxLtvPercent === 75);
    expect(under75?.ltvTier).toEqual({
      minLtvPercent: 60,
      maxLtvPercent: 75,
    });

    const under85 = offers.find((o) => o.ltvTier.maxLtvPercent === 85);
    expect(under85?.ltvTier).toEqual({
      minLtvPercent: 75,
      maxLtvPercent: 85,
    });
  });

  it("throws a clear error when the response is not ok", async () => {
    stubFetch(undefined, false, 503);

    await expect(new RenteportalenSource().fetchOffers()).rejects.toThrow(
      /503/,
    );
  });
});
