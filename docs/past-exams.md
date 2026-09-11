# Tidligere eksamener

Oppgaveteksten vises som hele, uendrede sider rendret fra kilde-PDF-en. Tekst, tabeller og figurer er ikke skrevet om eller rekonstruert. Original PDF kan åpnes fra øvingen. Appens kontrollspørsmål vises separat og sjekker utvalgte resultater, ikke fullstendige besvarelser eller sensorpoeng.

## Kilder og avgrensning

- Våren 2023: oppgavesett fra NDLA, uten de innskutte løsningene i brukerens løsningsdokument.
- Høsten 2024 og våren 2025: hele bokmålssider fra vedlagte dokumenter.
- Våren 2026: vedlagt oppgavesett, navngitt etter brukerens instruksjon.
- `losning_2022_2.pdf` er etter gammel læreplan og inngår ikke.

NDLAs kildeoversikt: https://ndla.no/en/r/matematikk-2p-y/eksamensoppgaver-og-losninger-i-2p-y/e016af8473

## Vedlikehold og kontroll

Fire sett vises kronologisk: våren 2023, høsten 2024, våren 2025 og våren 2026. De omfatter 56 hovedoppgaver på 38 originalsider, med 62 kontrollpunkter. `scripts/author-past-exam-checks.py` lager kontrollpunktene i `docs/past-exam-checks.json`. `scripts/render-past-exams.py` lager sidebilder og manifest fra kildene i `public/eksamener/kilder`. Ved endret kilde eller bilde rendres siden på nytt. Endrede kilder og kontrollpunkter må gjennomgås faglig før publisering.

Manifestet inneholder kilde- og bildehash samt sidestørrelser. Testene sjekker filintegritet, oppgavedekning, utvalgte matematiske grensetilfeller, svarvisning, lagring og at produksjonsbygget inneholder de samme kildene. Alle 38 sidebilder er også visuelt gjennomgått. Dette er ikke en garanti mot enhver feil i kildedokumentene eller kontrollpunktene.

Ved ferdigstilling bestod produksjonsbygget og alle 143 tester. Lokal forhåndsvisning svarte med HTTP 200. Interaktiv nettleser- og mobiltesting er ikke utført.
