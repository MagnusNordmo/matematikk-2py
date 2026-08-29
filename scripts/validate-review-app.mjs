import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = dirname(scriptDir);
const source = JSON.parse(await readFile(join(projectDir, "public", "oppgaver-2027.json"), "utf8"));
const html = await readFile(join(projectDir, "public", "oppgaver-og-hint.html"), "utf8");
const match = html.match(/<script id="question-data" type="application\/json">([\s\S]*?)<\/script>/);

if (!match) throw new Error("Fant ikke den innebygde oppgavebanken.");
const embedded = JSON.parse(match[1].replaceAll("<\\/script", "</script"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(embedded.oppgaver.length === 500, "HTML-filen må inneholde 500 oppgaver.");
assert(embedded.groups === 50, "HTML-filen må inneholde 50 Del 2-case.");
assert(embedded.temaer.length === 11, "HTML-filen må inneholde 11 temaer.");
assert(new Set(embedded.oppgaver.map((question) => question.id)).size === 500, "Oppgave-ID-ene må være unike.");
assert(["lett", "middels", "vanskelig"].every((level) => embedded.oppgaver.some((question) => question.vanskelighetsgrad === level)), "Alle tre vanskelighetsgrader må være i bruk.");

for (const original of source.oppgaver) {
  const copy = embedded.oppgaver.find((question) => question.id === original.id);
  assert(copy, `Mangler oppgave ${original.id}.`);
  assert(copy.sporsmal === original.sporsmal, `Spørsmålsteksten er endret i ${original.id}.`);
  assert(copy.svar === original.svar, `Fasiten er endret i ${original.id}.`);
  assert(JSON.stringify(copy.hints) === JSON.stringify(original.hint), `Hintene er endret i ${original.id}.`);
  assert(JSON.stringify(copy.losningsveier ?? []) === JSON.stringify(original.losningsveier ?? []), `Løsningsveiene er endret i ${original.id}.`);
  assert(copy.del === original.del, `Eksamensdelen er endret i ${original.id}.`);
}

assert(embedded.oppgaver.filter((question) => question.del === 1).length === 262, "Del 1 må ha 262 oppgaver.");
assert(embedded.oppgaver.filter((question) => question.del === 2).length === 238, "Del 2 må ha 238 oppgaver.");
assert(embedded.oppgaver.filter((question) => question.losningsveier?.length === 2).length === 26, "Kontrollsiden må inneholde de 26 oppgavene med metodevalg.");

assert(!html.includes("fetch("), "Filen skal ikke hente oppgavebanken eksternt.");
assert(html.includes("data:font/woff2;base64,"), "Matematikkfontene må være innebygd for bruk uten nett.");
console.log("Kontroll bestått: 500 oppgaver, 50 Del 2-case, 11 temaer og alle originale tekster er bevart.");
