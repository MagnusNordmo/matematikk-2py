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

test('tolv råd har korte forklaringer og lukkede eksempler med steg', () => {
  assert.equal((html.match(/<article\b/g) ?? []).length, 12);
  assert.equal((html.match(/<details>/g) ?? []).length, 12);
  assert.equal((html.match(/<summary\b/g) ?? []).length, 12);
  assert.equal((html.match(/<ol>/g) ?? []).length, 12);
  assert.doesNotMatch(html, /<details[^>]*\bopen\b/);
  assert.match(html, /1040 egg/);
  assert.match(html, /0,54 prosentpoeng/);
  assert.match(html, /Sju av vognene hadde seks eller færre personer/);
  assert.match(html, /Til startsiden/);
});

test('omtrent forklares med del 1-hengelåser og en tydelig merket øvingsvariant', () => {
  const cards = [...html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/g)].map(match => match[1]);
  const estimate = cards.find(card => card.includes('«Omtrent»'));
  assert.ok(estimate);
  assert.match(estimate, /Våren 2020 · Del 1 · Oppgave 4/);
  assert.match(estimate, /45 tonn/);
  assert.match(estimate, /50 gram/);
  assert.match(estimate, /20 låser på ett kilo/);
  assert.match(estimate, /900 000/);
  assert.match(estimate, /Ekstra øvingsvariant/);
  assert.match(estimate, /44,8 tonn/);
  assert.match(estimate, /49 gram/);
  assert.doesNotMatch(estimate, /kalkulator|485 294|kronestykker/i);
});

test('eksamenseksemplene har små håndregnesteg og en ferdig svarsetning', () => {
  assert.equal((html.match(/Slik kan du skrive svaret/g) ?? []).length, 12);
  assert.equal((html.match(/class="reminder-source"/g) ?? []).length, 12);
  assert.match(html, /12 % : 3 = 4 %/);
  assert.match(html, /100 : 4 = 25/);
  assert.doesNotMatch(html, /3 : 0,12/);
  assert.match(html, /30 % er 12 kroner/);
  assert.match(html, /10 % er 4 kroner/);
  assert.match(html, /Fem tiere blir 50 personer/);
  assert.match(html, /4 og 6/);
  const rateCards = [...html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/g)].map(match => match[1]);
  const points = rateCards.find(card => card.includes('Prosentpoeng:'));
  const percent = rateCards.find(card => card.includes('Prosent: sammenlikn'));
  assert.ok(points && percent, 'Prosentpoeng og prosent skal ha hvert sitt kort');
  assert.match(points, /0,54 prosentpoeng/);
  assert.doesNotMatch(points, /0,54 : 6/);
  assert.match(percent, /9 %/);
});

test('modulen kan åpnes fra startsiden og har vis mindre når et eksempel er åpent', async () => {
  const page = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /setScreen\("reminders"\)/);
  assert.match(page, /screen === "reminders" && <ExamReminders/);
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(css, /details\[open\] \.reminder-more/);
  assert.match(css, /details\[open\] \.reminder-less/);
});
