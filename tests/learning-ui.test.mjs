import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const cache=new Map();
async function moduleUrl(file){
 if(cache.has(file))return cache.get(file);
 const source=await readFile(new URL('../app/'+file,import.meta.url),'utf8');
 let {outputText}=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
 const matches=[...outputText.matchAll(/from (["'])([^"']+)\1/g)];
 for(const m of matches){const spec=m[2];const target=spec.startsWith('.')?await moduleUrl(spec.slice(2)+(spec.endsWith('.ts')?'':(['presentation','learning-support','worked-steps'].includes(spec.slice(2))?'.tsx':'.ts'))):import.meta.resolve(spec);outputText=outputText.replace(m[0],`from ${JSON.stringify(target)}`);}
 const url='data:text/javascript;base64,'+Buffer.from(outputText).toString('base64');cache.set(file,url);return url;
}
const {LearningSupport}=await import(await moduleUrl('learning-support.tsx'));
const {WorkedSteps}=await import(await moduleUrl('worked-steps.tsx'));
const {questionConcepts,answerFeedback}=await import(await moduleUrl('learning-content.ts'));
const bank=JSON.parse(await readFile(new URL('../public/oppgaver-2027.json',import.meta.url),'utf8'));
const q={id:'test',sporsmal:'Hvilken sammenheng beskriver y = 30x?',deltema:'modellvalg',svar:'Forholdet y/x er konstant og lik 30, så sammenhengen er proporsjonal.',fasit:{type:'valg',flervalg:false,riktige:['proporsjonal'],alternativer:['proporsjonal','eksponentiell vekst']}};
const render=(props={})=>renderToStaticMarkup(createElement(LearningSupport,{question:q,submitted:null,showConcepts:false,onConcepts(){},onSolution(){},...props}));
test('begreper og fasit er ikke gjengitt før en elevhandling',()=>{
 const html=render();assert.match(html,/Forklar ord og begreper/);assert.doesNotMatch(html,/To størrelser|Forholdet y\/x|Vis løsning/);
});
test('aktiv hjelp åpner definisjoner, men ikke løsningen',()=>{
 const html=render({showConcepts:true});assert.match(html,/To størrelser/);assert.doesNotMatch(html,/Forholdet y\/x er konstant og lik 30|Vis løsning/);
});
test('innsendt feil forklarer begge begrepene og gir løsning ved forespørsel',()=>{
 const html=render({submitted:{numbers:[],choices:['eksponentiell vekst']}});assert.match(html,/samme prosentvise/);assert.match(html,/Proporsjonal sammenheng/);assert.doesNotMatch(html,/<summary>Vis løsning<\/summary>/);assert.doesNotMatch(html,/<details[^>]* open/);
});
test('riktig svar gir begrepsforklaring uten en ekstra fasit',()=>{const html=render({submitted:{numbers:[],choices:['proporsjonal']}});assert.match(html,/Proporsjonal sammenheng/);assert.match(html,/konstant forhold/);assert.ok(!html.includes(q.svar));});
test('alle oppgaver har begrepsstøtte og riktig feedback for gyldige svar',()=>{
 for(const q of bank.oppgaver){assert.ok(questionConcepts(q,bank.oppgavegrupper.find(g=>g.id===q.oppgavegruppe?.id)).length,q.id);
 const key=q.fasit, choice=key.type==='valg'?key:key.valg;
 const input={numbers:(key.verdier??[]).map(v=>String(v.verdi)),choices:choice?.riktige??[]};
 assert.equal(answerFeedback(q,input),null,q.id);
 }
});
test('automatisk utvidelse er avgrenset til ferdig vurderte eksamensfeil',async()=>{
 const source=await readFile(new URL('../app/page.tsx',import.meta.url),'utf8');
 assert.match(source,/const expandExamSolution = mode === "exam" && resolved && evaluation !== null && !evaluation.correct/);
 assert.match(source,/<WorkedSteps autoExpand=\{expandExamSolution\}/);
 assert.match(source,/<WorkedSteps[^>]*>[\s\S]*<LearningSupport/);
});
test('Python-hjelpen kobler for-løkke til koden eleven ser',()=>{
 const program=bank.oppgaver.find(q=>q.id==='2py27-213');
 const concepts=questionConcepts(program);
 const loop=concepts.find(c=>/for-løkke/.test(c.term));
 assert.ok(loop);assert.match(loop.explanation,/for loop/);assert.match(loop.example,/for verdi in tall:/);
 assert.ok(!concepts.some(c=>/Intervall|while/.test(c.term)));
});
test('range og tilordning forklares, også i felles programkode',()=>{
 const range=questionConcepts(bank.oppgaver.find(q=>q.id==='2py27-218'));
 assert.ok(range.some(c=>c.term.includes('range') && /stopp|slutt/.test(c.explanation)));
 const q=bank.oppgaver.find(q=>q.id==='2py27-441');
 const concepts=questionConcepts(q,bank.oppgavegrupper.find(g=>g.id===q.oppgavegruppe.id));
 assert.ok(concepts.some(c=>/for-løkke/.test(c.term)));
 assert.ok(concepts.some(c=>/if/.test(c.term)));
});
test('løsningen forekommer ikke i et ekstra begrepspanel',()=>{
 for(const choices of [['proporsjonal'],['eksponentiell vekst']]) {
 const html=render({submitted:{numbers:[],choices},autoExpand:true});
 assert.doesNotMatch(html,/class="worked-solution"|Vis løsning|Se løsningsforslaget/);
 assert.ok(!html.includes(q.svar));
 }
});

test('samlet læringsflate har én løsning, også ved feil og riktig svar',()=>{
 const program=bank.oppgaver.find(q=>q.id==='2py27-213');
 for (const [numbers,wrong] of [[['30'],true],[['32'],false]]) {
  const submitted={numbers,choices:[]};
  const help=createElement(LearningSupport,{question:program,submitted,showConcepts:false,onConcepts(){}});
  const html=renderToStaticMarkup(createElement(WorkedSteps,{hints:program.hint,paths:[],selectedPath:null,revealed:0,resolved:true,submitted:true,autoExpand:wrong,solutionExpanded:!wrong,solution:program.svar,onReveal(){},onChoose(){}},help));
  assert.equal((html.match(/class="worked-solution"/g)??[]).length,1);
  assert.equal((html.match(/<summary>Løsning<\/summary>/g)??[]).length,1);
  assert.equal((html.match(/Programmet skriver ut/g)??[]).length,1);
  assert.match(html,/<details class="worked-solution" open="">/);
  assert.doesNotMatch(html,/prosentgrunnlag/);
 }
});
test('ekstra begreper er sammenfoldet og kode er gjengitt som kode',()=>{
 const program=bank.oppgaver.find(q=>q.id==='2py27-218');
 const html=render({question:program,showConcepts:true});
 assert.match(html,/<details class="more-concepts">/);
 assert.doesNotMatch(html,/<details class="more-concepts" open/);
 assert.match(html,/<code>range\(2\)<\/code>/);
});

test('mobilens leserekkefølge har steg og løsning før begrepene',()=>{
 const program=bank.oppgaver.find(q=>q.id==='2py27-213');
 const help=createElement(LearningSupport,{question:program,submitted:{numbers:['30'],choices:[]},showConcepts:true,onConcepts(){}});
 const html=renderToStaticMarkup(createElement(WorkedSteps,{hints:program.hint,paths:[],selectedPath:null,revealed:1,resolved:true,submitted:true,autoExpand:true,solution:program.svar,onReveal(){},onChoose(){}},help));
 assert.ok(html.indexOf('worked-step-body') < html.indexOf('concept-list'));
 assert.ok(html.indexOf('worked-solution') < html.indexOf('concept-list'));
});

test('tilbakemelding ved svaret og begrepene nederst har separate innhold',()=>{
 const props={question:q,submitted:{numbers:[],choices:['eksponentiell vekst']},showConcepts:false,onConcepts(){}};
 const feedback=renderToStaticMarkup(createElement(LearningSupport,{...props,section:'feedback'}));
 const concepts=renderToStaticMarkup(createElement(LearningSupport,{...props,section:'concepts'}));
 assert.match(feedback,/learning-feedback/);assert.doesNotMatch(feedback,/concept-list/);
 assert.match(concepts,/concept-list/);assert.doesNotMatch(concepts,/learning-feedback/);
});
