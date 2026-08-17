import type { RateOffer, RateSource } from "../types";

const RENTEPORTALEN_URL = "https://renteportalen.no/data/rentebarometer.json";

interface RenteportalenResponse {
  oppdatert: string;
  billigste_effektiv_per_belaningsgrad: {
    inntil_60: number;
    inntil_75: number;
    inntil_85: number;
    ung_forstehjem: number;
  };
}

/**
 * Renteportalen only breaks the market-wide cheapest rate down to 85 % LTV.
 * That is a gap in this data source, not a regulatory ceiling: nedbetalingslån
 * are allowed up to 90 % LTV under utlånsforskriften (Lovdata forskrift
 * 2020-12-09-2648 § 7), see also Finanstilsynet's guidance on belåningsgrad.
 * ung_forstehjem (first-time buyer) is excluded here since it is a
 * demographic category, not an LTV band, and out of scope for this tool.
 */
const LTV_TIERS = [
  { key: "inntil_60", minLtvPercent: 0, maxLtvPercent: 60 },
  { key: "inntil_75", minLtvPercent: 60, maxLtvPercent: 75 },
  { key: "inntil_85", minLtvPercent: 75, maxLtvPercent: 85 },
] as const;

/** Real source: Renteportalen.no's open rate barometer (CC BY 4.0). */
export class RenteportalenSource implements RateSource {
  readonly id = "renteportalen";
  readonly name = "Renteportalen.no";
  readonly isMock = false;

  async fetchOffers(): Promise<RateOffer[]> {
    const res = await fetch(RENTEPORTALEN_URL);
    if (!res.ok) {
      throw new Error(
        `Renteportalen fetch failed: ${res.status} ${res.statusText}`,
      );
    }
    const data = (await res.json()) as RenteportalenResponse;
    const fetchedAt = data.oppdatert;
    const rates = data.billigste_effektiv_per_belaningsgrad;

    return LTV_TIERS.map(({ key, minLtvPercent, maxLtvPercent }) => ({
      id: `${this.id}-${key}`,
      sourceId: this.id,
      sourceName: this.name,
      isMock: false,
      bankName: "Ukjent bank (billigste tilbud i markedet for dette trinnet)",
      ltvTier: { minLtvPercent, maxLtvPercent },
      effectiveRatePercent: rates[key],
      fetchedAt,
      sourceUrl: RENTEPORTALEN_URL,
      assumptions: [
        "Renteportalen oppgir kun billigste effektive rente i markedet per belåningsgrad-trinn, ikke hvilken bank som tilbyr den eller nominell rente.",
        "Belåningsgrad-trinnet tolkes som et ikke-overlappende intervall med inkluderende øvre grense, f.eks. 60,0 % LTV havner i 0-60-trinnet, ikke 60-75-trinnet.",
      ],
    }));
  }
}
