import type { AnswerKey, NumericAnswer } from "./question-bank";

export type AnswerInput = {
  numbers: string[];
  choices: string[];
  explanation?: string;
};

export type AnswerEvaluation = {
  correct: boolean;
  correctParts: number;
  totalParts: number;
  fraction: number;
};

export const EMPTY_ANSWER: AnswerInput = { numbers: [], choices: [], explanation: "" };

// Available for every number field, regardless of the expected answer. This
// avoids relying on a phone keyboard having a minus key or revealing a sign.
export function toggleAnswerSign(value: string) {
  const trimmed = value.trim();
  if (/^[-−–—]/u.test(trimmed)) return trimmed.slice(1);
  return `-${trimmed.replace(/^\+/u, "")}`;
}

export function parseNorwegianNumber(value: string) {
  const normalized = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[−–—]/g, "-")
    .replace(/\s/g, "")
    .replace(/,/g, ".")
    .replace(
      /(?:kr|kroner|prosentpoeng|prosent|elever|år|kg|g|km|m|cm|timer|minutter|%)+$/g,
      "",
    )
    .replace(/[^0-9./+-]/g, "");

  const fraction = normalized.match(
    /^([+-]?\d+(?:\.\d+)?)\/([+-]?\d+(?:\.\d+)?)$/,
  );
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator === 0 ? Number.NaN : Number(fraction[1]) / denominator;
  }

  return /^[+-]?\d+(?:\.\d+)?$/.test(normalized)
    ? Number(normalized)
    : Number.NaN;
}

function numericMatches(input: string, expected: NumericAnswer) {
  const actual = parseNorwegianNumber(input);
  if (!Number.isFinite(actual)) return false;
  return Math.abs(actual - expected.verdi) <= (expected.toleranse ?? 0.0001);
}

function evaluateNumbers(inputs: string[], expected: NumericAnswer[]) {
  return expected.reduce(
    (sum, answer, index) =>
      sum + (numericMatches(inputs[index] ?? "", answer) ? 1 : 0),
    0,
  );
}

function evaluateChoices(inputs: string[], correct: string[], multiple: boolean) {
  const selected = new Set(inputs);
  const expected = new Set(correct);
  const correctSelections = correct.filter((answer) => selected.has(answer)).length;
  const incorrectSelections = inputs.filter((answer) => !expected.has(answer)).length;
  const parts = multiple ? correct.length : 1;
  return Math.max(0, Math.min(parts, correctSelections - incorrectSelections));
}

export function evaluateAnswer(input: AnswerInput, key: AnswerKey): AnswerEvaluation {
  let correctParts = 0;
  let totalParts = 1;

  if (key.type === "tall" || key.type === "flere_tall") {
    totalParts = key.verdier.length;
    correctParts = evaluateNumbers(input.numbers, key.verdier);
  } else if (key.type === "valg") {
    totalParts = key.flervalg ? key.riktige.length : 1;
    correctParts = evaluateChoices(input.choices, key.riktige, key.flervalg);
  } else {
    const choiceParts = key.valg.flervalg ? key.valg.riktige.length : 1;
    totalParts = choiceParts + key.verdier.length;
    correctParts =
      evaluateChoices(input.choices, key.valg.riktige, key.valg.flervalg) +
      evaluateNumbers(input.numbers, key.verdier);
  }

  return {
    correct: correctParts === totalParts,
    correctParts,
    totalParts,
    fraction: totalParts === 0 ? 0 : correctParts / totalParts,
  };
}

export function isAnswerComplete(input: AnswerInput, key: AnswerKey) {
  if (key.type === "tall" || key.type === "flere_tall") {
    return key.verdier.every((_, index) => Boolean(input.numbers[index]?.trim()));
  }
  if (key.type === "valg") {
    return input.choices.length > 0 &&
      (!key.krever_begrunnelse || Boolean(input.explanation?.trim()));
  }
  return (
    input.choices.length > 0 &&
    (!key.valg.krever_begrunnelse || Boolean(input.explanation?.trim())) &&
    key.verdier.every((_, index) => Boolean(input.numbers[index]?.trim()))
  );
}
