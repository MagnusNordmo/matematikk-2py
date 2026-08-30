import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultBankPath = join(scriptDir, "..", "public", "oppgaver-2027.json");

const mildFamilies = new Set([
  // Del 1: direkte gjenkjenning, avlesning eller én kort beregning.
  "d1-prosent-av-tall",
  "d1-vekstfaktor",
  "d1-potensverdi",
  "d1-formel-innsetting",
  "d1-lineaer-modell",
  "d1-kode-vilkar",
  "d1-grafavlesning",

  // Del 2: en direkte inngang til et kjent verktøy eller en tydelig modell.
  "d2-sammensatt-prosent-a",
  "d2-eksponential-a",
  "d2-lineaer-d",
  "d2-regresjon-a",
  "d2-statistikk-a",
  "d2-omvendt-a",
  "d2-kode-a",
  "d2-figur-a",
  "d2-samfunn-c",
]);

const challengingFamilies = new Set([
  // Del 1: strategivalg, omvendte prosesser eller flere sammenhengende ideer.
  "d1-omvendt-prosent",
  "d1-standardform-regning",
  "d1-kvadratisk-figurmonster",
  "d1-omvendt-fast-ledd",
  "d1-veid-gjennomsnitt",
  "d1-lineaert-skjaeringspunkt",
  "d1-kode-terskel",
  "d1-kritisk-statistikk",

  // Del 2: terskler, regresjon, modellkritikk og selvstendige vurderinger.
  "d2-kort-vekst-terskel",
  "d2-kort-histogram",
  "d2-sammensatt-prosent-c",
  "d2-eksponential-c",
  "d2-eksponential-d",
  "d2-lineaer-b",
  "d2-regresjon-b",
  "d2-regresjon-d",
  "d2-statistikk-d",
  "d2-gruppert-b",
  "d2-gruppert-d",
  "d2-omvendt-c",
  "d2-omvendt-d",
  "d2-kode-c",
  "d2-kode-d",
  "d2-figur-b",
  "d2-figur-d",
  "d2-samfunn-d",
]);

const mildIds = new Set([
  // Prosent: vennlige prosentandeler og hele tall.
  "2py27-006", "2py27-007", "2py27-011", "2py27-012", "2py27-013",
  // Potensregler: én regel om gangen.
  "2py27-053", "2py27-054", "2py27-055",
  // Proporsjonalitet: enkel enhetsverdi eller et helt tydelig tabellmønster.
  "2py27-105", "2py27-106", "2py27-123",
  // Statistikk: korte datasett med én tydelig observasjon.
  "2py27-128", "2py27-130", "2py27-133", "2py27-135",
  "2py27-163", "2py27-164", "2py27-166",
  // Modellgjenkjenning og korte blandede representasjoner.
  "2py27-208", "2py27-209", "2py27-258", "2py27-261", "2py27-262",
]);

const challengingIds = new Set([
  // Krever en lite synlig faktorisering uten hjelpemidler.
  "2py27-010",
]);

function updateSingleNumericQuestion(question, { sporsmal, svar, result, hints, unit }) {
  question.sporsmal = sporsmal;
  question.svar = svar;
  question.fasit.verdier[0].verdi = result;
  question.fasit.verdier[0].toleranse = 0;
  if (unit) question.fasit.verdier[0].enhet = unit;
  question.kontroll.resultat = [result];
  question.hint = hints;
  delete question.losningsveier;
}

function reviseMildPercentQuestions(byId) {
  updateSingleNumericQuestion(byId.get("2py27-001"), {
    sporsmal: "På en aktivitetsdag deltar \\(240\\) elever. \\(10\\,\\%\\) av elevene velger klatring. Hvor mange elever velger klatring?",
    svar: "Ti prosent er en tidel: \\(240/10=24\\). Det er \\(24\\) elever som velger klatring.",
    result: 24,
    hints: [
      "Hva vet vi? Hele gruppen er 240 elever, og vi skal finne 10 % av denne gruppen.",
      "Velg en enkel regnevei: 10 % betyr én av ti like store deler, så vi kan dele hele tallet på 10.",
      "Lag en plan: Skriv regnestykket som \\(240/10\\). Da flyttes vi direkte fra 100 % til 10 %.",
      "Gjør regningen: \\(240/10=24\\). Én tidel av 240 elever er derfor 24 elever.",
      "Svar på spørsmålet: \\(10\\,\\%\\) av \\(240\\) er \\(24\\), så 24 elever velger klatring.",
      "Sjekk svaret: Ti grupper med 24 elever gir \\(10\\cdot24=240\\). Dermed er 24 akkurat 10 % av hele gruppen.",
    ],
  });
  Object.assign(byId.get("2py27-001").kontroll.inndata, { total: 240, prosent: 10 });

  updateSingleNumericQuestion(byId.get("2py27-003"), {
    sporsmal: "En arbeidsplass har \\(200\\) ansatte. \\(30\\,\\%\\) sykler til jobb. Hvor mange ansatte sykler til jobb?",
    svar: "Ti prosent av 200 er 20. Da er \\(30\\,\\%=3\\cdot10\\,\\%\\), så \\(3\\cdot20=60\\) ansatte sykler til jobb.",
    result: 60,
    hints: [
      "Hva vet vi? 200 ansatte er hele gruppen, og vi skal finne den delen som svarer til 30 %.",
      "Velg en enkel regnevei: Finn først 10 %. Tre slike deler blir 30 %, så tallene holder seg små.",
      "Lag en plan: Del 200 på 10 for å finne 10 %, og gang deretter dette svaret med 3.",
      "Gjør regningen: \\(200/10=20\\), og deretter \\(3\\cdot20=60\\).",
      "Svar på spørsmålet: \\(30\\,\\%\\) av \\(200\\) er \\(60\\), så 60 ansatte sykler til jobb.",
      "Sjekk svaret: \\(60/200=0{,}3=30\\,\\%\\). Andelen stemmer med opplysningen i oppgaven.",
    ],
  });
  Object.assign(byId.get("2py27-003").kontroll.inndata, { total: 200, prosent: 30 });

  updateSingleNumericQuestion(byId.get("2py27-004"), {
    sporsmal: "Et idrettslag har \\(160\\) medlemmer. \\(25\\,\\%\\) av medlemmene er trenere. Hvor mange trenere har idrettslaget?",
    svar: "Siden 25 % er en firedel, får vi \\(160/4=40\\). Idrettslaget har \\(40\\) trenere.",
    result: 40,
    hints: [
      "Hva vet vi? 160 medlemmer er hele gruppen, og vi skal finne den delen som er 25 %.",
      "Velg en enkel regnevei: 25 % er det samme som en firedel. Derfor kan vi dele medlemstallet på 4.",
      "Lag en plan: Tenk at de 160 medlemmene deles i fire like store grupper.",
      "Gjør regningen: \\(160/4=40\\). Hver firedel inneholder 40 medlemmer.",
      "Svar på spørsmålet: \\(25\\,\\%\\) av \\(160\\) er \\(40\\), så laget har 40 trenere.",
      "Sjekk svaret: Fire like grupper med 40 medlemmer gir \\(4\\cdot40=160\\). Én gruppe er derfor 25 %.",
    ],
  });
  Object.assign(byId.get("2py27-004").kontroll.inndata, { total: 160, prosent: 25 });

  updateSingleNumericQuestion(byId.get("2py27-005"), {
    sporsmal: "I en spørreundersøkelse kom det inn \\(350\\) svar. \\(10\\,\\%\\) svarte «vet ikke». Hvor mange svarte «vet ikke»?",
    svar: "Ti prosent er en tidel: \\(350/10=35\\). Det var \\(35\\) slike svar.",
    result: 35,
    hints: [
      "Hva vet vi? 350 er hele antallet svar, og vi skal finne 10 % av svarene.",
      "Velg en enkel regnevei: 10 % betyr en tidel, så vi trenger bare å dele 350 på 10.",
      "Lag en plan: Skriv regnestykket \\(350/10\\). Dette går direkte fra 100 % til 10 %.",
      "Gjør regningen: \\(350/10=35\\). En tidel av alle svarene er 35 svar.",
      "Svar på spørsmålet: \\(10\\,\\%\\) av \\(350\\) er \\(35\\). Det var 35 «vet ikke»-svar.",
      "Sjekk svaret: \\(10\\cdot35=350\\). Ti like deler på 35 svar gir hele undersøkelsen.",
    ],
  });
  Object.assign(byId.get("2py27-005").kontroll.inndata, { total: 350, prosent: 10 });

  updateSingleNumericQuestion(byId.get("2py27-006"), {
    sporsmal: "På en skole reiser \\(20\\) av \\(100\\) elever med tog. Hvor mange prosent av elevene reiser med tog?",
    svar: "Når hele gruppen er 100, viser antallet delen direkte i prosent. Derfor er andelen \\(20\\,\\%\\).",
    result: 20,
    hints: [
      "Hva vet vi? Hele gruppen er 100 elever, og 20 av dem reiser med tog.",
      "Velg en enkel regnevei: Prosent betyr «av hundre». Her er totalen allerede 100, så vi kan lese prosenten direkte.",
      "Lag en plan: Skriv andelen som \\(20/100\\) og sammenlign med definisjonen av prosent.",
      "Gjør regningen: \\(20/100=0{,}2\\), og \\(0{,}2\\cdot100\\,\\%=20\\,\\%\\).",
      "Svar på spørsmålet: \\(20\\) av \\(100\\) elever er \\(20\\,\\%\\).",
      "Sjekk svaret: \\(20\\,\\%\\) av 100 er \\(0{,}2\\cdot100=20\\) elever, som er den oppgitte delen.",
    ],
  });
  Object.assign(byId.get("2py27-006").kontroll.inndata, { del: 20, total: 100 });

  updateSingleNumericQuestion(byId.get("2py27-007"), {
    sporsmal: "I en kantine velger \\(25\\) av \\(100\\) kunder vegetarretten. Hvor mange prosent velger vegetarretten?",
    svar: "Når hele gruppen er 100, er 25 av kundene det samme som \\(25\\,\\%\\).",
    result: 25,
    hints: [
      "Hva vet vi? Hele gruppen er 100 kunder, og 25 av dem velger vegetarretten.",
      "Velg en enkel regnevei: Prosent betyr «av hundre». Totalen er allerede 100, så antallet kan leses direkte som prosent.",
      "Lag en plan: Skriv andelen som \\(25/100\\) og gjør brøken om til prosent.",
      "Gjør regningen: \\(25/100=0{,}25\\), og \\(0{,}25\\cdot100\\,\\%=25\\,\\%\\).",
      "Svar på spørsmålet: \\(25\\) av \\(100\\) kunder er \\(25\\,\\%\\).",
      "Sjekk svaret: \\(25\\,\\%\\) av 100 er \\(0{,}25\\cdot100=25\\) kunder, som stemmer med oppgaven.",
    ],
  });
  Object.assign(byId.get("2py27-007").kontroll.inndata, { del: 25, total: 100 });

  updateSingleNumericQuestion(byId.get("2py27-011"), {
    sporsmal: "\\(20\\) frivillige utgjør \\(10\\,\\%\\) av alle som deltar på en festival. Hvor mange deltakere er det totalt?",
    svar: "Ti prosent er en tidel av hele gruppen. Derfor er hele gruppen \\(10\\cdot20=200\\) personer.",
    result: 200,
    hints: [
      "Hva vet vi? 20 frivillige tilsvarer 10 %, og vi skal finne hele gruppen på 100 %.",
      "Velg en enkel regnevei: Fra 10 % til 100 % ganger vi med 10. Det samme må vi gjøre med antallet personer.",
      "Lag en plan: 10 % er 20 personer, mens 100 % er ti slike deler.",
      "Gjør regningen: \\(20\\cdot10=200\\). Hele gruppen består av ti grupper med 20 personer.",
      "Svar på spørsmålet: Det er \\(200\\) deltakere på festivalen.",
      "Sjekk svaret: \\(10\\,\\%\\) av \\(200\\) er \\(200/10=20\\), som er antallet oppgaven ga.",
    ],
  });
  Object.assign(byId.get("2py27-011").kontroll.inndata, { del: 20, prosent: 10 });
}

function reviseMildFormulaQuestions(byId) {
  const revisions = {
    "2py27-073": {
      sporsmal: "Reiseutgiften er gitt ved \\(K=100+5x\\), der \\(x\\) er antall kilometer. Finn \\(K\\) når \\(x=20\\).",
      svar: "\\(K=100+5\\cdot20=100+100=200\\) kr.", result: 200,
      known: "Formelen er \\(K=100+5x\\), og \\(x=20\\). Vi skal finne K ved å sette 20 inn for x.",
      plan: "Sett inn 20: \\(K=100+5\\cdot20\\). Regn multiplikasjonen før addisjonen.",
      work: "\\(5\\cdot20=100\\), og deretter \\(100+100=200\\).",
      check: "\\(200-100=100=5\\cdot20\\). Den variable delen stemmer med formelen.",
    },
    "2py27-074": {
      sporsmal: "Strekningen er gitt ved \\(s=vt\\), der \\(v\\) er farten og \\(t\\) er tiden. Finn \\(s\\) når \\(v=4\\) m/s og \\(t=3\\) s.",
      svar: "\\(s=4\\cdot3=12\\) m.", result: 12, unit: "m",
      known: "Formelen er \\(s=vt\\), med \\(v=4\\) og \\(t=3\\). Begge tallene skal settes inn.",
      plan: "Sett inn verdiene: \\(s=4\\cdot3\\). Nå gjenstår én multiplikasjon.",
      work: "\\(4\\cdot3=12\\). Strekningen er derfor 12 meter.",
      check: "\\(12/3=4\\). Når strekningen deles på tiden, får vi den oppgitte farten tilbake.",
    },
    "2py27-075": {
      sporsmal: "Arealet av et rektangel er \\(A=lb\\). Finn \\(A\\) når lengden er \\(l=5\\) m og bredden er \\(b=4\\) m.",
      svar: "\\(A=5\\cdot4=20\\) m².", result: 20,
      known: "Formelen er \\(A=lb\\), og vi kjenner \\(l=5\\) og \\(b=4\\).",
      plan: "Sett inn begge målene: \\(A=5\\cdot4\\). Nå gjenstår én multiplikasjon.",
      work: "\\(5\\cdot4=20\\). Arealet er derfor 20 kvadratmeter.",
      check: "\\(20/5=4\\). Når arealet deles på lengden, får vi den oppgitte bredden tilbake.",
    },
    "2py27-076": {
      sporsmal: "Temperaturen i fahrenheit er \\(F=1{,}8C+32\\). Finn \\(F\\) når \\(C=10\\).",
      svar: "\\(F=1{,}8\\cdot10+32=18+32=50\\) °F.", result: 50,
      known: "Formelen er \\(F=1{,}8C+32\\), og temperaturen er \\(C=10\\). Vi skal finne F.",
      plan: "Sett inn 10 for C: \\(F=1{,}8\\cdot10+32\\). Regn multiplikasjonen først.",
      work: "\\(1{,}8\\cdot10=18\\), og \\(18+32=50\\).",
      check: "\\(50-32=18=1{,}8\\cdot10\\). Vi får tilbake temperaturdelen i formelen.",
    },
    "2py27-077": {
      sporsmal: "En modell for malingsbehov er \\(D=0{,}05m+1\\), der \\(m\\) er veggarealet i m². Finn \\(D\\) når \\(m=20\\).",
      svar: "\\(D=0{,}05\\cdot20+1=1+1=2\\) liter.", result: 2,
      known: "Formelen er \\(D=0{,}05m+1\\), og veggarealet er \\(m=20\\). Vi skal finne D.",
      plan: "Sett inn 20 for m: \\(D=0{,}05\\cdot20+1\\). Regn multiplikasjonen først.",
      work: "\\(0{,}05\\cdot20=1\\), og deretter \\(1+1=2\\).",
      check: "\\(2-1=1=0{,}05\\cdot20\\). Den variable delen stemmer med formelen.",
    },
  };

  for (const [id, revision] of Object.entries(revisions)) {
    const question = byId.get(id);
    updateSingleNumericQuestion(question, {
      sporsmal: revision.sporsmal,
      svar: revision.svar,
      result: revision.result,
      unit: revision.unit,
      hints: [
        `Hva vet vi? ${revision.known}`,
        "Velg en enkel regnevei: Erstatt bokstaven med tallet først. Deretter følger vi regnerekkefølgen ett trinn om gangen.",
        `Lag en plan: ${revision.plan}`,
        `Gjør regningen: ${revision.work}`,
        `Svar på spørsmålet: ${revision.svar}`,
        `Sjekk svaret: ${revision.check}`,
      ],
    });
  }
}

export function calibrateDifficulty(bank) {
  const byId = new Map(bank.oppgaver.map((question) => [question.id, question]));
  reviseMildPercentQuestions(byId);
  reviseMildFormulaQuestions(byId);

  for (const question of bank.oppgaver) {
    question.niva = 2;
    if (mildFamilies.has(question.variantfamilie) || mildIds.has(question.id)) question.niva = 1;
    if (challengingFamilies.has(question.variantfamilie) || challengingIds.has(question.id)) question.niva = 3;
  }

  bank.nivaaer = { "1": "mild", "2": "middels", "3": "utfordrende" };
  bank.statistikk.fordeling_niva = Object.fromEntries(
    [1, 2, 3].map((level) => [String(level), bank.oppgaver.filter((question) => question.niva === level).length]),
  );
  bank.samling.versjon = "2027.14";
  const difficultyNote = "Alle oppgaver er vurdert på nytt etter en streng nivåregel: Mild betyr en direkte avlesning, gjenkjenning eller kort beregning med vennlige tall; middels krever flere sammenhengende steg; utfordrende krever strategivalg, kombinasjon av ideer eller selvstendig vurdering.";
  const noteWithoutOldCalibration = bank.opphav.merknad
    .replace(/ Alle oppgaver er vurdert som (?:lette|milde), middels eller utfordrende[^.]*\./gu, "")
    .replace(/ Alle oppgaver er vurdert på nytt etter en streng nivåregel: Mild betyr en direkte avlesning, gjenkjenning eller kort beregning med vennlige tall; middels krever flere sammenhengende steg; utfordrende krever strategivalg, kombinasjon av ideer eller selvstendig vurdering\./gu, "");
  bank.opphav.merknad = `${noteWithoutOldCalibration.trim()} ${difficultyNote}`;

  return bank;
}

async function run(bankPath = defaultBankPath) {
  const bank = JSON.parse(await readFile(bankPath, "utf8"));
  calibrateDifficulty(bank);
  await writeFile(bankPath, `${JSON.stringify(bank, null, 2)}\n`, "utf8");
  console.log(`Kalibrerte ${bank.oppgaver.length} oppgaver. Fordeling: ${JSON.stringify(bank.statistikk.fordeling_niva)}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await run(process.argv[2] ?? defaultBankPath);
}
