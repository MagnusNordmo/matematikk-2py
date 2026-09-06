import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateAnswer, isAnswerComplete } from '../app/answer-engine.ts';
import type { Question } from '../app/question-bank.ts';
const bank = JSON.parse(readFileSync(new URL('../public/oppgaver-2027.json', import.meta.url),'utf8')).oppgaver as Question[];
const q = (id: string) => bank.find(q => q.id === id)!;
test('alle oppgaver kan vurderes uten egenvurdering', () => {
 for (const q of bank) {
  assert.doesNotMatch(JSON.stringify(q.fasit), /krever_begrunnelse|vurderingskriterier|aapen/, q.id);
 }
});
test('egne datasett vurderes etter kravene, uavhengig av fasitlisten', () => {
 const key=q('2py27-281').fasit;
 for (const numbers of [['4','6','8','12','20'],['20','0','8','8','14']]) assert.equal(evaluateAnswer({numbers,choices:[]},key).correct,true);
 for (const numbers of [['4','6','8','12','21'],['0','0','10','20','20'],['-1','7','8','16','20']]) assert.equal(evaluateAnswer({numbers,choices:[]},key).correct,false);
});
test('moteksempler kontrollerer både før, etter og samme observasjon', () => {
 const key=q('2py27-253').fasit;
 assert.equal(evaluateAnswer({numbers:['40','60','30','80'],choices:[]},key).correct,true);
 assert.equal(evaluateAnswer({numbers:['40','60','45','65'],choices:[]},key).correct,false);
});
test('ugyldige tall åpner ikke tilbakemeldingen', () => {
 for (const value of ['abc60','60xyz','2+3','1/0','']) assert.equal(isAnswerComplete({numbers:[value],choices:[]},{type:'tall',verdier:[{verdi:60}]}),false,value);
});
