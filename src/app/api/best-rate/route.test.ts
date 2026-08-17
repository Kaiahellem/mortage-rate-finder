import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const renteportalenBody = {
  oppdatert: "2026-08-13T05:30:06.788Z",
  billigste_effektiv_per_belaningsgrad: {
    inntil_60: 5.07,
    inntil_75: 5.1,
    inntil_85: 5.1,
    ung_forstehjem: 4.68,
  },
};

const norgesBankCsv =
  "FREQ;Frequency;INSTRUMENT_TYPE;Instrument Type;TENOR;Tenor;UNIT_MEASURE;Unit of Measure;DECIMALS;COLLECTION;Collection Indicator;TIME_PERIOD;OBS_VALUE;CALC_METHOD;Calculation Method\n" +
  "B;Business;KPRA;Key policy rate;SD;Policy rate;R;Rate;2;E;End of day;2026-08-14;4.25;;\n";

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function stubFetch(options?: { failRenteportalen?: boolean }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = urlOf(input);
      if (url.includes("renteportalen.no")) {
        if (options?.failRenteportalen) {
          throw new Error("network down");
        }
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => renteportalenBody,
        } as Response;
      }
      if (url.includes("norges-bank.no")) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          text: async () => norgesBankCsv,
        } as Response;
      }
      throw new Error(`Unexpected fetch to ${url}`);
    }),
  );
}

function postRequest(body: unknown) {
  return new Request("http://localhost/api/best-rate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/best-rate", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a winner with reasoning and an unflagged trust check for a normal request", async () => {
    stubFetch();

    const res = await POST(postRequest({ ltvPercent: 50, loanAmount: 3_000_000 }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.winner).not.toBeNull();
    // Mock's 0-60% tier (5.05) undercuts Renteportalen's real 5.07 here,
    // and correctly wins since selection compares across all sources.
    expect(json.winner.effectiveRatePercent).toBe(5.05);
    expect(json.winner.sourceId).toBe("direct-bank-mock");
    expect(json.reasoning).toContain("Fiktiv Bank AS");
    expect(json.trustCheck.policyRate.ratePercent).toBe(4.25);
    // The mock's fixed fetchedAt (2026-05-01) is always stale relative to
    // "now", which is exactly what the staleness flag is supposed to catch.
    expect(json.trustCheck.flags).toEqual([
      expect.objectContaining({ type: "stale_data" }),
    ]);
    expect(json.sourceErrors).toHaveLength(0);
  });

  it("rejects an out-of-range ltvPercent with 400", async () => {
    stubFetch();

    const res = await POST(postRequest({ ltvPercent: 150, loanAmount: 1_000_000 }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("ltvPercent");
  });

  it("rejects malformed JSON with 400", async () => {
    stubFetch();

    const res = await POST(postRequest("not json"));

    expect(res.status).toBe(400);
  });

  it("returns a null winner with an explanation when no tier covers the LTV", async () => {
    stubFetch();

    const res = await POST(postRequest({ ltvPercent: 95, loanAmount: 1_000_000 }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.winner).toBeNull();
    expect(json.trustCheck).toBeNull();
    expect(json.reasoning).toContain("Fant ingen tilbud");
  });

  it("keeps going with the remaining sources and reports the failure when one source fails", async () => {
    stubFetch({ failRenteportalen: true });

    const res = await POST(postRequest({ ltvPercent: 50, loanAmount: 3_000_000 }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.sourceErrors).toHaveLength(1);
    expect(json.sourceErrors[0].sourceId).toBe("renteportalen");
    expect(json.winner.sourceId).toBe("direct-bank-mock");
  });
});
