# Matematikk 2PY – Del 1

En norsk nettapp for elever som øver til Del 1 av matematikk 2PY uten hjelpemidler. Prosjektet inneholder både elevappen og en kontrollapp for å lese gjennom alle spørsmål, hint og fasiter.

## Én felles oppgavebank

`public/oppgaver.json` er den eneste autoritative kilden til oppgaveinnholdet. Elevappen leser filen direkte. Kontrollappen og den selvstendige HTML-filen genereres fra nøyaktig samme fil under bygging.

```text
public/oppgaver.json          spørsmål, hint, fasiter og metadata
app/page.tsx                  elevappen
app/kontroll/page.tsx         kontrollappen på /kontroll
scripts/build-review-app.mjs  lager selvstendig kontrollapp
tests/                        kontrollerer innhold og bygg
```

Ikke rediger `public/oppgaver-og-hint.html` direkte. Den blir laget på nytt fra `public/oppgaver.json`.

## Kjør lokalt

Du trenger Node.js 22.13 eller nyere.

```bash
npm ci
npm run dev
```

Elevappen åpnes på `/`, og kontrollappen på `/kontroll`.

## Kontroller endringer

```bash
npm test
```

Testene stopper dersom oppgavebanken er ugyldig, oppgave-ID-er er duplisert, eller kontrollappen ikke inneholder nøyaktig de samme spørsmålene og hintene som elevappen.

## Arbeidsflyt

1. Endre bare `public/oppgaver.json` når en oppgave, et hint eller en fasit skal revideres.
2. Kjør `npm test`.
3. Kontroller elevappen og `/kontroll` i nettleseren.
4. Legg inn endringen i GitHub.

Appen bruker lokal lagring i elevens nettleser. Den krever ingen innlogging og samler ikke inn personopplysninger.
