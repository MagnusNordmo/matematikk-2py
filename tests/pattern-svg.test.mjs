import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const code=ts.transpileModule(readFileSync(new URL('../app/presentation.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/from (["'])([^"']+)\1/gu,(_,q,s)=>`from ${JSON.stringify(import.meta.resolve(s))}`);
const {VisualizationPanel,patternGeometry}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const render=v=>renderToStaticMarkup(createElement(VisualizationPanel,{visualization:v}));
test('eksamensrammen tegnes som SVG med hvitt sentrum og uten antall i etiketten',()=>{
 const html=render({type:'figurmønster',monster:'ramme',figurer:[{n:1,antall:8}],tekstalternativ:'Grønn ytterkant rundt et hvitt sentrum.'});
 assert.match(html,/<svg /);assert.equal((html.match(/data-counted="true"/g)||[]).length,8);
 assert.match(html,/fill="#ffffff"/);assert.doesNotMatch(html,/Figur 1: 8/);
});
test('alle fem eksamensmønstrene har riktig geometri også utenfor eksemplene',()=>{
 for(let n=1;n<=10;n++) for(const [monster,count] of [['ramme',4*n+4],['prikk_h',4*n+1],['prikk_x',4*n+8],['ruter_t',2*n*n+2*n+4],['prikk_hale',4*n+3]]){
  const g=patternGeometry(monster,n,count,{});
  assert.equal(g.shapes.filter(s=>s.counted).length,count,`${monster}, n=${n}`);
  assert.equal(new Set(g.shapes.map(s=>JSON.stringify([s.kind,s.x,s.y,s.x2,s.y2]))).size,g.shapes.length,'Ingen overlappende elementer');
 }
});

const bank=JSON.parse(readFileSync(new URL('../public/oppgaver-2027.json',import.meta.url),'utf8'));
test('hele banken tegnes med avtalte antall, også fyrstikker og prikker',()=>{
 for(const owner of [...bank.oppgaver,...bank.oppgavegrupper]) {
  const v=owner.visualisering;if(v?.type!=='figurmønster') continue;
  const counts=v.figurer?.map(f=>f.antall) ?? v.verdier;
  const html=render(v);
  assert.equal((html.match(/<svg /g)||[]).length,counts.length,owner.id);
  assert.equal((html.match(/data-counted="true"/g)||[]).length,counts.reduce((a,b)=>a+b,0),owner.id);
  assert.doesNotMatch(html,/<small>Figur \d+:/);
  if(owner.id==='2py27-943') assert.equal((html.match(/<circle /g)||[]).length,14);
  if(owner.id==='2py27-511') assert.equal((html.match(/<line /g)||[]).length,36);
 }
});
test('figurene bruker samme målestokk og den selvstendige kontrollsiden viser samme SVG',()=>{
 const html=readFileSync(new URL('../public/oppgaver-og-hint.html',import.meta.url),'utf8');
 const embedded=JSON.parse(html.match(/<script id="question-data" type="application\/json">([\s\S]*?)<\/script>/)[1].replaceAll('<\\/script','</script'));
 for(const id of ['088','089','090','091','092']) {
  const q=bank.oppgaver.find(q=>q.id===`2py27-${id}`);
  const drawing=render(q.visualisering);
  const boxes=[...drawing.matchAll(/viewBox="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(boxes).size,1);
  assert.ok(embedded.oppgaver.find(p=>p.id===q.id).renderedContext.includes(drawing));
 }
 assert.ok(html.includes('grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr))'));
});
test('koordinatfigurer støttes, mens ukjente mønstre og feil antall ikke tegnes som noe annet',()=>{
 const v={type:'figurmønster',monster:'koordinater',element:'sirkel',figurer:[{n:1,antall:3,punkter:[{x:-1,y:0},{x:0,y:1},{x:1,y:0}]}]};
 assert.equal((render(v).match(/<circle /g)||[]).length,3);
 for(const [pattern,n,count] of [['ramme',1,9],['ukjent',1,3],['ramme',1e8,8],['ramme',NaN,8],['ramme',1,-8]])
  assert.throws(()=>patternGeometry(pattern,n,count,{}));
 assert.throws(()=>patternGeometry('koordinater',1,2,{punkter:[{x:0,y:0},{x:0,y:0}]}));
 assert.match(render({type:'figurmønster',monster:'ukjent',verdier:[1]}),/Figuren kunne ikke vises/);
});
test('felles figuropplysninger røper ikke antall i en ekstra tabell',async()=>{
 const {DataPanel}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const v={type:'figurmønster'};
 assert.equal(renderToStaticMarkup(createElement(DataPanel,{data:{figurnummer:[1,2,3],antall:[8,12,16]},visualization:v})), '');
 assert.match(renderToStaticMarkup(createElement(DataPanel,{data:{figurnummer:[1,2,3],antall:[8,12,16]}})),/<table/);
});

test('nye figuroppgaver har matematisk kontrollerte fasiter og automatisk retting',async()=>{
 const {evaluateAnswer,isAnswerComplete}=await import('../app/answer-engine.ts');
 const expected=[['088',10,n=>4*n+4,'4n+4'],['089',5,n=>4*n+1,'4n+1'],['090',10,n=>4*n+8,'4n+8'],['091',5,n=>2*n*n+2*n+4,'2n^2+2n+4'],['092',10,n=>4*n+3,'4n+3']];
 for(const [id,target,calculate,formula] of expected){
  const q=bank.oppgaver.find(q=>q.id===`2py27-${id}`);
  assert.equal(q.fasit.valg.riktige[0],`\\(${formula}\\)`);
  assert.equal(q.fasit.verdier[0].verdi,calculate(target));
  for(const f of q.visualisering.figurer) assert.equal(f.antall,calculate(f.n));
  const correct={numbers:[String(calculate(target))],choices:q.fasit.valg.riktige};
  assert.equal(evaluateAnswer(correct,q.fasit).correct,true);
  assert.equal(evaluateAnswer({...correct,numbers:[String(calculate(target)+1)]},q.fasit).correct,false);
  for(const choice of q.fasit.valg.alternativer.filter(c=>!q.fasit.valg.riktige.includes(c)))
   assert.equal(evaluateAnswer({...correct,choices:[choice]},q.fasit).correct,false);
  assert.equal(isAnswerComplete({...correct,numbers:['']},q.fasit),false);
  assert.equal(isAnswerComplete({...correct,numbers:['abc']},q.fasit),false);
 }
});
test('bare dokumenterte figurfelt er endret i de 950 oppgavene og 60 gruppene',async()=>{
 const {createHash}=await import('node:crypto');
 const hashes=JSON.parse(readFileSync(new URL('../docs/baseline-patterns-sha256.json',import.meta.url),'utf8'));
 const revision=JSON.parse(readFileSync(new URL('../docs/pattern-revision.json',import.meta.url),'utf8'));
 function canonical(v){return Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;}
 for(const type of ['oppgaver','oppgavegrupper']) for(const owner of bank[type]){
  const restored=structuredClone(owner);
  for(const [field,values] of Object.entries(revision[type].find(c=>c.id===owner.id)?.felter??{})){
   assert.deepEqual(restored[field]??null,values.etter,`${owner.id}/${field}`);
   if(values.før===null) delete restored[field];else restored[field]=values.før;
  }
  assert.equal(createHash('sha256').update(JSON.stringify(canonical(restored))).digest('hex'),hashes[owner.id],owner.id);
 }
 assert.equal(revision.oppgaver.length,12);
 assert.equal(revision.oppgavegrupper.length,5);
});
test('eldre hintoppskrift bevarer de gjennomgåtte geometriske hintene',async()=>{
 const {reviseHintScaffolding}=await import('../scripts/hint-scaffolding.mjs');
 const copy=structuredClone(bank);
 reviseHintScaffolding(copy,{math:s=>`\\(${s}\\)`,number:String});
 for(const id of ['088','089','090','091','092']) assert.deepEqual(copy.oppgaver.find(q=>q.id===`2py27-${id}`).hint,bank.oppgaver.find(q=>q.id===`2py27-${id}`).hint);
});
