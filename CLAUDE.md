@AGENTS.md

# Prosjektpreferanser

Dette er en take-home-oppgave til andregangsintervju hos PengeFix. Se
`README.md` for oppgaven og `DECISIONS.md` for begrunnede valg.

## Språk

- Kode, filnavn, kommentarer og commit-meldinger: engelsk.
- Dokumentasjon (`README.md`, `DECISIONS.md`, `TODO.md`): naturlig norsk,
  uten tankestrek (bruk vanlig bindestrek eller komma i stedet).

## Arbeidsmåte

- Jobb én GitHub-issue om gangen. Små commits med tydelige meldinger som
  refererer issue-nummer, f.eks. `Add RateSource interface (#2)`.
- Etter hver issue: stopp, oppsummer kort hva som ble gjort og hvorfor, og
  vent på klarsignal før neste issue. Ikke dump hele løsningen på én gang.
- Før et ikke-trivielt valg (kilder, arkitektur, biblioteker): forklar
  alternativene og trade-offs, la brukeren bestemme.
- Oppdater `DECISIONS.md` ved viktige valg, med kolonne "AI eller meg" som
  noterer hvem som styrte valget.
- Mock skal alltid være tydelig flagget i kode og output (aldri fremstilles
  som ekte data). Antakelser skal stå eksplisitt, ikke skjules.
- Hold løsningen liten. Ikke gullforgyll. "Med mer tid ville jeg..."-punkter
  samles fortløpende i README under "Videre arbeid", eventuelt i `TODO.md`
  som arbeidsliste underveis.
