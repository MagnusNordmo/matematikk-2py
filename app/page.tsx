"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  EMPTY_ANSWER,
  evaluateAnswer,
  isAnswerComplete,
  type AnswerEvaluation,
  type AnswerInput,
} from "./answer-engine";
import { DataPanel, MathText, VisualizationPanel } from "./presentation";
import {
  THEMES,
  answerPartCount,
  type AnswerKey,
  type Part,
  type Question,
  type QuestionBank,
  type QuestionGroup,
} from "./question-bank";
import {
  findRetryQuestion,
  selectSessionQuestions,
  type SessionMode,
} from "./session-engine";

type Screen = "home" | "modes" | "topics" | "session" | "result";
type Feedback = "wrong" | "partial" | "correct" | null;

type SessionItem = {
  key: string;
  question: Question;
  isExtra: boolean;
  baseOrdinal: number | null;
};

type SessionOutcome = {
  question: Question;
  correct: boolean;
  correctParts: number;
  totalParts: number;
  usedHint: boolean;
};

type SessionStats = {
  hints: number;
  baseSolved: number;
  baseWithoutHint: number;
  score: number;
  extraSolved: number;
};

type SavedProgress = {
  sessions: number;
  tasksCompleted: number;
  hintsUsed: number;
};

type ProgressByPart = Record<Part, SavedProgress>;
type RecentSelections = Record<string, string[]>;

const EMPTY_STATS: SessionStats = {
  hints: 0,
  baseSolved: 0,
  baseWithoutHint: 0,
  score: 0,
  extraSolved: 0,
};

const EMPTY_PROGRESS: SavedProgress = {
  sessions: 0,
  tasksCompleted: 0,
  hintsUsed: 0,
};

const EMPTY_PROGRESS_BY_PART: ProgressByPart = {
  1: { ...EMPTY_PROGRESS },
  2: { ...EMPTY_PROGRESS },
};

function IconArrow({ direction = "right" }: { direction?: "left" | "right" }) {
  return (
    <svg aria-hidden="true" className={direction === "left" ? "icon flip" : "icon"} viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg aria-hidden="true" className="icon" viewBox="0 0 24 24" fill="none">
      <path d="M12 3c.6 4.5 3 7 7 8-4 1-6.4 3.5-7 8-.6-4.5-3-7-7-8 4-1 6.4-3.5 7-8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function IconExam() {
  return (
    <svg aria-hidden="true" className="icon" viewBox="0 0 24 24" fill="none">
      <path d="M7 3h8l4 4v14H7V3Zm8 0v5h4M10 12h6M10 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function gradeFromPercent(percent: number) {
  if (percent >= 92) return 6;
  if (percent >= 80) return 5;
  if (percent >= 60) return 4;
  if (percent >= 40) return 3;
  if (percent >= 20) return 2;
  return 1;
}

function readableTaskType(question: Question) {
  const detail = question.deltema.replaceAll("_", " ");
  return detail.charAt(0).toLocaleUpperCase("nb-NO") + detail.slice(1);
}

function makeSessionItem(question: Question, baseOrdinal: number | null, isExtra = false): SessionItem {
  return {
    key: `${question.id}-${Date.now()}-${Math.random()}`,
    question,
    baseOrdinal,
    isExtra,
  };
}

function answerKeyParts(key: AnswerKey) {
  if (key.type === "valg") return { choices: key, numbers: [] };
  if (key.type === "valg_og_tall") return { choices: key.valg, numbers: key.verdier };
  return { choices: null, numbers: key.verdier };
}

function AnswerFields({
  answerKey,
  value,
  onChange,
  disabled,
  feedback,
  firstInputRef,
}: {
  answerKey: AnswerKey;
  value: AnswerInput;
  onChange: (answer: AnswerInput) => void;
  disabled: boolean;
  feedback: Feedback;
  firstInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { choices, numbers } = answerKeyParts(answerKey);
  return (
    <div className="answer-controls">
      {choices && (
        <fieldset className="choice-options">
          <legend>{choices.flervalg ? "Velg alle påstandene som er riktige" : "Velg ett svar"}</legend>
          {choices.alternativer.map((option) => {
            const checked = value.choices.includes(option);
            return (
              <label className={checked ? "choice-option selected" : "choice-option"} key={option}>
                <input
                  type={choices.flervalg ? "checkbox" : "radio"}
                  name="choice-answer"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => {
                    const nextChoices = choices.flervalg
                      ? checked
                        ? value.choices.filter((item) => item !== option)
                        : [...value.choices, option]
                      : [option];
                    onChange({ ...value, choices: nextChoices });
                  }}
                />
                <span><MathText>{option}</MathText></span>
              </label>
            );
          })}
        </fieldset>
      )}

      {numbers.length > 0 && (
        <div className={`numeric-answers numeric-answers-${numbers.length}`}>
          {numbers.map((number, index) => {
            const fieldLabel =
              number.etikett ??
              (numbers.length === 1 ? "Svaret ditt" : `Svar ${index + 1}`);
            return (
              <label key={index} className="numeric-answer">
                <span>{fieldLabel}</span>
                <span className={`answer-field ${feedback === "wrong" || feedback === "partial" ? "answer-field-wrong" : ""} ${feedback === "correct" ? "answer-field-correct" : ""}`}>
                  <input
                    ref={index === 0 ? firstInputRef : undefined}
                    value={value.numbers[index] ?? ""}
                    onChange={(event) => {
                      const nextNumbers = [...value.numbers];
                      nextNumbers[index] = event.target.value;
                      onChange({ ...value, numbers: nextNumbers });
                    }}
                    inputMode="decimal"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={number.etikett ? `Skriv ${number.etikett.toLocaleLowerCase("nb-NO")}` : "Skriv tallet"}
                    disabled={disabled}
                  />
                  {number.enhet && <span className="answer-unit">{number.enhet}</span>}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GroupContext({ group }: { group: QuestionGroup }) {
  return (
    <section className="group-context" aria-labelledby={`group-${group.id}`}>
      <p className="group-label">Felles oppgavetekst</p>
      <h2 id={`group-${group.id}`}>{group.tittel}</h2>
      <p><MathText>{group.innledning}</MathText></p>
      {group.visualisering?.type !== "tabell" && <DataPanel data={group.data} />}
      <VisualizationPanel visualization={group.visualisering} data={group.data} />
      {group.dataopprinnelse && <small>{group.dataopprinnelse}</small>}
    </section>
  );
}

export default function Home() {
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [mode, setMode] = useState<SessionMode>("skill");
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [queue, setQueue] = useState<SessionItem[]>([]);
  const [baseCount, setBaseCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState<AnswerInput>(EMPTY_ANSWER);
  const [hintIndex, setHintIndex] = useState(0);
  const [selectedSolutionPathId, setSelectedSolutionPathId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
  const [stats, setStats] = useState<SessionStats>(EMPTY_STATS);
  const [resultStats, setResultStats] = useState<SessionStats | null>(null);
  const [outcomes, setOutcomes] = useState<SessionOutcome[]>([]);
  const [resultOutcomes, setResultOutcomes] = useState<SessionOutcome[]>([]);
  const [maxPoints, setMaxPoints] = useState(0);
  const [savedProgress, setSavedProgress] = useState<ProgressByPart>(EMPTY_PROGRESS_BY_PART);
  const [recentSelections, setRecentSelections] = useState<RecentSelections>({});
  const answerRef = useRef<HTMLInputElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetch("/oppgaver-2027.json")
      .then((response) => {
        if (!response.ok) throw new Error("Oppgavebanken kunne ikke lastes");
        return response.json();
      })
      .then((data: QuestionBank) => setBank(data))
      .catch(() => setLoadError(true));

    Promise.resolve().then(() => {
      try {
        const stored = window.localStorage.getItem("matematikk2py-progress-v2");
        if (stored) {
          setSavedProgress(JSON.parse(stored) as ProgressByPart);
        } else {
          const legacy = window.localStorage.getItem("matematikk2py-progress");
          if (legacy) {
            const partOne = JSON.parse(legacy) as SavedProgress;
            setSavedProgress({ 1: partOne, 2: { ...EMPTY_PROGRESS } });
          }
        }
      } catch {
        setSavedProgress(EMPTY_PROGRESS_BY_PART);
      }

      try {
        const recent = window.localStorage.getItem("matematikk2py-recent-selections-v1");
        if (recent) setRecentSelections(JSON.parse(recent) as RecentSelections);
      } catch {
        setRecentSelections({});
      }
    });
  }, []);

  useEffect(() => {
    if (screen === "session" && !resolved) answerRef.current?.focus();
    if (resolved) continueRef.current?.focus();
  }, [currentIndex, resolved, screen]);

  useEffect(() => {
    if (screen !== "session" || mode !== "exam") return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [mode, screen]);

  const currentItem = queue[currentIndex];
  const currentQuestion = currentItem?.question;
  const activeTheme = THEMES.find((theme) => theme.id === selectedTheme);
  const themeById = useMemo(() => new Map(THEMES.map((theme) => [theme.id, theme])), []);
  const groupById = useMemo(
    () => new Map(bank?.oppgavegrupper.map((group) => [group.id, group]) ?? []),
    [bank],
  );
  const currentGroup = currentQuestion?.oppgavegruppe
    ? groupById.get(currentQuestion.oppgavegruppe.id)
    : undefined;
  const solutionPaths = currentQuestion?.losningsveier ?? [];
  const selectedSolutionPath = solutionPaths.find((path) => path.id === selectedSolutionPathId);
  const activeHints = selectedSolutionPath?.hint ?? currentQuestion?.hint ?? [];
  const needsSolutionPath = solutionPaths.length > 0 && !selectedSolutionPath;
  const availableThemes = useMemo(() => {
    if (!bank || !selectedPart) return [];
    const ids = new Set(bank.oppgaver.filter((question) => question.del === selectedPart).map((question) => question.tema));
    return THEMES.filter((theme) => ids.has(theme.id));
  }, [bank, selectedPart]);
  function choosePart(part: Part) {
    setSelectedPart(part);
    setSelectedTheme(null);
    setScreen("modes");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startSession(nextMode: SessionMode, themeId?: string) {
    if (!bank || !selectedPart) return;
    const selectionKey = `${selectedPart}:${nextMode}:${themeId ?? "blandet"}`;
    const questions = selectSessionQuestions(
      bank,
      selectedPart,
      nextMode,
      themeId,
      new Set(recentSelections[selectionKey] ?? []),
    );
    const nextRecentSelections = {
      ...recentSelections,
      [selectionKey]: questions.map((question) => question.id),
    };
    const items = questions.map((question, index) => makeSessionItem(question, index + 1));
    setRecentSelections(nextRecentSelections);
    try {
      window.localStorage.setItem(
        "matematikk2py-recent-selections-v1",
        JSON.stringify(nextRecentSelections),
      );
    } catch {
      // Tilfeldig trekking virker fortsatt når lokal lagring er blokkert.
    }
    setMode(nextMode);
    setSelectedTheme(themeId ?? null);
    setQueue(items);
    setBaseCount(questions.length);
    setCurrentIndex(0);
    setAnswer(EMPTY_ANSWER);
    setHintIndex(0);
    setSelectedSolutionPathId(null);
    setAttempts(0);
    setResolved(false);
    setFeedback(null);
    setEvaluation(null);
    setStats(EMPTY_STATS);
    setResultStats(null);
    setOutcomes([]);
    setResultOutcomes([]);
    setMaxPoints(questions.reduce((sum, question) => sum + answerPartCount(question), 0));
    setScreen("session");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function revealHint() {
    if (!currentQuestion || resolved || needsSolutionPath || hintIndex >= activeHints.length) return;
    setHintIndex((value) => value + 1);
    setStats((value) => ({ ...value, hints: value.hints + 1 }));
  }

  function chooseSolutionPath(pathId: string) {
    if (pathId === selectedSolutionPathId) return;
    setSelectedSolutionPathId(pathId);
    setHintIndex(0);
  }

  function insertRetryAfterGroup(question: Question) {
    if (!bank) return;
    const retry = makeSessionItem(findRetryQuestion(bank, question), null, true);
    setQueue((items) => {
      const updated = [...items];
      const groupId = question.oppgavegruppe?.id;
      let insertAt = currentIndex + 1;
      if (groupId) {
        while (insertAt < updated.length && updated[insertAt].question.oppgavegruppe?.id === groupId) insertAt += 1;
      }
      updated.splice(insertAt, 0, retry);
      return updated;
    });
  }

  function submitAnswer(event: FormEvent) {
    event.preventDefault();
    if (!currentQuestion || resolved || !isAnswerComplete(answer, currentQuestion.fasit)) return;
    const result = evaluateAnswer(answer, currentQuestion.fasit);
    setEvaluation(result);

    if (mode === "skill" && !result.correct) {
      setAttempts((value) => value + 1);
      setFeedback(result.correctParts > 0 ? "partial" : "wrong");
      return;
    }

    const usedHint = hintIndex > 0;
    setResolved(true);
    setFeedback(result.correct ? "correct" : result.correctParts > 0 ? "partial" : "wrong");
    setStats((value) => ({
      ...value,
      baseSolved: value.baseSolved + (currentItem.isExtra ? 0 : 1),
      baseWithoutHint: value.baseWithoutHint + (!currentItem.isExtra && !usedHint && result.correct ? 1 : 0),
      score: value.score + (!currentItem.isExtra && mode === "exam" && !usedHint ? result.correctParts : 0),
      extraSolved: value.extraSolved + (currentItem.isExtra ? 1 : 0),
    }));
    if (!currentItem.isExtra) {
      setOutcomes((value) => [
        ...value,
        {
          question: currentQuestion,
          correct: result.correct,
          correctParts: result.correctParts,
          totalParts: result.totalParts,
          usedHint,
        },
      ]);
    }

    if (mode === "skill" && usedHint) insertRetryAfterGroup(currentQuestion);
  }

  function saveCompletedSession(finalStats: SessionStats) {
    if (!selectedPart) return;
    const nextPart = {
      sessions: savedProgress[selectedPart].sessions + 1,
      tasksCompleted: savedProgress[selectedPart].tasksCompleted + finalStats.baseSolved,
      hintsUsed: savedProgress[selectedPart].hintsUsed + finalStats.hints,
    };
    const nextProgress = { ...savedProgress, [selectedPart]: nextPart };
    setSavedProgress(nextProgress);
    try {
      window.localStorage.setItem("matematikk2py-progress-v2", JSON.stringify(nextProgress));
    } catch {
      // Lokal fremdrift er valgfri; økten virker også når lagring er blokkert.
    }
  }

  function finishSession() {
    setResultStats(stats);
    setResultOutcomes(outcomes);
    saveCompletedSession(stats);
    setScreen("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function nextQuestion() {
    if (currentIndex + 1 >= queue.length) {
      finishSession();
      return;
    }
    setCurrentIndex((value) => value + 1);
    setAnswer(EMPTY_ANSWER);
    setHintIndex(0);
    setSelectedSolutionPathId(null);
    setAttempts(0);
    setResolved(false);
    setFeedback(null);
    setEvaluation(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function leaveSession(target: "home" | "modes" | "topics", force = false) {
    if (
      !force &&
      screen === "session" &&
      mode === "exam" &&
      !window.confirm("Forlater du eksamensøkten nå, mister du framdriften i denne økten. Vil du forlate økten?")
    ) return;
    setScreen(target);
    setQueue([]);
    setOutcomes([]);
    setResultOutcomes([]);
    setResultStats(null);
    if (target !== "topics") setSelectedTheme(null);
    if (target === "home") setSelectedPart(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goHome(force = false) {
    leaveSession("home", force);
  }

  const progressPercent = baseCount > 0 ? Math.min(100, (stats.baseSolved / baseCount) * 100) : 0;
  const resultPercent = resultStats && maxPoints > 0 ? Math.round((resultStats.score / maxPoints) * 100) : 0;
  const grade = gradeFromPercent(resultPercent);
  const correctQuestionCount = resultOutcomes.filter((outcome) => outcome.correct).length;
  const currentProgress = selectedPart ? savedProgress[selectedPart] : null;

  return (
    <main className="app-shell">
      <header className="site-header">
        <button className="brand" onClick={() => goHome()} aria-label="Gå til start">
          <span className="brand-mark" aria-hidden="true">2</span>
          <span><strong>Matematikk 2PY</strong><small>{selectedPart ? `Del ${selectedPart} · ${selectedPart === 1 ? "uten" : "med"} hjelpemidler` : "Eksamensnær øving"}</small></span>
        </button>
        {screen === "session" ? (
          <button className="quiet-button" onClick={() => leaveSession(mode === "exam" ? "modes" : "topics")}>
            {mode === "exam" ? "Forlat eksamensøkt" : "Til temaer"}
          </button>
        ) : currentProgress && currentProgress.sessions > 0 ? (
          <span className="local-progress">Del {selectedPart}: {currentProgress.sessions} {currentProgress.sessions === 1 ? "økt" : "økter"} på denne enheten</span>
        ) : null}
      </header>

      {screen === "home" && (
        <div className="page home-page">
          <section className="hero">
            <p className="eyebrow">Eksamensnær trening for 2PY</p>
            <h1>Velg hvilken del du vil øve på</h1>
            <p className="hero-copy">Tren på oppgaver som ligner formatet og nivået du kan møte på eksamen. Velg først om du vil arbeide uten eller med hjelpemidler.</p>
          </section>
          <section className="choice-grid part-grid" aria-label="Velg eksamensdel">
            <button className="choice-card choice-card-primary" onClick={() => choosePart(1)} disabled={!bank}>
              <span className="part-number">1</span>
              <span className="choice-content"><span className="choice-kicker">Uten hjelpemidler</span><strong>Del 1</strong><span>Korte og sammensatte oppgaver du skal kunne løse med egne ferdigheter.</span></span>
              <span className="choice-arrow"><IconArrow /></span>
            </button>
            <button className="choice-card" onClick={() => choosePart(2)} disabled={!bank}>
              <span className="part-number part-number-blue">2</span>
              <span className="choice-content"><span className="choice-kicker">Med hjelpemidler</span><strong>Del 2</strong><span>Digitale oppgaver og eksamenslignende case med fire deloppgaver.</span></span>
              <span className="choice-arrow"><IconArrow /></span>
            </button>
          </section>
          {loadError && <p className="load-message error-message" role="alert">Oppgavebanken kunne ikke lastes. Prøv å oppdatere siden.</p>}
          {!bank && !loadError && <p className="load-message" role="status">Henter oppgaver …</p>}
          <footer className="privacy-note"><span aria-hidden="true">●</span>Fremdrift lagres bare på denne enheten. Ingen innlogging eller innsamling.</footer>
        </div>
      )}

      {screen === "modes" && selectedPart && (
        <div className="page topics-page">
          <button className="back-link" onClick={() => goHome(true)}><IconArrow direction="left" />Bytt del</button>
          <section className="section-heading">
            <p className="eyebrow">Del {selectedPart} · {selectedPart === 1 ? "uten hjelpemidler" : "med hjelpemidler"}</p>
            <h1>Hvordan vil du øve?</h1>
            <p>En eksamensøkt består alltid av 10 tilfeldig valgte oppgaver.</p>
          </section>
          <section className="choice-grid" aria-label="Velg øvingsmåte">
            <button className="choice-card choice-card-primary" onClick={() => setScreen("topics")}>
              <span className="choice-icon"><IconSpark /></span>
              <span className="choice-content"><span className="choice-kicker">Lær i ditt tempo</span><strong>Øv på et bestemt tema</strong><span>Velg et fagområde. Du kan prøve på nytt og åpne hint trinn for trinn.</span></span>
              <span className="choice-arrow"><IconArrow /></span>
            </button>
            <button className="choice-card" onClick={() => startSession("exam")}>
              <span className="choice-icon"><IconExam /></span>
              <span className="choice-content"><span className="choice-kicker">Blandet trening</span><strong>Øv som på eksamen</strong><span>10 oppgaver fra flere temaer. Du får ett forsøk før fasiten vises.</span><span className="exam-note">Hint gir 0 poeng på oppgaven.</span></span>
              <span className="choice-arrow"><IconArrow /></span>
            </button>
          </section>
        </div>
      )}

      {screen === "topics" && selectedPart && (
        <div className="page topics-page">
          <button className="back-link" onClick={() => setScreen("modes")}><IconArrow direction="left" />Tilbake</button>
          <section className="section-heading">
            <p className="eyebrow">Del {selectedPart} · spesifikke ferdigheter</p>
            <h1>Velg et tema</h1>
            <p>Prøv selv først, og bruk forklaringene når du trenger dem.</p>
          </section>
          <section className="topic-grid" aria-label="Matematikktemaer">
            {availableThemes.map((theme) => (
              <button className="topic-card" key={theme.id} onClick={() => startSession("skill", theme.id)}>
                <span className="topic-symbol" aria-hidden="true">{theme.symbol}</span>
                <span className="topic-copy"><strong>{theme.navn}</strong><span>{theme.beskrivelse}</span></span>
                <IconArrow />
              </button>
            ))}
          </section>
        </div>
      )}

      {screen === "session" && currentQuestion && selectedPart && (
        <div className="session-page">
          <div className="session-navigation">
            <button className="back-link" onClick={() => leaveSession(mode === "exam" ? "modes" : "topics")}>
              <IconArrow direction="left" />{mode === "exam" ? "Til øvingsmåter" : "Til temaer"}
            </button>
          </div>
          <section className="session-status" aria-label="Fremdrift i økten">
            <div className="progress-copy">
              <span>{currentItem.isExtra ? "Ekstra mestringsoppgave" : `Oppgave ${currentItem.baseOrdinal} av ${baseCount}`}</span>
              <span>{mode === "exam" ? `${stats.score} av ${maxPoints} poeng` : `${stats.baseWithoutHint} uten hint`}<span className="stat-divider">·</span>{stats.hints} hint</span>
            </div>
            <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={baseCount} aria-valuenow={stats.baseSolved}><span style={{ width: `${progressPercent}%` }} /></div>
          </section>

          <section className="question-wrap">
            <div className="question-meta">
              <span>{currentItem.isExtra ? "Samme ferdighet – prøv uten hint" : themeById.get(currentQuestion.tema)?.kortnavn}</span>
              <span>Del {selectedPart}{currentQuestion.oppgavegruppe ? ` · ${currentQuestion.oppgavegruppe.deloppgave})` : ""}</span>
            </div>
            {mode === "exam" && !currentItem.isExtra && <div className="exam-banner"><IconExam />Ett forsøk. Hint gir 0 poeng på denne oppgaven.</div>}
            {currentGroup && <GroupContext group={currentGroup} />}

            <article className="question-card">
              <div className="question-text">
                <MathText>{currentQuestion.sporsmal}</MathText>
                {currentQuestion.visualisering?.type !== "tabell" && <DataPanel data={currentQuestion.data} />}
                <VisualizationPanel visualization={currentQuestion.visualisering} data={currentQuestion.data} />
              </div>
              <form onSubmit={submitAnswer} className="answer-form structured-answer-form">
                <AnswerFields answerKey={currentQuestion.fasit} value={answer} onChange={(next) => { setAnswer(next); if (!resolved) setFeedback(null); }} disabled={resolved} feedback={feedback} firstInputRef={answerRef} />
                <div id="answer-feedback" className={`feedback ${feedback ? `feedback-${feedback}` : ""}`} aria-live="polite">
                  {feedback === "wrong" && (resolved ? <><strong>Ikke riktig denne gangen.</strong> Se løsningsforslaget under.</> : <><strong>Ikke helt ennå.</strong> Prøv en gang til, eller bruk et hint.</>)}
                  {feedback === "partial" && (resolved ? <><strong>Delvis riktig.</strong> Du fikk {evaluation?.correctParts} av {evaluation?.totalParts} mulige poeng.</> : <><strong>Noe er riktig.</strong> Kontroller alle delene og prøv igjen.</>)}
                  {feedback === "correct" && <><strong>Riktig!</strong> {hintIndex > 0 && mode === "skill" ? "Du får en lignende oppgave, slik at du kan prøve uten hint." : attempts > 0 ? "Du fant fram etter å ha prøvd på nytt." : "Godt jobbet."}</>}
                </div>
                {!resolved ? (
                  <button className="primary-button" type="submit" disabled={!isAnswerComplete(answer, currentQuestion.fasit)}>Sjekk svar<IconArrow /></button>
                ) : (
                  <button ref={continueRef} className="primary-button" type="button" onClick={nextQuestion}>{currentIndex + 1 >= queue.length ? "Se resultat" : "Neste oppgave"}<IconArrow /></button>
                )}
              </form>

              {resolved && (
                <div className="solution-panel"><strong>Løsningsforslag</strong><p><MathText>{currentQuestion.svar}</MathText></p></div>
              )}
              <div className="hint-section">
                <div className="hint-heading">
                  <div><strong>{solutionPaths.length > 0 ? "Velg en regnevei" : "Trenger du en forklaring?"}</strong><span>{solutionPaths.length > 0 ? "Samme oppgave kan løses på flere måter. Velg én vei, og åpne løsningen steg for steg. Du kan bytte vei og sammenligne etterpå." : "Åpne ett løsningssteg om gangen. Hintene viser en fullstendig løsning steg for steg, og fasiten vises til slutt."}</span></div>
                  {!resolved && !needsSolutionPath && hintIndex < activeHints.length && <button className="hint-button" type="button" onClick={revealHint}><IconSpark />Vis hint {hintIndex + 1} av {activeHints.length}</button>}
                </div>
                {solutionPaths.length > 0 && (
                  <div className="solution-paths" role="group" aria-label="Velg løsningsmetode">
                    {solutionPaths.map((path) => (
                      <button
                        className={`solution-path ${selectedSolutionPathId === path.id ? "solution-path-selected" : ""}`}
                        type="button"
                        key={`${currentQuestion.id}-${path.id}`}
                        aria-pressed={selectedSolutionPathId === path.id}
                        onClick={() => chooseSolutionPath(path.id)}
                      >
                        <strong>{path.navn}</strong>
                        <span>{path.forklaring}</span>
                      </button>
                    ))}
                  </div>
                )}
                {!needsSolutionPath && (resolved || hintIndex > 0) && (
                  <ol className="hint-list">
                    {activeHints.slice(0, resolved ? activeHints.length : hintIndex).map((hint, index) => <li key={`${currentQuestion.id}-${selectedSolutionPathId ?? "standard"}-hint-${index}`}><span>{index + 1}</span><p><MathText>{hint}</MathText></p></li>)}
                    {(resolved || hintIndex === activeHints.length) && <li className="final-hint"><span>✓</span><p><strong>Fasit:</strong> <MathText>{currentQuestion.svar}</MathText></p></li>}
                  </ol>
                )}
              </div>
            </article>
          </section>
        </div>
      )}

      {screen === "result" && resultStats && selectedPart && (
        <div className="page result-page">
          <section className="result-card">
            <span className="result-symbol" aria-hidden="true">✓</span>
            <p className="eyebrow">Del {selectedPart} · økten er fullført</p>
            {mode === "exam" ? (
              <>
                <h1>Veiledende karakter {grade}</h1>
                <p className="result-lead">Du fikk {correctQuestionCount} av {baseCount} oppgaver helt riktig og {resultStats.score} av {maxPoints} mulige poeng ({resultPercent} %).</p>
                <div className="result-grid">
                  <div><strong>{correctQuestionCount}</strong><span>helt riktige oppgaver</span></div>
                  <div><strong>{baseCount - correctQuestionCount}</strong><span>oppgaver å øve mer på</span></div>
                  <div><strong>{resultStats.hints}</strong><span>hint brukt</span></div>
                </div>
                <p className="grade-disclaimer">Karakteren er bare et øvingsanslag. På ekte eksamen vurderer sensor også framgangsmåte, begrunnelser og matematisk forståelse.</p>

                <section className="exam-report" aria-labelledby="question-report-heading">
                  <div className="report-heading">
                    <p className="eyebrow">Rapport</p>
                    <h2 id="question-report-heading">Oppgave for oppgave</h2>
                    <p>Oppgaver som ikke var helt riktige, er åpnet slik at du kan se løsningsforslaget.</p>
                  </div>
                  <div className="question-report-list">
                    {resultOutcomes.map((outcome, index) => {
                      const status = outcome.correct ? "Riktig" : outcome.correctParts > 0 ? "Delvis riktig" : "Feil";
                      return (
                        <details className={`question-report-item ${outcome.correct ? "question-report-correct" : "question-report-wrong"}`} key={outcome.question.id} open={!outcome.correct}>
                          <summary>
                            <span className="question-report-number">{index + 1}</span>
                            <span><small>{themeById.get(outcome.question.tema)?.kortnavn}</small><strong>{readableTaskType(outcome.question)}</strong></span>
                            <span className="question-report-status">{status}</span>
                          </summary>
                          <div className="question-report-content">
                            <p><strong>Oppgaven:</strong> <MathText>{outcome.question.sporsmal}</MathText></p>
                            <p><strong>Løsningsforslag:</strong> <MathText>{outcome.question.svar}</MathText></p>
                            {outcome.usedHint && <p className="question-report-note">Du brukte hint på denne oppgaven.</p>}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </section>
              </>
            ) : (
              <><h1>God økt!</h1><p className="result-lead">Du fullførte {baseCount} oppgaver i {activeTheme?.navn.toLowerCase() ?? "temaet"}.</p><div className="result-grid"><div><strong>{resultStats.baseWithoutHint}</strong><span>løst uten hint</span></div><div><strong>{resultStats.hints}</strong><span>hint brukt</span></div><div><strong>{resultStats.extraSolved}</strong><span>ekstraoppgaver</span></div></div></>
            )}
            <div className="result-actions"><button className="primary-button" onClick={() => mode === "exam" ? startSession("exam") : startSession("skill", selectedTheme ?? undefined)}>{mode === "exam" ? "Prøv igjen" : "Øv en gang til"}<IconArrow /></button><button className="secondary-button" onClick={() => leaveSession(mode === "exam" ? "modes" : "topics", true)}>{mode === "exam" ? "Velg øvingsmåte" : "Velg tema"}</button></div>
          </section>
        </div>
      )}
    </main>
  );
}
