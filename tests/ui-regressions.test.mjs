import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

// Compile the real TSX components in memory. No fixture reimplementation and
// no files generated in the source tree by these tests.
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
const { DataPanel } = await componentModule("presentation.tsx");
const { NumberAnswerField } = await componentModule("number-answer-field.tsx");

test("inaktive knapper bruker vanlig musepil, ikke ventemarkør", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const disabledRule = css.match(/button:disabled\s*\{([^}]+)\}/u)?.[1];
  assert.ok(disabledRule);
  assert.match(disabledRule, /cursor:\s*default\s*;/u);
  assert.match(disabledRule, /opacity:\s*0\.58\s*;/u);
  assert.doesNotMatch(css, /cursor:\s*(?:wait|progress)\s*[;}]/u);
});

test("rekkefølgeoppgavene gjengir uttrykkene som matematikk i selve oppgavedataene", () => {
  const questions = bank.oppgaver.filter((q) => q.variantfamilie === "d1-rot-rekkefolge");
  assert.equal(questions.length, 5);
  for (const question of questions) {
    const html = renderToStaticMarkup(createElement(DataPanel, { data: question.data }));
    assert.equal((html.match(/class="katex"/gu) ?? []).length, question.data.uttrykk.length, question.id);
    assert.doesNotMatch(html, /\\\(|\\\)/u, question.id);
  }
});

test("matematikk i tabellceller og vanlige data bevares", () => {
  const html = renderToStaticMarkup(createElement(DataPanel, {
    data: { tabell: { x: [1, 2], uttrykk: ["\\(2^5\\)", "\\(3^2\\)"] }, merknad: "To observasjoner", total: 1250 },
  }));
  assert.match(html, /<td>(?:<span><\/span>)?<span class="math-inline">/u);
  assert.match(html, /To observasjoner/u);
  assert.match(html, /1.250/u);
  assert.doesNotMatch(html, /\\\(|\\\)/u);
});

test("tallfelt har valgfri fortegnshjelp, teksttype og desimaltastatur", () => {
  for (const disabled of [false, true]) {
    const html = renderToStaticMarkup(createElement(NumberAnswerField, {
      id: "answer-test", label: "Endring", value: "-1", onChange() {}, disabled,
      placeholder: "Skriv tallet", unit: "%", className: "answer-field",
    }));
    assert.match(html, /<label for="answer-test">Endring<\/label>/u);
    assert.match(html, /type="text"/u);
    assert.match(html, /inputMode="decimal"/u);
    assert.match(html, /value="-1"/u);
    assert.match(html, /<details class="answer-sign-help"><summary>Mangler minustegn\?<\/summary><button/u);
    assert.doesNotMatch(html, /<details[^>]*\bopen(?:\s|=|>)/u);
    const inputRow = html.match(/<div class="answer-field">(.*?)<\/div>/u)?.[1];
    assert.ok(inputRow);
    assert.doesNotMatch(inputRow, /<button/u);
    assert.match(html, /<button[^>]*type="button"[^>]*aria-label="Bytt fortegn for endring"[^>]*>±<\/button>/u);
    assert.equal((html.match(/disabled=""/gu) ?? []).length, disabled ? 2 : 0);
  }
});

test("fortegnshjelpen er skjult på datamaskin og tilgjengelig i begge mobilretninger", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.answer-sign-help\s*\{\s*display:\s*none;\s*\}/u);
  assert.match(css, /@media\s*\(hover: none\) and \(pointer: coarse\) and \(max-width: 767px\),\s*\(hover: none\) and \(pointer: coarse\) and \(max-height: 500px\)\s*\{\s*\.answer-sign-help\s*\{\s*display:\s*block;\s*\}\s*\}/u);
  // All display overrides for the disclosure must stay inside that mobile rule.
  assert.equal((css.match(/\.answer-sign-help\s*\{/gu) ?? []).length, 2);
});

test("medlemsoppgaven bruker medlemmer og ingen tom svarrute i femte hint", () => {
  const question = bank.oppgaver.find((q) => q.id === "2py27-027");
  for (const hints of [question.hint, ...question.losningsveier.map((r) => r.hint)]) {
    assert.equal(hints.length, 5);
    assert.doesNotMatch(hints.join(" "), /\bkr\b|kron|pris|\\square|□/iu);
    assert.match(hints[4], /99-100/u);
  }
  assert.deepEqual(question.hint, question.losningsveier[0].hint);
  assert.equal(question.fasit.verdier[0].verdi, -1);
});

test("innlasting av oppgaver ber om ferske data", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /fetch\("\/oppgaver-2027.json", \{ cache: "no-store" \}\)/u);
});

test("gamle fullrevisjoner stopper uten eksplisitt flagg og endrer ingen bank", async () => {
  const files = ["oppgaver-2027.json", "oppgaver.json"].map((file) => new URL(`../public/${file}`, import.meta.url));
  const before = await Promise.all(files.map((file) => readFile(file, "utf8")));
  for (const script of ["revise-2027-content.mjs", "calibrate-difficulty.mjs", "revise-hints.mjs"]) {
    const result = spawnSync(process.execPath, [new URL(`../scripts/${script}`, import.meta.url).pathname], { encoding: "utf8" });
    assert.equal(result.status, 1, script);
    assert.match(result.stderr, /Full omskriving er sperret/u, script);
  }
  const after = await Promise.all(files.map((file) => readFile(file, "utf8")));
  assert.deepEqual(after, before);
});
