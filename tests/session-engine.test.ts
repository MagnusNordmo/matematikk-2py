import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { QuestionBank } from "../app/question-bank.ts";
import { selectSessionQuestions } from "../app/session-engine.ts";

const bank = JSON.parse(
  await readFile(new URL("../public/oppgaver-2027.json", import.meta.url), "utf8"),
) as QuestionBank;

test("Del 1-eksamensøkter har ti blandede oppgaver uten hjelpemidler", () => {
  const questions = selectSessionQuestions(bank, 1, "exam");
  assert.equal(questions.length, 10);
  assert.ok(questions.every((question) => question.del === 1 && question.hjelpemidler === "uten"));
  assert.ok(new Set(questions.map((question) => question.tema)).size >= 8);
});

test("Del 2-eksamensøkter beholder tre hele case samlet", () => {
  const questions = selectSessionQuestions(bank, 2, "exam");
  assert.equal(questions.length, 12);
  const ids = questions.map((question) => question.oppgavegruppe?.id);
  assert.equal(new Set(ids).size, 3);
  assert.equal(new Set(questions.map((question) => question.tema)).size, 3);
  for (let index = 0; index < 12; index += 4) {
    const group = questions.slice(index, index + 4);
    assert.equal(new Set(group.map((question) => question.oppgavegruppe?.id)).size, 1);
    assert.deepEqual(group.map((question) => question.oppgavegruppe?.rekkefolge), [1, 2, 3, 4]);
  }
});

test("temaøkt i Del 2 bruker hele case", () => {
  const questions = selectSessionQuestions(bank, 2, "skill", "lineaere_funksjoner");
  assert.equal(questions.length, 8);
  assert.ok(questions.every((question) => question.tema === "lineaere_funksjoner"));
  for (let index = 0; index < 8; index += 4) {
    assert.equal(new Set(questions.slice(index, index + 4).map((question) => question.oppgavegruppe?.id)).size, 1);
  }
});
