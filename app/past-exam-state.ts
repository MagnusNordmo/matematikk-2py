import { evaluateAnswer, type AnswerInput } from "./answer-engine";
import type { PastExam } from "./past-exam-types";

export type CheckProgress = { answer: AnswerInput; submitted?: AnswerInput; hint?: boolean; solution?: boolean; usedHelp?: boolean };
export type ExamProgress = { page: number; checks: Record<string, CheckProgress> };
export const emptyExamProgress = (): ExamProgress => ({ page: 0, checks: {} });

function safeAnswer(value: unknown): AnswerInput | undefined {
  if (!value || typeof value !== "object") return;
  const item = value as AnswerInput;
  if (!Array.isArray(item.numbers) || !Array.isArray(item.choices) ||
      ![...item.numbers, ...item.choices].every(v => typeof v === "string" && v.length < 200)) return;
  return { numbers: item.numbers.slice(0, 20), choices: item.choices.slice(0, 20) };
}
export function restoreExamProgress(value: unknown, exam: PastExam): ExamProgress {
  if (!value || typeof value !== "object") return emptyExamProgress();
  const item = value as ExamProgress;
  const page = Number.isInteger(item.page) && item.page >= 0 && item.page < exam.pages.length ? item.page : 0;
  const checks: Record<string, CheckProgress> = {};
  for (const check of exam.pages.flatMap(p => p.checks)) {
    const saved = item.checks?.[check.id];
    const answer = safeAnswer(saved?.answer);
    if (answer) checks[check.id] = { answer, submitted: safeAnswer(saved.submitted), hint: saved.hint === true, solution: saved.solution === true, usedHelp: saved.usedHelp === true || saved.hint === true || saved.solution === true };
  }
  return { page, checks };
}
export function examCompletion(exam: PastExam, progress: ExamProgress) {
  const checks = exam.pages.flatMap(p => p.checks);
  return {
    total: checks.length,
    answered: checks.filter(c => progress.checks[c.id]?.submitted).length,
    correct: checks.filter(c => {
      const saved = progress.checks[c.id];
      return saved?.submitted && evaluateAnswer(saved.submitted, c.key).correct;
    }).length,
  };
}
