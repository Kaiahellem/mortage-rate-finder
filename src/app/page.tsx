"use client";

import { useState } from "react";
import styles from "./page.module.css";
import type { RateOffer } from "@/lib/types";
import type { TrustCheckResult, TrustFlag } from "@/lib/trust-check";

interface SourceError {
  sourceId: string;
  sourceName: string;
  message: string;
}

interface BestRateResponse {
  winner: RateOffer | null;
  consideredOffers: RateOffer[];
  reasoning: string;
  trustCheck: TrustCheckResult | null;
  trustCheckError?: string;
  sourceErrors: SourceError[];
  error?: string;
}

const FLAG_LABEL: Record<TrustFlag["type"], string> = {
  below_policy_rate: "Below policy rate",
  spread_too_high: "Unusually high spread",
  stale_data: "Possibly stale",
};

function formatPercent(value: number): string {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} %`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString("en-GB");
}

function flagsFor(
  offerId: string,
  trustCheck: TrustCheckResult | null,
): TrustFlag[] {
  return (
    trustCheck?.offerChecks.find((check) => check.offerId === offerId)
      ?.flags ?? []
  );
}

function OfferCard({
  offer,
  flags,
  highlighted,
}: {
  offer: RateOffer;
  flags: TrustFlag[];
  highlighted?: boolean;
}) {
  return (
    <li
      className={`${styles.offerCard} ${highlighted ? styles.offerCardWinner : ""}`}
    >
      <div className={styles.offerHeader}>
        <span className={styles.bankName}>{offer.bankName}</span>
        {offer.isMock && <span className={styles.mockBadge}>MOCK DATA</span>}
      </div>
      <div className={styles.offerRate}>{formatPercent(offer.effectiveRatePercent)}</div>
      <dl className={styles.offerMeta}>
        <div>
          <dt>Source</dt>
          <dd>
            <a href={offer.sourceUrl} target="_blank" rel="noopener noreferrer">
              {offer.sourceName}
            </a>
          </dd>
        </div>
        <div>
          <dt>LTV tier</dt>
          <dd>
            {offer.ltvTier.minLtvPercent}-{offer.ltvTier.maxLtvPercent} %
          </dd>
        </div>
        {offer.nominalRatePercent !== undefined && (
          <div>
            <dt>Nominal rate</dt>
            <dd>{formatPercent(offer.nominalRatePercent)}</dd>
          </div>
        )}
        <div>
          <dt>Source updated</dt>
          <dd>{formatDate(offer.sourceUpdatedAt)}</dd>
        </div>
      </dl>
      {flags.length > 0 && (
        <ul className={styles.flagList}>
          {flags.map((flag, i) => (
            <li key={i} className={styles.flag} title={flag.message}>
              {FLAG_LABEL[flag.type]}
            </li>
          ))}
        </ul>
      )}
      {offer.assumptions.length > 0 && (
        <details className={styles.assumptions}>
          <summary>Assumptions from this source</summary>
          <ul>
            {offer.assumptions.map((assumption, i) => (
              <li key={i}>{assumption}</li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

export default function Home() {
  const [ltvPercent, setLtvPercent] = useState("70");
  const [loanAmount, setLoanAmount] = useState("3000000");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<BestRateResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage(null);
    setResult(null);

    try {
      const res = await fetch("/api/best-rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ltvPercent: Number(ltvPercent),
          loanAmount: Number(loanAmount),
        }),
      });
      const json = (await res.json()) as BestRateResponse;

      if (!res.ok) {
        setErrorMessage(json.error ?? "Something went wrong.");
        setStatus("error");
        return;
      }

      setResult(json);
      setStatus("done");
    } catch {
      setErrorMessage("Could not reach the API. Is the dev server running?");
      setStatus("error");
    }
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <h1>Best Mortgage Rate Finder</h1>
          <p className={styles.subtitle}>
            Find the best Norwegian mortgage rate for a given loan-to-value
            ratio, compared across sources on effective interest rate.
          </p>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="ltvPercent">Loan-to-value (LTV %)</label>
            <input
              id="ltvPercent"
              type="number"
              min={0}
              max={100}
              step="0.1"
              required
              value={ltvPercent}
              onChange={(e) => setLtvPercent(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="loanAmount">Loan amount (NOK)</label>
            <input
              id="loanAmount"
              type="number"
              min={0}
              step="1"
              required
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
            />
          </div>
          <button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Searching..." : "Find best rate"}
          </button>
        </form>

        {status === "error" && errorMessage && (
          <p className={styles.errorBanner} role="alert">
            {errorMessage}
          </p>
        )}

        {result && (
          <section className={styles.result}>
            <p className={styles.reasoning}>{result.reasoning}</p>

            {result.sourceErrors.length > 0 && (
              <p className={styles.warningBanner}>
                {result.sourceErrors.length} source
                {result.sourceErrors.length > 1 ? "s" : ""} failed to
                respond: {result.sourceErrors.map((e) => e.sourceName).join(", ")}.
                Results below are based on the remaining sources.
              </p>
            )}

            {result.trustCheckError && (
              <p className={styles.warningBanner}>
                Trust check unavailable: {result.trustCheckError}
              </p>
            )}

            {result.trustCheck && (
              <p className={styles.policyRate}>
                Norges Bank key policy rate: {formatPercent(result.trustCheck.policyRate.ratePercent)}{" "}
                (as of {result.trustCheck.policyRate.asOfDate})
              </p>
            )}

            {result.winner && (
              <>
                <h2>Best offer</h2>
                <ul className={styles.offerList}>
                  <OfferCard
                    offer={result.winner}
                    flags={flagsFor(result.winner.id, result.trustCheck)}
                    highlighted
                  />
                </ul>
              </>
            )}

            {result.consideredOffers.length > 1 && (
              <>
                <h2>All considered offers</h2>
                <ul className={styles.offerList}>
                  {result.consideredOffers
                    .filter((offer) => offer.id !== result.winner?.id)
                    .map((offer) => (
                      <OfferCard
                        key={offer.id}
                        offer={offer}
                        flags={flagsFor(offer.id, result.trustCheck)}
                      />
                    ))}
                </ul>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
