import type { Question, QuestionGroup } from './question-bank';
import type { AnswerInput } from './answer-engine';
import { questionConcepts, answerFeedback, type ConceptExplanation } from './learning-content';
import { MathText } from './presentation';

function LearningText({text}: {text: string}) {
 return <>{text.split(/(`[^`]+`)/g).map((part,i) => part.startsWith('`')
  ? <code key={i}>{part.slice(1,-1)}</code> : <MathText key={i}>{part}</MathText>)}</>;
}
function Concept({concept}: {concept: ConceptExplanation}) {
 return <div className="concept-explanation"><strong>{concept.term}</strong>
  <p><LearningText text={concept.explanation} /></p>
  {concept.example && <div className="concept-example"><span>I denne oppgaven</span><pre><code>{concept.example}</code></pre></div>}
 </div>;
}
export function LearningSupport({ question, group, submitted, showConcepts, onConcepts, section = "all" }: {
 question: Question; group?: QuestionGroup; submitted: AnswerInput | null;
 section?: "all" | "feedback" | "concepts";
 showConcepts: boolean; onConcepts: () => void;
}) {
 const visible = showConcepts;
 const concepts = questionConcepts(question, group, submitted);
 const feedback = submitted ? answerFeedback(question, submitted, group) : null;
 if (section === "feedback") return feedback ? <div className="learning-feedback" aria-live="polite"><p><LearningText text={feedback} /></p></div> : null;
 return <section className="learning-support" aria-label="Begreper og tilbakemelding">
  <button type="button" className="hint-button" aria-expanded={visible} onClick={onConcepts}>Begreper i oppgaven <span aria-hidden="true">{visible ? "−" : "+"}</span></button>
  {section !== "concepts" && feedback && <div className="learning-feedback" aria-live="polite"><p><LearningText text={feedback} /></p></div>}
  {visible && <div className="concept-list"><h3>Begreper i oppgaven</h3>
   {concepts.slice(0,2).map(concept => <Concept key={concept.term} concept={concept} />)}
   {concepts.length > 2 && <details className="more-concepts"><summary>Flere ord og begreper ({concepts.length-2})</summary>
    {concepts.slice(2).map(concept => <Concept key={concept.term} concept={concept} />)}
   </details>}
  </div>}
 </section>;
}
