import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = dirname(scriptDir);
const source = JSON.parse(await readFile(join(projectDir, "public", "oppgaver.json"), "utf8"));
const html = await readFile(join(projectDir, "public", "oppgaver-og-hint.html"), "utf8");
const match = html.match(/<script id="question-data" type="application\/json">([\s\S]*?)<\/script>/);

if (!match) throw new Error("Fant ikke den innebygde oppgavebanken.");
const embedded = JSON.parse(match[1].replaceAll("<\\/script", "</script"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(embedded.oppgaver.length === 80, "HTML-filen må inneholde 80 oppgaver.");
assert(embedded.oppgaver.reduce((sum, question) => sum + question.hints.length, 0) === 534, "HTML-filen må inneholde 534 hint.");
assert(embedded.temaer.length === 8, "HTML-filen må inneholde 8 temaer.");
assert(new Set(embedded.oppgaver.map((question) => question.id)).size === 80, "Oppgave-ID-ene må være unike.");
assert(["lett", "middels", "vanskelig"].every((level) => embedded.oppgaver.some((question) => question.vanskelighetsgrad === level)), "Alle tre vanskelighetsgrader må være i bruk.");

for (const original of source.oppgaver) {
  const copy = embedded.oppgaver.find((question) => question.id === original.id);
  assert(copy, `Mangler oppgave ${original.id}.`);
  assert(copy.sporsmal === original.sporsmal, `Spørsmålsteksten er endret i ${original.id}.`);
  assert(copy.svar === original.svar, `Fasiten er endret i ${original.id}.`);
  assert(JSON.stringify(copy.hints) === JSON.stringify(original.hints), `Hintene er endret i ${original.id}.`);
  assert(copy.vanskelighetsgrad === original.vanskelighetsgrad, `Vanskelighetsgraden er endret i ${original.id}.`);
}

for (const theme of source.temaer) {
  assert(embedded.oppgaver.filter((question) => question.tema === theme.id).length === 10, `Temaet ${theme.id} må ha 10 oppgaver.`);
}

assert(!html.includes("fetch("), "Filen skal ikke hente oppgavebanken eksternt.");
assert(html.includes("data:font/woff2;base64,"), "Matematikkfontene må være innebygd for bruk uten nett.");
console.log("Kontroll bestått: 80 oppgaver, 534 hint, 8 temaer og alle originale tekster er bevart.");
