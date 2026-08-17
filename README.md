# PengeFix take-home-oppgave

En liten tjeneste som svarer på: "Hva er beste boliglånsrente i Norge nå for
en gitt belåningsgrad?"

Input: belåningsgrad (LTV) og lånebeløp.
Output: beste alternativ, med begrunnelse, sammenlignet på effektiv rente.

Dette er en take-home-oppgave til andregangsintervju hos PengeFix. Se
`DECISIONS.md` for begrunnede valg underveis, og `CLAUDE.md` for
arbeidsmåten som er brukt.

## Status

Kjernefunksjonaliteten er ferdig: to kilder bak et felles grensesnitt,
utvalg på effektiv rente filtrert etter belåningsgrad, og en tillitssjekk
mot Norges Banks styringsrente, koblet sammen i `POST /api/best-rate`.
En valgfri minimal UI-side (lav prioritet) er ikke bygget. Se `TODO.md`
for fremdrift og `DECISIONS.md` for begrunnede valg.

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

## Tillitssjekk

Alle vurderte tilbud (ikke bare det vinnende) sjekkes mot Norges Banks
styringsrente, hentet live ved hver forespørsel (aldri hardkodet, siden
neste rentebeslutning er 2026-09-24). Hvert tilbud sjekkes uavhengig,
slik at et tilbud som taper på pris likevel blir flagget hvis det er
mistenkelig eller utdatert:

- **Under styringsrenten**: flagges for gjennomgang, men avvises eller
  skjules ikke. Subsiderte lån (f.eks. startlån) kan legitimt ligge lavere.
- **Mer enn 5 prosentpoeng over styringsrenten**: flagges som et urimelig
  høyt påslag for et ordinært boliglån, kan skyldes en feil i tallet.
- **Eldre enn 48 timer**: flagges som mulig utdatert.

Sjekken er ment som en søppelfanger for åpenbart feil tall, ikke en
vurdering av hvor god en rente er. Se DECISIONS.md rad 11-13 for
begrunnelsen bak grensene.

## API

```bash
npm install
npm run dev
```

```bash
curl -X POST http://localhost:3000/api/best-rate \
  -H "Content-Type: application/json" \
  -d '{"ltvPercent": 70, "loanAmount": 3000000}'
```

Svaret inneholder `winner` (eller `null` med en forklarende `reasoning` hvis
ingen kilde dekker den oppgitte belåningsgraden), `consideredOffers` (alle
tilbud som ble vurdert, billigst først), `trustCheck` (styringsrenten pluss
`offerChecks`, en liste med flagg per vurdert tilbud, ikke bare vinneren)
og `sourceErrors` (hvis én kilde feilet, fortsetter endepunktet med resten
i stedet for å feile helt).

Testet mot ekte, levende data: Renteportalen sitt eget "oppdatert"-tidsstempel
viste seg å være noen dager gammelt da vi testet, så selv det ekte tilbudet
ble riktig flagget som `stale_data` av tillitssjekken, en fin bekreftelse på
at utdatert-flagget faktisk fanger noe reelt og ikke bare mock-dataen.

## Kom i gang

```bash
npm test
```

## Videre arbeid

Punkter vi bevisst har utsatt eller forenklet, som ville vært naturlig å ta
tak i med mer tid:

- **Ingen caching eller fallback for Renteportalen.** Hver forespørsel gjør
  et nytt, live kall. Bevisst utsatt for å holde løsningen liten, men et
  ekte produkt ville trengt caching (Renteportalen selv oppdaterer bare
  daglig) og en fallback hvis kilden er nede.
- **Ingen ekte skraping av en enkeltbank.** `DirectBankMockSource` er en
  tydelig flagget mock. Et naturlig neste steg er å bytte den ut med en
  ekte integrasjon mot én banks API eller nettside, bak samme
  `RateSource`-grensesnitt.
- **Lånebeløp brukes ikke til å justere renten**, bare til å flagge avvik
  fra kildens referansebeløp (se DECISIONS.md rad 10), siden ingen av
  kildene våre gir beløpsavhengige rentetrinn.
- **"Ung/førstehjem" og belåningsgrad over 90 %** er utenfor scope. Se
  "Antakelser" over.
- **Ingen retry eller backoff** mot Renteportalen eller Norges Bank, kun ett
  forsøk per forespørsel. Feiler kilden, rapporteres det i `sourceErrors`
  eller `trustCheckError` i stedet for å prøve på nytt.
- **Historikk brukes ikke.** Renteportalen tilbyr også `historikk.json`
  (62 dagers data), som kunne vist rentetrend over tid, men det er utenfor
  det oppgaven ber om.
- **Ingen minimal UI bygget** (issue #9), lav prioritet, `curl`/API-et
  dekker kravet om at et rent endepunkt holder.
