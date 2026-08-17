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
  et nytt, live kall. Bevisst utsatt for å holde løsningen liten. Gjort
  ordentlig ville betydd en cache med TTL matchet mot Renteportalens egen
  oppdateringsfrekvens (de cacher selv i 1 time), og en fallback til sist
  kjente data hvis et live kall feiler. Det siste hadde vært billig å legge
  til: cachet data kunne flytt gjennom nøyaktig samme `stale_data`-flagg som
  allerede finnes, siden den måler kildens egen dato (`sourceUpdatedAt`),
  ikke når vi hentet (`retrievedAt`).
- **Ingen ekte skraping av en enkeltbank.** `DirectBankMockSource` er en
  tydelig flagget mock. Gjort ordentlig ville betydd enten en
  headless-browser-scraper (Playwright/Puppeteer) mot én banks
  rentetabellside, med selektorer som må overvåkes for å oppdage når siden
  endres, eller en avtale om API-tilgang (Finansportalen krever en
  distribusjonsavtale fra Forbrukerrådet). Fordi mock-en ligger bak samme
  `RateSource`-grensesnitt som den ekte kilden, er selve byttet en lokal
  endring i én fil, resten av systemet trenger ikke røres.
- **Lånebeløp brukes ikke til å justere renten**, bare til å flagge avvik
  fra kildens referansebeløp (se DECISIONS.md rad 10). Ingen av kildene våre
  gir beløpsavhengige rentetrinn, og å finne opp en skaleringsformel ville
  vært gjettverk uten belegg i data. Gjort ordentlig ville betydd å finne en
  kilde som oppgir faste gebyrer i kroner (etableringsgebyr,
  tinglysingsgebyr), og regne ut reell effektiv rente per oppgitt lånebeløp
  med annuitetsformelen, den formelle måten effektiv rente faktisk
  beregnes på.
- **"Ung/førstehjem" og belåningsgrad over 90 % er utenfor scope.**
  Ung/førstehjem er en demografisk kategori (alder, første bolig), ikke et
  belåningsgrad-trinn, og ville krevd en ny akse i domenemodellen utover LTV
  og lånebeløp. Over 90 % LTV er i stor grad et ikke-problem: nedbetalingslån
  er uansett begrenset til 90 % av forsvarlig verdigrunnlag i
  utlånsforskriften (§ 7), så gapet er mer et datagrunnlags-hull enn en
  reell mangel.
- **Ingen retry eller backoff** mot Renteportalen eller Norges Bank, kun ett
  forsøk per forespørsel. Feiler kilden, rapporteres det i `sourceErrors`
  eller `trustCheckError` i stedet for å prøve på nytt (se DECISIONS.md rad
  14). Gjort ordentlig ville betydd eksponentiell backoff med 1-2 forsøk,
  men kun for forbigående feil (5xx, nettverksfeil), ikke for klientfeil
  (4xx, som ikke fikser seg selv), og en total tidsbudsjett-grense så
  endepunktet ikke henger.
- **Historikk brukes ikke.** Renteportalen tilbyr også `historikk.json`
  (62 dagers data). Kunne vært brukt til en rentegraf, eller til en mer
  robust avviks-sjekk (flagg et tall som statistisk avviker fra nylig trend,
  i stedet for en fast prosentpoeng-grense mot styringsrenten), men det er
  utenfor det oppgaven spør om.
- **Ingen minimal UI bygget.** Oppgaveteksten stiller ikke krav om UI, kun
  at vi sender en lenke til det vi har laget, så dette er et rent
  diskresjonært valg, ikke et udekket krav. Med mer tid ville en ett-sides
  skjema rundt det eksisterende API-et vært billig å legge til og gjort
  demo-opplevelsen enklere.
