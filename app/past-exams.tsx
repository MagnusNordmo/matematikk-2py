"use client";

import { useEffect, useState } from "react";
import { EMPTY_ANSWER, evaluateAnswer, isAnswerComplete } from "./answer-engine";
import { NumberAnswerField } from "./number-answer-field";
import { MathText } from "./presentation";
import { emptyExamProgress, examCompletion, restoreExamProgress, type CheckProgress, type ExamProgress } from "./past-exam-state";
import type { ExamCheck, ExamPage, PastExam } from "./past-exam-types";

function storageKey(exam: PastExam) { return `matematikk2py-past-v1-${exam.id}-${exam.sourceSha256.slice(0,12)}`; }

export function OriginalExamPage({ page, title }: { page: ExamPage; title: string }) {
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);
  return <section className="original-exam-page" aria-label="Original oppgaveside">
    <div className="exam-page-tools"><span>{title} · side {page.printedPage}</span>
      <button className="quiet-button" onClick={() => setExpanded(!expanded)} aria-pressed={expanded}>{expanded ? "Tilpass bredden" : "Forstørr siden"}</button>
    </div>
    {failed && <p role="alert">Oppgavesiden kunne ikke lastes. Åpne kildedokumentet nedenfor eller last siden på nytt.</p>}
    <div className="exam-paper-scroll" tabIndex={0} aria-label="Oppgaveside. Ved forstørring kan du rulle vannrett.">
      {/* A lossless rendering of the complete PDF page; no OCR or reconstructed figures. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={expanded ? "exam-paper expanded" : "exam-paper"} src={page.image}
        width={page.width} height={page.height} onError={() => setFailed(true)}
        alt={`${title}, del ${page.part}, original side ${page.printedPage}. Oppgave ${page.tasks.join(", ")}. Oppgavetekst, formler, tabeller og figurer vises samlet.`} />
    </div>
  </section>;
}

export function ExamCheckCard({ check, progress, onChange }: { check: ExamCheck; progress?: CheckProgress; onChange: (p: CheckProgress) => void }) {
  const saved = progress ?? { answer: EMPTY_ANSWER };
  const result = saved.submitted ? evaluateAnswer(saved.submitted, check.key) : null;
  const values = "verdier" in check.key ? check.key.verdier : [];
  const choice = check.key.type === "valg" ? check.key : check.key.type === "valg_og_tall" ? check.key.valg : null;
  const changeAnswer = (answer: typeof EMPTY_ANSWER) => onChange({ ...saved, answer, submitted: undefined });
  return <article className="exam-check">
    <p className="eyebrow">Oppgave {check.task} · appens kontrollpunkt</p>
    <h3><MathText>{check.label}</MathText></h3>
    <form onSubmit={event => { event.preventDefault(); if (isAnswerComplete(saved.answer, check.key)) onChange({ ...saved, submitted: structuredClone(saved.answer) }); }}>
      <div className="exam-check-fields">
        {values.map((value, index) => <NumberAnswerField key={index} id={`${check.id}-${index}`}
          label={value.etikett ?? "Svar"} value={saved.answer.numbers[index] ?? ""} disabled={false}
          placeholder="Skriv tallet" unit={value.enhet} className="answer-field"
          onChange={value => { const numbers = [...saved.answer.numbers]; numbers[index] = value; changeAnswer({ ...saved.answer, numbers }); }} />)}
      </div>
      {choice && <fieldset className="exam-choice-fields"><legend>{choice.flervalg ? "Velg alle som passer" : "Velg ett svar"}</legend>
        {choice.alternativer.map(option => <label key={option}>
          <input type={choice.flervalg ? "checkbox" : "radio"} name={check.id} value={option} checked={saved.answer.choices.includes(option)}
            onChange={() => changeAnswer({ ...saved.answer, choices: choice.flervalg
              ? saved.answer.choices.includes(option) ? saved.answer.choices.filter(v => v !== option) : [...saved.answer.choices, option]
              : [option] })} /><MathText>{option}</MathText>
        </label>)}
      </fieldset>}
      <div className="exam-actions"><button type="submit" className="primary-button" disabled={!isAnswerComplete(saved.answer, check.key)}>Sjekk svar</button>
        <button type="button" className="quiet-button" onClick={() => onChange({ ...saved, hint: !saved.hint, usedHelp: true })}>{saved.hint ? "Skjul hint" : "Vis hint"}</button>
      </div>
    </form>
    {saved.hint && <p className="exam-hint"><MathText>{check.hint}</MathText></p>}
    {result && <div className={`exam-feedback ${result.correct ? "correct" : "incorrect"}`} role="status">
      <strong>{result.correct ? "Resultatet er riktig." : result.correctParts > 0 ? `${result.correctParts} av ${result.totalParts} svar stemmer. Prøv igjen.` : "Resultatet stemmer ikke ennå. Prøv igjen eller se forklaringen."}</strong>
      <p>Dette gjelder kontrollpunktet. Begrunnelse, framgangsmåte og tegning er ikke vurdert.</p>
      {(saved.usedHelp || saved.hint || saved.solution) && <small>Du har brukt hjelp på dette kontrollpunktet.</small>}
      <button className="quiet-button" onClick={() => onChange({ ...saved, solution: !saved.solution, usedHelp: true })}>{saved.solution ? "Skjul forklaring" : "Vis forklaring"}</button>
      {saved.solution && <p><MathText>{check.solution}</MathText></p>}
    </div>}
  </article>;
}

function ExamSession({ exam, onBack }: { exam: PastExam; onBack: () => void }) {
  const [progress, setProgress] = useState<ExamProgress>(emptyExamProgress);
  const [ready, setReady] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  useEffect(() => {
    let next = emptyExamProgress();
    try { next = restoreExamProgress(JSON.parse(localStorage.getItem(storageKey(exam)) ?? "null"), exam); } catch { /* Ignore unreadable old data. */ }
    // Load before enabling writes, including on a new selection.
    queueMicrotask(() => { setProgress(next); setReady(true); });
  }, [exam]);
  function save(next: ExamProgress) {
    setProgress(next);
    try { localStorage.setItem(storageKey(exam), JSON.stringify(next)); } catch { setStorageFailed(true); }
  }
  function navigate(index: number) {
    save({ ...progress, page: index });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  if (!ready) return <p role="status">Henter framdriften …</p>;
  const page = exam.pages[progress.page];
  const completion = examCompletion(exam, progress);
  return <div className="page past-exam-session">
    <button className="back-link" onClick={onBack}>← Til eksamenslisten</button>
    <section className="section-heading"><p className="eyebrow">Tidligere eksamensoppgaver</p><h1>{exam.title}</h1><p>{exam.note}</p></section>
    <div className="exam-session-meta"><span>Del 1: {exam.minutes[0] / 60} t uten hjelpemidler · Del 2: {exam.minutes[1] / 60} t med hjelpemidler</span><span>{completion.correct} av {completion.total} kontrollpunkter riktige</span></div>
    <p className="exam-instructions">Løs oppgavene på papir eller med aktuelle hjelpemidler. Her kan du kontrollere utvalgte resultater. Svarfeltene nedenfor er lagt til av appen.</p>
    {storageFailed && <p role="status">Nettleseren kunne ikke lagre framdriften. Svarene beholdes så lenge du har denne økten åpen.</p>}
    <nav className="exam-page-nav" aria-label="Oppgavesider">
      {([1,2] as const).map(part => <div key={part}><strong>Del {part}</strong><div className="exam-page-buttons">
        {exam.pages.map((p, index) => p.part === part && <button key={p.page} aria-current={index === progress.page ? "page" : undefined} onClick={() => navigate(index)}>
          Oppg. {p.tasks.join(", ")}
        </button>)}
      </div></div>)}
    </nav>
    <OriginalExamPage key={page.image} page={page} title={exam.title} />
    <p className="exam-source">Kilde: {exam.sourceLabel}. <a href={`${exam.pdf}#page=${page.page}`} target="_blank" rel="noreferrer">Åpne kildedokumentet (PDF)</a>{exam.sourceUrl && <> · <a href={exam.sourceUrl} target="_blank" rel="noreferrer">Om kilden</a></>}</p>
    <section aria-label="Kontroller resultatene" className="exam-checks">
      <h2>Kontroller resultatene</h2>
      {page.checks.map(check => <ExamCheckCard key={check.id} check={check} progress={progress.checks[check.id]} onChange={value => save({ ...progress, checks: { ...progress.checks, [check.id]: value } })} />)}
    </section>
    <div className="exam-actions exam-bottom-nav">
      <button className="secondary-button" disabled={progress.page === 0} onClick={() => navigate(progress.page - 1)}>← Forrige side</button>
      {progress.page < exam.pages.length - 1 ? <button className="primary-button" onClick={() => navigate(progress.page + 1)}>Neste side →</button> : <button className="primary-button" onClick={onBack}>Til eksamenslisten</button>}
    </div>
    <p className="exam-save-note">Svar og framdrift lagres på denne enheten. Du kan gå tilbake og fortsette senere.</p>
  </div>;
}

export function PastExams({ onBack }: { onBack: () => void }) {
  const [exams, setExams] = useState<PastExam[] | null>(null);
  const [selected, setSelected] = useState<PastExam | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/eksamener/manifest.json", { signal: controller.signal, cache: "no-store" })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: PastExam[]) => { if (!Array.isArray(data) || !data.length) throw new Error(); setExams(data); setError(false); })
      .catch(e => { if (e.name !== "AbortError") setError(true); });
    return () => controller.abort();
  }, [retry]);
  if (selected) return <ExamSession key={selected.id} exam={selected} onBack={() => { setSelected(null); window.scrollTo({ top: 0 }); }} />;
  return <div className="page past-exam-list">
    <button className="back-link" onClick={onBack}>← Tilbake</button>
    <section className="section-heading"><p className="eyebrow">Originale oppgavesett</p><h1>Velg tidligere eksamen</h1><p>Velg årgang. Begge eksamensdelene er med, og du kan fortsette der du slapp.</p></section>
    {error ? <p role="alert">Eksamenslisten kunne ikke lastes. <button className="quiet-button" onClick={() => { setError(false); setRetry(retry + 1); }}>Prøv igjen</button></p> : !exams ? <p role="status">Henter eksamenssett …</p> : <>
      <section className="exam-catalog-group" aria-label="Tidligere gitte eksamener">
        <div className="exam-catalog">{[...exams].sort((a, b) => a.id.localeCompare(b.id)).map(exam => <button key={exam.id} className="exam-catalog-card" onClick={() => { setSelected(exam); window.scrollTo({ top: 0 }); }}>
          <strong>{exam.title}</strong><span>{exam.note}</span><small>Del 1 og del 2 · {exam.pages.reduce((sum,p) => sum + p.tasks.length, 0)} oppgaver</small><span className="exam-open">Åpne settet →</span>
        </button>)}</div>
      </section>
      <p className="exam-save-note">Utvalget følger ny læreplan. Våren 2022 følger gammel læreplan og er derfor ikke med.</p>
    </>}
  </div>;
}
