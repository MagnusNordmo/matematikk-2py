import assert from "node:assert/strict";
import test from "node:test";
import { evaluateAnswer, isAnswerComplete, parseNorwegianNumber, toggleAnswerSign } from "../app/answer-engine.ts";
import type { AnswerKey } from "../app/question-bank.ts";

test("tolker norske desimaltall, enheter og brøk", () => {
  assert.equal(parseNorwegianNumber("2,5 kg"), 2.5);
  assert.equal(parseNorwegianNumber(" 1 250,75 kr "), 1250.75);
  assert.equal(parseNorwegianNumber("3/4"), 0.75);
  assert.ok(Number.isNaN(parseNorwegianNumber("et tall")));
});

test("fortegnsknappen støtter tomme felt, negative tall, norske desimaler og brøker", () => {
  for (const [before, after] of [["", "-"], ["-", ""], ["1", "-1"], ["-1", "1"], ["−1", "1"], ["+1", "-1"], [" 2,5 ", "-2,5"], ["3/4", "-3/4"], ["0", "-0"]]) {
    assert.equal(toggleAnswerSign(before), after);
  }
  assert.equal(parseNorwegianNumber(toggleAnswerSign("2,5")), -2.5);
  assert.equal(parseNorwegianNumber(toggleAnswerSign("3/4")), -0.75);
  assert.equal(evaluateAnswer({ numbers: [toggleAnswerSign("1")], choices: [] }, {
    type: "tall", verdier: [{ verdi: -1, enhet: "%", toleranse: 0 }],
  }).correct, true);
});

test("gir delpoeng for flere numeriske svar", () => {
  const key: AnswerKey = {
    type: "flere_tall",
    verdier: [
      { verdi: 6, toleranse: 0, enhet: "prosentpoeng" },
      { verdi: 33.3, toleranse: 0.1, enhet: "%" },
    ],
  };
  assert.deepEqual(evaluateAnswer({ numbers: ["6", "33,35"], choices: [] }, key), {
    correct: true,
    correctParts: 2,
    totalParts: 2,
    fraction: 1,
  });
  const partial = evaluateAnswer({ numbers: ["6", "30"], choices: [] }, key);
  assert.equal(partial.correct, false);
  assert.equal(partial.correctParts, 1);
  assert.equal(partial.fraction, 0.5);
});

test("kontrollerer enkeltvalg og flervalg", () => {
  const single: AnswerKey = {
    type: "valg",
    flervalg: false,
    riktige: ["B"],
    alternativer: ["A", "B", "C"],
  };
  assert.equal(evaluateAnswer({ numbers: [], choices: ["B"] }, single).correct, true);
  assert.equal(evaluateAnswer({ numbers: [], choices: ["A"] }, single).correct, false);

  const multiple: AnswerKey = {
    type: "valg",
    flervalg: true,
    riktige: ["A", "C"],
    alternativer: ["A", "B", "C", "D"],
  };
  assert.equal(evaluateAnswer({ numbers: [], choices: ["A", "C"] }, multiple).correct, true);
  assert.equal(evaluateAnswer({ numbers: [], choices: ["A"] }, multiple).correctParts, 1);
  assert.equal(evaluateAnswer({ numbers: [], choices: ["A", "B"] }, multiple).correctParts, 0);
});

test("krever både valg og tall i kombinasjonssvar", () => {
  const key: AnswerKey = {
    type: "valg_og_tall",
    valg: { type: "valg", flervalg: false, riktige: ["4n-1"], alternativer: ["4n-1", "4n+3"] },
    verdier: [{ verdi: 59, toleranse: 0, enhet: "ruter" }],
  };
  assert.equal(isAnswerComplete({ numbers: [""], choices: ["4n-1"] }, key), false);
  assert.equal(isAnswerComplete({ numbers: ["59"], choices: ["4n-1"] }, key), true);
  assert.equal(evaluateAnswer({ numbers: ["59"], choices: ["4n-1"] }, key).correct, true);
});
