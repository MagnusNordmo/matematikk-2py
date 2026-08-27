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

  for (const question of bank.oppgaver) {
    assert.ok(
      question.hint.every((hint) => !forbiddenHints.has(hint)),
      `${question.id} har fortsatt et hint som bare gjentar arbeidsordren`,
    );
    assert.ok(question.hint.length >= 5, `${question.id} mangler gradvis hintprogresjon`);
    assert.ok(question.hint.join(" ").length >= 300, `${question.id} har for lite forklaring til å være et worked example`);
    assert.ok(question.hint.some((hint) => /Løsningen samlet:|Regn ut:/.test(hint)), `${question.id} mangler fullført utregning`);
    assert.ok(question.hint.some((hint) => /Kontroller/.test(hint)), `${question.id} mangler kontrollsteg`);
  }

  assert.ok(bank.oppgaver.reduce((total, question) => total + question.hint.length, 0) >= 2500);
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

test("standardformoppgaven viser samme tall som fasiten", () => {
  const question = bank.oppgaver.find((item) => item.id === "2py27-062");
  assert.match(question.sporsmal, /0\{,\}000000605/);
  assert.equal(question.fasit.riktige[0], "\\(6{,}05\\cdot10^{-7}\\)");
  assert.match(question.svar, /0\{,\}000000605=6\{,\}05/);
});
