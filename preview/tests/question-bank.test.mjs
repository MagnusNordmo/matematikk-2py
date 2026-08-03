import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bank = JSON.parse(
  await readFile(new URL("../public/oppgaver.json", import.meta.url), "utf8"),
);

test("oppgavebanken har gyldig og komplett struktur", () => {
  assert.equal(bank.oppgaver.length, 80);
  assert.equal(bank.temaer.length, 8);
  assert.equal(new Set(bank.oppgaver.map((question) => question.id)).size, 80);

  const themeIds = new Set(bank.temaer.map((theme) => theme.id));
  const levels = new Set(["lett", "middels", "vanskelig"]);

  for (const question of bank.oppgaver) {
    assert.ok(question.id?.trim(), "Alle oppgaver må ha ID");
    assert.ok(themeIds.has(question.tema), `${question.id} har ukjent tema`);
    assert.ok(question.sporsmal?.trim(), `${question.id} mangler spørsmål`);
    assert.ok(question.svar?.trim(), `${question.id} mangler fasit`);
    assert.ok(Array.isArray(question.hints), `${question.id} mangler hintliste`);
    assert.ok(question.hints.length >= 2, `${question.id} har for få hint`);
    assert.ok(
      question.hints.every((hint) => typeof hint === "string" && hint.trim().length >= 10),
      `${question.id} har et tomt eller svært kort hint`,
    );
    assert.ok(levels.has(question.vanskelighetsgrad), `${question.id} mangler gyldig vanskelighetsgrad`);
    assert.ok(Number.isInteger(question.poeng) && question.poeng > 0, `${question.id} har ugyldige poeng`);
  }
});

test("alle temaer har ti oppgaver", () => {
  for (const theme of bank.temaer) {
    assert.equal(
      bank.oppgaver.filter((question) => question.tema === theme.id).length,
      10,
      theme.navn,
    );
  }
});

test("hintene følger den nybegynnervennlige standarden", () => {
  assert.equal(
    bank.oppgaver.reduce((sum, question) => sum + question.hints.length, 0),
    534,
  );

  const proportionality = bank.oppgaver.find((question) => question.id === "pr-01");
  assert.match(proportionality.hints.join(" "), /0,4=40\\%/);
  assert.match(proportionality.hints.join(" "), /120:10=12/);
  assert.match(proportionality.hints.join(" "), /4\\cdot12=48/);
});
