import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
import {evaluateAnswer,isAnswerComplete} from '../app/answer-engine.ts';
const b=JSON.parse(readFileSync(new URL('../public/oppgaver-2027.json',import.meta.url),'utf8'));
const added=b.oppgaver.slice(950);
const code=ts.transpileModule(readFileSync(new URL('../app/presentation.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/from (["'])([^"']+)\1/gu,(_,q,s)=>`from ${JSON.stringify(import.meta.resolve(s))}`);
const {VisualizationPanel,patternGeometry}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const render=v=>renderToStaticMarkup(createElement(VisualizationPanel,{visualization:v}));
const counts={kors:n=>4*n+1,vinkel:n=>2*n+1,u_form:n=>3*n+1,dobbeltrapp:n=>n*(n+1),rektangelramme:n=>4*n+6,rektangel:n=>n*(n+2),trekant:n=>n*(n+1)/2,kvadrat_med_tillegg:n=>n*n+2,fyrstikkrad:n=>3*n+1,ramme:n=>4*n+4};
test('20 nye figuroppgaver har små, korrekte figurer og uavhengig kontrollerte fasiter',()=>{
 assert.equal(added.length,20);
 assert.deepEqual(added.map(q=>q.id),Array.from({length:20},(_,i)=>`2py27-${951+i}`));
 const expected=[25,9,17,12,22,3,30,14,38,11,48,'n(n + 2)',28,10,27,'n² + 2',28,10,32,'Tell to hele sider med n + 2 ruter og to sider uten hjørnene med n ruter.'];
 for(const [i,q] of added.entries()){
  const v=q.visualisering;
  for(let n=1;n<=10;n++){
   const g=patternGeometry(v.monster,n,counts[v.monster](n),v);
   assert.equal(g.shapes.filter(s=>s.counted).length,counts[v.monster](n),q.id);
   assert.equal(new Set(g.shapes.map(s=>JSON.stringify([s.kind,s.x,s.y,s.x2,s.y2]))).size,g.shapes.length);
  }
  assert.deepEqual(v.figurer.map(f=>f.antall),[1,2,3].map(counts[v.monster]));
  const html=render(v);
  assert.equal((html.match(/<svg /g)||[]).length,3);
  assert.ok(html.length<20000,`${q.id}: bound individual SVG cost`);
  const x=expected[i];const input={numbers:typeof x==='number'?[String(x)]:[],choices:typeof x==='string'?[x]:[]};
  assert.equal(isAnswerComplete(input,q.fasit),true,q.id);
  assert.equal(evaluateAnswer(input,q.fasit).correct,true,q.id);
  assert.equal(isAnswerComplete({numbers:[],choices:[]},q.fasit),false,q.id);
  if(typeof x==='number'){
   assert.equal(q.fasit.verdier[0].verdi,x);
   assert.equal(evaluateAnswer({numbers:[String(x+1)],choices:[]},q.fasit).correct,false,q.id);
  }else for(const option of q.fasit.alternativer)assert.equal(evaluateAnswer({numbers:[],choices:[option]},q.fasit).correct,option===x,q.id);
 }
 const compressed=gzipSync(JSON.stringify(added)).length;
 assert.ok(compressed<8000,'Small incremental task payload, with no image files');
});
test('alle 950 tidligere oppgaver og 60 grupper er identiske',()=>{
 const hashes=JSON.parse(readFileSync(new URL('../docs/baseline-svg20-sha256.json',import.meta.url),'utf8'));
 const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
 assert.equal(Object.keys(hashes).length,1010);
 for(const q of [...b.oppgaver.slice(0,950),...b.oppgavegrupper])assert.equal(createHash('sha256').update(JSON.stringify(canonical(q))).digest('hex'),hashes[q.id],q.id);
});
test('kontrollappen inneholder nøyaktig samme figurer og rettede fyrstikker',()=>{
 const html=readFileSync(new URL('../public/oppgaver-og-hint.html',import.meta.url),'utf8');
 const data=JSON.parse(html.match(/<script id="question-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
 for(const q of added)assert.ok(data.oppgaver.find(x=>x.id===q.id).renderedContext.includes(render(q.visualisering)),q.id);
 for(const owner of [...b.oppgaver,...b.oppgavegrupper].filter(q=>q.visualisering?.monster?.startsWith('fyrstikk'))){
  const markup=render(owner.visualisering);
  assert.ok(markup.includes('data-match-head="true"'),owner.id);
 }
 assert.ok(data.oppgaver.find(q=>q.id==='2py27-944').renderedContext.includes('data-match-head="true"'));
});
