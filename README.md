# Matematikk 2PY – eksamenstrening

En norsk nettapp for elever som øver til både Del 1 og Del 2 av matematikk 2PY. Eleven velger eksamensdel og kan deretter trene på et bestemt tema eller gjennomføre en blandet eksamensøkt.

Oppgavebanken dekker både oppgaver uten hjelpemidler og digitale oppgaver med hjelpemidler. Del 2 inneholder sammenhengende case med fire deloppgaver, i tillegg til selvstendige digitale oppgaver. Alle svar kan kontrolleres direkte i nettleseren.

## Én felles oppgavebank

`public/oppgaver-2027.json` er den autoritative kilden til det nye oppgaveinnholdet. Elevappen leser filen direkte. Kontrollappen og den selvstendige HTML-filen genereres fra nøyaktig samme fil under bygging. Den eldre `public/oppgaver.json` er beholdt som historikk, men brukes ikke av elevappen.

```text
public/oppgaver-2027.json     spørsmål, case, hint, fasiter og metadata
app/page.tsx                  elevappen
app/kontroll/page.tsx         kontrollappen på /kontroll
scripts/build-review-app.mjs  lager selvstendig kontrollapp
tests/                        kontrollerer innhold og bygg
```

Ikke rediger `public/oppgaver-og-hint.html` direkte. Den blir laget på nytt fra `public/oppgaver-2027.json`.

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

1. Endre `public/oppgaver-2027.json` når en oppgave, et hint eller en fasit skal revideres.
2. Kjør `npm test`.
3. Kontroller elevappen og `/kontroll` i nettleseren.
4. Legg inn endringen i GitHub.

Appen lagrer framdrift separat for Del 1 og Del 2 i elevens nettleser. Den krever ingen innlogging og samler ikke inn personopplysninger.
