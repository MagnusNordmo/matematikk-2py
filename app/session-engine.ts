import { taskPattern, workKind } from "./task-profile.ts";
import type { Part, Question, QuestionBank } from "./question-bank";

export type SessionMode = "skill" | "exam";
export type Difficulty = "mixed" | 1 | 2 | 3;

export function requiresOwnReasoning(question: Question) {
  return (question.fasit.type === "flere_tall" && Boolean(question.fasit.konstruksjon)) || question.ferdighet.includes("begrunne") || question.ferdighet.includes("generalisere");
}

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
    .filter(
      (questions) =>
        questions.length === 4 &&
        new Set(questions.map((question) => question.oppgavegruppe?.rekkefolge)).size === 4,
    )
    .map((questions) =>
      questions.sort(
        (a, b) =>
          (a.oppgavegruppe?.rekkefolge ?? 0) -
          (b.oppgavegruppe?.rekkefolge ?? 0),
      ),
    );
}

function recentVariantFamilies(bank: QuestionBank, recentIds: Set<string>) {
  return new Set(
    bank.oppgaver
      .filter((question) => recentIds.has(question.id))
      .map((question) => question.variantfamilie),
  );
}

function preferUnseenFamilies(
  candidates: Question[],
  recentFamilies: Set<string>,
) {
  const unseen = candidates.filter(
    (question) => !recentFamilies.has(question.variantfamilie),
  );
  return unseen.length > 0 ? unseen : candidates;
}

function chooseDiverseQuestion(
  candidates: Question[],
  selected: Question[],
  preferredLevel?: Question["niva"],
) {
  const usedFamilies = new Set(selected.map((question) => question.variantfamilie));
  const usedSubthemes = new Set(selected.map((question) => question.deltema));
  const usedSkills = new Set(selected.flatMap((question) => question.ferdighet));
  let pool = candidates.filter(
    (question) => !usedFamilies.has(question.variantfamilie),
  );
  if (pool.length === 0) pool = candidates;

  const unusedPatterns = pool.filter(q => !selected.some(previous => taskPattern(previous) === taskPattern(q)));
  if (unusedPatterns.length) pool = unusedPatterns;
  const unusedKinds = pool.filter(q => !selected.some(previous => workKind(previous) === workKind(q)));
  if (unusedKinds.length) pool = unusedKinds;

  const matchingLevel = preferredLevel
    ? pool.filter((question) => question.niva === preferredLevel)
    : [];
  if (matchingLevel.length > 0) pool = matchingLevel;

  const newSubthemes = pool.filter(
    (question) => !usedSubthemes.has(question.deltema),
  );
  if (newSubthemes.length > 0) pool = newSubthemes;

  return shuffle(pool).sort((a, b) => {
    const newSkillsA = a.ferdighet.filter((skill) => !usedSkills.has(skill)).length;
    const newSkillsB = b.ferdighet.filter((skill) => !usedSkills.has(skill)).length;
    return newSkillsB - newSkillsA;
  })[0];
}

function chooseDiverseGroup(groups: Question[][], selected: Question[]) {
  const usedSkills = new Set(selected.flatMap((question) => question.ferdighet));
  const usedSubthemes = new Set(selected.map((question) => question.deltema));
  return shuffle(groups).sort((a, b) => {
    const score = (group: Question[]) => {
      const newSkills = new Set(
        group.flatMap((question) => question.ferdighet).filter((skill) => !usedSkills.has(skill)),
      ).size;
      const newSubthemes = new Set(
        group.map((question) => question.deltema).filter((subtheme) => !usedSubthemes.has(subtheme)),
      ).size;
      const kinds = new Set(group.map(workKind).filter(kind => !selected.some(q => workKind(q) === kind))).size;
      const repeatedPatterns = group.filter(q => selected.some(previous => taskPattern(previous) === taskPattern(q))).length;
      return kinds * 30 + newSkills * 3 + newSubthemes - repeatedPatterns * 20;
    };
    return score(b) - score(a);
  })[0];
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

// Draw families before numerical variants. A short varied session is preferable
// to filling the remaining slots with copies of a task the learner just saw.
function practiceSelection(candidates: Question[], context: Question[], recentIds: Set<string>, count: number) {
  const selected: Question[] = [];
  while (selected.length < count) {
    const used = new Set([...context, ...selected].map(q => q.variantfamilie));
    const pool = candidates.filter(q => !used.has(q.variantfamilie));
    if (!pool.length) break;
    const recentFamilies = new Set(candidates.filter(q => recentIds.has(q.id)).map(q => q.variantfamilie));
    const unseen = pool.filter(q => !recentFamilies.has(q.variantfamilie));
    const preferred = unseen.length ? unseen : withoutRecent(pool, recentIds);
    selected.push(chooseDiverseQuestion(preferred, [...context, ...selected]));
  }
  return selected;
}

export function rememberSelection(previous: string[], questions: Question[]) {
  return [...new Set([...questions.map(q => q.id), ...previous])].slice(0, 30);
}

function selectSessionQuestionsOnce(
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
    if (mode === "skill") return practiceSelection(candidates, [], recentIds, 10);

    const recentFamilies = recentVariantFamilies(bank, recentIds);
    const examCandidates = preferUnseenFamilies(preferredCandidates, recentFamilies);
    const themes = shuffle([
      ...new Set(examCandidates.map((question) => question.tema)),
    ]);
    const levelPlan = shuffle<Question["niva"]>([1, 1, 1, 1, 2, 2, 2, 2, 2, 3]);
    const selected: Question[] = [];
    const openCandidates = examCandidates.filter(requiresOwnReasoning);
    const opening = chooseDiverseQuestion(openCandidates, selected);
    if (opening) selected.push(opening);

    for (const [index, theme] of themes.entries()) {
      if (selected.length >= 10) break;
      if (selected.some(question => question.tema === theme)) continue;
      const themeCandidates = examCandidates.filter(
        (question) => question.tema === theme,
      );
      const preferred = preferUnseenFamilies(themeCandidates, recentFamilies);
      const chosen = chooseDiverseQuestion(preferred, selected, levelPlan[index]);
      if (chosen) selected.push(chosen);
    }

    while (selected.length < 10) {
      const themeCounts = new Map<string, number>();
      for (const question of selected) {
        themeCounts.set(question.tema, (themeCounts.get(question.tema) ?? 0) + 1);
      }
      const usedIds = new Set(selected.map((question) => question.id));
      const usedFamilies = new Set(
        selected.map((question) => question.variantfamilie),
      );
      const diverseCandidates = examCandidates.filter(
        (question) =>
          !usedIds.has(question.id) &&
          !usedFamilies.has(question.variantfamilie) &&
          (themeCounts.get(question.tema) ?? 0) < 2,
      );
      if (diverseCandidates.length === 0) break;
      const preferred = preferUnseenFamilies(diverseCandidates, recentFamilies);
      const chosen = chooseDiverseQuestion(
        preferred,
        selected,
        levelPlan[selected.length],
      );
      if (!chosen) break;
      selected.push(chosen);
    }

    return shuffle(selected).slice(0, 10);
  }

  const groups = completeGroups(bank, themeId).filter(
    (group) => difficulty === "mixed" || group.some(matchesDifficulty),
  );
  if (mode === "exam") {
    const freshGroups = groups.filter((group) =>
      group.every((question) => !recentIds.has(question.id)),
    );
    const recentFamilies = recentVariantFamilies(bank, recentIds);
    const independentCandidates = preferUnseenFamilies(withoutRecent(
      bank.oppgaver.filter(
        (question) =>
          question.del === 2 &&
          !question.oppgavegruppe &&
          matchesDifficulty(question),
      ),
      recentIds,
    ), recentFamilies);
    const independentThemes = shuffle([
      ...new Set(independentCandidates.map((question) => question.tema)),
    ]).slice(0, 2);
    const independent: Question[] = [];
    for (const theme of independentThemes) {
      const candidatesForTheme = preferUnseenFamilies(
        independentCandidates.filter((question) => question.tema === theme),
        recentFamilies,
      );
      const chosen = chooseDiverseQuestion(candidatesForTheme, independent);
      if (chosen) independent.push(chosen);
    }

    const usedThemes = new Set(independent.map((question) => question.tema));
    const recentGroupThemes = new Set(
      bank.oppgaver
        .filter(
          (question) => recentIds.has(question.id) && question.oppgavegruppe,
        )
        .map((question) => question.tema),
    );
    const availableGroups = (freshGroups.length >= 2 ? freshGroups : groups).filter(
      (group) => !usedThemes.has(group[0]?.tema),
    );
    // A different case ID may still repeat the same recently practised family.
    const unseenGroups = availableGroups.filter(group =>
      group.every(question => !recentFamilies.has(question.variantfamilie)),
    );
    const availableGroupPool = new Set(unseenGroups.map(group => group[0]?.tema)).size >= 2
      ? unseenGroups : availableGroups;
    const groupsFromNewThemes = availableGroupPool.filter(
      (group) => !recentGroupThemes.has(group[0]?.tema),
    );
    const groupPool =
      new Set(groupsFromNewThemes.map((group) => group[0]?.tema)).size >= 2
        ? groupsFromNewThemes
        : availableGroupPool;
    const selectedGroups: Question[][] = [];
    const selectedQuestions = [...independent];
    while (selectedGroups.length < 2) {
      const selectedGroupThemes = new Set(
        selectedGroups.map((group) => group[0]?.tema),
      );
      const candidates = groupPool.filter(
        (group) => !selectedGroupThemes.has(group[0]?.tema),
      );
      const reasoningGroups = candidates.filter(group => group.some(requiresOwnReasoning));
      const chosen = chooseDiverseGroup(!selectedQuestions.some(requiresOwnReasoning) && reasoningGroups.length ? reasoningGroups : candidates, selectedQuestions);
      if (!chosen) break;
      selectedGroups.push(chosen);
      selectedQuestions.push(...chosen);
    }

    if (selectedGroups.length < 2) {
      for (const group of distinctGroupThemes(groups, 2)) {
        if (selectedGroups.includes(group)) continue;
        selectedGroups.push(group);
        if (selectedGroups.length === 2) break;
      }
    }
    return shuffle([
      ...selectedGroups,
      ...independent.map((question) => [question]),
    ]).flat();
  }

  // One complete case is enough in a topic practice session. Two numerical
  // variants of the same case would repeat all four mathematical tasks.
  const freshGroups = groups.filter(group => group.every(q => !recentIds.has(q.id)));
  const selectedGroup = chooseDiverseGroup(freshGroups.length ? freshGroups : groups, []);
  const independent = bank.oppgaver.filter(q => q.del === 2 && !q.oppgavegruppe &&
    (!themeId || q.tema === themeId) && matchesDifficulty(q));
  const selected = selectedGroup ? [...selectedGroup] : [];
  return [...selected, ...practiceSelection(independent, selected, recentIds, 10 - selected.length)];
}

// Validate the assembled exam as a whole: topic labels alone do not guarantee
// different work. Bounded retries preserve randomness without an unbounded loop.
export function selectSessionQuestions(
  bank: QuestionBank, part: Part, mode: SessionMode, themeId?: string,
  recentIds = new Set<string>(), difficulty: Difficulty = "mixed",
) {
  if (mode === "skill") return selectSessionQuestionsOnce(bank, part, mode, themeId, recentIds, difficulty);
  const recentFamilies = recentVariantFamilies(bank, recentIds);
  const score = (questions: Question[]) => {
    const patterns = new Set(questions.map(taskPattern)).size;
    const kinds = new Set(questions.map(workKind)).size;
    const themes = new Set(questions.map(q => q.tema)).size;
    const repeated = questions.filter(q => recentFamilies.has(q.variantfamilie)).length;
    return questions.length * 10000 + Math.min(kinds, 3) * 1000 +
      Math.min(themes, part === 1 ? 8 : 4) * 100 + Math.min(patterns, part === 1 ? 10 : 9) * 20 - repeated;
  };
  let best: Question[] = [];
  for (let attempt = 0; attempt < 24; attempt++) {
    const candidate = selectSessionQuestionsOnce(bank, part, mode, themeId, recentIds, difficulty);
    if (score(candidate) > score(best)) best = candidate;
    if (candidate.length === 10 && new Set(candidate.map(workKind)).size >= 3 &&
      new Set(candidate.map(taskPattern)).size >= (part === 1 ? 10 : 9) &&
      !candidate.some(q => recentFamilies.has(q.variantfamilie))) return candidate;
  }
  return best;
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
