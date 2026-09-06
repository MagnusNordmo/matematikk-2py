import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateAnswer, isAnswerComplete } from '../app/answer-engine.ts';
import type { Question } from '../app/question-bank.ts';
type StoredQuestion = Question & { kontroll: { inndata: { x?: number; T?: number } } };
const bank=JSON.parse(readFileSync(new URL('../public/oppgaver-2027.json',import.meta.url),'utf8')) as {oppgaver:StoredQuestion[]};
const q=(n:number)=>bank.oppgaver.find(q=>q.id===`2py27-${String(n).padStart(3,'0')}`)!;
test('nivå og deloppgaver følger revidert eksamensprofil',()=>{
 for(const n of [29,63,153,342]) assert.equal(q(n).niva,2);
 const intersection=q(342).fasit; const time=q(422).fasit;
 assert.ok('verdier' in intersection && 'verdier' in time);
 assert.notEqual(q(341).kontroll.inndata.x,intersection.verdier[0].verdi);
 assert.notEqual(time.verdier[0].verdi,q(423).kontroll.inndata.T);
});
test('konstruksjoner kan ikke godkjennes ved egenvurdering',()=>{
 const key=q(253).fasit;
 assert.equal(isAnswerComplete({numbers:[],choices:[],explanation:'Mitt utkast'},key),false);
 assert.equal(evaluateAnswer({numbers:[],choices:[],explanation:'Mitt utkast',assessment:[true,true]},key).correct,false);
 assert.equal(evaluateAnswer({numbers:['40','60','30','80'],choices:[]},key).correct,true);
});
test('nye eksamensberegninger er uavhengig kontrollert',()=>{
 for (const [id, result] of [[291, .5**(1/6)],[292,(5000*.93**6-5000)/6]]) {
  const key=q(id).fasit;
  assert.equal(evaluateAnswer({numbers:[String(result)],choices:[]},key).correct,true);
 }
 const constructed=[4,6,8,12,20];
 assert.equal(constructed.reduce((a,b)=>a+b)/5,10); assert.equal(constructed[2],8);
 for(let x=0;x<=20;x++) assert.equal(180+30*x<60*x && 180+30*x<420+10*x,x>=7 && x<=11);
});
