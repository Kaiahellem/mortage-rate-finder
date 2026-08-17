import type { RateOffer, RateSource } from "../types";

const MOCK_SOURCE_URL = "mock://direct-bank-source/rates";
const MOCK_FETCHED_AT = "2026-05-01T08:00:00.000Z";
const REFERENCE_LOAN_AMOUNT = 3_000_000;
const MOCK_BANK_NAME = "Fiktiv Bank AS";

interface MockTier {
  minLtvPercent: number;
  maxLtvPercent: number;
  nominalRatePercent: number;
  effectiveRatePercent: number;
}

const MOCK_TIERS: MockTier[] = [
  {
    minLtvPercent: 0,
    maxLtvPercent: 60,
    nominalRatePercent: 4.95,
    effectiveRatePercent: 5.05,
  },
  {
    minLtvPercent: 60,
    maxLtvPercent: 75,
    nominalRatePercent: 5.05,
    effectiveRatePercent: 5.15,
  },
  {
    minLtvPercent: 75,
    maxLtvPercent: 85,
    nominalRatePercent: 5.15,
    effectiveRatePercent: 5.26,
  },
  {
    minLtvPercent: 85,
    maxLtvPercent: 90,
    nominalRatePercent: 5.55,
    effectiveRatePercent: 5.67,
  },
];

/**
 * Mock source standing in for a real bank's own published rate table
 * (DNB/Nordea style: LTV-tiered, both nominal and effective rate).
 * Scraping individual bank sites was judged too fragile for this task
 * (JS-rendered pages, markup that changes often, unclear scraping terms),
 * see DECISIONS.md row 2. This adapter is a clearly flagged stand-in
 * behind the same RateSource interface, so a real scraper or bank API
 * integration can replace it later without touching the rest of the
 * system. bankName is deliberately fictional and numbers are
 * illustrative, never real quotes from any actual bank.
 */
export class DirectBankMockSource implements RateSource {
  readonly id = "direct-bank-mock";
  readonly name = "Fiktiv direktebank (mock, ikke ekte data)";
  readonly isMock = true;

  async fetchOffers(): Promise<RateOffer[]> {
    return MOCK_TIERS.map((tier, index) => ({
      id: `${this.id}-tier-${index}`,
      sourceId: this.id,
      sourceName: this.name,
      isMock: true,
      bankName: MOCK_BANK_NAME,
      productName: "Boliglån",
      ltvTier: {
        minLtvPercent: tier.minLtvPercent,
        maxLtvPercent: tier.maxLtvPercent,
      },
      nominalRatePercent: tier.nominalRatePercent,
      effectiveRatePercent: tier.effectiveRatePercent,
      referenceLoanAmount: REFERENCE_LOAN_AMOUNT,
      fetchedAt: MOCK_FETCHED_AT,
      sourceUrl: MOCK_SOURCE_URL,
      assumptions: [
        "Dette er mock-data, ikke en ekte henting fra en bank. Tallene er illustrative og modellert etter typisk LTV-trinnet prising (DNB/Nordea-stil), ikke reelle tilbud fra Fiktiv Bank AS eller noen annen bank.",
        `Effektiv rente er beregnet for et referert lånebeløp på ${REFERENCE_LOAN_AMOUNT.toLocaleString("nb-NO")} kr, inkludert et typisk etableringsgebyr.`,
        "85-90 %-trinnet er lagt til for å vise at kilder kan dekke ulike deler av belåningsgrad-spekteret (Renteportalen dekker kun opp til 85 %), ikke hentet fra noen ekte banks faktiske produktspekter.",
      ],
    }));
  }
}
