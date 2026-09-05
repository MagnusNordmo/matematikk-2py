import { useState } from "react";
import { MathText } from "./presentation";
import type { SolutionPath } from "./question-bank";

export function WorkedSteps({ hints, paths, selectedPath, revealed, resolved, solution, onReveal, onChoose }: {
  hints: string[]; paths: SolutionPath[]; selectedPath: string | null;
  revealed: number; resolved: boolean; solution: string;
  onReveal: () => void; onChoose: (id: string) => void;
}) {
  const [viewed, setViewed] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const needsPath = paths.length > 0 && !selectedPath;
  const available = resolved ? hints.length : revealed;
  const active = Math.min(viewed ?? Math.max(0, available - 1), Math.max(0, available - 1));
  return <aside className="worked-steps" aria-label="Løsning steg for steg">
    <header><h2>Løsning steg for steg</h2><p>Prøv selv først. Åpne så mye hjelp du trenger.</p></header>
    {paths.length > 0 && <div className="solution-paths" role="group" aria-label="Velg løsningsmetode">
      {paths.map(path => <button key={path.id} type="button" aria-pressed={selectedPath === path.id} className={`solution-path ${selectedPath === path.id ? "solution-path-selected" : ""}`} onClick={() => { onChoose(path.id); setViewed(null); setShowAll(false); }}><strong>{path.navn}</strong><span>{path.forklaring}</span></button>)}
    </div>}
    {!needsPath && <>
      {available > 0 && <>
        <nav className="step-tabs" aria-label="Åpnede løsningssteg">{hints.slice(0, available).map((_, i) => <button type="button" key={i} aria-current={!showAll && active === i ? "step" : undefined} onClick={() => { setViewed(i); setShowAll(false); }}>Steg {i + 1}</button>)}</nav>
        <div className="worked-step-body" aria-live="polite">{(showAll ? hints.slice(0, available) : [hints[active]]).map((hint, i) => <section key={showAll ? i : active}><h3>Steg {(showAll ? i : active) + 1}</h3><p><MathText>{hint}</MathText></p></section>)}</div>
      </>}
      <div className="step-actions">
        {!resolved && revealed < hints.length && <button className="hint-button" type="button" onClick={() => { setViewed(null); setShowAll(false); onReveal(); }}>{revealed ? "Åpne neste steg" : "Åpne første steg"} <span>{revealed + 1}/{hints.length}</span></button>}
        {available > 1 && <button type="button" className="step-overview" onClick={() => setShowAll(!showAll)}>{showAll ? "Vis ett steg" : "Se åpnede steg samlet"}</button>}
      </div>
      {(resolved || revealed === hints.length) && <details className="worked-solution"><summary>Se løsningsforslaget</summary><p><MathText>{solution}</MathText></p></details>}
    </>}
  </aside>;
}
