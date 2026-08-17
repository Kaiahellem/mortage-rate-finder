import type { LoanRequest, LtvTier, RateOffer } from "./types";

export interface SelectionResult {
  request: LoanRequest;
  /** Null when no offer's LTV tier covers the requested LTV. */
  winner: RateOffer | null;
  /** Offers whose LTV tier covers the requested LTV, sorted cheapest first. */
  consideredOffers: RateOffer[];
  /** Human readable (Norwegian) explanation of the result, for the API response. */
  reasoning: string;
}

function offerCoversLtv(tier: LtvTier, ltvPercent: number): boolean {
  const aboveMin =
    tier.minLtvPercent === 0 ? ltvPercent >= 0 : ltvPercent > tier.minLtvPercent;
  return aboveMin && ltvPercent <= tier.maxLtvPercent;
}

function formatPercent(value: number): string {
  return `${value.toLocaleString("nb-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} %`;
}

function formatTier(tier: LtvTier): string {
  return `${tier.minLtvPercent}-${tier.maxLtvPercent} %`;
}

function buildReasoning(
  winner: RateOffer,
  consideredOffers: RateOffer[],
  request: LoanRequest,
): string {
  const runnerUp = consideredOffers[1];
  const parts: string[] = [
    `${winner.bankName} har lavest effektiv rente (${formatPercent(
      winner.effectiveRatePercent,
    )}) blant ${consideredOffers.length} vurdert${
      consideredOffers.length === 1 ? "" : "e"
    } tilbud for en belåningsgrad på ${request.ltvPercent} % (trinn ${formatTier(
      winner.ltvTier,
    )}).`,
  ];

  if (runnerUp) {
    parts.push(
      `Nest billigste var ${runnerUp.bankName} med ${formatPercent(
        runnerUp.effectiveRatePercent,
      )} effektiv rente.`,
    );
  }

  parts.push(
    `Kilde: ${winner.sourceName} (${winner.sourceUrl}), hentet ${winner.fetchedAt}.`,
  );

  if (winner.isMock) {
    parts.push(
      "Merk: dette tilbudet kommer fra en mock-kilde, ikke en ekte henting.",
    );
  }

  if (
    winner.referenceLoanAmount !== undefined &&
    winner.referenceLoanAmount !== request.loanAmount
  ) {
    parts.push(
      `Effektiv rente er beregnet for et referert lånebeløp på ${winner.referenceLoanAmount.toLocaleString(
        "nb-NO",
      )} kr, ikke nøyaktig for oppgitt lånebeløp på ${request.loanAmount.toLocaleString(
        "nb-NO",
      )} kr, så faktisk effektiv rente kan avvike noe siden gebyrer utgjør en annen andel av lånet.`,
    );
  }

  if (winner.assumptions.length > 0) {
    parts.push(`Antakelser fra kilden: ${winner.assumptions.join(" ")}`);
  }

  return parts.join(" ");
}

/**
 * Filters offers to those whose LTV tier covers the requested LTV, and
 * picks the one with the lowest effective rate. Loan amount is not used
 * to filter offers, since none of our sources publish amount-dependent
 * rate tiers, it is only used to flag when a winner's reference loan
 * amount differs from what was requested (see DECISIONS.md).
 */
export function selectBestOffer(
  offers: RateOffer[],
  request: LoanRequest,
): SelectionResult {
  const consideredOffers = offers
    .filter((offer) => offerCoversLtv(offer.ltvTier, request.ltvPercent))
    .sort((a, b) => a.effectiveRatePercent - b.effectiveRatePercent);

  if (consideredOffers.length === 0) {
    return {
      request,
      winner: null,
      consideredOffers: [],
      reasoning: `Fant ingen tilbud som dekker en belåningsgrad på ${request.ltvPercent} %. Ingen av kildenes belåningsgrad-trinn treffer denne verdien.`,
    };
  }

  const winner = consideredOffers[0];

  return {
    request,
    winner,
    consideredOffers,
    reasoning: buildReasoning(winner, consideredOffers, request),
  };
}
