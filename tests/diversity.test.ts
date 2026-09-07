import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectSessionQuestions} from '../app/session-engine.ts';
import type {QuestionBank} from '../app/question-bank.ts';
const bank:QuestionBank=JSON.parse(readFileSync(new URL('../public/oppgaver-2027.json',import.meta.url),'utf8'));
test('de ensidige kategoriene tilbyr minst ti ulike familier',()=>{
 for(const [part,theme] of [[1,'statistikk_og_samfunn'],[1,'lineaere_funksjoner'],[2,'representasjoner'],[1,'variabler_og_monstre']] as const){
  const pool=bank.oppgaver.filter(q=>q.del===part&&q.tema===theme);
  assert.ok(new Set(pool.map(q=>q.variantfamilie)).size>=10,theme);
  const s=selectSessionQuestions(bank,part,'skill',theme);
  assert.equal(s.length,10);assert.equal(new Set(s.map(q=>q.variantfamilie)).size,10,theme);
 }
});
test('vanlige øvingsdata har ingen unødvendige forbehold',()=>{
 assert.doesNotMatch(JSON.stringify(bank),/konstruert(?:e)? (?:øvingsdata|data|målinger|reisetider|medlemstall|ventetider|bibliotekdata)|dataene er konstruerte/i);
});

import {rememberSelection} from '../app/session-engine.ts';
import {taskPattern,workKind} from '../app/task-profile.ts';
import {evaluateAnswer} from '../app/answer-engine.ts';
import {createHash} from 'node:crypto';
test('eksamen varierer matematisk arbeid gjennom gjentatte økter',()=>{
 const original=Math.random;
 let seed=20270907;
 Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
 try {
  for(const part of [1,2] as const){
   let history:string[]=[];
   for(let run=0;run<1000;run++){
    const selected=selectSessionQuestions(bank,part,'exam',undefined,new Set(history));
    assert.equal(selected.length,10);
    assert.equal(new Set(selected.map(q=>q.variantfamilie)).size,10);
    assert.ok(new Set(selected.map(workKind)).size>=3,`del ${part}, økt ${run}`);
    assert.ok(new Set(selected.map(taskPattern)).size>=(part===1?10:9),`mønstre, del ${part}, økt ${run}`);
    const previousFamilies=new Set(bank.oppgaver.filter(q=>history.includes(q.id)).map(q=>q.variantfamilie));
    assert.ok(selected.every(q=>!previousFamilies.has(q.variantfamilie)),`ny familie, del ${part}, økt ${run}`);
    history=rememberSelection(history,selected);
    assert.equal(history.length,Math.min(30,(run+1)*10));
   }
  }
 } finally {Math.random=original;}
});
test('samme arbeid gjenkjennes på tvers av temaetiketter',()=>{
 const byFamily=(f:string)=>bank.oppgaver.find(q=>q.variantfamilie===f)!;
 for(const [a,b] of [['d1-finne-prosent','variasjon-d1-andel-av-befolkning'],['d1-ligning','variasjon-d1-finne-figurnummer'],['d1-manglende-gjennomsnitt','utvidelse-d1-manglende-observasjon']]){
  assert.equal(taskPattern(byFamily(a)),taskPattern(byFamily(b)));
 }
});
test('nye temaøkter fylles ikke med varianter fra samme familie',()=>{
 for(const part of [1,2] as const) for(const theme of new Set(bank.oppgaver.filter(q=>q.del===part).map(q=>q.tema))){
  let history:string[]=[];
  for(let i=0;i<5;i++){
   const s=selectSessionQuestions(bank,part,'skill',theme,new Set(history));
   assert.equal(new Set(s.map(q=>q.variantfamilie)).size,s.length,`${part}/${theme}`);
   assert.ok(s.length>0 && s.length<=10);
   history=rememberSelection(history,s);
  }
 }
});
test('numeriske svar i de nye oppgavene kontrolleres med egne beregninger',()=>{
 const expected:Record<number,number[]>={916:[200/800*100],917:[35-8],920:[150/250*100],926:[(120-6)-120],927:[200+90*3],928:[(350-100)/50],929:[100/(40-20)],930:[90/3],934:[(23-15)/(4-2),15-4*2],935:[2*2**2+3,2*5**2+3],937:[105/360*240],938:[53-18],939:[(25-10)*4],942:[(130-90)/(2-1.5)],943:[7*7],945:[(47-2)/5],947:[5*7-4*6],948:[3*2**4]};
 for(const [id,values] of Object.entries(expected)){
  const q=bank.oppgaver.find(q=>q.id===`2py27-${id}`)!;
  assert.ok('verdier' in q.fasit);
  if(!('verdier' in q.fasit))throw Error(q.id);
  assert.deepEqual(q.fasit.verdier.map(v=>v.verdi),values,q.id);
  assert.ok(evaluateAnswer({numbers:values.map(String),choices:[]},q.fasit).correct,q.id);
  for(let i=0;i<values.length;i++){
   const wrong=[...values];wrong[i]+=1;
   assert.equal(evaluateAnswer({numbers:wrong.map(String),choices:[]},q.fasit).correct,false,q.id);
  }
 }
 assert.equal(bank.oppgaver.slice(915).filter(q=>'verdier' in q.fasit).length,Object.keys(expected).length);
});
test('alle nye valgalternativer har ett faglig gjennomgått svar',()=>{
 const correct:Record<number,string>={918:'Nord, fordi 30/100 er større enn 50/200.',919:'Tilfeldig trukne elever fra alle klassetrinn.',921:'Søylehøyden over 90 dobles, men besøkstallet øker bare med 10 %.',922:'Temperatur kan påvirke begge, så samvariasjonen beviser ikke årsak.',923:'Gjennomsnittet er 40 000 kroner, mens medianen er 30 000 kroner.',924:'Besøkstallet har økt med 25 %, men endringen i antall forskjellige personer er ukjent.',925:'En fast avgift på 150 kroner kommer i tillegg til timeprisen.',931:'P(x) = 30x + 50',932:'A er alltid 150 kroner billigere enn B.',933:'Heltall fra og med 0 til og med 40.',936:'Linjediagram med måneder langs den vannrette aksen.',940:'Eksponentialmodell med en fast vekstfaktor.',941:'(4, 6)',944:'3n + 1',946:'22 brikker',949:'4n − 4',950:'n = 2 gir 6, som er et partall.'};
 for(const [id,answer] of Object.entries(correct)){
  const q=bank.oppgaver.find(q=>q.id===`2py27-${id}`)!;
  assert.equal(q.fasit.type,'valg');if(q.fasit.type!=='valg')throw Error(q.id);
  assert.ok(q.fasit.alternativer.includes(answer));
  for(const option of q.fasit.alternativer)assert.equal(evaluateAnswer({numbers:[],choices:[option]},q.fasit).correct,option===answer,q.id);
 }
 assert.equal(bank.oppgaver.slice(915).filter(q=>q.fasit.type==='valg').length,Object.keys(correct).length);
});
test('varianter har forskjellige prosentendringer og konklusjoner',()=>{
 const cycling=bank.oppgaver.filter(q=>q.variantfamilie==='utvidelse-d1-andel-og-prosentpoeng');
 assert.ok(new Set(cycling.map(q=>q.fasit.type==='flere_tall'&&q.fasit.verdier[1].verdi)).size>=5);
 const library=bank.oppgaver.filter(q=>q.variantfamilie==='utvidelse-d2-data-konklusjon');
 assert.equal(new Set(library.map(q=>q.fasit.type==='valg'&&q.fasit.riktige[0])).size,3);
});
function canonical(value:unknown):unknown {return Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>[k,canonical(v)])):value;}
test('alle tidligere oppgaver er identiske utenfor dokumenterte rettelser',()=>{
 const hashes=JSON.parse(readFileSync(new URL('../docs/baseline-915-sha256.json',import.meta.url),'utf8'));
 const revision=JSON.parse(readFileSync(new URL('../docs/variation-revision.json',import.meta.url),'utf8'));
 for(const q of bank.oppgaver.slice(0,915)){
  const restored=structuredClone(q) as unknown as Record<string,unknown>;
  const change=revision.oppgaver.find((x:{id:string})=>x.id===q.id);
  for(const [field,values] of Object.entries(change?.felter??{}) as [string,{før:unknown;etter:unknown}][]){
   assert.deepEqual(restored[field],values.etter,`${q.id}/${field}`);restored[field]=values.før;
  }
  assert.equal(createHash('sha256').update(JSON.stringify(canonical(restored))).digest('hex'),hashes[q.id],q.id);
 }
 assert.deepEqual(bank.oppgaver.slice(915).map(q=>q.id),revision.nye_ider);
});
