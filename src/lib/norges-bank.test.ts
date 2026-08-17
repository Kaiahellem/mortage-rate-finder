import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPolicyRate } from "./norges-bank";

function stubFetch(body: string, ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status,
      statusText: ok ? "OK" : "Service Unavailable",
      text: async () => body,
    }),
  );
}

const sampleCsv =
  "FREQ;Frequency;INSTRUMENT_TYPE;Instrument Type;TENOR;Tenor;UNIT_MEASURE;Unit of Measure;DECIMALS;COLLECTION;Collection Indicator;TIME_PERIOD;OBS_VALUE;CALC_METHOD;Calculation Method\n" +
  "B;Business;KPRA;Key policy rate;SD;Policy rate;R;Rate;2;E;End of day;2026-08-14;4.25;;\n";

describe("fetchPolicyRate", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses the policy rate and date from the CSV export", async () => {
    stubFetch(sampleCsv);

    const rate = await fetchPolicyRate();

    expect(rate.ratePercent).toBe(4.25);
    expect(rate.asOfDate).toBe("2026-08-14");
    expect(rate.sourceUrl).toContain("data.norges-bank.no");
  });

  it("throws a clear error when the response is not ok", async () => {
    stubFetch("", false, 503);

    await expect(fetchPolicyRate()).rejects.toThrow(/503/);
  });

  it("throws when the response has no data row", async () => {
    stubFetch("FREQ;Frequency\n");

    await expect(fetchPolicyRate()).rejects.toThrow(/data row/);
  });
});
