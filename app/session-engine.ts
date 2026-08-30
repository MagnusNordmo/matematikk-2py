import type { Part, Question, QuestionBank } from "./question-bank";

export type SessionMode = "skill" | "exam";
export type Difficulty = "mixed" | 1 | 2 | 3;

function withoutRecent<T extends { id: string }>(items: T[], recentIds: Set<string>) {
  const fresh = items.filter((item) => !recentIds.has(item.id));
  return fresh.length > 0 ? fresh : items;
}

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
  recentIds = new Set<string>(),
  difficulty: Difficulty = "mixed",
) {
  const matchesDifficulty = (question: Question) =>
    difficulty === "mixed" || question.niva === difficulty;

  if (part === 1) {
    const candidates = bank.oppgaver.filter(
      (question) =>
        question.del === 1 &&
        (!themeId || question.tema === themeId) &&
        matchesDifficulty(question),
    );
    const preferredCandidates = withoutRecent(candidates, recentIds);
    if (mode === "skill") return shuffle(preferredCandidates).slice(0, 10);

    const themes = [...new Set(preferredCandidates.map((question) => question.tema))];
    const spread = shuffle(themes)
      .map((theme) =>
        shuffle(preferredCandidates.filter((question) => question.tema === theme))[0],
      )
      .filter(Boolean);
    const used = new Set(spread.map((question) => question.id));
    return shuffle([
      ...spread,
      ...shuffle(preferredCandidates.filter((question) => !used.has(question.id))).slice(
        0,
        Math.max(0, 10 - spread.length),
      ),
    ]).slice(0, 10);
  }

  if (mode === "skill" && difficulty !== "mixed") {
    const candidates = bank.oppgaver.filter(
      (question) =>
        question.del === 2 &&
        (!themeId || question.tema === themeId) &&
        matchesDifficulty(question),
    );
    return shuffle(withoutRecent(candidates, recentIds)).slice(0, 10);
  }

  const groups = completeGroups(bank, themeId);
  if (mode === "exam") {
    const freshGroups = groups.filter((group) =>
      group.every((question) => !recentIds.has(question.id)),
    );
    const selectedGroups = distinctGroupThemes(
      freshGroups.length >= 2 ? freshGroups : groups,
      2,
    );
    const independentCandidates = bank.oppgaver.filter(
      (question) => question.del === 2 && !question.oppgavegruppe,
    );
    const independent = shuffle(
      withoutRecent(independentCandidates, recentIds),
    ).slice(0, 2);
    return shuffle([
      ...selectedGroups,
      ...independent.map((question) => [question]),
    ]).flat();
  }

  const freshGroups = groups.filter((group) =>
    group.every((question) => !recentIds.has(question.id)),
  );
  const selectedGroups = shuffle(
    freshGroups.length >= 2 ? freshGroups : groups,
  ).slice(0, 2);
  const independent = shuffle(
    withoutRecent(
      bank.oppgaver.filter(
        (question) =>
          question.del === 2 &&
          !question.oppgavegruppe &&
          (!themeId || question.tema === themeId),
      ),
      recentIds,
    ),
  ).slice(0, 2);
  if (selectedGroups.length === 0) return independent;
  return shuffle([
    ...selectedGroups,
    ...independent.map((question) => [question]),
  ]).flat();
}

export function findRetryQuestion(
  bank: QuestionBank,
  question: Question,
  difficulty: Difficulty = "mixed",
) {
  const candidates = bank.oppgaver.filter(
    (candidate) =>
      candidate.del === question.del &&
      candidate.id !== question.id &&
      (difficulty === "mixed" || candidate.niva === difficulty) &&
      (candidate.variantfamilie === question.variantfamilie ||
        candidate.tema === question.tema),
  );
  const sameFamily = candidates.filter(
    (candidate) => candidate.variantfamilie === question.variantfamilie,
  );
  return shuffle(sameFamily.length > 0 ? sameFamily : candidates)[0] ?? question;
}
