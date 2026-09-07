# Variasjon og mobilrekkefølge – 2027.25

Den lokale banken var byteidentisk med den publiserte banken før revisjonen.

- Steg og løsning kommer før begrepshjelpen i dokumentrekkefølgen. Svartilbakemelding beholdes ved svarfeltet. Sidevisning på brede skjermer bevares.
- 35 nye oppgaver (2py27-916–950) gir minst ti familier i del 1 samfunnsstatistikk, lineære funksjoner og mønstre samt del 2 representasjoner. De inneholder ferdige hint, automatisk retting og begrepsstøtte. Figurer viser tidligere figurnumre, ikke svarfiguren.
- 150 oppgavetekster og ti gruppeinnledninger får fjernet unødvendig merking av øvingsdata. Instruksen for nye oppgaver er justert.
- Ti syklingoppgaver har nå fem forskjellige relative prosentendringer. Ti bibliotekoppgaver varierer mellom større, mindre og lik relativ endring, inkludert nedgang og uendret besøkstall.
- Fem samfunnscase spør ikke lenger etter samme prosentberegning i både a og c. Oppgave c beholder endring for andre kategori og valg av diagram.
- 155 tidligere oppgaver er berørt: 130 har bare ordlydsopprydding, 25 har målrettet innholdsrevisjon. De øvrige 760 er identiske. `variation-revision.json` angir alle endrede ID-er og nøyaktige før/etter-felt; `baseline-915-sha256.json` låser tidligere innhold for kontroll.
- Temaøving velger familier før tallvarianter og bruker høyst ett komplett case. Ved smalt nivåutvalg kan økten bli kortere enn ti oppgaver for å unngå gjentakelser.
- `task-profile.ts` samler like matematiske løsningsmønstre på tvers av temaetiketter. Eksamen vurderes samlet etter antall oppgaver, temaer, arbeidsmåter, mønstre og nylig brukte familier. Trekking har en begrenset søking og returnerer beste tilgjengelige sett hvis en begrenset bank ikke kan oppfylle alt.
- Historikken beholder de siste 30 unike oppgave-ID-ene per del/modus/tema/nivå. Dette er lokal historikk på enheten, ikke synkronisert mellom enheter.

Kontroll: 119 tester, inkludert gjengitte React-komponenter, selvstendig fasitkontroll, full historisk integritetskontroll og 1000 påfølgende eksamensøkter per del med fast tilfeldig startverdi. I simuleringen hadde alle økter ti forskjellige familier, minst tre arbeidsmåter, ti mønstre i del 1 / minst ni i del 2 og ingen familie fra de siste 30 oppgavene. Bygg og representasjonskontroll består. Ingen fysisk telefon- eller nettleserinteraksjonstest er gjennomført.

Bankens antall familier er ikke en garanti for helt forskjellige matematiske metoder. Numeriske varianter er beholdt for målrettet repetisjon. Flere nye case-oppsett kan senere gi større bredde i samfunnsstatistikk del 2; denne revisjonen hindrer at to varianter av samme case fyller én temaøkt.
