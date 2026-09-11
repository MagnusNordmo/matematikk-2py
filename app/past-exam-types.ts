import type { AnswerKey } from "./question-bank";

export type ExamCheck = {
  id: string;
  task: number;
  label: string;
  key: AnswerKey;
  hint: string;
  solution: string;
};
export type ExamPage = {
  page: number;
  printedPage: number;
  part: 1 | 2;
  tasks: number[];
  image: string;
  width: number;
  height: number;
  sha256: string;
  checks: ExamCheck[];
};
export type PastExam = {
  id: string;
  title: string;
  kind: "exam";
  note: string;
  sourceLabel: string;
  sourceUrl?: string;
  pdf: string;
  sourceSha256: string;
  minutes: [number, number];
  pages: ExamPage[];
};
