export type AnswerQuestion = {
  svar: string;
  aksepterteSvar?: string[];
  svarType: "tall" | "prosent" | "tekst" | "uttrykk";
  toleranse?: number;
};

function normalizeExact(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[−–—]/g, "-")
    .replace(/,/g, ".")
    .replace(/\b(kroner|kr\.?|prosent|grader|elever|jenter|gutter|år|kg|g)\b/g, "")
    .replace(/\\cdot|\\times|×|·/g, "*")
    .replace(/\s+/g, "")
    .replace(/[.]$/g, "");
}

function parseFlexibleNumber(value: string) {
  const normalized = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[−–—]/g, "-")
    .replace(/,/g, ".")
    .replace(/[^0-9./-]/g, "");

  const fraction = normalized.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator === 0 ? Number.NaN : Number(fraction[1]) / denominator;
  }

  const match = normalized.match(/^-?\d+(?:\.\d+)?$/);
  return match ? Number(normalized) : Number.NaN;
}

export function answersMatch(input: string, question: AnswerQuestion) {
  const candidates = [question.svar, ...(question.aksepterteSvar ?? [])];
  const normalizedInput = normalizeExact(input);

  if (candidates.some((candidate) => normalizeExact(candidate) === normalizedInput)) {
    return true;
  }

  if (question.svarType === "tekst" || question.svarType === "uttrykk") {
    return false;
  }

  const expected = parseFlexibleNumber(question.svar);
  let actual = parseFlexibleNumber(input);

  if (!Number.isFinite(expected) || !Number.isFinite(actual)) {
    return false;
  }

  if (
    question.svarType === "prosent" &&
    !input.includes("%") &&
    Math.abs(actual) <= 1 &&
    Math.abs(expected) > 1
  ) {
    actual *= 100;
  }

  return Math.abs(actual - expected) <= (question.toleranse ?? 0.0001);
}
