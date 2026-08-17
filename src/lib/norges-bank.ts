const POLICY_RATE_URL =
  "https://data.norges-bank.no/api/data/IR/B.KPRA.SD.R?format=csv&lastNObservations=1&locale=en";

export interface PolicyRate {
  /** Key policy rate (styringsrenten), in percent. */
  ratePercent: number;
  /** Date the rate is reported as of, e.g. "2026-08-14". */
  asOfDate: string;
  /** URL to cite as the source of this figure. */
  sourceUrl: string;
}

/**
 * Fetches Norges Bank's key policy rate (styringsrenten) as the trust
 * anchor, always live, never hardcoded, since the next rate decision
 * (2026-09-24) would otherwise make the trust check itself outdated.
 *
 * Uses the CSV export rather than the richer SDMX-JSON format: for a
 * single-row lookup, CSV (header row + one data row) is far simpler to
 * parse correctly than SDMX-JSON's dimension-indexed structure, with no
 * loss of information for this use case.
 */
export async function fetchPolicyRate(): Promise<PolicyRate> {
  const res = await fetch(POLICY_RATE_URL);
  if (!res.ok) {
    throw new Error(
      `Norges Bank fetch failed: ${res.status} ${res.statusText}`,
    );
  }

  const csv = await res.text();
  const lines = csv.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("Norges Bank response did not contain a data row");
  }

  const header = lines[0].split(";");
  const row = lines[1].split(";");
  const timeIndex = header.indexOf("TIME_PERIOD");
  const valueIndex = header.indexOf("OBS_VALUE");
  if (timeIndex === -1 || valueIndex === -1) {
    throw new Error("Norges Bank response is missing expected CSV columns");
  }

  const ratePercent = Number(row[valueIndex]);
  if (Number.isNaN(ratePercent)) {
    throw new Error(
      `Norges Bank response has a non-numeric rate: "${row[valueIndex]}"`,
    );
  }

  return {
    ratePercent,
    asOfDate: row[timeIndex],
    sourceUrl: POLICY_RATE_URL,
  };
}
