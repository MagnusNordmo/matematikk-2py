import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

async function componentModule(file) {
  const url = new URL(`../app/${file}`, import.meta.url);
  const source = await readFile(url, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const resolved = outputText.replace(/from (["'])([^"']+)\1/gu, (_, _quote, specifier) => {
    const target = specifier.startsWith(".")
      ? new URL(`${specifier}.ts`, url).href
      : import.meta.resolve(specifier);
    return `from ${JSON.stringify(target)}`;
  });
  return import(`data:text/javascript;base64,${Buffer.from(resolved).toString("base64")}`);
}

const bank = JSON.parse(await readFile(new URL("../public/oppgaver-2027.json", import.meta.url), "utf8"));
const questions = new Map(bank.oppgaver.map((question) => [question.id, question]));
const groups = new Map(bank.oppgavegrupper.map((group) => [group.id, group]));
const { VisualizationPanel } = await componentModule("presentation.tsx");

test("prosentoppgaven har samme helhet og resultat i alle felt", () => {
  const question = questions.get("2py27-007");
  assert.match(question.hint.join(" "), /25\/100/u);
  assert.doesNotMatch(question.hint.join(" "), /125/u);
  assert.equal(question.kontroll.inndata.hel, 100);
  assert.deepEqual(question.kontroll.resultat, [25]);
});

test("modelloppgavene har ett matematisk entydig svar", () => {
  const power = questions.get("2py27-210");
  assert.match(power.sporsmal, /uttrykk/u);
  assert.deepEqual(power.fasit.riktige, ["\\(y=3x^2\\)"]);
  const inverse = questions.get("2py27-212");
  assert.match(inverse.sporsmal, /proporsjonalitet/u);
  assert.deepEqual(inverse.fasit.alternativer, [
    "proporsjonal",
    "omvendt proporsjonal",
    "lineær, men ikke proporsjonal",
    "ingen av disse",
  ]);
});

test("medianen i treningscaset ligger entydig i én klasse", () => {
  const group = groups.get("d2-gruppert-05");
  assert.deepEqual(group.data.frekvenser, [10, 14, 18, 8]);
  const cumulative = questions.get("2py27-417");
  assert.deepEqual(cumulative.fasit.verdier.map((answer) => answer.verdi), [50, 24]);
  assert.equal(questions.get("2py27-418").fasit.verdier[0].verdi, 4.12);
  assert.deepEqual(questions.get("2py27-419").fasit.riktige, ["[4, 6)"]);
});

test("klassemidtpunktene i hintene stemmer med beregningen", () => {
  const question = questions.get("2py27-406");
  assert.match(question.hint.at(-1), /2\{,\}5, 7\{,\}5, 15, 30/u);
  assert.match(question.hint.at(-1), /20\+127\{,\}5\+300\+450=897\{,\}5/u);
});

test("histogram med ulike klassebredder bruker frekvenstetthet", () => {
  for (let number = 286; number <= 290; number += 1) {
    assert.equal(questions.get(`2py27-${number}`).visualisering.bruk_frekvenstetthet, true);
  }
  const html = renderToStaticMarkup(createElement(VisualizationPanel, {
    visualization: questions.get("2py27-286").visualisering,
  }));
  assert.match(html, /frekvenstetthet 0,8/u);
});

test("prosentfigurer røper ikke ukjente svar før eleven har regnet", () => {
  const visualization = groups.get("d2-prosent-01").visualisering;
  assert.equal(visualization.skjul_verdier, true);
  const html = renderToStaticMarkup(createElement(VisualizationPanel, { visualization }));
  assert.doesNotMatch(html, /23[\s.]?370|29[\s.]?212/u);
  assert.match(html, /Endringstrinn 1/u);
});

test("figurmønstre viser konstruksjonen og alle elementene", () => {
  for (const id of ["d2-figur-01", "d2-figur-02", "d2-figur-03", "d2-figur-04", "d2-figur-05"]) {
    assert.ok(groups.get(id).visualisering.monster, id);
  }
  const quadratic = questions.get("2py27-096").visualisering;
  assert.equal(quadratic.monster, "kvadrat_med_tillegg");
  const html = renderToStaticMarkup(createElement(VisualizationPanel, { visualization: quadratic }));
  assert.equal((html.match(/class="pattern-cell/g) ?? []).length, 17 + 26 + 37);
  assert.doesNotMatch(html, /Math\.min|pattern-dots/u);
});

test("Del 1 bruker elevvennlige tall i oppgaver som tester metode", () => {
  const expected = new Map([
    ["2py27-010", [220, 500, 44]],
    ["2py27-028", [720, 600]],
    ["2py27-031", [640, 800]],
    ["2py27-069", [400, 20]],
    ["2py27-107", [180, 10, 18]],
    ["2py27-109", [5, 40, 8, 64]],
    ["2py27-110", [8, 240, 10, 300]],
    ["2py27-112", [4, 20, 8, 40]],
    ["2py27-116", [6, 30, 10, 18]],
    ["2py27-117", [4, 24, 8, 12]],
    ["2py27-260", [6, 64]],
  ]);
  for (const [id, values] of expected) {
    const text = `${questions.get(id).sporsmal} ${questions.get(id).svar}`;
    for (const value of values) assert.match(text, new RegExp(String(value)), id);
  }
});

test("avrundingskrav og toleranser godtar riktig presisjon uten å godta nabosvar", () => {
  for (let number = 291; number <= 300; number += 1) {
    const question = questions.get(`2py27-${number}`);
    assert.match(question.sporsmal, /to desimaler/u, question.id);
    assert.ok(question.fasit.verdier.every((answer) => answer.toleranse <= 0.005), question.id);
  }
  assert.equal(questions.get("2py27-366").fasit.verdier[0].toleranse, 0.5);
  assert.equal(questions.get("2py27-370").fasit.verdier[0].toleranse, 0.00005);
  for (const number of [363, 367, 371, 375, 379, 482, 486, 490, 494, 498]) {
    assert.equal(questions.get(`2py27-${number}`).fasit.verdier.at(-1).toleranse, 0.05);
  }
});

test("faglig vurdering krever at eleven skriver en begrunnelse", () => {
  const reasoningQuestions = bank.oppgaver.filter((question) =>
    question.fasit.type === "valg" && question.fasit.krever_begrunnelse,
  );
  assert.ok(reasoningQuestions.length >= 15);
  assert.ok(reasoningQuestions.every((question) => /begrunn/iu.test(question.sporsmal)));
});

test("rutineoppgaver er ikke merket utfordrende", () => {
  for (const number of [118, 119, 120, 121, 253, 254, 255, 257, 324, 328, 332, 336, 340, 384, 388, 392, 396, 400, 404, 408, 412, 416, 420]) {
    assert.ok(questions.get(`2py27-${number}`).niva <= 2, `2py27-${number}`);
  }
});
