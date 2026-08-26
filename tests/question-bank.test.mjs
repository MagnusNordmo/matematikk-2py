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
    assert.ok(Array.isArray(question.hint) && question.hint.length >= 2, `${question.id} har for få hint`);
    assert.ok(question.hint.every((hint) => typeof hint === "string" && hint.trim().length >= 10), `${question.id} har et kort eller tomt hint`);
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

test("svake hintfamilier har konkrete, trinnvise mellomsteg", () => {
  const revisedFamilies = new Set([
    "d1-algebra-pastand",
    "d1-blandet-representasjon",
    "d1-formel-innsetting",
    "d1-kode-statistikk",
    "d1-konstantledd",
    "d1-lineaert-skjaeringspunkt",
    "d1-modellvalg",
    "d1-omforme-formel",
    "d1-potensregler",
    "d1-rot-rekkefolge",
    "d1-standardform",
    "d1-statistikk-valg",
    "d1-tolke-representasjon",
    "d1-kritisk-statistikk",
    "d1-vekstfaktor",
    "d2-eksponential-a",
    "d2-eksponential-b",
    "d2-eksponential-c",
    "d2-figur-c",
    "d2-kode-a",
    "d2-kode-b",
    "d2-kode-c",
    "d2-kort-eksponentialverdi",
    "d2-kort-potensmodell",
    "d2-lineaer-a",
    "d2-lineaer-b",
    "d2-lineaer-c",
    "d2-omvendt-b",
    "d2-omvendt-c",
    "d2-regresjon-b",
    "d2-regresjon-c",
    "d2-sammensatt-prosent-d",
    "d2-statistikk-c",
  ]);
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
    if (revisedFamilies.has(question.variantfamilie)) {
      assert.ok(question.hint.length >= 3, `${question.id} mangler gradvis hintprogresjon`);
      assert.ok(
        question.hint.join(" ").length >= 70,
        `${question.id} har for lite forklaring til å gi gradvis støtte`,
      );
    }
  }
});

test("standardformoppgaven viser samme tall som fasiten", () => {
  const question = bank.oppgaver.find((item) => item.id === "2py27-062");
  assert.match(question.sporsmal, /0\{,\}000000605/);
  assert.equal(question.fasit.riktige[0], "\\(6{,}05\\cdot10^{-7}\\)");
  assert.match(question.svar, /0\{,\}000000605=6\{,\}05/);
});
