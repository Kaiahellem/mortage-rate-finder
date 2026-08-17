# Beslutninger

Dette dokumentet lister viktige valg tatt underveis i oppgaven, med
begrunnelse og hvem som styrte valget.

| # | Valg | Alternativer vurdert | Begrunnelse | AI eller meg |
|---|---|---|---|---|
| 1 | Tilbudskilde 1: Renteportalen.no sitt åpne JSON-API | Finansportalen direkte (krever distribusjonsavtale), SSB (ikke LTV-delt, for grovkornet) | Eneste kandidat som er ekte, åpen uten innlogging, og allerede delt inn i belåningsgrad-trinn | AI foreslo, meg godkjente |
| 2 | Tilbudskilde 2: mock av en enkeltbanks rentetabell (`DirectBankMockSource`) | Ekte skraping av DNB/Nordea sine sider | Skraping er skjørt (JS-rendret, endres ofte, uklare vilkår), akkurat den typen tilgang oppgaven ber om å mocke | AI foreslo, meg godkjente |
| 3 | Tillitsanker: Norges Banks styringsrente via `data.norges-bank.no` | SSB sine rentetall | Norges Bank er den offisielle kilden til styringsrenten, gratis, ingen innlogging, direkte relevant for en under-rente-sjekk | AI foreslo, meg godkjente |
| 4 | Next.js App Router + TypeScript, ingen Tailwind | Ren API-server (Express/Fastify) | Next.js gir både API-rute og evt. minimal UI i samme rammeverk uten ekstra oppsett; Tailwind droppet siden UI er lavt prioritert | AI foreslo, meg godkjente |
| 5 | Vitest som testrammeverk | Jest | Raskere, enklere TypeScript/ESM-oppsett, vanlig standardvalg i nye Next.js-prosjekter | AI foreslo |
