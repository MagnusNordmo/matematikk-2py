import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { reviseHintScaffolding } from "../scripts/hint-scaffolding.mjs";

const bank = JSON.parse(await readFile(new URL("../public/oppgaver-2027.json", import.meta.url), "utf8"));
const byMethod = (method) => bank.oppgaver.filter((q) => q.kontroll?.metode === method);
const visible = (q) => q.hint.join(" ");
const plain = (text) => text.replaceAll("\\,", "").replaceAll("{,}", ".");

test("hele banken har ingen anonyme ruter som teller i en senere brøk", () => {
  for (const question of bank.oppgaver) {
    const routes = [question.hint, ...(question.losningsveier ?? []).map((r) => r.hint)];
    for (const hints of routes) {
      assert.doesNotMatch(hints.join(" "), /(?:\\square|□)\s*[\/+\-]|\\frac\{(?:\\square|□)\}/u, question.id);
      assert.doesNotMatch(hints.join(" "), /&#x20;|Test den riktige formelen|Den forkortede brøken er/u, question.id);
    }
  }
});

test("gjennomsnitt viser summen før den brukes og en konkret oppdeling av divisjonen", () => {
  for (const q of byMethod("mean")) {
    const values = q.kontroll.inndata.verdier;
    const total = values.reduce((a, b) => a + b, 0);
    assert.ok(plain(q.hint[1]).includes(`${values.join("+")}=${total}`), q.id);
    assert.ok(plain(q.hint[2]).includes(`${total}/${values.length}`), q.id);
    assert.match(q.hint[3], /Del opp totalsummen.*Del begge delene.*Legg sammen/u, q.id);
    assert.doesNotMatch(visible(q), /\\square|□/u, q.id);
  }
});

test("manglende observasjon bruker navngitte og beregnede summer", () => {
  for (const q of byMethod("missing_from_mean")) {
    const { kjente, gjennomsnitt } = q.kontroll.inndata;
    const total = (kjente.length + 1) * gjennomsnitt;
    const known = kjente.reduce((a, b) => a + b, 0);
    assert.ok(plain(q.hint[1]).includes(`=${total}`), q.id);
    assert.ok(plain(q.hint[2]).includes(`${kjente.join("+")}=${known}`), q.id);
    assert.ok(plain(q.hint[3]).includes(`${total}-${known}`), q.id);
    assert.doesNotMatch(visible(q), /\\square|□/u, q.id);
  }
});

test("endringer vises som subtraksjon før divisjon", () => {
  for (const method of ["slope", "table_slope", "average_rate"]) {
    assert.equal(byMethod(method).length, 5);
    for (const q of byMethod(method)) {
      assert.match(q.hint[1], /\\Delta y=.+-.+/u, q.id);
      assert.match(q.hint[2], /\\Delta x=.+-.+=/u, q.id);
      assert.match(q.hint[3], /\\frac\{.+-.+\}\{.+-.+\}/u, q.id);
    }
  }
});

test("ukjent konstant beholdes som k og isoleres gjennom synlige operasjoner", () => {
  for (const q of byMethod("d2_inverse_constant")) {
    const { T, fast, x } = q.kontroll.inndata;
    assert.ok(plain(q.hint[0]).includes(`${T}=k/${x}+${fast}`), q.id);
    assert.ok(plain(q.hint[1]).includes(`${T}-${fast}=k/${x}`), q.id);
    assert.ok(plain(q.hint[2]).includes(`k=${T - fast}\\cdot${x}`), q.id);
    assert.doesNotMatch(visible(q), /\\square|□/u, q.id);
  }
});

test("terskelhint lar eleven finne kandidaten før nabokontrollen", () => {
  for (const method of ["growth_threshold", "d2_figure_threshold"]) {
    for (const q of byMethod(method)) {
      assert.match(q.hint[1], /Lag en tabell/u, q.id);
      assert.match(q.hint[2], /første heltallet.*rett før/u, q.id);
      assert.doesNotMatch(visible(q), /Kontroller kandidaten:|Bare den siste|\\square|□/u, q.id);
    }
  }
});

test("figurformler prøves uten at hintet velger riktig alternativ på forhånd", () => {
  for (const q of bank.oppgaver.filter((q) => /d1-(?:lineart|kvadratisk)-figurmonster/u.test(q.variantfamilie))) {
    assert.match(q.hint[1], /alle svaralternativene/u, q.id);
    assert.match(q.hint[2], /gjenværende alternativene/u, q.id);
    assert.match(q.hint[3], /Sett inn/u, q.id);
    assert.doesNotMatch(visible(q), /den riktige formelen|Formelen passer dermed/u, q.id);
  }
});

test("faglige hintforløp er stabile når revisjonen kjøres igjen", () => {
  const copy = structuredClone(bank);
  const format = {
    math: (text) => `\\(${text}\\)`,
    number: (value) => String(value).replace(".", "{,}"),
  };
  reviseHintScaffolding(copy, format);
  const once = JSON.stringify(copy);
  reviseHintScaffolding(copy, format);
  assert.equal(JSON.stringify(copy), once);
});
