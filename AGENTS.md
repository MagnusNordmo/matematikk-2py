# Vedlikehold av MatematikkApp

Følg [CONTENT_MAINTENANCE.md](CONTENT_MAINTENANCE.md) ved feilretting.

- Rett rapporterte feil målrettet. Ikke regenerer hele oppgavebanken for en enkelt innholds- eller visningsfeil.
- `public/oppgaver-2027.json` er den autoritative, publiserte innholdskilden.
- Lag en regresjonstest som feiler før rettelsen og består etterpå. Test den faktiske visningskomponenten ved visningsfeil, ikke bare tekstdataene.
- Kontroller hvilke oppgave-ID-er som faktisk er endret. Urelaterte oppgaver skal være identiske.
- De eldre revisjons- og kalibreringsskriptene kan overskrive hele banken. Ikke bruk `--allow-full-bank-rewrite` uten at brukeren uttrykkelig har bestilt en full innholdsrevisjon.
- Bygging av den avledede kontrollsiden er tillatt. Det er ikke en hintrevisjon og skal ikke endre JSON-banken.
- Bevar tidligere rettelser og tester. Ikke senk testkrav for å få en feilretting gjennom.
