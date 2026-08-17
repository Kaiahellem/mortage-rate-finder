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
  rentetabell ("Fiktiv Bank AS", et oppdiktet navn), siden direkte skraping
  av bankers nettsider er skjørt og vilkårene er uklare. Dekker LTV-trinnene
  0-60, 60-75, 75-85 og 85-90 %, med både nominell og effektiv rente.
- **Tillitsanker (ekte)**: [Norges Banks styringsrente](https://www.norges-bank.no/en/topics/statistics/Key-policy-rate-daily/)
  via det åpne API-et på `data.norges-bank.no`.

## Antakelser

- Renteportalen sitt rentebarometer oppgir kun billigste effektive rente i
  markedet per belåningsgrad-trinn (0-60, 60-75, 75-85 %), ikke hvilken bank
  som tilbyr den eller nominell rente. Vi viser derfor tilbudet som "ukjent
  bank" for disse radene, og effektiv rente uten nominell motpart.
- Belåningsgrad-trinnene tolkes som ikke-overlappende intervaller med
  inkluderende øvre grense, slik at nøyaktig 60,0 % LTV havner i 0-60-trinnet.
- Belåningsgrad over 85 % gir "ingen tilbud i datagrunnlaget" i denne
  løsningen. Dette er en begrensning i Renteportalens data, ikke en
  regelverksgrense. Utlånsforskriften ([Lovdata forskrift 2020-12-09-2648
  § 7](https://lovdata.no/dokument/SF/forskrift/2020-12-09-2648/kap3))
  tillater nedbetalingslån med pant i bolig opptil 90 % av et forsvarlig
  verdigrunnlag, se også [Finanstilsynets](https://www.finanstilsynet.no)
  veiledning om belåningsgrad.
- "Ung/førstehjem"-kategorien fra Renteportalen er utelatt, siden den er
  demografisk avgrenset (alder/boligkjøpstype) og ikke et belåningsgrad-trinn.

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
