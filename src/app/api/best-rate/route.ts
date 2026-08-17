import { NextResponse } from "next/server";
import { fetchPolicyRate } from "@/lib/norges-bank";
import { DirectBankMockSource } from "@/lib/rate-sources/direct-bank-mock";
import { RenteportalenSource } from "@/lib/rate-sources/renteportalen";
import { selectBestOffer } from "@/lib/selection";
import { checkOfferTrust, type TrustCheckResult } from "@/lib/trust-check";
import type { LoanRequest, RateOffer, RateSource } from "@/lib/types";

const SOURCES: RateSource[] = [
  new RenteportalenSource(),
  new DirectBankMockSource(),
];

interface SourceError {
  sourceId: string;
  sourceName: string;
  message: string;
}

type ParsedRequest = { value: LoanRequest } | { errors: string[] };

function parseLoanRequest(body: unknown): ParsedRequest {
  if (typeof body !== "object" || body === null) {
    return {
      errors: ["Body må være et JSON-objekt med ltvPercent og loanAmount."],
    };
  }

  const { ltvPercent, loanAmount } = body as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof ltvPercent !== "number" || !Number.isFinite(ltvPercent)) {
    errors.push("ltvPercent må være et tall.");
  } else if (ltvPercent < 0 || ltvPercent > 100) {
    errors.push("ltvPercent må være mellom 0 og 100.");
  }

  if (typeof loanAmount !== "number" || !Number.isFinite(loanAmount)) {
    errors.push("loanAmount må være et tall.");
  } else if (loanAmount <= 0) {
    errors.push("loanAmount må være større enn 0.");
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    value: {
      ltvPercent: ltvPercent as number,
      loanAmount: loanAmount as number,
    },
  };
}

/**
 * Fetches all sources concurrently and keeps going if one fails, so a
 * flaky external API does not take down the whole endpoint. Failures are
 * reported back in sourceErrors rather than swallowed.
 */
async function fetchAllOffers(): Promise<{
  offers: RateOffer[];
  sourceErrors: SourceError[];
}> {
  const results = await Promise.allSettled(
    SOURCES.map((source) => source.fetchOffers()),
  );

  const offers: RateOffer[] = [];
  const sourceErrors: SourceError[] = [];

  results.forEach((result, index) => {
    const source = SOURCES[index];
    if (result.status === "fulfilled") {
      offers.push(...result.value);
    } else {
      sourceErrors.push({
        sourceId: source.id,
        sourceName: source.name,
        message:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
      });
    }
  });

  return { offers, sourceErrors };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ugyldig JSON i forespørselen." },
      { status: 400 },
    );
  }

  const parsed = parseLoanRequest(body);
  if ("errors" in parsed) {
    return NextResponse.json(
      { error: parsed.errors.join(" ") },
      { status: 400 },
    );
  }

  const { offers, sourceErrors } = await fetchAllOffers();
  const selection = selectBestOffer(offers, parsed.value);

  let trustCheck: TrustCheckResult | null = null;
  let trustCheckError: string | undefined;

  if (selection.winner) {
    try {
      const policyRate = await fetchPolicyRate();
      trustCheck = checkOfferTrust(selection.winner, policyRate);
    } catch (err) {
      trustCheckError =
        err instanceof Error
          ? err.message
          : "Klarte ikke å hente styringsrenten fra Norges Bank.";
    }
  }

  return NextResponse.json({
    request: parsed.value,
    winner: selection.winner,
    consideredOffers: selection.consideredOffers,
    reasoning: selection.reasoning,
    trustCheck,
    trustCheckError,
    sourceErrors,
  });
}
