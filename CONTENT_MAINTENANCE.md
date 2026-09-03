# Strategi: små, kontrollerte feilrettinger

## Hvorfor arbeidsmåten endres

Innholdsrevisjonen har flere trinn som omskriver hint, maskerer svar og erstatter tidligere hint. En full kjøring kan derfor endre mange oppgaver som ikke inngår i den rapporterte feilen. At resultatet blir identisk ved gjentatt kjøring, beviser bare stabilitet, ikke pedagogisk kvalitet. Tester av gyldig matematikktekst oppdager heller ikke om en visningskomponent glemmer å gjengi matematikken, eller om mobilens tastatur mangler et nødvendig tegn.

## Fast fremgangsmåte

1. Identifiser oppgave-ID, valgt løsningsvei, hintnummer og hvilken skjermdel som feiler. Sammenlign lokal og publisert versjon før noe endres.
2. Klassifiser feilen: innhold, visning, innskriving eller utdatert innlasting. Avgrens hvilke filer og oppgaver som skal endres.
3. Lag en regresjonstest for selve feilen. Visningsfeil testes i gjengitt komponent; innskriving testes med negative tall og norske desimaler; hint testes i alle løsningsveier for den berørte oppgaven.
4. Rett den minste relevante enheten. En delt komponent kan rette flere visninger uten at oppgavetekstene skrives om. Ved en innholdsfeil redigeres bare den aktuelle JSON-oppgaven og eventuelt dens tilsvarende historiske generatoroppskrift; generatoren kjøres ikke.
5. Sammenlign med versjonen før arbeidet startet. Bekreft eksplisitt hvilke oppgave-ID-er som er endret, og at øvrige oppgaver er identiske. Bygg kontrollsiden og appen uten å endre innholdskilden.
6. Kjør eksisterende og nye tester. Ved mobilproblemer skilles logikktester og komponenttester fra en faktisk test på telefon; sistnevnte skal ikke påstås gjennomført uten belegg.
7. Publiser den kontrollerte versjonen etter nødvendig godkjenning. Hent oppgavebanken fra nett og sammenlign med den lokale. Oppsummer konkrete rettelser og gjenværende usikkerhet, ikke at «alle feil» er borte.

## Vern mot utilsiktede omskrivinger

De gamle fullrevisjonene krever nå det eksplisitte flagget `--allow-full-bank-rewrite`. Flagget er bare for en separat, brukerbestilt fullrevisjon. Vanlig bygging og feilretting skal ikke bruke det. Regresjonstester kontrollerer at skriptene avbryter uten flagget og ikke endrer bankfilene.

## Denne rettingen

- Oppgavedata bruker samme matematikkgjengivelse som spørsmål og hint, også i tabellceller.
- Alle numeriske svarfelt får en tilgjengelig fortegnsknapp, uavhengig av fasiten.
- Kun oppgave `2py27-027` får endret hinttekst: medlemmer i stedet for kroner/priser. Begge løsningsveier er låst med tester mot tomme svarruter i siste hint.
- Ny sideinnlasting henter oppgavebanken uten gjenbruk av nettleserens HTTP-cache. En allerede åpen økt avbrytes ikke automatisk.
