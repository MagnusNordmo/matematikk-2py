import type { Question, QuestionGroup } from './question-bank';
import type { AnswerInput } from './answer-engine';
import { questionConcepts, answerFeedback } from './learning-content';
import { MathText } from './presentation';

export function LearningSupport({ question, group, submitted, showConcepts, onConcepts, onSolution }: {
 question: Question; group?: QuestionGroup; submitted: AnswerInput | null;
 showConcepts: boolean; onConcepts: () => void; onSolution: () => void;
}) {
 const visible = showConcepts || submitted !== null;
 return <section className="learning-support" aria-label="Begreper og tilbakemelding">
  {!visible && <button type="button" className="hint-button" onClick={onConcepts}>Forklar ord og begreper</button>}
  {submitted && <div className="learning-feedback" aria-live="polite"><h3>Dette kan du lære</h3><p><MathText>{answerFeedback(question, submitted)}</MathText></p></div>}
  {visible && <div className="concept-list"><h3>Ord og begreper i oppgaven</h3>{questionConcepts(question, group).map(({term,explanation}) => <div key={term}><strong>{term}</strong><p>{explanation}</p></div>)}</div>}
  {submitted && <details className="worked-solution" onToggle={e => { if(e.currentTarget.open) onSolution(); }}><summary>Vis løsning</summary><p><MathText>{question.svar}</MathText></p></details>}
 </section>;
}
