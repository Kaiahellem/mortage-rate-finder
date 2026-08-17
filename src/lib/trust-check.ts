import type { PolicyRate } from "./norges-bank";
import type { RateOffer } from "./types";

/**
 * Reasonable markup window over the policy rate, in percentage points.
 * This is a sanity net for obviously wrong numbers, not a judgement of
 * how good a rate is: real effective mortgage rates rarely exceed the
 * policy rate by more than ~8pp, so 5pp gives a generous margin against
 * false positives on real offers while still catching parsing errors or
 * other clearly bogus figures.
 */
const MAX_REASONABLE_SPREAD_PP = 5;

/** How old sourceUpdatedAt may be before a figure is flagged as outdated. */
const STALE_THRESHOLD_HOURS = 48;

export type TrustFlagType = "below_policy_rate" | "spread_too_high" | "stale_data";

export interface TrustFlag {
  type: TrustFlagType;
  message: string;
}

export interface OfferTrustCheck {
  offerId: string;
  /** Empty when nothing was flagged. Flags are warnings, not rejections: the offer is still shown. */
  flags: TrustFlag[];
}

export interface TrustCheckResult {
  policyRate: PolicyRate;
  /** One entry per checked offer, so a stale or suspicious offer is caught even when it isn't the winner. */
  offerChecks: OfferTrustCheck[];
}

/**
 * Sanity-checks one offer against Norges Bank's policy rate and its own
 * sourceUpdatedAt timestamp. Flags are advisory: an offer below the policy
 * rate is still returned to the caller, just with a warning attached,
 * since subsidised loans (e.g. startlån) can legitimately sit below it.
 */
export function checkOfferTrust(
  offer: RateOffer,
  policyRate: PolicyRate,
  now: Date = new Date(),
): TrustFlag[] {
  const flags: TrustFlag[] = [];
  const spreadPp = offer.effectiveRatePercent - policyRate.ratePercent;

  if (spreadPp < 0) {
    flags.push({
      type: "below_policy_rate",
      message: `Effektiv rente (${offer.effectiveRatePercent} %) er lavere enn styringsrenten (${policyRate.ratePercent} % per ${policyRate.asOfDate}). Uvanlig for et ordinært boliglån, men kan forekomme for subsiderte lån som startlån. Bør dobbeltsjekkes, ikke avvises automatisk.`,
    });
  } else if (spreadPp > MAX_REASONABLE_SPREAD_PP) {
    flags.push({
      type: "spread_too_high",
      message: `Effektiv rente (${offer.effectiveRatePercent} %) ligger ${spreadPp.toFixed(
        2,
      )} prosentpoeng over styringsrenten (${policyRate.ratePercent} % per ${policyRate.asOfDate}), mer enn det urimelighetstaket på ${MAX_REASONABLE_SPREAD_PP} pp. Kan skyldes en feil i tallet eller kilden.`,
    });
  }

  const sourceUpdatedAtMs = Date.parse(offer.sourceUpdatedAt);
  if (!Number.isNaN(sourceUpdatedAtMs)) {
    const ageHours = (now.getTime() - sourceUpdatedAtMs) / (1000 * 60 * 60);
    if (ageHours > STALE_THRESHOLD_HOURS) {
      flags.push({
        type: "stale_data",
        message: `Kildens data er datert ${offer.sourceUpdatedAt}, mer enn ${STALE_THRESHOLD_HOURS} timer gammel. Kan være utdatert.`,
      });
    }
  }

  return flags;
}

/**
 * Runs checkOfferTrust across every considered offer, not just the winner.
 * A stale or suspicious offer must not go unflagged just because it lost
 * on price, e.g. an old mock offer that never becomes the winner should
 * still surface its stale_data flag.
 */
export function checkOffersTrust(
  offers: RateOffer[],
  policyRate: PolicyRate,
  now: Date = new Date(),
): TrustCheckResult {
  return {
    policyRate,
    offerChecks: offers.map((offer) => ({
      offerId: offer.id,
      flags: checkOfferTrust(offer, policyRate, now),
    })),
  };
}
