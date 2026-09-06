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
 for(const m of matches){const spec=m[2];const target=spec.startsWith('.')?await moduleUrl(spec.slice(2)+(spec.endsWith('.ts')?'':(['presentation','learning-support'].includes(spec.slice(2))?'.tsx':'.ts'))):import.meta.resolve(spec);outputText=outputText.replace(m[0],`from ${JSON.stringify(target)}`);}
 const url='data:text/javascript;base64,'+Buffer.from(outputText).toString('base64');cache.set(file,url);return url;
}
const {LearningSupport}=await import(await moduleUrl('learning-support.tsx'));
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
 const html=render({submitted:{numbers:[],choices:['eksponentiell vekst']}});assert.match(html,/samme prosentvise/);assert.match(html,/Proporsjonal sammenheng/);assert.match(html,/<summary>Vis løsning<\/summary>/);assert.doesNotMatch(html,/<details[^>]* open/);
});
test('riktig svar gir faglig forklaring',()=>{assert.match(render({submitted:{numbers:[],choices:['proporsjonal']}}),/Forholdet y\/x/);});
test('alle oppgaver har begrepsstøtte og riktig feedback for gyldige svar',()=>{
 for(const q of bank.oppgaver){assert.ok(questionConcepts(q,bank.oppgavegrupper.find(g=>g.id===q.oppgavegruppe?.id)).length,q.id);
 const key=q.fasit, choice=key.type==='valg'?key:key.valg;
 const input={numbers:(key.verdier??[]).map(v=>String(v.verdi)),choices:choice?.riktige??[]};
 assert.equal(answerFeedback(q,input),q.svar,q.id);
 }
});
