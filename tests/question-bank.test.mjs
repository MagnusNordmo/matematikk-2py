import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bank = JSON.parse(
  await readFile(new URL("../public/oppgaver-2027.json", import.meta.url), "utf8"),
);

test("oppgavebanken har 500 komplette og unike oppgaver", () => {
  assert.equal(bank.samling.antall, 500);
  assert.equal(bank.oppgaver.length, 500);
  assert.equal(new Set(bank.oppgaver.map((question) => question.id)).size, 500);
  assert.equal(bank.oppgavegrupper.length, 50);

  for (const question of bank.oppgaver) {
    assert.ok(question.id?.trim(), "Alle oppgaver må ha ID");
    assert.ok([1, 2].includes(question.del), `${question.id} har ugyldig del`);
    assert.equal(question.hjelpemidler, question.del === 1 ? "uten" : "med");
    assert.ok(question.sporsmal?.trim(), `${question.id} mangler spørsmål`);
    assert.ok(question.svar?.trim(), `${question.id} mangler løsning`);
    assert.ok(Array.isArray(question.hint) && question.hint.length >= 5, `${question.id} har for få worked-example-steg`);
    assert.ok(question.hint.every((hint) => typeof hint === "string" && hint.trim().length >= 20), `${question.id} har et kort eller tomt hint`);
    assert.ok(["tall", "flere_tall", "valg", "valg_og_tall"].includes(question.fasit?.type), `${question.id} har ugyldig svarformat`);
  }
});

test("fordelingen mellom deler og svarformater er bevart", () => {
  assert.equal(bank.oppgaver.filter((question) => question.del === 1).length, 262);
  assert.equal(bank.oppgaver.filter((question) => question.del === 2).length, 238);
  const expected = { tall: 260, flere_tall: 70, valg: 160, valg_og_tall: 10 };
  for (const [type, count] of Object.entries(expected)) {
    assert.equal(bank.oppgaver.filter((question) => question.fasit.type === type).length, count, type);
  }
});

test("alle oppgaver har et gjennomgått og tilgjengelig nivå", () => {
  assert.deepEqual(bank.nivaaer, {
    "1": "mild",
    "2": "middels",
    "3": "utfordrende",
  });

  const distribution = Object.fromEntries(
    [1, 2, 3].map((level) => [String(level), bank.oppgaver.filter((question) => question.niva === level).length]),
  );
  assert.deepEqual(distribution, { "1": 103, "2": 266, "3": 131 });
  assert.deepEqual(bank.statistikk.fordeling_niva, distribution);

  for (const question of bank.oppgaver) {
    assert.ok([1, 2, 3].includes(question.niva), `${question.id} mangler gyldig nivå`);
  }

  const partThemes = new Set(bank.oppgaver.map((question) => `${question.del}:${question.tema}`));
  for (const partTheme of partThemes) {
    const [part, theme] = partTheme.split(":");
    const questions = bank.oppgaver.filter((question) => String(question.del) === part && question.tema === theme);
    for (const level of [1, 2, 3]) {
      assert.ok(questions.some((question) => question.niva === level), `${partTheme} mangler nivå ${level}`);
    }
  }

  assert.equal(bank.oppgaver.find((question) => question.id === "2py27-010").niva, 3);
});

test("alle oppgaver med flere svarbestanddeler har tydelige feltetiketter", () => {
  const multipartQuestions = bank.oppgaver.filter((question) =>
    ["flere_tall", "valg_og_tall"].includes(question.fasit.type),
  );

  for (const question of multipartQuestions) {
    const labels = question.fasit.verdier.map((answer) => answer.etikett);
    assert.ok(
      labels.every((label) => typeof label === "string" && label.trim().length > 0),
      `${question.id} mangler en tydelig feltetikett`,
    );
    assert.equal(
      new Set(labels).size,
      labels.length,
      `${question.id} har svarfelt som ikke kan skilles fra hverandre`,
    );
  }
});

test("Del 2-case har fire sammenhengende deloppgaver", () => {
  const groupIds = new Set(bank.oppgavegrupper.map((group) => group.id));
  for (const group of bank.oppgavegrupper) {
    assert.equal(group.del, 2);
    assert.ok(group.tittel?.trim());
    assert.ok(group.innledning?.trim());
    const questions = bank.oppgaver
      .filter((question) => question.oppgavegruppe?.id === group.id)
      .sort((a, b) => a.oppgavegruppe.rekkefolge - b.oppgavegruppe.rekkefolge);
    assert.equal(questions.length, 4, group.id);
    assert.deepEqual(questions.map((question) => question.oppgavegruppe.rekkefolge), [1, 2, 3, 4]);
    assert.deepEqual(questions.map((question) => question.oppgavegruppe.deloppgave), ["a", "b", "c", "d"]);
  }
  for (const question of bank.oppgaver.filter((item) => item.oppgavegruppe)) {
    assert.ok(groupIds.has(question.oppgavegruppe.id), `${question.id} viser til ukjent case`);
  }
});

test("oppgavebanken dekker digitale representasjoner uten filinnlevering", () => {
  assert.equal(bank.oppgaver.filter((question) => question.tema === "programmering").length, 45);
  assert.ok(bank.oppgaver.some((question) => question.visualisering?.type === "figurmønster"));
  assert.ok(bank.oppgavegrupper.some((group) => group.visualisering?.type === "spredningsdiagram"));
  assert.ok(bank.oppgaver.every((question) => !/last opp|lever inn|excel-fil/i.test(question.sporsmal)));
});

test("alle hintforløp er fullstendige worked examples", () => {
  const forbiddenHints = new Set([
    "Bruk regelen som passer operasjonen.",
    "Følg regnerekkefølgen.",
    "Løs ligningen og sett x-verdien inn i én av modellene.",
    "Følg programmet linje for linje.",
    "Bruk modellen fra b.",
    "Oversett uttrykket til en beregning.",
    "Kjør den samme algoritmen med den nye inndataen eller parameteren.",
  ]);
  const obsoleteGenericChecks = new Set([
    "Kontroller og konkluder: Spor programmet én gang til med de opprinnelige startverdiene. Variablene og stoppvilkåret skal ende på verdiene i løsningen.",
    "Kontroller og konkluder: Gå motsatt vei med prosentregningen, eller sammenlign med startverdien. Da skal du få tilbake den oppgitte verdien og riktig retning på endringen.",
    "Kontroller og konkluder: Kontroller antall observasjoner, samlet frekvens og eventuell sortering. Svaret skal ligge på en rimelig plass i datamaterialet.",
    "Kontroller og konkluder: Prøv regelen på en av de oppgitte figurene og på figuren rett før eller etter. Begge kontrollene skal passe mønsteret.",
    "Kontroller og konkluder: Sett resultatet inn i modellen eller sammenlign det med tabellen og grafen. Fortegn, enhet og størrelsesorden skal passe situasjonen.",
    "Kontroller og konkluder: Regn uttrykket tilbake som et vanlig tall eller bruk en omvendt potensoperasjon. Fortegn og størrelsesorden skal stemme.",
    "Kontroller og konkluder: Sett den funne verdien inn i den opprinnelige ligningen eller formelen. Venstre og høyre side skal bli like.",
  ]);
  const numericTypes = new Set(["tall", "flere_tall", "valg_og_tall"]);

  for (const question of bank.oppgaver) {
    assert.ok(
      question.hint.every((hint) => !forbiddenHints.has(hint)),
      `${question.id} har fortsatt et hint som bare gjentar arbeidsordren`,
    );
    assert.ok(question.hint.length >= 5, `${question.id} mangler gradvis hintprogresjon`);
    assert.ok(question.hint.join(" ").length >= 300, `${question.id} har for lite forklaring til å være et worked example`);
    assert.ok(question.hint.some((hint) => /Svar på spørsmålet:|Fullfør regningen:/.test(hint)), `${question.id} mangler fullført utregning`);
    assert.match(question.hint.at(-1), /^(?:Sjekk svaret|Kontroller)/u, `${question.id} mangler avsluttende kontrollsteg`);
    assert.ok(!obsoleteGenericChecks.has(question.hint.at(-1)), `${question.id} har et generisk kontrollsteg uten konkret kontroll`);

    if (numericTypes.has(question.fasit.type)) {
      const solutionIndex = question.hint.findIndex((hint) => hint.startsWith("Svar på spørsmålet:"));
      const workedSteps = question.hint.slice(1, solutionIndex >= 0 ? solutionIndex : -1).join(" ");
      assert.match(
        workedSteps,
        /=|\\(?:approx|le|ge)|[≤≥]/u,
        `${question.id} mangler en utført matematisk relasjon før konklusjonen`,
      );
    }
  }

  assert.ok(bank.oppgaver.reduce((total, question) => total + question.hint.length, 0) >= 2500);
  assert.ok(new Set(bank.oppgaver.map((question) => question.hint.at(-1))).size >= 400, "Kontrollstegene er fortsatt for generiske");
});

test("regneoppgavene viser smarte hoderegningsveier når tallene inviterer til det", () => {
  const byId = (id) => bank.oppgaver.find((question) => question.id === id);
  const numericTypes = new Set(["tall", "flere_tall", "valg_og_tall"]);
  const numericDel1 = bank.oppgaver.filter((question) =>
    question.del === 1 && numericTypes.has(question.fasit.type));

  for (const question of numericDel1) {
    if (question.variantfamilie === "d1-omvendt-prosent") {
      assert.match(question.hint.join(" "), /prosentstripe hele veien/u, question.id + " mangler én sammenhengende håndregningsstrategi");
    } else {
      assert.ok(
        question.hint.some((hint) => hint.startsWith("Velg en enkel regnevei:")),
        question.id + " signaliserer ikke den enkle regneveien",
      );
    }
  }

  const strategies = bank.oppgaver
    .flatMap((question) => question.hint)
    .filter((hint) => hint.startsWith("Velg en enkel regnevei:"));
  assert.ok(strategies.length >= 200, "For få oppgaver har fått et konkret strategihint");
  assert.ok(new Set(strategies).size >= 180, "Strategihintene er for generiske eller gjentatte");
  assert.ok(strategies.every((hint) => hint.length >= 60), "Et strategihint er for kort til å hjelpe");
  assert.doesNotMatch(strategies.join(" "), /--|\+-|skal (?:legg|halver)\b/u, "Et strategihint har uklar matematikk eller språk");

  const quarterQuestion = byId("2py27-002");
  assert.match(quarterQuestion.hint.join(" "), /Dette kan gjøres i hodet/u);
  assert.match(quarterQuestion.hint.join(" "), /25 % er en firedel/u);
  assert.match(quarterQuestion.hint.join(" "), /360\/4=90/u);
  assert.doesNotMatch(quarterQuestion.svar, /0\{,\}25/u);

  assert.match(byId("2py27-001").hint.join(" "), /10 % betyr én av ti/u);
  assert.match(byId("2py27-004").hint.join(" "), /25 % er det samme som en firedel/u);
  assert.match(byId("2py27-128").hint.join(" "), /balansering rundt/u);
  assert.match(byId("2py27-213").hint.join(" "), /Grupper til to like summer/u);
  assert.match(byId("2py27-043").hint.join(" "), /\(-3\)\^2=9/u);
  assert.match(byId("2py27-243").hint.join(" "), /\(21\+1\)\/2=11/u);
});

test("Del 1 viser alle avgjørende operasjoner for en nybegynner", () => {
  const byId = (id) => bank.oppgaver.find((question) => question.id === id);
  const numericTypes = new Set(["tall", "flere_tall", "valg_og_tall"]);
  const numericDel1 = bank.oppgaver.filter((question) =>
    question.del === 1 && numericTypes.has(question.fasit.type));

  const shortenedFractions = numericDel1.filter((question) => /Forkort/u.test(question.hint.join(" ")));
  assert.equal(shortenedFractions.length, 17);
  for (const question of shortenedFractions) {
    const hints = question.hint.join(" ");
    assert.match(hints, /tallet over brøkstreken/u, `${question.id} forklarer ikke telleren`);
    assert.match(hints, /tallet under brøkstreken/u, `${question.id} forklarer ikke nevneren`);
    assert.match(hints, /\\div/u, `${question.id} viser ikke divisjonen over og under brøkstreken`);
  }

  const percentExample = byId("2py27-008").hint.join(" ");
  assert.match(percentExample, /66\\div6/u);
  assert.match(percentExample, /240\\div6/u);
  assert.match(percentExample, /11.*40/u);

  for (const question of numericDel1.filter((item) => item.variantfamilie === "d1-veid-gjennomsnitt")) {
    assert.match(question.hint.join(" "), /Multipliser hver verdi med frekvensen/u, question.id);
    assert.match(question.hint.join(" "), /\\cdot.*=/u, question.id);
  }
  for (const question of numericDel1.filter((item) => item.variantfamilie === "d1-grafavlesning")) {
    assert.match(question.hint.join(" "), /Erstatt.*x.*linjens uttrykk/u, question.id);
    assert.match(question.hint.join(" "), /Legg til konstantleddet/u, question.id);
  }
  for (const question of numericDel1.filter((item) =>
    ["d1-konstantledd", "d1-lineaert-skjaeringspunkt"].includes(item.variantfamilie))) {
    assert.match(question.hint.join(" "), /fra begge sider/u, question.id);
  }

  const cumulativeMedian = numericDel1.filter((item) => item.variantfamilie === "d1-kumulativ-median");
  assert.match(byId("2py27-245").hint.join(" "), /to midterste plassene er.*15.*16/u);
  for (const question of cumulativeMedian) {
    assert.doesNotMatch(question.hint.join(" "), /21\/2=11|35\/2=18|45\/2=23/u, question.id);
  }

  for (const question of numericDel1.filter((item) => item.variantfamilie === "d1-kode-vekst")) {
    const visible = question.hint.join(" ");
    assert.match(visible, /\^\{\d+\}=/u, question.id);
    assert.doesNotMatch(visible, /\^\{[^}]*=/u, question.id);
  }

  assert.doesNotMatch(
    numericDel1.flatMap((question) => question.hint).join(" "),
    /Bruk oppgavens tall og utfør regnestykket/u,
  );
});

test("hver hovedløsning i Del 1 holder fast ved én tydelig metode", () => {
  const del1 = bank.oppgaver.filter((question) => question.del === 1);
  const byId = (id) => bank.oppgaver.find((question) => question.id === id);

  for (const question of del1) {
    assert.match(question.hint[0], /^Hva vet vi\?/u, `${question.id} starter ikke med kjente opplysninger`);
    assert.doesNotMatch(
      question.hint[0],
      /Marker verdiene|Finn nøkkelopplysningene|Skriv opp de gitte størrelsene/u,
      `${question.id} starter fortsatt med en generell arbeidsordre`,
    );
    assert.ok(
      question.hint.some((hint) => hint.startsWith("Svar på spørsmålet:")),
      `${question.id} skiller ikke svaret fra mellomregningen`,
    );
    assert.match(question.hint.at(-1), /^Sjekk svaret:/u, `${question.id} avslutter ikke med en kontroll`);
  }

  for (const question of del1.filter((item) => item.variantfamilie === "d1-omvendt-prosent")) {
    const hints = question.hint.join(" ");
    assert.match(hints, /prosentstripe hele veien/u, question.id);
    assert.match(hints, /like delene er til sammen/u, question.id);
    assert.match(hints, /Derfor deler vi/u, question.id);
    assert.doesNotMatch(hints, /vekstfaktor|Lag ligningen|\bx\b/u, `${question.id} skifter metode underveis`);
  }

  const annualPass = byId("2py27-031").hint.join(" ");
  assert.match(annualPass, /95\/19=5/u);
  assert.match(annualPass, /760\/19=40/u);
  assert.match(annualPass, /40\\cdot20=800/u);
  assert.match(annualPass, /800-40=760/u);

  for (const id of ["2py27-033", "2py27-035", "2py27-036", "2py27-037", "2py27-098", "2py27-123", "2py27-124", "2py27-125", "2py27-126", "2py27-127", "2py27-211", "2py27-253", "2py27-255"]) {
    const beforeAnswer = byId(id).hint.filter((hint) => !hint.startsWith("Svar på spørsmålet:")).join(" ");
    assert.match(beforeAnswer, /=/u, `${id} viser ikke den avgjørende testen før svaret`);
  }
});

test("prosentøvingen lar eleven sammenligne naturlige løsningsveier", () => {
  const percentQuestions = bank.oppgaver.filter((question) => question.del === 1 && question.tema === "prosent");
  const withPaths = percentQuestions.filter((question) => question.losningsveier);
  const byId = (id) => bank.oppgaver.find((question) => question.id === id);

  assert.equal(bank.samling.versjon, "2027.13");
  assert.equal(percentQuestions.length, 42);
  assert.equal(withPaths.length, 7);
  assert.deepEqual(
    withPaths.map((question) => question.id),
    ["2py27-002", "2py27-009", "2py27-010", "2py27-012", "2py27-026", "2py27-027", "2py27-038"],
  );

  for (const question of withPaths) {
    assert.equal(question.losningsveier.length, 2, `${question.id} skal ha to oversiktlige metodevalg`);
    assert.equal(new Set(question.losningsveier.map((path) => path.id)).size, 2, `${question.id} har like metode-ID-er`);
    assert.ok(question.losningsveier.every((path) => path.navn.length >= 8), `${question.id} har et uklart metodenavn`);
    assert.ok(question.losningsveier.every((path) => path.forklaring.length >= 25), `${question.id} forklarer ikke når metoden passer`);
    for (const path of question.losningsveier) {
      assert.ok(path.hint.length >= 6, `${question.id}/${path.id} har for få løsningssteg`);
      assert.match(path.hint[0], /^Hva vet vi\?/u, `${question.id}/${path.id} starter ikke med forståelse`);
      assert.ok(path.hint.some((hint) => hint.startsWith("Svar på spørsmålet:")), `${question.id}/${path.id} mangler svarsteg`);
      assert.match(path.hint.at(-1), /^Sjekk svaret:/u, `${question.id}/${path.id} mangler kontroll`);
    }
    assert.notDeepEqual(
      question.losningsveier[0].hint,
      question.losningsveier[1].hint,
      `${question.id} viser samme løsning to ganger`,
    );
  }

  assert.deepEqual(byId("2py27-002").losningsveier.map((path) => path.navn), [
    "Kjent brøk: en firedel",
    "10 % + 10 % + 5 %",
  ]);
  assert.deepEqual(byId("2py27-026").losningsveier.map((path) => path.navn), [
    "Start med 100",
    "Bruk vekstfaktorer",
  ]);
  assert.equal(byId("2py27-031").losningsveier, undefined, "95 %-oppgaven skal ikke få et kunstig metodevalg");

  for (const id of ["2py27-001", "2py27-003", "2py27-004", "2py27-005", "2py27-007", "2py27-008", "2py27-011", "2py27-013", "2py27-014", "2py27-015", "2py27-028", "2py27-029", "2py27-030", "2py27-032", "2py27-039", "2py27-040", "2py27-041", "2py27-042"]) {
    assert.equal(byId(id).losningsveier, undefined, `${id} skal bruke den ene naturlige hovedveien uten metodevalg`);
  }

  for (const question of percentQuestions.filter((item) =>
    ["d1-prosentpoeng", "d1-vekstfaktor", "d1-prosent-pastand"].includes(item.variantfamilie))) {
    assert.equal(question.losningsveier, undefined, `${question.id} har fått et kunstig metodevalg`);
  }
});

test("hintene har korrekt mål, avrunding og matematikkvisning", () => {
  const byId = (id) => bank.oppgaver.find((question) => question.id === id);

  for (const id of ["2py27-021", "2py27-023", "2py27-025"]) {
    const question = byId(id);
    assert.match(question.svar, /^Vekstfaktoren er/u, `${id} svarer ikke på det oppgaven spør om`);
    assert.doesNotMatch(question.svar, /prosentvise endringen/u, `${id} svarer fortsatt med prosentendring`);
  }

  assert.match(byId("2py27-099").hint.at(-1), /ulike|Påstanden er feil/u);
  assert.doesNotMatch(byId("2py27-099").hint.at(-1), /Venstre og høyre side skal bli like/u);

  for (const id of ["2py27-198", "2py27-199", "2py27-200", "2py27-201", "2py27-202"]) {
    assert.match(byId(id).hint.at(-1), /tidsintervallet|verdiendringen/u);
    assert.doesNotMatch(byId(id).hint.join(" "), /samlet frekvens|sortering/u);
  }

  const roundedQuestion = byId("2py27-481");
  assert.equal(roundedQuestion.fasit.verdier[0].verdi, 6.3);
  assert.equal(roundedQuestion.kontroll.resultat[0], 6.3);
  assert.match(roundedQuestion.svar, /6\{,\}3/);
  assert.doesNotMatch(roundedQuestion.svar, /6\{,\}2/);

  for (const question of bank.oppgaver) {
    const hintCollections = [question.hint, ...(question.losningsveier ?? []).map((path) => path.hint)];
    for (const [collectionIndex, hints] of hintCollections.entries()) {
      for (const [index, hint] of hints.entries()) {
        const outsideMath = hint.replace(/\\\(.*?\\\)/gu, "");
        assert.doesNotMatch(
          outsideMath,
          /\{,\}|\\(?:cdot|frac|div|sqrt)|\^/u,
          `${question.id} løsningsvei ${collectionIndex + 1}, hint ${index + 1} har matematikkkode utenfor matematikkmarkører`,
        );
      }
    }
  }
});

test("synlige tall har fornuftige desimaler uten flyttallsstøy", () => {
  const decimalPattern = /-?\d+(?:\{,\}|[.,])\d{5,}/gu;
  const normalizeToken = (token) => {
    const separator = token.includes("{,}") ? "{,}" : token.includes(",") ? "," : ".";
    const numeric = Number(token.replace("{,}", ".").replace(",", "."));
    const normalized = Number(numeric.toPrecision(12)).toLocaleString("en-US", {
      useGrouping: false,
      maximumSignificantDigits: 12,
      maximumFractionDigits: 20,
    });
    return normalized.includes(".") ? normalized.replace(".", separator) : normalized;
  };
  const visit = (value, path) => {
    if (typeof value === "number") {
      assert.equal(value, Number(value.toPrecision(12)), `${path} inneholder unødvendig flyttallsstøy`);
      return;
    }
    if (typeof value === "string") {
      for (const match of value.matchAll(decimalPattern)) {
        assert.equal(match[0], normalizeToken(match[0]), `${path} har et urimelig desimaltall: ${match[0]}`);
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((child, index) => visit(child, `${path}[${index}]`));
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) visit(child, `${path}.${key}`);
    }
  };

  visit(bank.oppgaver, "oppgaver");
  const factorQuestion = bank.oppgaver.find((question) => question.id === "2py27-022");
  assert.match(factorQuestion.hint.join(" "), /0\{,\}82/);
  assert.match(factorQuestion.hint.join(" "), /-0\{,\}18/);
  assert.doesNotMatch(factorQuestion.hint.join(" "), /000000000|999999999/);
});

test("Del 1 er konstruert for håndregning uten kalkulator", () => {
  const del1 = bank.oppgaver.filter((question) => question.del === 1);
  const visibleText = (question) => JSON.stringify({
    sporsmal: question.sporsmal,
    hint: question.hint,
    svar: question.svar,
    fasit: question.fasit,
  });

  for (const question of del1) {
    const text = visibleText(question);
    assert.doesNotMatch(text, /\\\\approx|≈|digitalt verktøy|logaritm/iu, `${question.id} krever tilnærming eller digital metode`);
    assert.doesNotMatch(text, /-?\d+\{,\}\d*0(?!\d)/u, `${question.id} viser en meningsløs desimalnull`);
    assert.doesNotMatch(text, /-?\d+\.\d*0(?!\d)/u, `${question.id} viser en meningsløs desimalnull`);
  }

  for (const question of del1.filter((item) => item.variantfamilie === "d1-omvendt-prosent")) {
    const { ny, endring } = question.kontroll.inndata;
    const original = question.kontroll.resultat[0];
    assert.ok(Number.isInteger(original), `${question.id} har ikke en hel opprinnelig verdi`);
    assert.equal(original * (1 + endring / 100), ny, `${question.id} har ikke en eksakt prosentkontroll`);
  }

  for (const question of del1.filter((item) => item.variantfamilie === "d1-kode-vekst")) {
    const { start, faktor, runder } = question.kontroll.inndata;
    const result = start * faktor ** runder;
    assert.ok(runder <= 3, `${question.id} krever for mange gjentatte multiplikasjoner`);
    assert.ok(Math.abs(result - Math.round(result)) < 1e-9, `${question.id} ender i tung desimalregning`);
    assert.equal(Math.round(result), question.kontroll.resultat[0]);
    assert.equal(question.data.programkode, question.visualisering.kode);
  }

  for (const question of del1.filter((item) => item.variantfamilie === "d1-kode-terskel")) {
    const { start, faktor, grense } = question.kontroll.inndata;
    let value = start;
    let rounds = 0;
    const shouldContinue = () => faktor > 1 ? value < grense : value > grense;
    while (shouldContinue() && rounds < 10) {
      value *= faktor;
      rounds += 1;
      assert.ok(Number.isInteger(value), `${question.id} får en tung mellomverdi`);
    }
    assert.ok(rounds <= 4, `${question.id} krever for lang sporing`);
    assert.equal(rounds, question.kontroll.resultat[0]);
    assert.equal(question.data.programkode, question.visualisering.kode);
  }

  assert.match(bank.oppgaver.find((question) => question.id === "2py27-031").sporsmal, /760/);
  assert.doesNotMatch(bank.oppgaver.find((question) => question.id === "2py27-070").svar, /3\{,\}16|\\\\approx/);
  assert.equal(bank.oppgaver.find((question) => question.id === "2py27-091").fasit.valg.riktige[0], "\\(n+5\\)");
});

test("anvendte oppgaver bruker eksamensnært språk og forklarte størrelser", () => {
  const forbiddenTemplateLanguage = /\bEn verdi\b|\bEn størrelse\b|bestemt gruppe|tidsenheter|per x-enhet|kategoriene A-D|kategori 1-4|tegnes direkte i HTML|laget for å trene/iu;

  for (const question of bank.oppgaver) {
    const visibleText = [question.sporsmal, question.svar, ...question.hint].join(" ");
    assert.doesNotMatch(visibleText, forbiddenTemplateLanguage, `${question.id} har abstrakt eller intern maltekst`);
  }
  for (const group of bank.oppgavegrupper) {
    assert.doesNotMatch(group.innledning, forbiddenTemplateLanguage, `${group.id} har abstrakt eller intern maltekst`);
  }

  assert.equal(bank.samling.versjon, "2027.13");
  assert.match(bank.oppgaver.find((question) => question.id === "2py27-026").sporsmal, /sykkel/);
  assert.match(bank.oppgaver.find((question) => question.id === "2py27-031").sporsmal, /årskort/);
  assert.match(bank.oppgaver.find((question) => question.id === "2py27-187").sporsmal, /vaskeritjenester/);
  assert.match(bank.oppgavegrupper.find((group) => group.id === "d2-figur-01").innledning, /benker/);
  assert.equal(bank.oppgaver.find((question) => question.id === "2py27-306").fasit.verdier[0].verdi, 4328);
});

test("standardformoppgaven viser samme tall som fasiten", () => {
  const question = bank.oppgaver.find((item) => item.id === "2py27-062");
  assert.match(question.sporsmal, /0\{,\}000000605/);
  assert.equal(question.fasit.riktige[0], "\\(6{,}05\\cdot10^{-7}\\)");
  assert.match(question.svar, /0\{,\}000000605=6\{,\}05/);
});
