/**
 * Loan-to-value band an offer applies to, in percent (e.g. 0-60, 60-75).
 * Norwegian banks price in LTV steps rather than a continuous curve, so
 * offers are matched by band, not by an exact LTV value.
 */
export interface LtvTier {
  /** Inclusive lower bound of loan-to-value, in percent (0-100). */
  minLtvPercent: number;
  /** Exclusive upper bound of loan-to-value, in percent (0-100]. */
  maxLtvPercent: number;
}

/**
 * A single mortgage rate offer from one source, for one LTV band.
 * Every number here must be traceable back to sourceUrl and fetchedAt,
 * since the task requires a citation and a fetch timestamp per figure.
 */
export interface RateOffer {
  /** Stable id for this offer within its source, e.g. "dnb-under-60". */
  id: string;
  /** Id of the RateSource that produced this offer. */
  sourceId: string;
  /** Human readable source name, used for citation in the answer. */
  sourceName: string;
  /**
   * True if this offer is mocked/synthetic data rather than a real fetch.
   * Must never be presented to the user as real without this flag.
   */
  isMock: boolean;
  /** Name of the bank or lender the offer is attributed to. */
  bankName: string;
  /** Name of the loan product, if the source distinguishes products. */
  productName?: string;
  /** LTV band this offer applies to. */
  ltvTier: LtvTier;
  /** Nominal annual interest rate, in percent. */
  nominalRatePercent: number;
  /** Effective annual interest rate, in percent (includes fees). */
  effectiveRatePercent: number;
  /**
   * Loan amount the effective rate was calculated for, if the source
   * assumes a reference amount (fees matter more on smaller loans).
   */
  referenceLoanAmount?: number;
  /** When this data point was fetched, as an ISO 8601 timestamp. */
  fetchedAt: string;
  /** URL to cite as the source of this specific number. */
  sourceUrl: string;
  /** Explicit assumptions behind this offer's numbers, e.g. reference amount or LTV band generalisation. */
  assumptions: string[];
}

/** A source of mortgage rate offers, real or mocked, behind one interface. */
export interface RateSource {
  /** Stable id, used to attribute offers back to this source. */
  id: string;
  /** Human readable name, used for citation. */
  name: string;
  /** True if this source returns mocked/synthetic data. */
  isMock: boolean;
  /** Fetches the current set of offers from this source. */
  fetchOffers(): Promise<RateOffer[]>;
}

/** User input for a best-rate lookup. */
export interface LoanRequest {
  /** Loan-to-value, in percent (0-100). */
  ltvPercent: number;
  /** Requested loan amount, in NOK. */
  loanAmount: number;
}
