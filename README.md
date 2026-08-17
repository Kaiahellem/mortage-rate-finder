# PengeFix take-home-oppgave

En liten tjeneste som svarer på: "Hva er beste boliglånsrente i Norge nå for
en gitt belåningsgrad?"

Input: belåningsgrad (LTV) og lånebeløp.
Output: beste alternativ, med begrunnelse, sammenlignet på effektiv rente.

Dette er en take-home-oppgave til andregangsintervju hos PengeFix. Se
`DECISIONS.md` for begrunnede valg underveis, og `CLAUDE.md` for
arbeidsmåten som er brukt.

## Status

Under arbeid. Se `TODO.md` for fremdrift.

## Kilder

- **Tilbudskilde 1 (ekte)**: [Renteportalen.no](https://renteportalen.no/data),
  som publiserer Finansportalens boliglånsdata åpent under CC BY 4.0-lisens.
- **Tilbudskilde 2 (mock, tydelig flagget)**: en modellert enkeltbanks
  rentetabell, siden direkte skraping av bankers nettsider er skjørt og
  vilkårene er uklare.
- **Tillitsanker (ekte)**: [Norges Banks styringsrente](https://www.norges-bank.no/en/topics/statistics/Key-policy-rate-daily/)
  via det åpne API-et på `data.norges-bank.no`.

## Kom i gang

```bash
npm install
npm run dev
npm test
```

## Videre arbeid

Punkter vi bevisst har utsatt eller forenklet, som ville vært naturlig å ta
tak i med mer tid:

- (fylles ut fortløpende etter hvert som vi tar snarveier)
