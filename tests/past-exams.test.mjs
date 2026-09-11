import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const moduleCache = new Map();
async function localModule(name) {
  if (moduleCache.has(name)) return moduleCache.get(name);
  const file = new URL(`../app/${name}`, import.meta.url);
  const source = await readFile(file,'utf8');
  let { outputText } = ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
  for (const match of [...outputText.matchAll(/from (["'])([^"']+)\1/g)]) {
    let target;
    if (match[2].startsWith('.')) {
      let relative = match[2].slice(2);
      if (!/\.tsx?$/.test(relative)) {
        try { await readFile(new URL(`../app/${relative}.tsx`,import.meta.url)); relative += '.tsx'; }
        catch { relative += '.ts'; }
      }
      target = await localModule(relative);
    } else target = import.meta.resolve(match[2]);
    outputText = outputText.replace(match[0], `from ${JSON.stringify(target)}`);
  }
  const url = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
  moduleCache.set(name,url); return url;
}
const { evaluateAnswer, isAnswerComplete } = await import(await localModule('answer-engine.ts'));
const { restoreExamProgress, examCompletion } = await import(await localModule('past-exam-state.ts'));
const { OriginalExamPage, ExamCheckCard } = await import(await localModule('past-exams.tsx'));
const exams=JSON.parse(await readFile(new URL('../public/eksamener/manifest.json',import.meta.url),'utf8'));
const checkpoint=(exam,part,task,index=0)=>exams.find(e=>e.id===exam).pages.filter(p=>p.part===part).flatMap(p=>p.checks).filter(c=>c.task===task)[index];
const numAnswer=(...values)=>({numbers:values.map(v=>String(v)),choices:[]});
const hash=b=>createHash('sha256').update(b).digest('hex');

test('alle hovedoppgaver og originale sider er med, uten løsninger eller omtegning',async()=>{
  const counts={'2025-var':[8,7],'2024-host':[5,8],'2023-var':[4,7],'2026-var':[13,4]};
  const ids=new Set();
  for(const exam of exams){
    const pdf=await readFile(new URL(`../public${exam.pdf}`,import.meta.url));
    assert.equal(hash(pdf),exam.sourceSha256,exam.id);
    for(const part of [1,2]){
      const tasks=exam.pages.filter(p=>p.part===part).flatMap(p=>p.tasks);
      assert.deepEqual(tasks,Array.from({length:counts[exam.id][part-1]},(_,i)=>i+1),exam.id);
    }
    for(const page of exam.pages){
      const png=await readFile(new URL(`../public${page.image}`,import.meta.url));
      assert.equal(hash(png),page.sha256,page.image);
      assert.equal(png.subarray(1,4).toString(),'PNG');
      assert.equal(png.readUInt32BE(16),page.width);assert.equal(png.readUInt32BE(20),page.height);
      assert.ok(page.width>=1500 && page.height===2200);
      const html=renderToStaticMarkup(createElement(OriginalExamPage,{page,title:exam.title}));
      assert.ok(html.includes(`src="${page.image}"`));
      assert.match(html,/Forstørr siden/);assert.doesNotMatch(html,/<canvas|<svg/);
      for(const task of page.tasks)assert.ok(page.checks.some(c=>c.task===task));
      for(const c of page.checks){assert.ok(!ids.has(c.id));ids.add(c.id);assert.ok(c.hint&&c.solution);}
    }
  }
  assert.equal(ids.size,62);
  assert.deepEqual(exams.map(e=>e.id), ['2023-var','2024-host','2025-var','2026-var']);
  assert.ok(exams.every(e=>e.kind==='exam'));
  assert.equal(exams.at(-1).title,'Våren 2026');
  assert.ok(!exams.some(e=>e.id==='2022-var'));
});

test('skjult kaffeobservasjon krever minst tre kopper, ikke to',()=>{
 const c=checkpoint('2023-var',2,2);
 assert.equal(evaluateAnswer(numAnswer(2),c.key).correct,false);
 assert.equal(evaluateAnswer(numAnswer(3),c.key).correct,true);
 assert.match(c.solution,/ikke avgjøre/);
});
test('statistikk bygger på observasjonene i kildesidene',()=>{
 const median=a=>{a=[...a].sort((a,b)=>a-b);return (a[Math.floor((a.length-1)/2)]+a[Math.ceil((a.length-1)/2)])/2;};
 const mean=a=>a.reduce((a,b)=>a+b,0)/a.length;
 const ski=[6,3,2,4,4,6,2,7,8,8];
 assert.ok(evaluateAnswer(numAnswer(median(ski),mean(ski)),checkpoint('2025-var',1,2).key).correct);
 const train=[3,1,5,30,5,6,1,6,20,6];
 assert.ok(evaluateAnswer(numAnswer(median(train),mean(train),Math.max(...train)-Math.min(...train),6),checkpoint('2026-var',1,2).key).correct);
 const ages=[12,14,40,42,70,67,5,5,28,30];
 assert.equal(median(ages),median([...ages,29]));
 assert.ok(evaluateAnswer({numbers:[],choices:['Nei']},checkpoint('2025-var',2,3).key).correct);
});
test('optimal plassering av fire ulike sifre kontrolleres uttømmende',()=>{
 let maximum=-Infinity,best;
 for(let a=1;a<=9;a++)for(let b=1;b<=9;b++)for(let c=1;c<=9;c++)for(let d=1;d<=9;d++){
  if(new Set([a,b,c,d]).size!==4)continue;
  const value=a*10**b-c*10**d;if(value>maximum){maximum=value;best=[a,b,c,d];}
 }
 assert.equal(maximum,7999999980);
 assert.ok(evaluateAnswer(numAnswer(...best),checkpoint('2025-var',1,5).key).correct);
});
test('riktig diskret parkeringsintervall og prosentgrunnlag for samlet utslipp',()=>{
 const days=Array.from({length:366},(_,i)=>i).filter(x=>1995+30*x<50*x && 1995+30*x<3490+24*x);
 assert.ok(evaluateAnswer(numAnswer(days[0],days.at(-1)),checkpoint('2024-host',2,4).key).correct);
 assert.ok(!evaluateAnswer(numAnswer(100,250),checkpoint('2024-host',2,4).key).correct);
 const c=checkpoint('2025-var',2,1);
 assert.ok(evaluateAnswer(numAnswer('17,86','33,44'),c.key).correct);
 assert.ok(!evaluateAnswer(numAnswer('17,86','40,13'),c.key).correct);
});
test('kontroll av figurtall bygger på de synlige konstruksjonene',()=>{
 // 2025: 2n+1 columns, n+2 rows, white upright T with 3n-2 cells.
 const green=n=>(2*n+1)*(n+2)-(3*n-2);
 assert.deepEqual([1,2,3].map(green),[8,16,28]);
 assert.ok(evaluateAnswer(numAnswer(green(5)),checkpoint('2025-var',1,6).key).correct);
 // 2024: square border has 4n cells, plus two on each of four arms.
 assert.ok(evaluateAnswer(numAnswer(4*4+8,4*10+8),checkpoint('2024-host',1,4).key).correct);
});
test('appens kontrollfelt røper ikke løsningen før innsending og påfølgende åpning',()=>{
 const c=checkpoint('2023-var',2,2);
 const initial=renderToStaticMarkup(createElement(ExamCheckCard,{check:c,onChange(){}}));
 assert.match(initial,/Oppgave 2/);assert.doesNotMatch(initial,/appens|kontrollpunkt/);assert.ok(!initial.includes(c.solution));assert.ok(!initial.includes(c.hint));
 assert.match(initial,/type="text"/);assert.match(initial,/inputMode="decimal"/);
 const submitted={answer:numAnswer(3),submitted:numAnswer(3)};
 const checked=renderToStaticMarkup(createElement(ExamCheckCard,{check:c,progress:submitted,onChange(){}}));
 assert.match(checked,/Resultatet er riktig/);assert.match(checked,/ikke vurdert/);assert.ok(!checked.includes(c.solution));
 const opened=renderToStaticMarkup(createElement(ExamCheckCard,{check:c,progress:{...submitted,solution:true},onChange(){}}));
 assert.ok(opened.includes(c.solution.replaceAll("&", "&amp;").replaceAll(">", "&gt;").replaceAll("<", "&lt;")));
});
test('lagring gjenoppretter svar og side, tåler ødelagte data, og vurderer på nytt',()=>{
 const e=exams.find(e=>e.id==='2025-var'),c=e.pages[0].checks[0];
 const value={page:4,checks:{[c.id]:{answer:numAnswer(25),submitted:numAnswer(25),hint:true},alien:{answer:numAnswer(0)}}};
 const restored=restoreExamProgress(JSON.parse(JSON.stringify(value)),e);
 assert.equal(restored.page,4);assert.equal(Object.keys(restored.checks).length,1);
 assert.equal(examCompletion(e,restored).correct,1);
 for(const corrupted of [null,{},42,{page:-1,checks:null},{page:9999,checks:{[c.id]:{answer:{numbers:[{}],choices:[]}}}}]){
  const restored=restoreExamProgress(corrupted,e);assert.equal(restored.page,0);assert.equal(examCompletion(e,restored).correct,0);
 }
 assert.ok(!isAnswerComplete(numAnswer(''),c.key));
});

test('ferdig app har tre innganger og inneholder de verifiserte eksamensfilene',async()=>{
 const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url));
 const response=await worker.fetch(new Request('http://localhost/',{headers:{accept:'text/html'}}),{ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},{waitUntil(){},passThroughOnException(){}});
 assert.equal(response.status,200);
 const html=await response.text();
 for(const label of ['Øv spesifikke ferdigheter','Øv på en tilfeldig eksamen','Øv på tidligere gitt eksamen'])assert.ok(html.includes(label),label);
 const built=JSON.parse(await readFile(new URL('../dist/client/eksamener/manifest.json',import.meta.url),'utf8'));
 assert.deepEqual(built,exams);
 for(const exam of exams){
  assert.equal(hash(await readFile(new URL(`../dist/client${exam.pdf}`,import.meta.url))),exam.sourceSha256);
  for(const page of exam.pages)assert.equal(hash(await readFile(new URL(`../dist/client${page.image}`,import.meta.url))),page.sha256);
 }
});
