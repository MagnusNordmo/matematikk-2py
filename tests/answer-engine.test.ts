import assert from "node:assert/strict";
import test from "node:test";
import { answersMatch, type AnswerQuestion } from "../app/answer-engine";

const percentQuestion: AnswerQuestion = {
  svar: "34 %",
  aksepterteSvar: ["0,34", "34 prosent"],
  svarType: "prosent",
};

test("godtar vanlige norske skrivemåter for prosent", () => {
  for (const answer of ["34%", "34 %", "34 prosent", "0,34", "0.34"]) {
    assert.equal(answersMatch(answer, percentQuestion), true, answer);
  }
  assert.equal(answersMatch("35 %", percentQuestion), false);
});

test("godtar desimalkomma, desimalpunkt og valgfri enhet for tall", () => {
  const question: AnswerQuestion = { svar: "2,5", svarType: "tall" };
  assert.equal(answersMatch("2,5", question), true);
  assert.equal(answersMatch("2.5 kg", question), true);
  assert.equal(answersMatch("2,6", question), false);
});

test("godtar oppgitte alternative matematiske uttrykk", () => {
  const question: AnswerQuestion = {
    svar: "9 · 10^5",
    aksepterteSvar: ["9*10^5", "9x10^5"],
    svarType: "uttrykk",
  };
  assert.equal(answersMatch("9 * 10^5", question), true);
  assert.equal(answersMatch("9 × 10^5", question), true);
  assert.equal(answersMatch("9 * 10^4", question), false);
});

test("tekstoppgaver krever en kjent faglig formulering", () => {
  const question: AnswerQuestion = {
    svar: "fast kostnad",
    aksepterteSvar: ["startkostnad", "fast pris"],
    svarType: "tekst",
  };
  assert.equal(answersMatch("Startkostnad", question), true);
  assert.equal(answersMatch("variabel kostnad", question), false);
});
