"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";
import { answersMatch } from "./answer-engine";

type Theme = {
  id: string;
  navn: string;
  kortnavn: string;
  beskrivelse: string;
  symbol: string;
};

type Question = {
  id: string;
  tema: string;
  gruppe: string;
  ferdighet: string;
  sporsmal: string;
  hints: string[];
  svar: string;
  aksepterteSvar?: string[];
  svarType: "tall" | "prosent" | "tekst" | "uttrykk";
  enhet?: string;
  poeng: number;
  toleranse?: number;
  vanskelighetsgrad: "lett" | "middels" | "vanskelig";
};

type QuestionBank = {
  versjon: string;
  temaer: Theme[];
  oppgaver: Question[];
};

type Mode = "skill" | "exam";
type Screen = "home" | "topics" | "session" | "result";

type SessionItem = {
  key: string;
  question: Question;
  isExtra: boolean;
  baseOrdinal: number | null;
};

type SessionStats = {
  hints: number;
  baseSolved: number;
  baseWithoutHint: number;
  examPoints: number;
  extraSolved: number;
};

type SavedProgress = {
  sessions: number;
  tasksCompleted: number;
  hintsUsed: number;
};

const EMPTY_STATS: SessionStats = {
  hints: 0,
  baseSolved: 0,
  baseWithoutHint: 0,
  examPoints: 0,
  extraSolved: 0,
};

const EMPTY_PROGRESS: SavedProgress = {
  sessions: 0,
  tasksCompleted: 0,
  hintsUsed: 0,
};

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [
      result[randomIndex],
      result[index],
    ];
  }
  return result;
}

function MathText({ children }: { children: string }) {
  const parts = children.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g);

  return (
    <>
      {parts.map((part, index) => {
        const isDisplay = part.startsWith("$$") && part.endsWith("$$");
        const isInline =
          !isDisplay && part.startsWith("$") && part.endsWith("$");

        if (!isDisplay && !isInline) {
          return <span key={`${part}-${index}`}>{part}</span>;
        }

        const expression = isDisplay ? part.slice(2, -2) : part.slice(1, -1);
        return (
          <span
            key={`${part}-${index}`}
            className={isDisplay ? "math-display" : "math-inline"}
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(expression, {
                throwOnError: false,
                displayMode: isDisplay,
                strict: "ignore",
              }),
            }}
          />
        );
      })}
    </>
  );
}

function IconArrow({ direction = "right" }: { direction?: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      className={direction === "left" ? "icon flip" : "icon"}
      viewBox="0 0 24 24"
      fill="none"
    >
      <path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg aria-hidden="true" className="icon" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3c.6 4.5 3 7 7 8-4 1-6.4 3.5-7 8-.6-4.5-3-7-7-8 4-1 6.4-3.5 7-8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconExam() {
  return (
    <svg aria-hidden="true" className="icon" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 3h8l4 4v14H7V3Zm8 0v5h4M10 12h6M10 16h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
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

export default function Home() {
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [mode, setMode] = useState<Mode>("skill");
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [queue, setQueue] = useState<SessionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [hintIndex, setHintIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [feedback, setFeedback] = useState<"wrong" | "correct" | null>(null);
  const [stats, setStats] = useState<SessionStats>(EMPTY_STATS);
  const [resultStats, setResultStats] = useState<SessionStats | null>(null);
  const [maxPoints, setMaxPoints] = useState(0);
  const [savedProgress, setSavedProgress] =
    useState<SavedProgress>(EMPTY_PROGRESS);
  const answerRef = useRef<HTMLInputElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetch("/oppgaver.json")
      .then((response) => {
        if (!response.ok) throw new Error("Oppgavebanken kunne ikke lastes");
        return response.json();
      })
      .then((data: QuestionBank) => setBank(data))
      .catch(() => setLoadError(true));

    Promise.resolve().then(() => {
      try {
        const stored = window.localStorage.getItem("matematikk2py-progress");
        if (stored) setSavedProgress(JSON.parse(stored) as SavedProgress);
      } catch {
        setSavedProgress(EMPTY_PROGRESS);
      }
    });
  }, []);

  useEffect(() => {
    if (screen === "session" && !resolved) {
      answerRef.current?.focus();
    }
    if (resolved) {
      continueRef.current?.focus();
    }
  }, [currentIndex, resolved, screen]);

  const currentItem = queue[currentIndex];
  const currentQuestion = currentItem?.question;
  const activeTheme = bank?.temaer.find((theme) => theme.id === selectedTheme);

  const themeById = useMemo(() => {
    return new Map(bank?.temaer.map((theme) => [theme.id, theme]) ?? []);
  }, [bank]);

  function makeSessionItem(
    question: Question,
    baseOrdinal: number | null,
    isExtra = false,
  ): SessionItem {
    return {
      key: `${question.id}-${Date.now()}-${Math.random()}`,
      question,
      baseOrdinal,
      isExtra,
    };
  }

  function selectExamQuestions() {
    if (!bank) return [];
    const firstFromEachTheme = bank.temaer
      .map((theme) => {
        const candidates = shuffle(
          bank.oppgaver.filter((question) => question.tema === theme.id),
        );
        return candidates[0];
      })
      .filter(Boolean);

    const firstIds = new Set(firstFromEachTheme.map((question) => question.id));
    const remaining = shuffle(
      bank.oppgaver.filter((question) => !firstIds.has(question.id)),
    ).slice(0, Math.max(0, 10 - firstFromEachTheme.length));

    return shuffle([...firstFromEachTheme, ...remaining]).slice(0, 10);
  }

  function startSession(nextMode: Mode, themeId?: string) {
    if (!bank) return;
    const questions =
      nextMode === "exam"
        ? selectExamQuestions()
        : shuffle(
            bank.oppgaver.filter((question) => question.tema === themeId),
          ).slice(0, 10);

    const items = questions.map((question, index) =>
      makeSessionItem(question, index + 1),
    );

    setMode(nextMode);
    setSelectedTheme(themeId ?? null);
    setQueue(items);
    setCurrentIndex(0);
    setAnswer("");
    setHintIndex(0);
    setAttempts(0);
    setResolved(false);
    setFeedback(null);
    setStats(EMPTY_STATS);
    setResultStats(null);
    setMaxPoints(questions.reduce((sum, question) => sum + question.poeng, 0));
    setScreen("session");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function findRetryQuestion(question: Question) {
    if (!bank) return question;
    const sameGroup = shuffle(
      bank.oppgaver.filter(
        (candidate) =>
          candidate.gruppe === question.gruppe && candidate.id !== question.id,
      ),
    );
    if (sameGroup.length > 0) return sameGroup[0];

    const sameTheme = shuffle(
      bank.oppgaver.filter(
        (candidate) =>
          candidate.tema === question.tema && candidate.id !== question.id,
      ),
    );
    return sameTheme[0] ?? question;
  }

  function revealHint() {
    if (!currentQuestion || resolved || hintIndex >= currentQuestion.hints.length) {
      return;
    }
    setHintIndex((value) => value + 1);
    setStats((value) => ({ ...value, hints: value.hints + 1 }));
  }

  function submitAnswer(event: FormEvent) {
    event.preventDefault();
    if (!currentQuestion || resolved || !answer.trim()) return;

    if (!answersMatch(answer, currentQuestion)) {
      setAttempts((value) => value + 1);
      setFeedback("wrong");
      return;
    }

    const usedHint = hintIndex > 0;
    setResolved(true);
    setFeedback("correct");
    setStats((value) => ({
      ...value,
      baseSolved: value.baseSolved + (currentItem.isExtra ? 0 : 1),
      baseWithoutHint:
        value.baseWithoutHint + (!currentItem.isExtra && !usedHint ? 1 : 0),
      examPoints:
        value.examPoints +
        (!currentItem.isExtra && mode === "exam" && !usedHint
          ? currentQuestion.poeng
          : 0),
      extraSolved: value.extraSolved + (currentItem.isExtra ? 1 : 0),
    }));

    if (usedHint) {
      const retry = makeSessionItem(
        findRetryQuestion(currentQuestion),
        null,
        true,
      );
      setQueue((items) => {
        const updated = [...items];
        updated.splice(currentIndex + 1, 0, retry);
        return updated;
      });
    }
  }

  function saveCompletedSession(finalStats: SessionStats) {
    const nextProgress = {
      sessions: savedProgress.sessions + 1,
      tasksCompleted: savedProgress.tasksCompleted + finalStats.baseSolved,
      hintsUsed: savedProgress.hintsUsed + finalStats.hints,
    };
    setSavedProgress(nextProgress);
    try {
      window.localStorage.setItem(
        "matematikk2py-progress",
        JSON.stringify(nextProgress),
      );
    } catch {
      // Fremdrift er et tillegg. Økten fungerer også når lokal lagring er blokkert.
    }
  }

  function finishSession() {
    setResultStats(stats);
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
    setAnswer("");
    setHintIndex(0);
    setAttempts(0);
    setResolved(false);
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goHome(force = false) {
    if (
      !force &&
      screen === "session" &&
      stats.baseSolved > 0 &&
      !window.confirm("Vil du avslutte økten? Resultatet fra økten blir ikke lagret.")
    ) {
      return;
    }
    setScreen("home");
    setQueue([]);
    setSelectedTheme(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const progressPercent = Math.min(100, (stats.baseSolved / 10) * 100);
  const resultPercent =
    resultStats && maxPoints > 0
      ? Math.round((resultStats.examPoints / maxPoints) * 100)
      : 0;
  const grade = gradeFromPercent(resultPercent);

  return (
    <main className="app-shell">
      <header className="site-header">
        <button className="brand" onClick={() => goHome()} aria-label="Gå til start">
          <span className="brand-mark" aria-hidden="true">
            2
          </span>
          <span>
            <strong>Matematikk 2PY</strong>
            <small>Del 1 · uten hjelpemidler</small>
          </span>
        </button>
        {screen === "session" ? (
          <button className="quiet-button" onClick={() => goHome()}>
            Avslutt økt
          </button>
        ) : savedProgress.sessions > 0 ? (
          <span className="local-progress">
            {savedProgress.sessions} {savedProgress.sessions === 1 ? "økt" : "økter"} på
            denne enheten
          </span>
        ) : null}
      </header>

      {screen === "home" && (
        <div className="page home-page">
          <section className="hero">
            <p className="eyebrow">Rolig trening. Ett steg om gangen.</p>
            <h1>Hva vil du øve på i dag?</h1>
            <p className="hero-copy">
              Oppgavene er laget for Del 1 av 2PY. Du trenger bare blyant,
              papir og litt tålmodighet.
            </p>
          </section>

          <section className="choice-grid" aria-label="Velg øvingsmåte">
            <button
              className="choice-card choice-card-primary"
              onClick={() => setScreen("topics")}
              disabled={!bank}
            >
              <span className="choice-icon">
                <IconSpark />
              </span>
              <span className="choice-content">
                <span className="choice-kicker">Lær i ditt tempo</span>
                <strong>Øv på spesifikke ferdigheter</strong>
                <span>
                  Velg ett tema og løs 10 oppgaver. Hint hjelper deg trinn for
                  trinn.
                </span>
              </span>
              <span className="choice-arrow">
                <IconArrow />
              </span>
            </button>

            <button
              className="choice-card"
              onClick={() => startSession("exam")}
              disabled={!bank}
            >
              <span className="choice-icon">
                <IconExam />
              </span>
              <span className="choice-content">
                <span className="choice-kicker">Blandet trening</span>
                <strong>Øv på eksamen</strong>
                <span>
                  Få 10 oppgaver fra ulike temaer, poeng og en veiledende
                  karakter.
                </span>
                <span className="exam-note">Bruker du hint, får du 0 poeng på oppgaven.</span>
              </span>
              <span className="choice-arrow">
                <IconArrow />
              </span>
            </button>
          </section>

          {loadError && (
            <p className="load-message error-message" role="alert">
              Oppgavebanken kunne ikke lastes. Prøv å oppdatere siden.
            </p>
          )}
          {!bank && !loadError && (
            <p className="load-message" role="status">
              Henter oppgavene …
            </p>
          )}

          <footer className="privacy-note">
            <span aria-hidden="true">●</span>
            Fremdrift lagres bare på denne enheten. Ingen innlogging eller
            innsamling.
          </footer>
        </div>
      )}

      {screen === "topics" && bank && (
        <div className="page topics-page">
          <button className="back-link" onClick={() => setScreen("home")}>
            <IconArrow direction="left" />
            Tilbake
          </button>
          <section className="section-heading">
            <p className="eyebrow">Spesifikke ferdigheter</p>
            <h1>Velg et tema</h1>
            <p>
              Du får 10 oppgaver. Prøv selv først, og bruk forklaringene når du
              trenger dem.
            </p>
          </section>

          <section className="topic-grid" aria-label="Matematikktemaer">
            {bank.temaer.map((theme) => (
              <button
                className="topic-card"
                key={theme.id}
                onClick={() => startSession("skill", theme.id)}
              >
                <span className="topic-symbol" aria-hidden="true">
                  {theme.symbol}
                </span>
                <span className="topic-copy">
                  <strong>{theme.navn}</strong>
                  <span>{theme.beskrivelse}</span>
                </span>
                <IconArrow />
              </button>
            ))}
          </section>
        </div>
      )}

      {screen === "session" && currentQuestion && (
        <div className="session-page">
          <section className="session-status" aria-label="Fremdrift i økten">
            <div className="progress-copy">
              <span>
                {currentItem.isExtra
                  ? "Ekstra mestringsoppgave"
                  : `Oppgave ${currentItem.baseOrdinal} av 10`}
              </span>
              <span>
                {mode === "exam"
                  ? `${stats.examPoints} poeng`
                  : `${stats.baseWithoutHint} uten hint`}
                <span className="stat-divider">·</span>
                {stats.hints} {stats.hints === 1 ? "hint" : "hint"}
              </span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={10}
              aria-valuenow={stats.baseSolved}
            >
              <span style={{ width: `${progressPercent}%` }} />
            </div>
          </section>

          <section className="question-wrap">
            <div className="question-meta">
              <span>
                {currentItem.isExtra
                  ? "Samme ferdighet – prøv uten hint"
                  : themeById.get(currentQuestion.tema)?.kortnavn}
              </span>
              {!currentItem.isExtra && (
                <span>
                  {currentQuestion.poeng}{" "}
                  {currentQuestion.poeng === 1 ? "poeng" : "poeng"}
                </span>
              )}
            </div>

            {mode === "exam" && !currentItem.isExtra && (
              <div className="exam-banner">
                <IconExam />
                Hint gir 0 poeng på denne oppgaven.
              </div>
            )}

            <article className="question-card">
              <div className="question-text">
                <MathText>{currentQuestion.sporsmal}</MathText>
              </div>

              <form onSubmit={submitAnswer} className="answer-form">
                <label htmlFor="answer">Svaret ditt</label>
                <div
                  className={`answer-field ${feedback === "wrong" ? "answer-field-wrong" : ""} ${
                    feedback === "correct" ? "answer-field-correct" : ""
                  }`}
                >
                  <input
                    ref={answerRef}
                    id="answer"
                    value={answer}
                    onChange={(event) => {
                      setAnswer(event.target.value);
                      if (!resolved) setFeedback(null);
                    }}
                    inputMode={
                      currentQuestion.svarType === "tekst" ||
                      currentQuestion.svarType === "uttrykk"
                        ? "text"
                        : "decimal"
                    }
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Skriv svaret her"
                    disabled={resolved}
                    aria-describedby="answer-feedback"
                  />
                  {currentQuestion.enhet && (
                    <span className="answer-unit">{currentQuestion.enhet}</span>
                  )}
                </div>

                <div
                  id="answer-feedback"
                  className={`feedback ${feedback ? `feedback-${feedback}` : ""}`}
                  aria-live="polite"
                >
                  {feedback === "wrong" && (
                    <>
                      <strong>Ikke helt ennå.</strong> Prøv en gang til, eller bruk
                      et hint.
                    </>
                  )}
                  {feedback === "correct" && (
                    <>
                      <strong>Riktig!</strong>{" "}
                      {hintIndex > 0
                        ? "Nå får du en lignende oppgave, slik at du kan prøve uten hint."
                        : attempts > 0
                          ? "Du fant fram etter å ha prøvd på nytt."
                          : "Godt jobbet."}
                    </>
                  )}
                </div>

                {!resolved ? (
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={!answer.trim()}
                  >
                    Sjekk svar
                    <IconArrow />
                  </button>
                ) : (
                  <button
                    ref={continueRef}
                    className="primary-button"
                    type="button"
                    onClick={nextQuestion}
                  >
                    {currentIndex + 1 >= queue.length ? "Se resultat" : "Neste oppgave"}
                    <IconArrow />
                  </button>
                )}
              </form>

              <div className="hint-section">
                <div className="hint-heading">
                  <div>
                    <strong>Trenger du en forklaring?</strong>
                    <span>
                      Åpne ett trinn om gangen. Det siste trinnet viser fasiten.
                    </span>
                  </div>
                  {!resolved && hintIndex < currentQuestion.hints.length && (
                    <button className="hint-button" type="button" onClick={revealHint}>
                      <IconSpark />
                      Vis hint {hintIndex + 1} av {currentQuestion.hints.length}
                    </button>
                  )}
                </div>

                {hintIndex > 0 && (
                  <ol className="hint-list">
                    {currentQuestion.hints
                      .slice(0, hintIndex)
                      .map((hint, index) => (
                        <li key={`${currentQuestion.id}-hint-${index}`}>
                          <span>{index + 1}</span>
                          <p>
                            <MathText>{hint}</MathText>
                          </p>
                        </li>
                      ))}
                    {hintIndex === currentQuestion.hints.length && (
                      <li className="final-hint">
                        <span>✓</span>
                        <p>
                          <strong>Fasit:</strong>{" "}
                          <MathText>{currentQuestion.svar}</MathText>
                        </p>
                      </li>
                    )}
                  </ol>
                )}
              </div>
            </article>
          </section>
        </div>
      )}

      {screen === "result" && resultStats && (
        <div className="page result-page">
          <section className="result-card">
            <span className="result-symbol" aria-hidden="true">
              ✓
            </span>
            <p className="eyebrow">Økten er fullført</p>
            {mode === "exam" ? (
              <>
                <h1>Veiledende karakter {grade}</h1>
                <p className="result-lead">
                  Du fikk {resultStats.examPoints} av {maxPoints} poeng (
                  {resultPercent} %).
                </p>
                <div className="result-grid">
                  <div>
                    <strong>{resultStats.baseWithoutHint}</strong>
                    <span>oppgaver uten hint</span>
                  </div>
                  <div>
                    <strong>{resultStats.hints}</strong>
                    <span>hint brukt</span>
                  </div>
                  <div>
                    <strong>{resultStats.extraSolved}</strong>
                    <span>ekstraoppgaver</span>
                  </div>
                </div>
                <p className="grade-disclaimer">
                  Karakteren er bare et anslag. På ekte eksamen gjør sensor en
                  samlet vurdering av framgangsmåte, begrunnelser og matematisk
                  forståelse.
                </p>
              </>
            ) : (
              <>
                <h1>God økt!</h1>
                <p className="result-lead">
                  Du fullførte 10 oppgaver i{" "}
                  {activeTheme?.navn.toLowerCase() ?? "temaet"}.
                </p>
                <div className="result-grid">
                  <div>
                    <strong>{resultStats.baseWithoutHint}</strong>
                    <span>løst uten hint</span>
                  </div>
                  <div>
                    <strong>{resultStats.hints}</strong>
                    <span>hint brukt</span>
                  </div>
                  <div>
                    <strong>{resultStats.extraSolved}</strong>
                    <span>ekstraoppgaver</span>
                  </div>
                </div>
              </>
            )}

            <div className="result-actions">
              <button
                className="primary-button"
                onClick={() =>
                  mode === "exam"
                    ? startSession("exam")
                    : startSession("skill", selectedTheme ?? undefined)
                }
              >
                Øv en gang til
                <IconArrow />
              </button>
              <button className="secondary-button" onClick={() => goHome(true)}>
                Til start
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
