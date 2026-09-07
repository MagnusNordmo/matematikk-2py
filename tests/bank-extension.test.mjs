import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { evaluateAnswer, isAnswerComplete } from '../app/answer-engine.ts';
import ts from 'typescript';
const learningSource = readFileSync(new URL('../app/learning-content.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(learningSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace("'./answer-engine'", JSON.stringify(new URL('../app/answer-engine.ts', import.meta.url).href));
const { questionConcepts, answerFeedback } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const b = JSON.parse(readFileSync(new URL('../public/oppgaver-2027.json', import.meta.url), 'utf8'));
const fresh = b.oppgaver.slice(515, 915);
const sum = (v) => v.reduce((a, c) => a + c, 0);
const mean = (v) => sum(v) / v.length;
function canonical(value) { return Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value; }
test('utvidelsen legger til 400 oppgaver og beholder de opprinnelige uendret', () => {
    const hashes = JSON.parse(readFileSync(new URL('../docs/baseline-515-sha256.json', import.meta.url), 'utf8'));
    for (const q of b.oppgaver.slice(0, 515)) {
        const original = structuredClone(q);
        const revision = JSON.parse(readFileSync(new URL('../docs/variation-revision.json', import.meta.url), 'utf8'));
        for (const [field, values] of Object.entries(revision.oppgaver.find(change => change.id === q.id)?.felter ?? {})) {
            assert.deepEqual(q[field], values.etter, `${q.id}/${field}: autorisert rettelse`);
            original[field] = values.før;
        }
        const expected = JSON.stringify(canonical(original));
        assert.equal(createHash('sha256').update(expected).digest('hex'), hashes[q.id], q.id);
    }
    assert.equal(fresh.length, 400);
    assert.equal(new Set(fresh.map((q) => q.variantfamilie)).size, 40);
    assert.equal(new Set(fresh.map((q) => JSON.stringify([q.sporsmal, q.visualisering, q.oppgavegruppe]))).size, 400);
});
test('alle nye fasiter beregnes uavhengig og gir riktig vurdering', () => {
    for (const q of fresh) {
        const d = q.kontroll.inndata;
        let expected;
        switch (q.kontroll.metode) {
            case 'fravaerende-andel':
                expected = [d.missing / (1 - d.attendance / 100)];
                break;
            case 'ulikt-sammenlikningsgrunnlag':
                expected = [100 * d.markup / (100 + d.markup)];
                break;
            case 'to-motsatte-endringer':
                expected = [1 - (d.p / 100) ** 2];
                break;
            case 'andel-og-prosentpoeng':
                expected = [d.b - d.a, (d.b / d.a - 1) * 100];
                break;
            case 'standardform-enheter':
                expected = [d.mg * d.millions];
                break;
            case 'rot-og-potens':
                expected = [Math.sqrt(d.a * d.a) + d.b * d.b];
                break;
            case 'eksponent-i-kvotient':
                expected = [Math.log10(10 ** d.a * 10 ** d.b / 10 ** d.denominator)];
                break;
            case 'proporsjonal-oppskrift':
                expected = [d.sugar * d.newkg / d.kg];
                break;
            case 'omvendt-med-fastledd':
                expected = [d.rent, d.food];
                break;
            case 'lineaer-fra-to-priser':
                expected = [((d.a * 6 + d.b) - (d.a * 2 + d.b)) / 4, d.b];
                break;
            case 'budsjett-heltall':
                expected = [Math.floor((d.budget - d.fixed) / d.rate)];
                break;
            case 'rektangulaert-rutemonster':
                expected = [1, d.k, d.extra];
                break;
            case 'tilvekst-og-startnummer': {
                let v = d.start;
                for (let t = 1; t < d.term; t++)
                    v += d.step;
                expected = [v];
                break;
            }
            case 'manglende-observasjon':
                expected = [5 * d.mean - sum(d.known)];
                break;
            case 'ekstremverdi-sentralmaal': {
                const v = [...d.before.slice(0, -1), d.newlast].sort((a, c) => a - c);
                expected = [mean(v), v[2]];
                break;
            }
            case 'kumulativ-antall':
                expected = [sum(d.freq.slice(0, 3))];
                break;
            case 'klassemidtpunkt-anslag':
                expected = [sum(d.freq.map((v, j) => v * (d.bounds[j] + d.bounds[j + 1]) / 2)) / sum(d.freq)];
                break;
            case 'kode-betinget-sum':
                expected = [sum(d.values.filter((v) => v > d.threshold))];
                break;
            case 'kode-tolkning-tillegg':
                assert.match(q.fasit.riktige[0], /^Antallet etter/);
                break;
            case 'samme-gjennomsnitt-spredning':
                assert.equal(q.fasit.riktige[0], d.options.find((v) => Math.max(...v) === Math.min(...v)).join(', '));
                break;
            case 'energi-startverdi':
                expected = [d.a + d.c];
                break;
            case 'energi-modellverdi':
                expected = [d.a * Math.exp(d.years * Math.log(d.b)) + d.c];
                break;
            case 'energi-gjennomsnittlig-vekstfart':
                expected = [d.a * (Math.exp(d.years * Math.log(d.b)) - 1) / d.years];
                break;
            case 'energi-modellbegrensning':
                assert.ok(d.c > d.floor && d.a > 0 && d.b > 0);
                assert.match(q.fasit.riktige[0], /^Nei,/);
                break;
            case 'foerste-hele-periode': {
                let t = 0, v = d.start;
                while (v <= d.limit) {
                    t++;
                    v *= d.factor;
                }
                expected = [t];
                break;
            }
            case 'finne-aarlig-vekst':
                expected = [Math.expm1(Math.log(d.end / d.start) / d.years) * 100];
                break;
            case 'tre-avtaler-intervall': {
                const valid = Array.from({ length: 100 }, (_, x) => x).filter(x => d.fixed + d.rate / 2 * x < d.rate * x && d.fixed + d.rate / 2 * x < d.flat);
                expected = [valid[0], valid.at(-1)];
                break;
            }
            case 'lineaer-regresjon-data':
            case 'eksponentialregresjon-data': {
                const logarithmic = q.kontroll.metode === 'eksponentialregresjon-data';
                const x = d.x, y = logarithmic ? d.y.map(Math.log) : d.y;
                const slope = (sum(x.map((v, j) => v * y[j])) - sum(x) * mean(y)) / (sum(x.map((v) => v * v)) - sum(x) * mean(x));
                const intercept = mean(y) - slope * mean(x);
                expected = logarithmic ? [Math.exp(intercept), Math.exp(slope)] : [slope, intercept];
                break;
            }
            case 'potensmodell-relativ-endring':
                expected = [100 * (Math.exp(d.exponent * Math.log(d.multiplier)) - 1)];
                break;
            case 'vektet-gjennomsnitt-grupper':
                expected = [mean([...Array(d.na).fill(d.ma), ...Array(d.nb).fill(d.mb)])];
                break;
            case 'populasjonsstandardavvik':
                expected = [Math.sqrt(mean(d.values.map((x) => x * x)) - mean(d.values) ** 2)];
                break;
            case 'histogram-hoeyder':
                expected = d.freq.map((v, j) => v / (d.bounds[j + 1] - d.bounds[j]));
                break;
            case 'median-interpolasjon': {
                const pos = sum(d.freq) / 2;
                let before = 0;
                for (let j = 0; j < d.freq.length; j++) {
                    if (before + d.freq[j] >= pos) {
                        expected = [d.bounds[j] + (pos - before) / d.freq[j] * (d.bounds[j + 1] - d.bounds[j])];
                        break;
                    }
                    before += d.freq[j];
                }
                break;
            }
            case 'konstruere-datasett': break;
            case 'forbruk-per-person':
                expected = [100 * (1 - d.factor * d.people0 / d.people1)];
                break;
            case 'indeks-nytt-grunnlag':
                expected = [100 * (d.new - d.old) / d.old];
                break;
            case 'data-konklusjon':
                { const difference = d.visits[1] * d.loans[0] - d.loans[1] * d.visits[0];
                  const expected = difference > 0 ? 'Den prosentvise endringen i besøk var større enn i utlån.' : difference < 0 ? 'Den prosentvise endringen i besøk var mindre enn i utlån.' : 'Besøk og utlån hadde samme prosentvise endring.';
                  assert.deepEqual(q.fasit.riktige, [expected]);
                }
                break;
            case 'sparing-innskudd-foer-rente':
                expected = [sum(Array.from({ length: d.years }, (_, j) => d.deposit * (1 + d.rate) ** (j + 1)))];
                break;
            case 'kode-terskel-tolkning': {
                let v = d.start, t = 0;
                while (v > d.limit) {
                    t++;
                    v *= d.factor;
                }
                expected = [t];
                break;
            }
            default: assert.fail('Utestet metode: ' + q.kontroll.metode);
        }
        if (expected)
            expected.forEach((v, j) => assert.ok(Math.abs(v - q.fasit.verdier[j].verdi) < 1e-7, `${q.id} felt ${j}: ${v}`));
        const input = { numbers: (q.fasit.verdier ?? []).map((v) => String(v.verdi).replace('.', ',')), choices: q.fasit.riktige ?? [] };
        assert.equal(isAnswerComplete(input, q.fasit), true, q.id);
        assert.equal(evaluateAnswer(input, q.fasit).correct, true, q.id);
        assert.equal(isAnswerComplete({ numbers: [], choices: [] }, q.fasit), false, q.id);
        assert.ok(questionConcepts(q, b.oppgavegrupper.find((g) => g.id === q.oppgavegruppe?.id)).length > 0, q.id);
        if (expected)
            for (let j = 0; j < expected.length; j++) {
                const bad = { ...input, numbers: [...input.numbers] };
                bad.numbers[j] = String(expected[j] + Math.max(1, (q.fasit.verdier[j].toleranse ?? 0) * 10));
                assert.equal(evaluateAnswer(bad, q.fasit).correct, false, q.id);
            }
    }
});
test('nye konstruksjoner godtar andre gyldige lister og avviser feil vilkår', () => {
    for (const q of fresh.filter((q) => q.fasit.konstruksjon)) {
        const m = q.fasit.vilkaar.median;
        const input = { numbers: [m - 2, m - 2, m - 1, m + 1, m + 2, m + 8].reverse().map(String), choices: [] };
        assert.equal(evaluateAnswer(input, q.fasit).correct, true, q.id);
        const wrong = { numbers: [m - 2, m - 2, m - 1, m + 1, m + 2, m + 9].map(String), choices: [] };
        assert.equal(evaluateAnswer(wrong, q.fasit).correct, false, q.id);
        assert.match(answerFeedback(q, wrong) ?? '', /median.*riktig/);
        assert.equal(evaluateAnswer({ numbers: ['-1', '0', String(m), String(m), '2', String(4 * m + 5)], choices: [] }, q.fasit).correct, false, q.id);
    }
});
test('nye tabeller og kode vises også i kontrollappen', () => {
    const html = readFileSync(new URL('../public/oppgaver-og-hint.html', import.meta.url), 'utf8');
    const embedded = JSON.parse(html.match(/<script id="question-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
    for (const q of fresh.filter((q) => q.visualisering)) {
        const copy = embedded.oppgaver.find((v) => v.id === q.id);
        assert.ok(copy.renderedContext?.length > 0, q.id);
        if (q.visualisering.type === 'tabell')
            assert.match(copy.renderedContext, /<table/);
        if (q.visualisering.type === 'programkode')
            assert.match(copy.renderedContext, /<pre/);
    }
});
test('avrundede svar godtas, mens nærmeste gale avrunding avvises', () => {
    for (const q of fresh.filter((q) => !q.fasit.konstruksjon)) {
        const answers = q.fasit.verdier ?? [];
        const numbers = answers.map((v) => String(v.avrunding === undefined ? v.verdi : Math.sign(v.verdi) * Math.round(Math.abs(v.verdi) * 10 ** v.avrunding + 1e-9) / 10 ** v.avrunding));
        const input = { numbers, choices: q.fasit.riktige ?? [] };
        assert.equal(evaluateAnswer(input, q.fasit).correct, true, q.id);
        for (let j = 0; j < answers.length; j++)
            if (answers[j].toleranse > 0) {
                const wrong = { ...input, numbers: [...numbers] };
                wrong.numbers[j] = String(Number(numbers[j]) + 2 * answers[j].toleranse);
                assert.equal(evaluateAnswer(wrong, q.fasit).correct, false, q.id);
            }
    }
});
test('halvverdier avrundes riktig uten at flyttallsstøy avviser svaret', () => {
 const key={type:'tall',verdier:[{verdi:21.75,toleranse:.05,avrunding:1}]};
 assert.equal(evaluateAnswer({numbers:['21,8'],choices:[]},key).correct,true);
 assert.equal(evaluateAnswer({numbers:['21,7'],choices:[]},key).correct,false);
 const negative={type:'tall',verdier:[{verdi:-21.75,toleranse:.05,avrunding:1}]};
 assert.equal(evaluateAnswer({numbers:['-21,8'],choices:[]},negative).correct,true);
 assert.equal(evaluateAnswer({numbers:['-21,7'],choices:[]},negative).correct,false);
});
test('kontrollsiden viser 50 om gangen og gir tilgang til alle 950', async () => {
 const {runInNewContext}=await import('node:vm');
 const html=readFileSync(new URL('../public/oppgaver-og-hint.html',import.meta.url),'utf8');
 const data=html.match(/<script id="question-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
 const nodes=new Map();
 function element(tag){return {tag,children:[],dataset:{},handlers:{},className:'',textContent:'',append(...items){this.children.push(...items);},replaceChildren(){this.children=[];},addEventListener(name,fn){this.handlers[name]=fn;},setAttribute(){},classList:{toggle(){}}};}
 const all=node=>[node,...node.children.flatMap(all)];
 for(const id of ['question-data','results','topic-filters','part-filters','difficulty-filters','filter-status'])nodes.set(id,element('div'));
 nodes.get('question-data').textContent=data;
 const document={getElementById:id=>nodes.get(id),createElement:element,querySelectorAll:selector=>[...nodes.values()].flatMap(all).filter(n=>selector==='.filter-pill'&&n.className.split(' ').includes('filter-pill'))};
 runInNewContext(html.match(/<script>\s*([\s\S]*?)<\/script>/)[1],{document});
 const result=nodes.get('results');const cards=()=>all(result).filter(n=>n.className==='question-card');
 assert.equal(cards().length,50);
 let more;while((more=all(result).find(n=>n.textContent==='Vis flere oppgaver')))more.handlers.click();
 assert.equal(cards().length,950);
 const del2=all(nodes.get('part-filters')).find(n=>n.textContent==='Del 2');del2.handlers.click();
 assert.equal(cards().length,50);
 while((more=all(result).find(n=>n.textContent==='Vis flere oppgaver')))more.handlers.click();
 assert.equal(cards().length,462);
});
