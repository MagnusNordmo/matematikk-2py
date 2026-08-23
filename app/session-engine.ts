import type { Part, Question, QuestionBank } from "./question-bank";

export type SessionMode = "skill" | "exam";

export function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function completeGroups(bank: QuestionBank, themeId?: string) {
  const byGroup = new Map<string, Question[]>();
  for (const question of bank.oppgaver) {
    if (question.del !== 2 || !question.oppgavegruppe) continue;
    if (themeId && question.tema !== themeId) continue;
    const questions = byGroup.get(question.oppgavegruppe.id) ?? [];
    questions.push(question);
    byGroup.set(question.oppgavegruppe.id, questions);
  }
  return [...byGroup.values()]
    .filter((questions) => questions.length > 0)
    .map((questions) =>
      questions.sort(
        (a, b) =>
          (a.oppgavegruppe?.rekkefolge ?? 0) -
          (b.oppgavegruppe?.rekkefolge ?? 0),
      ),
    );
}

function distinctGroupThemes(groups: Question[][], count: number) {
  const result: Question[][] = [];
  const usedThemes = new Set<string>();
  for (const group of shuffle(groups)) {
    const theme = group[0]?.tema;
    if (!theme || usedThemes.has(theme)) continue;
    result.push(group);
    usedThemes.add(theme);
    if (result.length === count) return result;
  }
  for (const group of shuffle(groups)) {
    if (result.includes(group)) continue;
    result.push(group);
    if (result.length === count) break;
  }
  return result;
}

export function selectSessionQuestions(
  bank: QuestionBank,
  part: Part,
  mode: SessionMode,
  themeId?: string,
) {
  if (part === 1) {
    const candidates = bank.oppgaver.filter(
      (question) =>
        question.del === 1 && (!themeId || question.tema === themeId),
    );
    if (mode === "skill") return shuffle(candidates).slice(0, 10);

    const themes = [...new Set(candidates.map((question) => question.tema))];
    const spread = shuffle(themes)
      .map((theme) =>
        shuffle(candidates.filter((question) => question.tema === theme))[0],
      )
      .filter(Boolean);
    const used = new Set(spread.map((question) => question.id));
    return shuffle([
      ...spread,
      ...shuffle(candidates.filter((question) => !used.has(question.id))).slice(
        0,
        Math.max(0, 10 - spread.length),
      ),
    ]).slice(0, 10);
  }

  const groups = completeGroups(bank, themeId);
  if (mode === "exam") {
    return distinctGroupThemes(groups, 3).flat();
  }

  const grouped = shuffle(groups).slice(0, 2).flat();
  const independent = shuffle(
    bank.oppgaver.filter(
      (question) =>
        question.del === 2 &&
        !question.oppgavegruppe &&
        (!themeId || question.tema === themeId),
    ),
  ).slice(0, 2);
  if (grouped.length === 0) return independent;
  return [...grouped, ...independent];
}

export function findRetryQuestion(bank: QuestionBank, question: Question) {
  const candidates = bank.oppgaver.filter(
    (candidate) =>
      candidate.del === question.del &&
      candidate.id !== question.id &&
      (candidate.variantfamilie === question.variantfamilie ||
        candidate.tema === question.tema),
  );
  const sameFamily = candidates.filter(
    (candidate) => candidate.variantfamilie === question.variantfamilie,
  );
  return shuffle(sameFamily.length > 0 ? sameFamily : candidates)[0] ?? question;
}
