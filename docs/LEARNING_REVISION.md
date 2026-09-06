# Automatisk vurdering og læringsstøtte, 6. september 2026

- Ny oppgaveinstruks: `oppgaveinstruks-2py.txt`, koblet fra AGENTS.md.
- 42 tidligere manuelle oppgaver har fått strukturerte svar. Se `learning-revision.json` for full ID-liste. De øvrige 473 oppgavene og alle 50 fellesdatasett er identiske med utgangspunktet.
- Egne datasett og moteksempler kontrolleres mot alle krav; alternative gyldige svar godtas.
- Felles begrepsbank dekker alle 515 oppgaver. Hjelpen vises ved forespørsel/hint eller etter gyldig innsending. Riktig svar får forklaring; gjenkjennelige feilsvar får målrettet tilbakemelding, ellers brukes oppgavens løsning eller et generelt neste steg.
- Innsendt svar beholdes som grunnlag for tilbakemeldingen mens eleven redigerer et nytt forsøk. Hjelp tilbakestilles ved neste oppgave. Full løsning kan åpnes etter innsending.
- Første forsøk uten hjelp skilles fra svar etter hint, tilbakemelding eller løsning. Hint gir ikke poengtrekk; mini-eksamen bruker fortsatt ett forsøk per oppgave.
- Fem tidligere åpne presentasjonsoppgaver er kalibrert fra krevende til middels etter omforming. Eldre tester som krevde fritekst/egenvurdering er erstattet med kontroller for de nye brukerkravene; øvrige regresjonskontroller er beholdt.
- Kontroll: 90 automatiske tester, inkludert faktisk gjengitte støttekomponenter, og produksjonsbygg. Ingen manuell nettleser- eller mobilutprøving er utført. Den eksisterende prosjektomfattende TypeScript-kontrollen har feil i Cloudflare-typer og eldre testoppsett; bygg og tester har egne vellykkede kontroller.
