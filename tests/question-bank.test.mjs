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
