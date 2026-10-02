import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const source = await readFile(new URL('../app/exam-reminders.tsx', import.meta.url), 'utf8');
let { outputText } = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
outputText = outputText.replace(/from (["'])(react\/jsx-runtime)\1/g, (_, quote, name) => `from ${JSON.stringify(import.meta.resolve(name))}`);
const { ExamReminders } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
const html = renderToStaticMarkup(createElement(ExamReminders, { onBack() {} }));

test('elleve råd har korte forklaringer og lukkede eksempler med steg', () => {
  assert.equal((html.match(/<article\b/g) ?? []).length, 11);
  assert.equal((html.match(/<details>/g) ?? []).length, 11);
  assert.equal((html.match(/<summary\b/g) ?? []).length, 11);
  assert.equal((html.match(/<ol>/g) ?? []).length, 11);
  assert.doesNotMatch(html, /<details[^>]*\bopen\b/);
  assert.match(html, /1040 egg/);
  assert.match(html, /0,54 prosentpoeng/);
  assert.match(html, /Eleven med 0 fraværsdager/);
  assert.match(html, /Fire elever har 5 eller færre/);
  assert.match(html, /Til startsiden/);
});

test('modulen kan åpnes fra startsiden og har vis mindre når et eksempel er åpent', async () => {
  const page = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /setScreen\("reminders"\)/);
  assert.match(page, /screen === "reminders" && <ExamReminders/);
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(css, /details\[open\] \.reminder-more/);
  assert.match(css, /details\[open\] \.reminder-less/);
});
