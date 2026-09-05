import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { QuestionBank } from "../app/question-bank.ts";
import { findRetryQuestion, selectSessionQuestions } from "../app/session-engine.ts";

const bank = JSON.parse(
  await readFile(new URL("../public/oppgaver-2027.json", import.meta.url), "utf8"),
) as QuestionBank;

test("Del 1-eksamensøkter har ti blandede oppgaver uten hjelpemidler", () => {
  for (let run = 0; run < 500; run += 1) {
    const questions = selectSessionQuestions(bank, 1, "exam");
    assert.equal(questions.length, 10);
    assert.ok(questions.every((question) => question.del === 1 && question.hjelpemidler === "uten"));
    assert.equal(new Set(questions.map((question) => question.tema)).size, 8);
    assert.equal(new Set(questions.map((question) => question.variantfamilie)).size, 10);
    assert.ok(new Set(questions.flatMap((question) => question.ferdighet)).size >= 14);
    for (const theme of new Set(questions.map((question) => question.tema))) {
      assert.ok(questions.filter((question) => question.tema === theme).length <= 2);
    }
  }
});

test("Del 2-eksamensøkter har ti oppgaver og beholder hele case samlet", () => {
  for (let run = 0; run < 500; run += 1) {
    const questions = selectSessionQuestions(bank, 2, "exam");
    assert.equal(questions.length, 10);
    const independent = questions.filter((question) => !question.oppgavegruppe);
    assert.equal(independent.length, 2);
    const grouped = questions.filter((question) => question.oppgavegruppe);
    const groupIds = new Set(grouped.map((question) => question.oppgavegruppe?.id));
    assert.equal(groupIds.size, 2);
    const unitThemes = [
      ...independent.map((question) => question.tema),
      ...[...groupIds].map(
        (groupId) => grouped.find((question) => question.oppgavegruppe?.id === groupId)?.tema,
      ),
    ];
    assert.equal(new Set(unitThemes).size, 4);
    assert.equal(new Set(questions.map((question) => question.variantfamilie)).size, 10);
    for (const groupId of groupIds) {
      const group = grouped.filter((question) => question.oppgavegruppe?.id === groupId);
      assert.deepEqual(group.map((question) => question.oppgavegruppe?.rekkefolge), [1, 2, 3, 4]);
    }
  }
});

test("selvstendige Del 2-oppgaver dekker alle fagområdene i eksamensprofilen", () => {
  const independentThemes = new Set(
    bank.oppgaver
      .filter((question) => question.del === 2 && !question.oppgavegruppe)
      .map((question) => question.tema),
  );
  const caseThemes = new Set(
    bank.oppgaver
      .filter((question) => question.del === 2 && question.oppgavegruppe)
      .map((question) => question.tema),
  );
  assert.deepEqual(independentThemes, caseThemes);
});

test("nye økter prioriterer andre oppgaver enn forrige økt", () => {
  for (const part of [1, 2] as const) {
    const first = selectSessionQuestions(bank, part, "exam");
    const second = selectSessionQuestions(
      bank,
      part,
      "exam",
      undefined,
      new Set(first.map((question) => question.id)),
    );
    assert.equal(second.length, 10);
    assert.equal(
      second.filter((question) => first.some((previous) => previous.id === question.id)).length,
      0,
    );
    assert.equal(
      second.filter((question) => first.some(
        (previous) => previous.variantfamilie === question.variantfamilie,
      )).length,
      0,
    );
  }
});

test("temaøkt i Del 2 bruker hele case", () => {
  const questions = selectSessionQuestions(bank, 2, "skill", "lineaere_funksjoner");
  assert.equal(questions.length, 10);
  assert.ok(questions.every((question) => question.tema === "lineaere_funksjoner"));
  const grouped = questions.filter((question) => question.oppgavegruppe);
  assert.equal(grouped.length, 8);
  for (const groupId of new Set(grouped.map((question) => question.oppgavegruppe?.id))) {
    assert.deepEqual(
      grouped
        .filter((question) => question.oppgavegruppe?.id === groupId)
        .map((question) => question.oppgavegruppe?.rekkefolge),
      [1, 2, 3, 4],
    );
  }
});

test("temaøkter i Del 1 kan avgrenses til mild, middels eller utfordrende", () => {
  const partThemes = new Set(bank.oppgaver.map((question) => `${question.del}:${question.tema}`));

  for (const partTheme of partThemes) {
    const [partText, theme] = partTheme.split(":");
    const part = Number(partText) as 1 | 2;
    if (part !== 1) continue;
    for (const level of [1, 2, 3] as const) {
      const available = bank.oppgaver.filter(
        (question) => question.del === part && question.tema === theme && question.niva === level,
      );
      const selected = selectSessionQuestions(bank, part, "skill", theme, new Set(), level);
      assert.equal(selected.length, Math.min(10, available.length), `${partTheme} nivå ${level}`);
      assert.ok(selected.every((question) => question.niva === level), `${partTheme} blander nivå ${level}`);
    }
  }
});

test("nivåvalg i Del 2 beholder hele case og prioriterer valgt nivå", () => {
  for (const level of [1, 2, 3] as const) {
    const selected = selectSessionQuestions(bank, 2, "skill", undefined, new Set(), level);
    assert.ok(selected.some((question) => question.niva === level));
    const groupIds = new Set(selected.flatMap((question) => question.oppgavegruppe ? [question.oppgavegruppe.id] : []));
    for (const groupId of groupIds) {
      const grouped = selected.filter((question) => question.oppgavegruppe?.id === groupId);
      assert.deepEqual(grouped.map((question) => question.oppgavegruppe?.rekkefolge), [1, 2, 3, 4]);
      assert.ok(grouped.some((question) => question.niva === level));
    }
    assert.ok(selected.filter((question) => !question.oppgavegruppe).every((question) => question.niva === level));
  }
});

test("ekstra mestringsoppgave holder valgt nivå", () => {
  for (const level of [1, 2, 3] as const) {
    const question = bank.oppgaver.find((item) => item.niva === level);
    assert.ok(question);
    assert.equal(findRetryQuestion(bank, question, level).niva, level);
  }
});

test("begge mini-eksamener krever minst ett selvstendig resonnement", () => {
  for (const part of [1, 2] as const) {
    for (let run = 0; run < 200; run++) {
      const questions = selectSessionQuestions(bank, part, "exam");
      assert.ok(questions.some(q => {
        const key = q.fasit.type === 'valg' ? q.fasit : q.fasit.type === 'valg_og_tall' ? q.fasit.valg : null;
        return key?.aapen;
      }));
    }
  }
});
