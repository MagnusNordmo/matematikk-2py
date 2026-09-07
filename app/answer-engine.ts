import type { AnswerKey, NumericAnswer } from "./question-bank";

export type AnswerInput = {
  numbers: string[];
  choices: string[];
  explanation?: string;
  assessment?: boolean[];
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
    );

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
  if (expected.avrunding !== undefined) {
    const scale = 10 ** expected.avrunding;
    const rounded = (value: number) => Math.sign(value) * Math.round(Math.abs(value) * scale + Number.EPSILON * Math.max(1, Math.abs(value) * scale) * 4);
    const epsilon = Number.EPSILON * Math.max(1, Math.abs(actual), Math.abs(expected.verdi)) * 4;
    return rounded(actual) === rounded(expected.verdi) && Math.abs(actual - expected.verdi) <= (expected.toleranse ?? 0.5 / scale) + epsilon;
  }
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
  return incorrectSelections > 0 ? 0 : Math.min(parts, correctSelections);
}

export function evaluateAnswer(input: AnswerInput, key: AnswerKey): AnswerEvaluation {
  let correctParts = 0;
  let totalParts = 1;

  if (key.type === "tall" || key.type === "flere_tall") {
    totalParts = key.verdier.length;
    correctParts = evaluateNumbers(input.numbers, key.verdier);
  } else if (key.type === "valg") {
    totalParts = key.aapen ? 0 : key.flervalg ? key.riktige.length : 1;
    correctParts = key.aapen ? 0 : evaluateChoices(input.choices, key.riktige, key.flervalg);
  } else {
    const choiceParts = key.valg.aapen ? 0 : key.valg.flervalg ? key.valg.riktige.length : 1;
    totalParts = choiceParts + key.verdier.length;
    correctParts =
      (key.valg.aapen ? 0 : evaluateChoices(input.choices, key.valg.riktige, key.valg.flervalg)) +
      evaluateNumbers(input.numbers, key.verdier);
  }

  if (key.type === "flere_tall" && key.konstruksjon) {
    const values = input.numbers.map(parseNorwegianNumber);
    totalParts = 2;
    correctParts = 0;
    if (values.length === key.verdier.length && values.every(Number.isFinite)) {
      if (key.konstruksjon === "datasett") {
        const rules = key.vilkaar ?? { antall: 5, gjennomsnitt: 10, median: 8, minimum: 0, heltall: true };
        if (values.length === rules.antall && values.every(v => v >= rules.minimum && (!rules.heltall || Number.isInteger(v)))) {
          const ordered = [...values].sort((a,b) => a-b);
          const middle = Math.floor(values.length / 2);
          const median = values.length % 2 ? ordered[middle] : (ordered[middle-1] + ordered[middle]) / 2;
          correctParts += Number(Math.abs(values.reduce((a,b) => a+b,0) - rules.gjennomsnitt * rules.antall) < 1e-9);
          correctParts += Number(Math.abs(median - rules.median) < 1e-9);
        }
      } else if (key.konstruksjon === "moteksempel") {
        const [a,b,c,d] = values;
        correctParts += Number(Math.abs(a+b-100) < 1e-9 && Math.abs(c+d-110) < 1e-9);
        correctParts += Number(c < a || d < b);
      }
    }
  }
  // Legacy manual keys cannot award points through a client self-assessment.
  const choice = key.type === "valg" ? key : key.type === "valg_og_tall" ? key.valg : null;
  if (choice?.aapen || choice?.krever_begrunnelse) correctParts = 0;
  return { correct: totalParts > 0 && correctParts === totalParts,
    correctParts, totalParts, fraction: totalParts ? correctParts / totalParts : 0 };
}

export function isAnswerComplete(input: AnswerInput, key: AnswerKey) {
  const choice = key.type === "valg" ? key : key.type === "valg_og_tall" ? key.valg : null;
  if (choice?.aapen || choice?.krever_begrunnelse) return false;
  const numbers = "verdier" in key ? key.verdier : [];
  return numbers.every((_, i) => Number.isFinite(parseNorwegianNumber(input.numbers[i] ?? ""))) &&
    (!choice || (input.choices.length > 0 && (choice.flervalg || input.choices.length === 1) && input.choices.every(v => choice.alternativer.includes(v))));
}
