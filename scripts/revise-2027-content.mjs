import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { calibrateDifficulty } from "./calibrate-difficulty.mjs";
import { reviseHintScaffolding } from "./hint-scaffolding.mjs";
import { reviseHandArithmetic } from "./hand-arithmetic.mjs";

if (!process.argv.includes("--allow-full-bank-rewrite")) {
  throw new Error("Full omskriving er sperret. Rett enkeltoppgaver direkte. Se CONTENT_MAINTENANCE.md. Krever --allow-full-bank-rewrite etter eksplisitt godkjenning av en full revisjon.");
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const bankPath = join(scriptDir, "..", "public", "oppgaver-2027.json");
const bank = JSON.parse(await readFile(bankPath, "utf8"));
const questions = new Map(bank.oppgaver.map((question) => [question.id, question]));
const groups = new Map(bank.oppgavegrupper.map((group) => [group.id, group]));
const revisedIds = new Set();

function normalizedNumber(value, significantDigits = 12) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return numeric;
  if (Object.is(numeric, -0)) return 0;
  return Number(numeric.toPrecision(significantDigits));
}

function plainDecimal(value) {
  const numeric = normalizedNumber(value);
  if (!Number.isFinite(numeric)) return String(numeric);
  return numeric.toLocaleString("en-US", {
    useGrouping: false,
    maximumSignificantDigits: 12,
    maximumFractionDigits: 20,
  });
}

function number(value, digits = null) {
  const numeric = normalizedNumber(value);
  let text = digits === null ? plainDecimal(numeric) : numeric.toFixed(digits);
  let [integer, decimals] = text.split(".");
  const sign = integer.startsWith("-") ? "-" : "";
  integer = integer.replace("-", "").replace(/\B(?=(\d{3})+(?!\d))/g, "\\,");
  return `${sign}${integer}${decimals === undefined ? "" : `{,}${decimals}`}`;
}

function decimal(value, maxDigits = 4) {
  const rounded = normalizedNumber(Number(value).toFixed(maxDigits));
  return number(rounded);
}

function math(expression) {
  return `\\(${expression}\\)`;
}

function setQuestion(id, changes) {
  const question = questions.get(id);
  if (!question) throw new Error(`Ukjent oppgave-ID: ${id}`);
  Object.assign(question, changes);
  if (changes.hint) {
    const minimumHintCount = question.del === 2 ? 2 : 3;
    if (changes.hint.length < minimumHintCount) {
      throw new Error(`${id} må få minst ${minimumHintCount} trinnvise hint.`);
    }
    if (changes.hint.some((hint) => hint.trim().length < 20)) throw new Error(`${id} har et for kort hint.`);
  }
  revisedIds.add(id);
}

function setHintsAndAnswer(id, hint, svar) {
  setQuestion(id, { hint, ...(svar ? { svar } : {}) });
}

function byFamily(family) {
  return bank.oppgaver.filter((question) => question.variantfamilie === family);
}

// Del 1 skal kunne løses uten kalkulator. Tallene under er derfor justert slik
// at metoden fortsatt blir prøvd, mens selve regningen kan gjøres med enkle
// prosentdeler, brøker eller en kort sporingstabell. Dette følger mønsteret i
// tidligere eksamensoppgaver, der krevende resonnement kombineres med håndterlige tall.
function replaceSingleNumericTask(id, { sporsmal, input, result, tolerance = 0 }) {
  const question = questions.get(id);
  setQuestion(id, {
    sporsmal,
    fasit: {
      ...question.fasit,
      verdier: question.fasit.verdier.map((answer, index) => index === 0
        ? { ...answer, verdi: result, toleranse: tolerance }
        : answer),
    },
    kontroll: {
      ...question.kontroll,
      inndata: input,
      resultat: [result],
    },
  });
}

replaceSingleNumericTask("2py27-011", {
  sporsmal: `${math("48")} personer utgjør ${math("12\\,\\%")} av en gruppe. Hvor mange personer er det i hele gruppen?`,
  input: { del: 48, prosent: 12 },
  result: 400,
});
replaceSingleNumericTask("2py27-015", {
  sporsmal: `${math("360")} personer utgjør ${math("40\\,\\%")} av en gruppe. Hvor mange personer er det i hele gruppen?`,
  input: { del: 360, prosent: 40 },
  result: 900,
});

{
  const question = questions.get("2py27-016");
  setQuestion(question.id, {
    sporsmal: `En andel endret seg fra ${math("18\\,\\%")} til ${math("27\\,\\%")}. Oppgi endringen i prosentpoeng og i prosent.`,
    fasit: {
      ...question.fasit,
      verdier: [
        { ...question.fasit.verdier[0], verdi: 9 },
        { ...question.fasit.verdier[1], verdi: 50, toleranse: 0 },
      ],
    },
    kontroll: {
      ...question.kontroll,
      inndata: { gammel: 18, ny: 27 },
      resultat: [9, 50],
      avrunding: [0, 0],
    },
  });
}

{
  const question = questions.get("2py27-020");
  setQuestion(question.id, {
    sporsmal: `En andel endret seg fra ${math("12\\,\\%")} til ${math("15\\,\\%")}. Oppgi endringen i prosentpoeng og i prosent.`,
    fasit: {
      ...question.fasit,
      verdier: [
        { ...question.fasit.verdier[0], verdi: 3 },
        { ...question.fasit.verdier[1], verdi: 25, toleranse: 0 },
      ],
    },
    kontroll: {
      ...question.kontroll,
      inndata: { gammel: 12, ny: 15 },
      resultat: [3, 25],
      avrunding: [0, 0],
    },
  });
}

replaceSingleNumericTask("2py27-027", {
  sporsmal: `En verdi reduseres først med ${math("10\\,\\%")} og økes deretter med ${math("10\\,\\%")}. Hva er den samlede prosentvise endringen?`,
  input: { endringer: [-10, 10] },
  result: -1,
});

replaceSingleNumericTask("2py27-030", {
  sporsmal: `Etter at en verdi var blitt økt med ${math("25\\,\\%")}, var den ${math("1\\,500")}. Hva var verdien før endringen?`,
  input: { ny: 1500, endring: 25 },
  result: 1200,
  tolerance: 0,
});
replaceSingleNumericTask("2py27-031", {
  sporsmal: `Etter at en verdi var blitt redusert med ${math("5\\,\\%")}, var den ${math("760")}. Hva var verdien før endringen?`,
  input: { ny: 760, endring: -5 },
  result: 800,
  tolerance: 0,
});
replaceSingleNumericTask("2py27-032", {
  sporsmal: `Etter at en verdi var blitt økt med ${math("50\\,\\%")}, var den ${math("1\\,950")}. Hva var verdien før endringen?`,
  input: { ny: 1950, endring: 50 },
  result: 1300,
  tolerance: 0,
});

setQuestion("2py27-042", {
  sporsmal: `En vare koster ${math("1\\,500")} kr. Butikk A gir ${math("18\\,\\%")} rabatt, og butikk B gir ${math("250")} kr i avslag. Hvilket tilbud gir størst avslag?`,
});

// Komma mellom koordinater og klassegrenser er skilletegn, ikke desimaltegn.
// Disse tekstene holdes eksplisitte slik at en formatteringspass aldri kan
// forveksle (12,120) med desimaltallet 12,120.
setQuestion("2py27-172", {
  sporsmal: `En rett linje går gjennom punktene ${math("(12,120)")} og ${math("(20,168)")}. Finn stigningstallet.`,
});
setQuestion("2py27-286", {
  sporsmal: `En gruppert fordeling har klassegrenser ${math("0, 10, 20, 40")} og frekvenser ${math("6, 10, 16")}. Finn frekvenstettheten og relativ frekvens for intervallet ${math("[20,40)")}.`,
});
setQuestion("2py27-288", {
  sporsmal: `En gruppert fordeling har klassegrenser ${math("10, 20, 30, 50")} og frekvenser ${math("8, 14, 20")}. Finn frekvenstettheten og relativ frekvens for intervallet ${math("[30,50)")}.`,
});
setQuestion("2py27-289", {
  sporsmal: `En gruppert fordeling har klassegrenser ${math("0, 20, 30, 60")} og frekvenser ${math("12, 9, 18")}. Finn frekvenstettheten og relativ frekvens for intervallet ${math("[20,30)")}.`,
});

// Sporingsoppgavene bruker faktorer som gir korte, eksakte mellomregninger.
const calculatorFreeCodeGrowth = {
  "2py27-218": { start: 1000, faktor: 1.1, runder: 2, values: [1000, 1100, 1210] },
  "2py27-219": { start: 800, faktor: 0.5, runder: 3, values: [800, 400, 200, 100] },
  "2py27-220": { start: 2500, faktor: 1.2, runder: 2, values: [2500, 3000, 3600] },
  "2py27-221": { start: 600, faktor: 1.5, runder: 2, values: [600, 900, 1350] },
  "2py27-222": { start: 1200, faktor: 0.75, runder: 2, values: [1200, 900, 675] },
};
for (const [id, revision] of Object.entries(calculatorFreeCodeGrowth)) {
  const question = questions.get(id);
  const result = revision.values.at(-1);
  const code = `verdi = ${revision.start}\nfor i in range(${revision.runder}):\n    verdi = verdi * ${plainDecimal(revision.faktor)}\nprint(round(verdi))`;
  setQuestion(id, {
    fasit: {
      ...question.fasit,
      verdier: [{ ...question.fasit.verdier[0], verdi: result, toleranse: 0 }],
    },
    kontroll: {
      ...question.kontroll,
      inndata: { start: revision.start, faktor: revision.faktor, runder: revision.runder },
      resultat: [result],
    },
    data: { ...question.data, programkode: code },
    visualisering: { ...question.visualisering, kode: code },
  });
}

const calculatorFreeThresholds = {
  "2py27-228": { start: 100, faktor: 2, grense: 750, comparator: "<", values: [100, 200, 400, 800] },
  "2py27-229": { start: 80, faktor: 1.5, grense: 400, comparator: "<", values: [80, 120, 180, 270, 405] },
  "2py27-230": { start: 800, faktor: 0.5, grense: 90, comparator: ">", values: [800, 400, 200, 100, 50] },
  "2py27-231": { start: 75, faktor: 2, grense: 250, comparator: "<", values: [75, 150, 300] },
  "2py27-232": { start: 2400, faktor: 0.5, grense: 500, comparator: ">", values: [2400, 1200, 600, 300] },
};
for (const [id, revision] of Object.entries(calculatorFreeThresholds)) {
  const question = questions.get(id);
  const result = revision.values.length - 1;
  const code = `verdi = ${revision.start}\nn = 0\nwhile verdi ${revision.comparator} ${revision.grense}:\n    verdi = verdi * ${plainDecimal(revision.faktor)}\n    n = n + 1\nprint(n)`;
  setQuestion(id, {
    fasit: {
      ...question.fasit,
      verdier: [{ ...question.fasit.verdier[0], verdi: result, toleranse: 0 }],
    },
    kontroll: {
      ...question.kontroll,
      inndata: { start: revision.start, faktor: revision.faktor, grense: revision.grense },
      resultat: [result],
    },
    data: { ...question.data, programkode: code },
    visualisering: { ...question.visualisering, kode: code },
  });
}

// Omvendt prosent er mønstereksempelet for resten av banken: hele resonnementet
// vises, ett meningsfullt delmål om gangen, og avsluttes med en kontroll.
const reversePercentMentalSteps = {
  "2py27-028": [`Her er 120 % lik ${math("816")}. Del begge tallene på 12: Da er 10 % lik ${math("68")}.`, `Gang 10 %-delen med 10: ${math("68\\cdot10=680")}. Dermed er 100 % lik ${math("680")}.`],
  "2py27-029": [`Her er 90 % lik ${math("630")}. Siden 90 % er ni like 10 %-deler, er 10 % lik ${math("630/9=70")}.`, `Gang 10 %-delen med 10: ${math("70\\cdot10=700")}. Dermed er 100 % lik ${math("700")}.`],
  "2py27-030": [`Her er 125 % lik ${math("1\\,500")}. Del begge tallene på 5: Da er 25 % lik ${math("300")}.`, `Fire deler på 25 % gir 100 %: ${math("300\\cdot4=1\\,200")}.`],
  "2py27-031": [`Her er 95 % lik ${math("760")}. Siden ${math("95=19\\cdot5")}, deler du ${math("760")} på 19 og får at 5 % er ${math("40")}.`, `Tjue deler på 5 % gir 100 %: ${math("40\\cdot20=800")}.`],
  "2py27-032": [`Her er 150 % lik ${math("1\\,950")}. Del begge tallene på 3: Da er 50 % lik ${math("650")}.`, `Dobbelt så mye er 100 %: ${math("650\\cdot2=1\\,300")}.`],
};
for (const question of byFamily("d1-omvendt-prosent")) {
  const { ny, endring } = question.kontroll.inndata;
  const factor = 1 + endring / 100;
  const original = question.fasit.verdier[0].verdi;
  const direction = endring >= 0 ? "økt" : "redusert";
  const factorOperation = endring >= 0 ? "+" : "-";
  const [mentalStep, mentalResult] = reversePercentMentalSteps[question.id];
  setHintsAndAnswer(question.id, [
    `Definer den ukjente: La ${math("x")} være verdien før den ble ${direction} med ${number(Math.abs(endring))} %.`,
    `Finn vekstfaktoren: ${number(Math.abs(endring))} % er ${math(number(Math.abs(endring) / 100))}. Derfor er vekstfaktoren ${math(`1${factorOperation}${number(Math.abs(endring) / 100)}=${number(factor)}`)}.`,
    `Lag ligningen: Gammel verdi multiplisert med vekstfaktoren skal bli den nye verdien. Det gir ${math(`${number(factor)}x=${number(ny)}`)}.`,
    `Regn uten kalkulator: ${mentalStep}`,
    `Regn ut: ${mentalResult} Dette er verdien før prosentendringen.`,
    `Kontroller svaret: ${math(`${number(original)}\\cdot${number(factor)}=${number(ny)}`)}. Vi får den oppgitte nye verdien, så svaret stemmer.`,
  ], `Verdien før endringen var ${math(number(original))}. Kontroll: ${math(`${number(original)}\\cdot${number(factor)}=${number(ny)}`)}.`);
}

// Vekstfaktor: oppgavene går i begge retninger og trenger derfor ulike hint.
for (const question of byFamily("d1-vekstfaktor")) {
  const change = question.kontroll.inndata.endring;
  const factor = 1 + change / 100;
  if (/(?:Hva er|Hvilken) vekstfaktor/.test(question.sporsmal)) {
    const operation = change < 0 ? "trekkes fra" : "legges til";
    const symbol = change < 0 ? "-" : "+";
    setHintsAndAnswer(question.id, [
      `Uten endring er 100 % igjen, og det tilsvarer vekstfaktor ${math("1")}.`,
      `${number(Math.abs(change))} % er ${math(number(Math.abs(change) / 100))} som desimaltall. Siden dette er en ${change < 0 ? "nedgang" : "økning"}, skal tallet ${operation} 1.`,
      `Skriv regnestykket ${math(`1${symbol}${number(Math.abs(change) / 100)}`)} og regn ut vekstfaktoren.`,
    ], `Vekstfaktoren er ${math(`1${symbol}${number(Math.abs(change) / 100)}=${number(factor)}`)}.`);
  } else {
    setHintsAndAnswer(question.id, [
      `Sammenlign vekstfaktoren ${math(number(factor))} med ${math("1")}, som betyr ingen endring.`,
      `Finn forskjellen: ${math(`${number(factor)}-1=${number(factor - 1)}`)}. Fortegnet viser om det er økning eller nedgang.`,
      `Gjør forskjellen om til prosent ved å gange med 100 %.`,
    ], `Den prosentvise endringen er ${math(`(${number(factor)}-1)\\cdot100\\,\\%=${number(change)}\\,\\%`)}.`);
  }
}

// Potensreglene må navngis og brukes konkret i stedet for «bruk regelen som passer».
const powerRuleRevisions = {
  "2py27-053": {
    hint: [
      "Når potenser med samme grunntall multipliseres, legger vi sammen eksponentene.",
      `Her blir uttrykket ${math("3^{4+5}")}. Grunntallet 3 skal stå uendret.`,
      "Regn ut summen av eksponentene og velg alternativet som har denne eksponenten.",
    ],
    svar: `Siden ${math("a^m\\cdot a^n=a^{m+n}")}, får vi ${math("3^4\\cdot3^5=3^{4+5}=3^9")}.`,
  },
  "2py27-054": {
    hint: [
      "Når potenser med samme grunntall divideres, trekker vi eksponenten i nevneren fra eksponenten i telleren.",
      `Her blir uttrykket ${math("x^{8-3}")}. Grunntallet x skal stå uendret.`,
      "Regn ut differansen mellom eksponentene og velg det tilsvarende alternativet.",
    ],
    svar: `Siden ${math("a^m/a^n=a^{m-n}")}, får vi ${math("x^8/x^3=x^{8-3}=x^5")}.`,
  },
  "2py27-055": {
    hint: [
      "Når en potens opphøyes i en ny potens, multipliserer vi eksponentene.",
      `Skriv uttrykket som ${math("a^{3\\cdot4}")}.`,
      "Regn ut produktet av eksponentene og velg alternativet som passer.",
    ],
    svar: `${math("(a^3)^4=a^{3\\cdot4}=a^{12}")}.`,
  },
  "2py27-056": {
    hint: [
      "Eksponenten utenfor parentesen gjelder både tallet 2 og variabelen x.",
      `Skriv ${math("(2x)^3=2^3\\cdot x^3")}.`,
      `Regn ut ${math("2^3")} og behold ${math("x^3")}.`,
    ],
    svar: `${math("(2x)^3=2^3x^3=8x^3")}.`,
  },
  "2py27-057": {
    hint: [
      "For et grunntall som ikke er null, er en potens med eksponent 0 alltid lik 1.",
      `Du kan se dette fra ${math("b^1/b^1=b^{1-1}=b^0")}.`,
      `Samtidig er ${math("b^1/b^1=1")}, siden et tall delt på seg selv er 1.`,
    ],
    svar: `Når ${math("b\\neq0")}, er ${math("b^0=1")}.`,
  },
};
for (const [id, changes] of Object.entries(powerRuleRevisions)) setQuestion(id, changes);

// Standardform fram og tilbake, inkludert retting av tallet i 2py27-062.
const standardFormRevisions = {
  "2py27-058": {
    hint: [
      `På standardform skal tallet foran tierpotensen være minst 1 og mindre enn 10. Flytt derfor kommaet slik at du får ${math("7{,}2")}.`,
      "Kommaet flyttes fem plasser mot høyre for å gå fra det opprinnelige tallet til 7,2.",
      "Det opprinnelige tallet er mindre enn 1, så eksponenten skal være negativ.",
    ],
    svar: `${math("0{,}000072=7{,}2\\cdot10^{-5}")}.`,
  },
  "2py27-059": {
    hint: [
      `Eksponenten ${math("6")} betyr at ${math("4{,}85")} skal multipliseres med én million.`,
      "Flytt kommaet seks plasser mot høyre.",
      "Fyll inn nuller i de tomme plassene og grupper gjerne sifrene i tusener.",
    ],
    svar: `${math("4{,}85\\cdot10^6=4\\,850\\,000")}.`,
  },
  "2py27-060": {
    hint: [
      `Flytt kommaet slik at første faktor blir ${math("3{,}14")}.`,
      "Kommaet må flyttes to plasser mot høyre.",
      "Siden det opprinnelige tallet er mindre enn 1, bruker du en negativ eksponent.",
    ],
    svar: `${math("0{,}0314=3{,}14\\cdot10^{-2}")}.`,
  },
  "2py27-061": {
    hint: [
      `Eksponenten ${math("10")} betyr at kommaet skal flyttes ti plasser mot høyre.`,
      `Start med ${math("9{,}2")} og fyll inn nuller etter 2-tallet.`,
      "Kontroller at resultatet har elleve sifre; 9 står på tiermilliardplassen.",
    ],
    svar: `${math("9{,}2\\cdot10^{10}=92\\,000\\,000\\,000")}.`,
  },
  "2py27-062": {
    sporsmal: `Hvilket alternativ viser ${math("0{,}000000605")} på standardform?`,
    hint: [
      `Flytt kommaet slik at tallet foran tierpotensen blir ${math("6{,}05")}.`,
      "Fra 0,000000605 til 6,05 flyttes kommaet sju plasser mot høyre.",
      "Tallet er mindre enn 1, så antallet plasser gir en negativ eksponent.",
    ],
    svar: `${math("0{,}000000605=6{,}05\\cdot10^{-7}")}.`,
  },
};
for (const [id, changes] of Object.entries(standardFormRevisions)) setQuestion(id, changes);

// Røtter og brøkeksponenter: vis hvilke tall som faktisk skal sammenlignes.
const rootValues = {
  "2py27-068": ["5^2=25", "\\sqrt{900}=30", "2^5=32"],
  "2py27-069": ["2^4=16", "\\sqrt{625}=25", "3^3=27"],
  "2py27-070": ["10^{1/2}=\\sqrt{10}\\approx3{,}16", "2^2=4", "\\sqrt[3]{125}=5"],
  "2py27-071": ["4^{3/2}=(\\sqrt4)^3=8", "3^2=9", "\\sqrt{100}=10"],
  "2py27-072": ["2^3=8", "27^{2/3}=(\\sqrt[3]{27})^2=9", "\\sqrt{121}=11"],
};
for (const [id, values] of Object.entries(rootValues)) {
  const question = questions.get(id);
  setHintsAndAnswer(id, [
    "Gjør hvert av de tre uttrykkene om til et vanlig tall før du sammenligner dem.",
    `Regn ut de to første: ${math(values[0])} og ${math(values[1])}.`,
    `Regn ut det siste uttrykket, ${math(values[2])}, og sorter de tre tallverdiene fra minst til størst.`,
  ], `Tallverdiene er ${values.map(math).join(", ")}. Riktig rekkefølge er derfor ${question.fasit.riktige[0]}.`);
}

// Konkret innsetting i formler og mer forklarende løsningsforslag.
const substitutionRevisions = {
  "2py27-073": {
    hint: [
      `Erstatt ${math("x")} med 75 i formelen. Da får du ${math("K=420+3{,}8\\cdot75")}.`,
      `Regn multiplikasjonen først: ${math("3{,}8\\cdot75=285")}.`,
      `Legg deretter 285 til fastbeløpet 420.`,
    ],
    svar: `${math("K=420+3{,}8\\cdot75=420+285=705")} kr.`,
  },
  "2py27-074": {
    sporsmal: `Energien er gitt ved ${math("E=0{,}5mv^2")}. Finn ${math("E")} når ${math("m=12")} kg og ${math("v=5")} m/s.`,
    hint: [
      `Erstatt ${math("m")} med 12 og ${math("v")} med 5: ${math("E=0{,}5\\cdot12\\cdot5^2")}.`,
      `Regn potensen først: ${math("5^2=25")}.`,
      `Regn deretter ${math("0{,}5\\cdot12\\cdot25")}.`,
    ],
    svar: `${math("E=0{,}5\\cdot12\\cdot5^2=0{,}5\\cdot12\\cdot25=150")} J.`,
  },
  "2py27-075": {
    sporsmal: `Arealet av et trapes er ${math("A=(a+b)h/2")}. Finn ${math("A")} når ${math("a=8")}, ${math("b=14")} og ${math("h=6")}.`,
    hint: [
      `Sett inn alle tre verdiene: ${math("A=(8+14)\\cdot6/2")}.`,
      `Regn parentesen først: ${math("8+14=22")}.`,
      `Regn deretter ${math("22\\cdot6/2")}.`,
    ],
    svar: `${math("A=(8+14)\\cdot6/2=22\\cdot6/2=66")} m².`,
  },
  "2py27-076": {
    hint: [
      `Erstatt ${math("C")} med 25: ${math("F=1{,}8\\cdot25+32")}.`,
      `Regn multiplikasjonen først: ${math("1{,}8\\cdot25=45")}.`,
      "Legg deretter til 32.",
    ],
    svar: `${math("F=1{,}8\\cdot25+32=45+32=77")} °F.`,
  },
  "2py27-077": {
    hint: [
      `Erstatt ${math("m")} med 70: ${math("D=0{,}04\\cdot70+1{,}2")}.`,
      `Regn multiplikasjonen først: ${math("0{,}04\\cdot70=2{,}8")}.`,
      `Legg deretter ${math("1{,}2")} til ${math("2{,}8")}.`,
    ],
    svar: `${math("D=0{,}04\\cdot70+1{,}2=2{,}8+1{,}2=4{,}0")} enheter.`,
  },
};
for (const [id, changes] of Object.entries(substitutionRevisions)) setQuestion(id, changes);

// Omforming av formler, med én konkret operasjon per hint.
const formulaRevisions = {
  "2py27-083": [
    ["Målet er å få h alene. Fjern først divisjonen på 2 ved å multiplisere begge sider med 2.", `Da får du ${math("2A=bh")}.`, "Del begge sider på b for å isolere h."],
    `${math("A=bh/2\\Rightarrow2A=bh\\Rightarrow h=2A/b")}.`,
  ],
  "2py27-084": [
    ["Målet er å få t alene i produktet vt.", "Del begge sider av s=vt på v.", `Da står ${math("t")} alene på høyre side.`],
    `${math("s=vt\\Rightarrow t=s/v")}.`,
  ],
  "2py27-085": [
    ["Målet er å få x alene. Fjern først konstantleddet a.", `Trekk a fra begge sider: ${math("K-a=bx")}.`, "Del deretter begge sider på b."],
    `${math("K=a+bx\\Rightarrow K-a=bx\\Rightarrow x=(K-a)/b")}.`,
  ],
  "2py27-086": [
    ["I produktet lbh skal b stå alene.", `Del begge sider på hele faktoren ${math("lh")}.`, `Da blir venstre side ${math("V/(lh)")} og høyre side b.`],
    `${math("V=lbh\\Rightarrow b=V/(lh)")}.`,
  ],
  "2py27-087": [
    ["Målet er å få m alene. I uttrykket m/V er m delt på V.", "Gjør motsatt operasjon og multipliser begge sider med V.", `Etter multiplikasjonen får du ${math("pV=m")}, som kan skrives med m på venstre side.`],
    `${math("p=m/V\\Rightarrow pV=m")}, altså ${math("m=pV")}.`,
  ],
};
for (const [id, [hint, svar]] of Object.entries(formulaRevisions)) setHintsAndAnswer(id, hint, svar);

// Sanne påstander må begrunnes generelt; falske påstander kan avkreftes med et moteksempel.
const claimRevisions = {
  "2py27-098": {
    hint: [
      `Sammenlign uttrykkets verdi for ${math("x")} og for ${math("x+1")}.`,
      `Forskjellen er ${math("[3(x+1)+7]-(3x+7)")}.`,
      "Forenkle forskjellen. Hvis x-leddene forsvinner, sammenligner du konstantleddet som står igjen med økningen i påstanden.",
    ],
    svar: `${math("[3(x+1)+7]-(3x+7)=3")}. Påstanden er derfor riktig for alle ${math("x")}.`,
  },
  "2py27-099": {
    hint: [
      "En påstand som skal gjelde for alle x, er feil dersom du finner én x-verdi der uttrykkene blir ulike.",
      `Prøv ${math("x=0")}. Da blir venstre side ${math("2(0+4)")} og høyre side ${math("2\\cdot0+4")}.`,
      "Regn ut begge sidene og sammenlign dem.",
    ],
    svar: `For ${math("x=0")} er ${math("2(0+4)=8")}, mens ${math("2\\cdot0+4=4")}. Påstanden er feil. Generelt er ${math("2(x+4)=2x+8")}.`,
  },
  "2py27-100": {
    hint: [
      "Det holder å finne to tall med sum 10 som ikke har produkt 25.",
      `Prøv ${math("a=2")} og ${math("b=8")}. De har summen 10.`,
      `Regn ut produktet ${math("2\\cdot8")} og sammenlign med 25.`,
    ],
    svar: `${math("2+8=10")}, men ${math("2\\cdot8=16")}. Påstanden er derfor feil.`,
  },
  "2py27-101": {
    hint: [
      `Skriv to vilkårlige oddetall som ${math("2m+1")} og ${math("2n+1")}.`,
      `Legg dem sammen: ${math("(2m+1)+(2n+1)")}.`,
      "Trekk ut faktoren 2. Et tall som kan skrives som 2 ganger et heltall, er et partall.",
    ],
    svar: `${math("(2m+1)+(2n+1)=2m+2n+2=2(m+n+1)")}. Summen er derfor alltid et partall, så påstanden er riktig.`,
  },
  "2py27-102": {
    hint: [
      `En proporsjonal sammenheng har formen ${math("y=kx")}.`,
      `Undersøk hva som skjer når ${math("x=0")}.`,
      `Da blir ${math("y=k\\cdot0")}. Punktet du får, avgjør om grafen går gjennom origo.`,
    ],
    svar: `Når ${math("x=0")}, får vi ${math("y=k\\cdot0=0")}. Grafen går gjennom ${math("(0,0)")}, så påstanden er riktig.`,
  },
};
for (const [id, changes] of Object.entries(claimRevisions)) setQuestion(id, changes);

// Statistikvalg må knyttes til den konkrete datatypen.
const statisticsChoiceRevisions = {
  "2py27-163": [
    "Direktørens lønn er en ekstremverdi som vil trekke gjennomsnittet kraftig opp.",
    "Et sentralmål som bestemmes av plasseringen i den sorterte listen, påvirkes mindre av ekstremverdien.",
    "Velg derfor sentralmålet som beskriver den midterste lønnen.",
  ],
  "2py27-164": [
    "Månedene har en naturlig kronologisk rekkefølge.",
    "Framstillingen bør gjøre det lett å se økning, nedgang og utvikling fra måned til måned.",
    "Velg diagramtypen som forbinder målepunktene i tidsrekkefølge.",
  ],
  "2py27-165": [
    "Reisetid er en sammenhengende tallvariabel, og observasjonene er samlet i intervaller.",
    "Du trenger en framstilling der arealet av søylene viser frekvensen i hvert intervall.",
    "Velg diagramtypen med sammenhengende søyler langs en tallakse.",
  ],
  "2py27-166": [
    "Spørsmålet handler om hvilken skostørrelse som forekommer oftest.",
    "Du trenger ikke beregne et gjennomsnitt eller finne en midtverdi.",
    "Velg sentralmålet som er definert som den vanligste verdien.",
  ],
  "2py27-167": [
    "Noen få svært dyre boliger er ekstremverdier som kan trekke gjennomsnittet opp.",
    "Den sorterte midtverdien påvirkes mindre av slike ekstremverdier.",
    "Velg derfor målet som beskriver den midterste boligprisen.",
  ],
};
for (const [id, hint] of Object.entries(statisticsChoiceRevisions)) {
  const question = questions.get(id);
  const correct = question.fasit.riktige[0];
  setHintsAndAnswer(id, hint, `${correct[0].toUpperCase()}${correct.slice(1)} er mest hensiktsmessig i denne situasjonen.`);
}

// Konstantledd og skjæringspunkt: vis den konkrete ligningen og ett mellomsteg.
for (const question of byFamily("d1-konstantledd")) {
  const { a, x, y } = question.kontroll.inndata;
  const product = a * x;
  const b = y - product;
  setHintsAndAnswer(question.id, [
    `Punktet betyr at ${math(`f(${number(x)})=${number(y)}`)}. Sett derfor inn ${math(`x=${number(x)}`)} og ${math(`f(x)=${number(y)}`)}.`,
    `Da får du ligningen ${math(`${number(y)}=${number(a)}\\cdot${number(x)}+b`)}. Regn først ut produktet ${math(`${number(a)}\\cdot${number(x)}=${number(product)}`)}.`,
    `Trekk ${math(`(${number(product)})`)} fra begge sider: ${math(`${number(y)}-(${number(product)})=${number(product)}+b-(${number(product)})`)}. Da er ${math(`b=${number(b)}`)}.`,
  ], `${math(`${number(y)}=${number(a)}\\cdot${number(x)}+b=${number(product)}+b`)}, så ${math(`b=${number(y)}-(${number(product)})=${number(b)}`)}.`);
}

for (const question of byFamily("d1-lineaert-skjaeringspunkt")) {
  const { a1, b1, a2, b2 } = question.kontroll.inndata;
  const [x, cost] = question.kontroll.resultat;
  const slopeDifference = Math.abs(a1 - a2);
  const fixedDifference = Math.abs(b1 - b2);
  const subtractSlope = Math.min(a1, a2);
  const slopeStep = a1 >= a2
    ? `${number(b1)}+${number(slopeDifference)}x=${number(b2)}`
    : `${number(b1)}=${number(b2)}+${number(slopeDifference)}x`;
  const fixedStep = a1 >= a2
    ? `${number(slopeDifference)}x=${number(b2)}-${number(b1)}=${number(fixedDifference)}`
    : `${number(slopeDifference)}x=${number(b1)}-${number(b2)}=${number(fixedDifference)}`;
  const subtractFixed = a1 >= a2 ? b1 : b2;
  setHintsAndAnswer(question.id, [
    `Samme kostnad betyr at ${math("A(x)=B(x)")}. Med tallene i oppgaven blir det ${math(`${number(b1)}+${number(a1)}x=${number(b2)}+${number(a2)}x`)}.`,
    `Trekk ${math(`${number(subtractSlope)}x`)} fra begge sider. Da får du ${math(slopeStep)}.`,
    `Trekk deretter ${math(number(subtractFixed))} fra begge sider: ${math(fixedStep)}.`,
    `Del begge sider på ${number(slopeDifference)}: ${math(`x=${number(fixedDifference)}/${number(slopeDifference)}=${number(x)}`)}. Sett så x inn i én av modellene.`,
  ], `${math(`${number(b1)}+${number(a1)}x=${number(b2)}+${number(a2)}x`)} gir ${math(`${number(slopeDifference)}x=${number(fixedDifference)}`)}, altså ${math(`x=${number(x)}`)}. Kostnaden blir ${math(`${number(b1)}+${number(a1)}\\cdot${number(x)}=${number(cost)}`)} kr.`);
}

// Modellvalg: hvert mønster trenger sin egen test.
const modelChoiceRevisions = {
  "2py27-208": [
    ["Finn forskjellen mellom to naboverdier i y-kolonnen.", `Forskjellene er ${math("11-7=4")}, ${math("15-11=4")} og videre 4.`, "Konstant første differanse betyr at sammenhengen er lineær."],
    "y-verdiene øker med 4 hver gang x øker med 1. Tabellen passer derfor nøyaktig til en lineær modell.",
  ],
  "2py27-209": [
    ["Del hver y-verdi på den forrige y-verdien.", `Forholdstallene er ${math("10/5=2")}, ${math("20/10=2")} og videre 2.`, "Konstant forholdstall betyr at sammenhengen er eksponentiell."],
    "Hver y-verdi er dobbelt så stor som den forrige. Tabellen passer derfor nøyaktig til en eksponentialmodell.",
  ],
  "2py27-210": [
    ["Sammenlign y med kvadratet av x.", `Regn ut ${math("y/x^2")}: ${math("3/1^2=3")}, ${math("12/2^2=3")} og ${math("27/3^2=3")}.`, `Forholdet er konstant, så modellen har formen ${math("y=3x^2")}.`],
    `${math("y=3x^2")} passer alle radene. Dette er en potensmodell med eksponent 2.`,
  ],
  "2py27-211": [
    ["Finn først differansene mellom y-verdiene.", `Første differanser er ${math("3,5,7,9")}. Differansene mellom disse er alle 2.`, "Konstant andre differanse kjennetegner en andregradsmodell."],
    "De andre differansene er konstante. Tabellen passer derfor nøyaktig til en andregradsmodell.",
  ],
  "2py27-212": [
    ["Undersøk produktet x·y i hver rad.", `Produktene er ${math("1\\cdot64=64")}, ${math("2\\cdot32=64")} og ${math("4\\cdot16=64")}.`, "Konstant produkt betyr omvendt proporsjonalitet."],
    `${math("x\\cdot y=64")} i alle radene, altså ${math("y=64/x")}. Tabellen er omvendt proporsjonal.`,
  ],
};
for (const [id, [hint, svar]] of Object.entries(modelChoiceRevisions)) setHintsAndAnswer(id, hint, svar);

// Kodeoppgaver i Del 1: spor de faktiske verdiene.
for (const question of byFamily("d1-kode-statistikk")) {
  const { verdier, variant } = question.kontroll.inndata;
  if (variant === 0) {
    const remaining = [...verdier];
    remaining.splice(remaining.indexOf(Math.min(...remaining)), 1);
    remaining.splice(remaining.indexOf(Math.max(...remaining)), 1);
    const sum = remaining.reduce((total, value) => total + value, 0);
    setHintsAndAnswer(question.id, [
      `De to remove-linjene fjerner først minste verdi ${number(Math.min(...verdier))} og deretter største verdi ${number(Math.max(...verdier))}.`,
      `Listen som står igjen, er [${remaining.join(", ")}].`,
      `Programmet beregner gjennomsnittet ${math(`(${remaining.join("+")})/${remaining.length}`)}.`,
    ], `Etter at minste og største verdi er fjernet, står [${remaining.join(", ")}] igjen. Gjennomsnittet er ${math(`${number(sum)}/${remaining.length}=${number(sum / remaining.length)}`)}.`);
  } else {
    const selected = verdier.filter((value) => value >= 8);
    const sum = selected.reduce((total, value) => total + value, 0);
    setHintsAndAnswer(question.id, [
      `If-vilkåret gjør at bare verdier som er minst 8, blir lagt til summen.`,
      `Verdiene som tas med, er [${selected.join(", ")}].`,
      `Legg sammen akkurat disse verdiene: ${math(selected.join("+"))}.`,
    ], `Programmet tar med [${selected.join(", ")}], og skriver derfor ut ${math(`${selected.join("+")}=${number(sum)}`)}.`);
  }
}

// Nybegynnersteg i Del 1: vis operasjonene som tidligere lå skjult i en sum,
// en grafavlesning, en medianplass eller en programløkke.
for (const question of byFamily("d1-veid-gjennomsnitt")) {
  const { verdier, frekvenser } = question.kontroll.inndata;
  const products = verdier.map((value, index) => value * frekvenser[index]);
  const weightedSum = products.reduce((sum, value) => sum + value, 0);
  const total = frekvenser.reduce((sum, value) => sum + value, 0);
  const result = question.kontroll.resultat[0];
  const multiplications = verdier.map((value, index) =>
    `${number(value)}\\cdot${number(frekvenser[index])}=${number(products[index])}`).join(", ");
  setQuestion(question.id, { hint: [
    `Multipliser hver verdi med frekvensen som står ved siden av: ${math(multiplications)}.`,
    `Legg sammen produktene: ${math(`${products.map((value) => number(value)).join("+")}=${number(weightedSum)}`)}.`,
    `Legg sammen frekvensene og del: ${math(`${frekvenser.map((value) => number(value)).join("+")}=${number(total)}`)} og ${math(`${number(weightedSum)}/${number(total)}=${number(result)}`)}.`,
  ] });
}

for (const question of byFamily("d1-grafavlesning")) {
  const { a, b, x } = question.kontroll.inndata;
  const result = question.kontroll.resultat[0];
  const product = a * x;
  setQuestion(question.id, { hint: [
    `Erstatt ${math("x")} med ${math(number(x))} i linjens uttrykk: ${math(`y=${number(a)}\\cdot${number(x)}+${number(b)}`)}.`,
    `Regn multiplikasjonen først: ${math(`${number(a)}\\cdot${number(x)}=${number(product)}`)}.`,
    `Legg til konstantleddet: ${math(`y=${number(product)}+${number(b)}=${number(result)}`)}.`,
  ] });
}

for (const question of byFamily("d1-kumulativ-median")) {
  const cumulative = question.kontroll.inndata.kumulativ;
  const total = cumulative.at(-1);
  const categoryAt = (position) => cumulative.findIndex((value) => value >= position) + 1;
  let positionHint;
  if (total % 2 === 1) {
    const position = (total + 1) / 2;
    positionHint = `Det er et oddetall antall svar. Den midterste plassen er ${math(`(${number(total)}+1)/2=${number(position)}`)}.`;
  } else {
    const left = total / 2;
    const right = left + 1;
    const leftCategory = categoryAt(left);
    const rightCategory = categoryAt(right);
    positionHint = `Det er et partall antall svar. De to midterste plassene er ${math(number(left))} og ${math(number(right))}; de ligger i kategori ${math(number(leftCategory))}${leftCategory === rightCategory ? "" : ` og ${math(number(rightCategory))}`}.`;
  }
  const result = question.kontroll.resultat[0];
  const previous = result > 1 ? cumulative[result - 2] : 0;
  const current = cumulative[result - 1];
  setQuestion(question.id, { hint: [
    `Det totale antallet svar er den siste kumulative frekvensen: ${math(number(total))}.`,
    positionHint,
    `Kumulativ frekvens går fra ${math(number(previous))} til ${math(number(current))} i kategori ${math(number(result))}. Derfor ligger den aktuelle midtposisjonen der.`,
  ] });
}

for (const question of byFamily("d1-kode-vekst")) {
  const { start, faktor, runder } = question.kontroll.inndata;
  const values = [start];
  for (let round = 0; round < runder; round += 1) values.push(normalizedNumber(values.at(-1) * faktor));
  const trace = values.map((value, index) => `${index}: ${number(value)}`).join(", ");
  setQuestion(question.id, { hint: [
    `Start med ${math(`verdi=${number(start)}`)}. Løkken multipliserer med ${math(number(faktor))} én gang per runde.`,
    `Spor verdien etter hver runde: ${math(trace)}.`,
    `Det er ${math(number(runder))} runder, så regnestykket er ${math(`${number(start)}\\cdot${number(faktor)}^{${number(runder)}}=${number(values.at(-1))}`)}.`,
  ] });
}

// Tolkning og kritisk statistikk trenger oppgavespesifikke spørsmål å stille seg.
const interpretationRevisions = {
  "2py27-248": [
    ["Finn funksjonsverdien når x=0; dette er punktet der grafen møter y-aksen.", `Regn ${math("K(0)=250+6\\cdot0")}.`, "Tolk 250 som kostnaden før det er brukt noen enheter."],
    "Siden K(0)=250, er 250 den faste kostnaden før forbruk.",
  ],
  "2py27-249": [
    ["Et skjæringspunkt med t-aksen har funksjonsverdi 0.", `Sett ${math("V(t)=0")}: ${math("900-30t=0")}.`, `Løsningen ${math("t=30")} forteller når volumet er null.`],
    "Grafen krysser t-aksen ved 30 fordi modellen sier at volumet er 0 etter 30 tidsenheter.",
  ],
  "2py27-250": [
    ["En eksponentialfaktor sammenlignes med 1, som betyr uendret verdi.", `Regn forskjellen ${math("0{,}8-1=-0{,}2")}.`, `Gjør ${math("-0{,}2")} om til prosent.`],
    "Faktoren 0,8 betyr at 80 % er igjen hver periode, altså en nedgang på 20 % per periode.",
  ],
  "2py27-251": [
    ["En proporsjonal sammenheng har formen y=kx.", `Bruk punktet: ${math("28=4k")}.`, "Del 28 på 4 for å finne hvor mye y øker per x-enhet."],
    `${math("k=28/4=7")}. Proporsjonalitetskonstanten er 7.`,
  ],
  "2py27-252": [
    ["Multipliser begge sider av y=120/x med x.", `Da får du ${math("xy=120")}.`, "Dette viser hvilken størrelse som er konstant når x endres."],
    `${math("y=120/x")} er det samme som ${math("xy=120")}. Produktet x·y er derfor alltid 120.`,
  ],
  "2py27-253": [
    ["Et gjennomsnitt beskriver summen fordelt på antall observasjoner, ikke hva som skjedde med hver enkelt observasjon.", "Tenk om én stor verdi kunne trekke gjennomsnittet opp selv om en annen verdi sank.", "Påstanden sier mer om enkeltobservasjonene enn gjennomsnittet kan dokumentere."],
    "Påstanden følger ikke. Gjennomsnittet kan stige selv om noen observasjoner synker.",
  ],
  "2py27-254": [
    ["Medianen deler de sorterte observasjonene i en nedre og en øvre halvdel.", "Verdier på selve medianplassen teller både som minst og høyst medianen.", "Vurder derfor hvor stor del av datasettet som ligger på eller over medianen."],
    "Påstanden er riktig: Etter den vanlige mediandefinisjonen er minst halvparten av observasjonene minst 12.",
  ],
  "2py27-255": [
    ["Gjennomsnitt og spredning beskriver to forskjellige egenskaper ved et datasett.", "Sammenlign for eksempel datasettene 4, 5, 6 og 0, 5, 10.", "De kan ha samme gjennomsnitt, men svært ulike avstander fra gjennomsnittet."],
    "Påstanden følger ikke. To datasett kan ha samme gjennomsnitt og svært forskjellig spredning.",
  ],
  "2py27-256": [
    ["Resultatet beskriver dem som valgte å delta i nettavstemningen.", "Spør om deltakerne er tilfeldig og representativt valgt fra hele befolkningen.", "Selvseleksjon kan gjøre at utvalget skiller seg systematisk fra befolkningen."],
    "Påstanden kan ikke konkluderes direkte. En nettavstemning må ha et representativt utvalg før resultatet kan generaliseres til hele befolkningen.",
  ],
  "2py27-257": [
    ["Sammenlign den viste høydeforskjellen når y-aksen starter på 0 og når den starter nær datapunktene.", "En avkuttet akse bruker en større del av diagramhøyden på den samme tallforskjellen.", "Vurder om dette kan forsterke det visuelle inntrykket uten å endre dataene."],
    "Påstanden er riktig. En avkuttet y-akse kan få en liten tallforskjell til å se stor ut.",
  ],
};
for (const [id, [hint, svar]] of Object.entries(interpretationRevisions)) setHintsAndAnswer(id, hint, svar);

const mixedRevisions = {
  "2py27-258": [[`Tierpotensen ${math("10^5")} betyr 100 000.`, `Skriv ${math("3{,}2\\cdot100\\,000")}.`, "Å gange med 100 000 flytter kommaet fem plasser mot høyre."], `${math("3{,}2\\cdot10^5=320\\,000")}.`],
  "2py27-259": [[`Skriv 45 % som desimaltallet ${math("0{,}45")}.`, `Regnestykket blir ${math("0{,}45\\cdot800")}.`, `Du kan dele opp 45 % i 40 % og 5 % av 800.`], `${math("0{,}45\\cdot800=360")}.`],
  "2py27-260": [[`Eksponenten 8 betyr at tallet 2 skal være faktor åtte ganger.`, `Du kan bygge videre ved å doble: ${math("2^4=16")}.`, `Da er ${math("2^8=(2^4)^2=16^2")}.`], `${math("2^8=256")}.`],
  "2py27-261": [["Tallene er allerede sortert fra minst til størst.", "Det er fem observasjoner, så medianen står på den tredje plassen.", "Tell deg fram til det tredje tallet i listen."], "Den tredje av de fem sorterte observasjonene er 9, så medianen er 9."],
  "2py27-262": [[`Erstatt x med 7 i uttrykket: ${math("6\\cdot7+5")}.`, `Regn multiplikasjonen først: ${math("6\\cdot7=42")}.`, "Legg deretter til 5."], `${math("6\\cdot7+5=42+5=47")}.`],
};
for (const [id, [hint, svar]] of Object.entries(mixedRevisions)) setHintsAndAnswer(id, hint, svar);

// Del 2: eksponentialmodeller.
for (const question of bank.oppgaver.filter((item) => item.variantfamilie.startsWith("d2-eksponential-"))) {
  if (question.variantfamilie === "d2-eksponential-d") continue;
  const input = question.kontroll.inndata;
  if (question.variantfamilie === "d2-eksponential-a") {
    const rate = (input.b - 1) * 100;
    setHintsAndAnswer(question.id, [
      `I modellen ${math("M(x)=a\\cdot b^x")} er startverdien funksjonsverdien når ${math("x=0")}.`,
      `Siden ${math("b^0=1")}, blir ${math(`M(0)=${number(input.a)}\\cdot1`)}.`,
      `Finn prosentendringen fra vekstfaktoren med ${math(`(${number(input.b)}-1)\\cdot100\\,\\%`)}.`,
    ], `Startverdien er ${math(number(input.a))}. Den prosentvise endringen er ${math(`(${number(input.b)}-1)\\cdot100\\,\\%=${decimal(rate, 2)}\\,\\%`)} per periode.`);
  } else if (question.variantfamilie === "d2-eksponential-b") {
    const result = question.fasit.verdier[0].verdi;
    setHintsAndAnswer(question.id, [
      `Bruk modellen ${math(`M(x)=${number(input.a)}\\cdot${number(input.b)}^x`)} og erstatt x med ${number(input.x)}.`,
      `Da skal du beregne ${math(`${number(input.a)}\\cdot${number(input.b)}^{${number(input.x)}}`)}.`,
      "Regn ut potensen i et digitalt verktøy før du multipliserer med startverdien, og rund som oppgaven ber om.",
    ], `${math(`M(${number(input.x)})=${number(input.a)}\\cdot${number(input.b)}^{${number(input.x)}}\\approx${number(result)}`)}.`);
  } else {
    const result = question.fasit.verdier[0].verdi;
    const relation = input.b > 1 ? "minst" : "høyst";
    setHintsAndAnswer(question.id, [
      `Skriv terskelkravet som ${math(`${number(input.a)}\\cdot${number(input.b)}^x`)} ${relation === "minst" ? "≥" : "≤"} ${math(number(input.terskel))}.`,
      "Lag en tabell med hele x-verdier, eller løs ulikheten digitalt. Start nær der grafen møter terskelen.",
      "Kontroller både den første perioden som oppfyller kravet og perioden rett før; ellers vet du ikke om perioden er den første.",
    ], `Ved ${math(`x=${number(result - 1)}`)} er kravet ennå ikke oppfylt, mens det er oppfylt ved ${math(`x=${number(result)}`)}. Terskelen passeres derfor første gang etter ${number(result)} perioder.`);
  }
}

// Del 2: lineære tilbud.
for (const question of bank.oppgaver.filter((item) => item.variantfamilie.startsWith("d2-lineaer-"))) {
  if (question.variantfamilie === "d2-lineaer-d") continue;
  const group = groups.get(question.oppgavegruppe.id);
  const { A, B } = group.data;
  if (question.variantfamilie === "d2-lineaer-a") {
    const x = question.kontroll.inndata.x;
    setQuestion(question.id, { hint: [
      `Hos A er prisen fastbeløpet ${math(number(A.fast))} pluss ${math(number(A.per_enhet))} ganger ${math("x")}. Hos B brukes fastbeløpet ${math(number(B.fast))} og satsen ${math(number(B.per_enhet))}.`,
      `Sett inn ${math(`x=${number(x)}`)}: ${math(`A(${number(x)})=${number(A.fast)}+${number(A.per_enhet)}\\cdot${number(x)}`)}.`,
      `Gjør det samme for B: ${math(`B(${number(x)})=${number(B.fast)}+${number(B.per_enhet)}\\cdot${number(x)}`)}.`,
    ] });
  } else if (question.variantfamilie === "d2-lineaer-b") {
    const [x, cost] = question.kontroll.resultat;
    const slopeDifference = Math.abs(A.per_enhet - B.per_enhet);
    const fixedDifference = Math.abs(A.fast - B.fast);
    setHintsAndAnswer(question.id, [
      `Samme pris betyr ${math("A(x)=B(x)")}: ${math(`${number(A.fast)}+${number(A.per_enhet)}x=${number(B.fast)}+${number(B.per_enhet)}x`)}.`,
      `Samle x-leddene og fastbeløpene på hver sin side. Da får du ${math(`${number(slopeDifference)}x=${number(fixedDifference)}`)}.`,
      "Del for å finne x, og sett deretter x-verdien inn i én av prismodellene for å finne felles pris.",
    ], `${math(`${number(A.fast)}+${number(A.per_enhet)}x=${number(B.fast)}+${number(B.per_enhet)}x`)} gir ${math(`x=${number(x)}`)}. Den felles prisen er ${math(number(cost))} kr.`);
  } else {
    const match = question.sporsmal.match(/x=(\d+)/);
    const x = Number(match?.[1]);
    setQuestion(question.id, { hint: [
      `Ikke avgjør ut fra fastbeløpet alene; satsen per enhet påvirker prisen når x er ${number(x)}.`,
      `Beregn ${math(`A(${number(x)})=${number(A.fast)}+${number(A.per_enhet)}\\cdot${number(x)}`)}.`,
      `Beregn også ${math(`B(${number(x)})=${number(B.fast)}+${number(B.per_enhet)}\\cdot${number(x)}`)} og velg det minste beløpet.`,
    ] });
  }
}

// Regresjon: konkret modellform, verktøybruk og innsetting.
const regressionForms = {
  "lineær": "y=ax+b",
  "eksponential": "y=a\\cdot b^x",
  "potens": "y=a\\cdot x^b",
  "andregrad": "y=ax^2+bx+c",
};
for (const question of bank.oppgaver.filter((item) => ["d2-regresjon-b", "d2-regresjon-c"].includes(item.variantfamilie))) {
  const input = question.kontroll.inndata;
  if (question.variantfamilie === "d2-regresjon-b") {
    setQuestion(question.id, { hint: [
      `Modelltypen fra a har formen ${math(regressionForms[input.modell])}. Parameterne som skal finnes, er bokstavene i denne formen.`,
      "Legg x-verdiene i én kolonne og de tilhørende y-verdiene i en annen. Velg riktig regresjonstype i verktøyet.",
      "Les av parameterne i samme rekkefølge som svarfeltene. Behold minst tre signifikante sifre, slik at senere beregninger ikke får unødvendig avrundingsfeil.",
    ] });
  } else {
    const sibling = bank.oppgaver.find((item) => item.oppgavegruppe?.id === question.oppgavegruppe.id && item.variantfamilie === "d2-regresjon-b");
    const coefficients = sibling.kontroll.resultat;
    let expression;
    if (input.modell === "lineær") expression = `${number(coefficients[0])}\\cdot${number(input.ny_x)}+${number(coefficients[1])}`;
    if (input.modell === "eksponential") expression = `${number(coefficients[0])}\\cdot${number(coefficients[1])}^{${number(input.ny_x)}}`;
    if (input.modell === "potens") expression = `${number(coefficients[0])}\\cdot${number(input.ny_x)}^{${number(coefficients[1])}}`;
    if (input.modell === "andregrad") expression = `${number(coefficients[0])}\\cdot${number(input.ny_x)}^2+${number(coefficients[1])}\\cdot${number(input.ny_x)}+${number(coefficients[2])}`;
    setQuestion(question.id, { hint: [
      "Bruk de samme parameterne som vises i løsningen fra oppgave b, slik at innsettingen og avrundingen kan etterprøves.",
      `Erstatt ${math("x")} med ${math(number(input.ny_x))}. Regnestykket blir ${math(expression)}.`,
      "Regn ut modellverdien og rund først til én desimal helt til slutt.",
    ] });
  }
}

// Standardavvik: skill uttrykkelig mellom populasjons- og utvalgsstandardavvik.
for (const question of byFamily("d2-statistikk-c")) {
  setQuestion(question.id, { hint: [
    "Standardavvik sammenligner observasjonenes typiske avstand fra gjennomsnittet; større avstander gir større standardavvik.",
    "Legg verdiene fra gruppe A og B i hver sin liste i et statistikkverktøy og beregn standardavvik for begge.",
    `Oppgaven ber om populasjonsstandardavvik, ofte merket ${math("\\sigma")} eller ${math("\\sigma_x")}, ikke utvalgsstandardavviket ${math("s")}. Velg gruppen med størst verdi.`,
  ] });
}

// Omvendte modeller: sett inn alle konkrete verdier før eleven skal løse.
for (const question of bank.oppgaver.filter((item) => ["d2-omvendt-b", "d2-omvendt-c"].includes(item.variantfamilie))) {
  const input = question.kontroll.inndata;
  if (question.variantfamilie === "d2-omvendt-b") {
    const result = question.fasit.verdier[0].verdi;
    setHintsAndAnswer(question.id, [
      `Bruk modellen ${math(`T(x)=${number(input.k)}/x+${number(input.fast)}`)} fra oppgave a.`,
      `Sett inn ${math(`x=${number(input.x)}`)}: ${math(`T(${number(input.x)})=${number(input.k)}/${number(input.x)}+${number(input.fast)}`)}.`,
      "Regn divisjonen før du legger til den faste tiden.",
    ], `${math(`T(${number(input.x)})=${number(input.k)}/${number(input.x)}+${number(input.fast)}=${number(result)}`)}.`);
  } else {
    const result = question.fasit.verdier[0].verdi;
    setHintsAndAnswer(question.id, [
      `Sett den oppgitte tiden inn på venstre side: ${math(`${number(input.T)}=${number(input.k)}/x+${number(input.fast)}`)}.`,
      `Trekk fra den faste tiden: ${math(`${number(input.T - input.fast)}=${number(input.k)}/x`)}.`,
      `Multipliser med ${math("x")} og del på ${math(number(input.T - input.fast))} for å isolere ${math("x")}.`,
    ], `${math(`${number(input.T)}=${number(input.k)}/x+${number(input.fast)}`)} gir ${math(`${number(input.T - input.fast)}=${number(input.k)}/x`)}, og dermed ${math(`x=${number(input.k)}/${number(input.T - input.fast)}=${number(result)}`)}.`);
  }
}

// Korte digitale modelloppgaver.
for (const question of bank.oppgaver.filter((item) => ["d2-kort-eksponentialverdi", "d2-kort-potensmodell"].includes(item.variantfamilie))) {
  const input = question.kontroll.inndata;
  const result = question.fasit.verdier[0].verdi;
  if (question.variantfamilie === "d2-kort-eksponentialverdi") {
    setHintsAndAnswer(question.id, [
      `I modellen ${math("f(x)=a\\cdot b^x")} skal x-verdien stå som eksponent.`,
      `Sett inn tallene: ${math(`f(${number(input.x)})=${number(input.a)}\\cdot${number(input.faktor)}^{${number(input.x)}}`)}.`,
      "Regn ut potensen først, multipliser med startverdien og rund som oppgaven krever.",
    ], `${math(`f(${number(input.x)})=${number(input.a)}\\cdot${number(input.faktor)}^{${number(input.x)}}\\approx${number(result)}`)}.`);
  } else {
    setHintsAndAnswer(question.id, [
      `I potensmodellen ${math("f(x)=a\\cdot x^b")} er x grunntallet i potensen.`,
      `Sett inn tallene: ${math(`f(${number(input.x)})=${number(input.a)}\\cdot${number(input.x)}^{${number(input.b)}}`)}.`,
      "Regn ut potensen før du multipliserer med faktoren a, og rund først til slutt.",
    ], `${math(`f(${number(input.x)})=${number(input.a)}\\cdot${number(input.x)}^{${number(input.b)}}\\approx${number(result)}`)}.`);
  }
}

// Figuroppgave c: bruk den konkrete formelen fra deloppgave b.
const figureSubstitutions = {
  "d2-figur-01": "4\\cdot25+2",
  "d2-figur-02": "12^2+4\\cdot12",
  "d2-figur-03": "2\\cdot40+4",
  "d2-figur-04": "18\\cdot19/2",
  "d2-figur-05": "(30+2)^2-30^2",
};
for (const question of byFamily("d2-figur-c")) {
  const sibling = bank.oppgaver.find((item) => item.oppgavegruppe?.id === question.oppgavegruppe.id && item.variantfamilie === "d2-figur-b");
  const formula = sibling.fasit.riktige[0];
  const expression = figureSubstitutions[question.oppgavegruppe.id];
  const result = question.fasit.verdier[0].verdi;
  setHintsAndAnswer(question.id, [
    `Fra oppgave b har du formelen ${formula}.`,
    `Erstatt n med figurnummeret i oppgaven. Da får du ${math(expression)}.`,
    "Følg regnerekkefølgen: regn potenser og multiplikasjon før addisjon eller subtraksjon.",
  ], `${math(`${expression}=${number(result)}`)}. Figuren har ${number(result)} elementer.`);
}

// Måloppgavene i prosentcasene skal bruke den faktiske sluttverdien og riktig ulikhetsord.
for (const question of byFamily("d2-sammensatt-prosent-d")) {
  const group = groups.get(question.oppgavegruppe.id);
  const sibling = bank.oppgaver.find((item) => item.oppgavegruppe?.id === question.oppgavegruppe.id && item.variantfamilie === "d2-sammensatt-prosent-b");
  const finalValue = sibling.fasit.verdier[0].verdi;
  const isMaximum = /høyst/.test(question.sporsmal);
  setQuestion(question.id, { hint: [
    `Sluttverdien fra b er ${math(number(finalValue))} ${group.data.enhet}.`,
    `Målet er ${isMaximum ? "en øvre grense" : "en nedre grense"} på ${math(number(group.data.mål))} ${group.data.enhet}. Ordet «${isMaximum ? "høyst" : "minst"}» avgjør hvilken side av grensen som er godkjent.`,
    `Sammenlign ${math(number(finalValue))} med ${math(number(group.data.mål))} og velg konklusjonen som følger av ulikheten.`,
  ] });
}

// Del 2-programmering: konkrete sporingssteg og presise løsningsforslag.
const codeRevisions = {
  "2py27-441": [["If-vilkåret tar bare med verdier som er minst 50.", "Verdiene som tas med, er 55, 61, 73, 66 og 58.", "Variabelen antall øker én gang for hver av disse verdiene."], "Fem verdier er minst 50, så den første utskriften er 5."],
  "2py27-442": [["Den andre utskriften er gjennomsnittet av verdiene som er minst 50.", `Legg sammen ${math("55+61+73+66+58=313")}.`, `Del summen på antallet 5 og rund til én desimal.`], `Gjennomsnittet er ${math("313/5=62{,}6")}.`],
  "2py27-443": [["Med ny grense 60 tas bare verdier som er minst 60 med.", "Gå gjennom listen og marker 61, 73 og 66.", "Variabelen antall øker én gang for hver av de tre markerte verdiene."], "Etter endringen teller programmet 3 verdier."],
  "2py27-445": [["While-løkken fortsetter så lenge verdi er større enn 500.", `Etter hver runde multipliseres verdien med ${math("0{,}88")}, og aar øker med 1.`, "Lag en tabell over aar og verdi og stopp ved den første verdien som er høyst 500."], "Den første verdien som er høyst 500 kommer etter 5 runder, så programmet skriver først ut 5."],
  "2py27-446": [["Den andre utskriften er verdien idet while-løkken stopper.", `Beregn ${math("900\\cdot0{,}88^5")}.`, "Programmet runder denne verdien til én desimal."], `${math("900\\cdot0{,}88^5\\approx475")}, så den andre utskriften er 475.`],
  "2py27-447": [["Den nye løkken stopper ved første verdi som er høyst 600.", `Følg ${math("900\\cdot0{,}88^n")} for hele n-verdier.`, "Kontroller både n=3 og n=4 for å finne første gang grensen er nådd."], "Verdien er fortsatt over 600 etter 3 år, men under etter 4 år. Programmet skriver ut 4."],
  "2py27-449": [["Programmet fjerner én minste og én største verdi.", "Fra listen fjernes 12 og 45, slik at 14, 15, 17, 18 og 21 står igjen.", "Den numeriske utskriften er gjennomsnittet av de fem gjenværende verdiene."], `${math("(14+15+17+18+21)/5=17")}. Programmet skriver ut 17.`],
  "2py27-450": [["Listen inneholder opprinnelig sju observasjoner.", "Én remove-linje fjerner den minste og den andre fjerner den største.", "Trekk de to fjernede observasjonene fra antallet 7."], "Etter de to remove-linjene er 5 observasjoner igjen."],
  "2py27-451": [["Når 60 legges til, blir 12 fortsatt minste verdi og 60 blir største verdi.", "Etter fjerningen står 14, 15, 17, 18, 21 og 45 igjen.", `Beregn ${math("(14+15+17+18+21+45)/6")}.`], `${math("130/6\\approx21{,}7")}. Programmet skriver ut 21,7.`],
  "2py27-453": [["Programmet tester heltallige x-verdier fra 0 og oppover.", `Vilkåret er ${math("200+5x\\le80+8x")}.`, `Omskriv til ${math("120\\le3x")} og finn det minste heltallet som oppfyller dette.`], `${math("120\\le3x")} gir ${math("x\\ge40")}. Den første utskriften er 40.`],
  "2py27-454": [["Fra første del vet du at programmet skriver ut x=40.", `Sett denne verdien inn i A: ${math("A=200+5\\cdot40")}.`, "Regn multiplikasjonen før du legger til fastbeløpet."], `${math("A(40)=200+5\\cdot40=400")}.`],
  "2py27-455": [[`Etter endringen er vilkåret ${math("170+5x\\le80+8x")}.`, `Omskriv til ${math("90\\le3x")}.`, "Finn det minste heltallet som oppfyller ulikheten."], `${math("90\\le3x")} gir ${math("x\\ge30")}. Programmet skriver ut 30.`],
  "2py27-457": [[`Medianplasseringen beregnes som ${math("(26+1)/2=13{,}5")}.`, "De kumulative frekvensene blir 4, 11, 20 og 26.", "Programmet stopper ved den første kumulative frekvensen som er minst 13,5."], "Den kumulative frekvensen passerer 13,5 i kategori 3, så programmet skriver ut 3."],
  "2py27-458": [["Det totale antallet observasjoner er summen av frekvensene.", `Legg sammen alle fire frekvensene: ${math("4+7+9+6")}.`, "Denne summen brukes også når programmet finner medianplasseringen."], `${math("4+7+9+6=26")}. Frekvenslisten inneholder 26 observasjoner.`],
  "2py27-459": [[`Den nye totalen er fortsatt 26, så medianplasseringen er ${math("13{,}5")}.`, "De nye kumulative frekvensene er 4, 14, 16 og 26.", "Finn den første kategorien der kumulativ frekvens er minst 13,5."], "Kumulativ frekvens er 14 allerede i kategori 2, så programmet skriver ut 2."],
};
for (const [id, [hint, svar]] of Object.entries(codeRevisions)) setHintsAndAnswer(id, hint, svar);

// Del 1: alle regnetunge familier får synlige mellomregninger som faktisk kan
// utføres for hånd. Hintene viser en mulig løsning, ikke bare en arbeidsordre.
const percentOfWorked = {
  "2py27-001": [
    `Finn først 10 %: ${math("240/10=24")}.`,
    `Fem prosent er halvparten av 10 %: ${math("24/2=12")}.`,
    `Legg sammen delene: ${math("24+12=36")}. Dermed er 15 % av 240 lik 36.`,
  ],
  "2py27-002": [
    "Tenk på 360 billetter som fire like store deler.",
    `Finn størrelsen på én del: ${math("360/4=90")}.`,
    "Én av fire like deler er 25 %, så 90 billetter er svaret.",
  ],
  "2py27-003": [
    `Finn 30 % som tre 10 %-deler: ${math("450/10=45")} og ${math("3\\cdot45=135")}.`,
    `Finn 2 % som to 1 %-deler: ${math("450/100=4{,}5")} og ${math("2\\cdot4{,}5=9")}.`,
    `Legg sammen 30 % og 2 %: ${math("135+9=144")}.`,
  ],
  "2py27-004": [
    "Tenk på 640 medlemmer som åtte like store deler.",
    `Finn størrelsen på én del: ${math("640/8=80")}.`,
    "Én av åtte like deler er 12,5 %, så det er 80 trenere.",
  ],
  "2py27-005": [
    `Gang først med 8 ved å dele opp 875: ${math("8\\cdot875=8\\cdot800+8\\cdot75=6\\,400+600=7\\,000")}.`,
    `Åtte prosent betyr 8 per 100, så del deretter på 100: ${math("7\\,000/100=70")}.`,
    "Dermed er 8 % av 875 lik 70.",
  ],
};
for (const [id, hint] of Object.entries(percentOfWorked)) setQuestion(id, { hint });

const wholeFromPartWorked = {
  "2py27-011": [`12 % tilsvarer ${math("48")}. Del begge tallene på 3, slik at 4 % tilsvarer ${math("16")}.`, `Del én gang til på 4: 1 % tilsvarer ${math("4")}.`, `Gang med 100: ${math("4\\cdot100=400")}. Hele gruppen har 400 personer.`],
  "2py27-012": [`20 % tilsvarer ${math("64")}.`, "Fem like deler på 20 % utgjør 100 %.", `Regn ${math("64\\cdot5=320")}. Hele gruppen har 320 personer.`],
  "2py27-013": [`25 % tilsvarer ${math("190")}.`, "25 % er en firedel av helheten, så helheten består av fire slike deler.", `Regn ${math("190\\cdot4=760")}. Hele gruppen har 760 personer.`],
  "2py27-014": [`30 % tilsvarer ${math("162")}. Del begge tallene på 3: 10 % tilsvarer ${math("54")}.`, "100 % består av ti like 10 %-deler.", `Regn ${math("54\\cdot10=540")}. Hele gruppen har 540 personer.`],
  "2py27-015": [`40 % tilsvarer ${math("360")}. Del begge tallene på 2: 20 % tilsvarer ${math("180")}.`, "100 % består av fem like 20 %-deler.", `Regn ${math("180\\cdot5=900")}. Hele gruppen har 900 personer.`],
};
for (const [id, hint] of Object.entries(wholeFromPartWorked)) {
  const question = questions.get(id);
  const result = question.kontroll.resultat[0];
  setHintsAndAnswer(id, hint, `Hele gruppen har ${math(number(result))} personer.`);
}

for (const question of byFamily("d1-finne-prosent")) {
  const { del, hel } = question.kontroll.inndata;
  const divisor = greatestCommonDivisor(del, hel);
  const numerator = del / divisor;
  const denominator = hel / divisor;
  const result = question.kontroll.resultat[0];
  setHintsAndAnswer(question.id, [
    `Skriv delen over totalen: ${math(`\\frac{${number(del)}}{${number(hel)}}`)}. Tallet over brøkstreken er delen, og tallet under er totalen.`,
    reducedFractionStep(del, hel, divisor),
    `Gjør den forkortede brøken om til prosent: ${math(`\\frac{${number(numerator)}}{${number(denominator)}}\\cdot100\\,\\%=${number(result)}\\,\\%`)}.`,
  ], `Andelen er ${math(`${number(result)}\\,\\%`)}.`);
}

const percentagePointWorked = {
  "2py27-016": { old: 18, next: 27, difference: 9, relative: 50, fraction: "9/18=1/2" },
  "2py27-017": { old: 40, next: 34, difference: -6, relative: -15, fraction: "-6/40=-15/100" },
  "2py27-018": { old: 6, next: 9, difference: 3, relative: 50, fraction: "3/6=1/2" },
  "2py27-019": { old: 72, next: 63, difference: -9, relative: -12.5, fraction: "-9/72=-1/8" },
  "2py27-020": { old: 12, next: 15, difference: 3, relative: 25, fraction: "3/12=1/4" },
};
for (const [id, values] of Object.entries(percentagePointWorked)) {
  const divisor = greatestCommonDivisor(values.difference, values.old);
  const numerator = values.difference / divisor;
  const denominator = values.old / divisor;
  setHintsAndAnswer(id, [
    `Finn først forskjellen mellom prosenttallene: ${math(`${number(values.next)}-${number(values.old)}=${number(values.difference)}`)} prosentpoeng.`,
    `Relativ endring er forskjellen delt på den gamle andelen. ${reducedFractionStep(values.difference, values.old, divisor)}`,
    `Den forkortede brøken er ${math(`\\frac{${number(numerator)}}{${number(denominator)}}=${number(values.relative)}\\,\\%`)}. Fortegnet viser om andelen økte eller sank.`,
  ], `Endringen er ${math(number(values.difference))} prosentpoeng og ${math(`${number(values.relative)}\\,\\%`)}.`);
}

setHintsAndAnswer("2py27-026", [
  `Velg en tenkt startverdi på 100. Etter en økning på 20 % blir verdien ${math("100+20=120")}.`,
  `Nedgangen på 20 % regnes av 120. Siden ${math("20\\,\\%")} av 120 er 24, blir sluttverdien ${math("120-24=96")}.`,
  "Fra 100 til 96 er en nedgang på 4 av 100, altså 4 %.",
], `Sluttverdien er 96 % av startverdien. Den samlede endringen er derfor ${math("-4\\,\\%")}.`);
setHintsAndAnswer("2py27-027", [
  `Velg en tenkt startverdi på 100. Etter en nedgang på 10 % blir verdien ${math("100-10=90")}.`,
  `Øk deretter 90 med 10 %. Ti prosent av 90 er 9, så sluttverdien blir ${math("90+9=99")}.`,
  "Fra 100 til 99 er en nedgang på 1 av 100, altså 1 %.",
], `Sluttverdien er 99 % av startverdien. Den samlede endringen er derfor ${math("-1\\,\\%")}.`);

const offerWorked = {
  "2py27-038": { parts: ["20 % er en femdel av 900.", "900/5=180"], fixed: 150, decision: "prosenttilbudet" },
  "2py27-039": { parts: ["10 % av 1 250 er 125, og 5 % er halvparten av dette: 62,5.", "125+62{,}5=187{,}5"], fixed: 220, decision: "kroneavslaget" },
  "2py27-040": { parts: [`25 % er en firedel av 680. En firedel kan finnes ved å halvere to ganger: ${math("680/2=340")} og ${math("340/2=170")}.`, "340/2=170"], fixed: 190, decision: "kroneavslaget" },
  "2py27-041": { parts: ["10 % av 2 400 er 240, og 2 % er 48.", "240+48=288"], fixed: 320, decision: "kroneavslaget" },
  "2py27-042": { parts: ["10 % av 1 500 er 150, og 8 % er 120.", "150+120=270"], fixed: 250, decision: "prosenttilbudet" },
};
for (const [id, values] of Object.entries(offerWorked)) {
  setHintsAndAnswer(id, [
    `Regn prosentavslaget i deler som er enkle uten kalkulator: ${values.parts[0]}`,
    `Regn ut prosentavslaget: ${math(values.parts[1])} kr.`,
    `Sammenlign ${math(values.parts[1].split("=")[1])} kr med ${math(number(values.fixed))} kr. Det største avslaget er best.`,
  ], `Prosentavslaget er ${math(values.parts[1])} kr. Derfor gir ${values.decision} størst avslag.`);
}
setHintsAndAnswer("2py27-040", [
  "Gjør prosenttilbudet om til kroner. Siden 25 % er en firedel, skal 680 deles i fire like deler.",
  `Finn firedelen uten lang divisjon ved å halvere to ganger. Første halvering er ${math("680/2=340")}.`,
  `Halver 340 én gang til: ${math("340/2=170")}. Dette beløpet er avslaget på 25 %.`,
  `Sammenlign prosentavslaget med ${math("190")} kr. Det største kronebeløpet gir størst avslag.`,
], `Prosentavslaget er ${math("680/4=170")} kr. Derfor gir kroneavslaget størst avslag.`);

setHintsAndAnswer("2py27-070", [
  `Skriv ${math("10^{1/2}=\\sqrt{10}")}. Du trenger ikke finne en desimalverdi for roten.`,
  `Sammenlign kvadrater: Siden ${math("10<16")}, er ${math("\\sqrt{10}<\\sqrt{16}=4")}. Dessuten er ${math("2^2=4")}.`,
  `Regn ut det siste uttrykket: ${math("\\sqrt[3]{125}=5")}. Dermed er rekkefølgen rotuttrykket, 4 og 5.`,
], `Siden ${math("\\sqrt{10}<4")} og ${math("\\sqrt[3]{125}=5")}, er riktig rekkefølge ${math("10^{1/2}")}, ${math("2^2")}, ${math("\\sqrt[3]{125}")}.`);

const standardFormWorked = {
  "2py27-063": { factor: "3\\cdot2=6", exponent: "5+3=8", result: "6\\cdot10^8" },
  "2py27-064": { factor: "8{,}4/2{,}1=4", exponent: "7-2=5", result: "4\\cdot10^5" },
  "2py27-065": { factor: "6\\cdot5=30", exponent: "-4+6=2", result: "30\\cdot10^2=3\\cdot10^3" },
  "2py27-066": { factor: "9{,}6/3{,}2=3", exponent: "-3-(-5)=2", result: "3\\cdot10^2" },
  "2py27-067": { factor: "4{,}5\\cdot2=9", exponent: "8+(-3)=5", result: "9\\cdot10^5" },
};
for (const [id, values] of Object.entries(standardFormWorked)) {
  setHintsAndAnswer(id, [
    `Regn med faktorene foran tierpotensene: ${math(values.factor)}.`,
    `Regn med eksponentene: ${math(values.exponent)}. Ved produkt legges de sammen; ved divisjon trekkes de fra.`,
    `Sett delene sammen og pass på at faktoren er minst 1 og mindre enn 10: ${math(values.result)}.`,
  ], `Resultatet er ${math(values.result)}.`);
}

{
  const question = questions.get("2py27-091");
  const correct = math("n+5");
  setQuestion(question.id, {
    hint: [
      "Fra figur 1 til figur n skjer økningen n−1 ganger.",
      `Start med 6 ruter og legg til ${math("n-1")}: ${math("6+(n-1)=n+5")}.`,
      `Sett inn ${math("n=18")}: ${math("18+5=23")}.`,
    ],
    svar: `Formelen er ${correct}. Figur 18 har 23 ruter.`,
    fasit: {
      ...question.fasit,
      valg: {
        ...question.fasit.valg,
        riktige: [correct],
        alternativer: [math("n+6"), math("6n+1"), math("7n"), correct],
      },
    },
    kontroll: { ...question.kontroll, riktige: [correct] },
  });
}

setQuestion("2py27-114", {
  sporsmal: `Reisetiden er omvendt proporsjonal med farten. En tur tar ${math("45")} minutter når farten er ${math("80")} km/t. Hvor lang tid tar turen med ${math("60")} km/t under de samme forutsetningene?`,
  hint: [
    "For samme strekning er produktet av fart og tid konstant.",
    `Finn produktet for den første turen: ${math("80\\cdot45=3\\,600")}.`,
    `Del på den nye farten: ${math("3\\,600/60=60")} minutter.`,
  ],
  svar: `Turen tar ${math("60")} minutter. Kontroll: ${math("60\\cdot60=3\\,600")}.`,
});

setHintsAndAnswer("2py27-127", [
  `Test proporsjonalitet: Forholdene ${math("y/x")} er 2, 4, 6 og 8. De er ikke konstante.`,
  `Test omvendt proporsjonalitet: Produktene ${math("xy")} er 2, 16, 54 og 128. De er heller ikke konstante.`,
  "Test linearitet: Første differanser i y er 6, 10 og 14. Siden de ikke er like, er sammenhengen heller ikke lineær.",
], "Tabellen viser ingen av de tre sammenhengene.");

const outlierMedians = {
  "2py27-158": { before: 14, after: "(14+15)/2=14{,}5" },
  "2py27-159": { before: 22, after: "(22+24)/2=23" },
  "2py27-160": { before: 8, after: "(8+9)/2=8{,}5" },
  "2py27-161": { before: 34, after: "(34+35)/2=34{,}5" },
  "2py27-162": { before: 10, after: "(10+10)/2=10" },
};
for (const [id, values] of Object.entries(outlierMedians)) {
  setHintsAndAnswer(id, [
    `Før den nye verdien legges til, er medianen den midterste verdien: ${math(number(values.before))}.`,
    `Etterpå er det seks sorterte verdier. Medianen finnes fra de to i midten: ${math(values.after)}. Medianen flytter seg derfor lite eller ikke i det hele tatt.`,
    "Den nye verdien er mye større enn de andre og går direkte inn i summen som brukes i gjennomsnittet. Derfor trekkes gjennomsnittet langt mer opp.",
  ], "Gjennomsnittet påvirkes mest. Den svært store verdien endrer summen kraftig, mens plasseringen av de midterste verdiene nesten ikke endres.");
}

for (const question of byFamily("d1-kode-sum")) {
  const values = question.kontroll.inndata.verdier;
  const running = [];
  let total = 0;
  for (const value of values) { total += value; running.push(total); }
  setHintsAndAnswer(question.id, [
    `Variabelen sum starter på 0. Første listeverdi er ${number(values[0])}, så summen blir ${number(running[0])}.`,
    `Etter hver ny verdi blir de løpende summene ${running.slice(1).map((value) => number(value)).join(", ")}.`,
    `Når listen er slutt, er sum ${number(total)}. Det er denne verdien print-linjen skriver ut.`,
  ], `Programmet skriver ut ${math(number(total))}.`);
}

for (const [id, revision] of Object.entries(calculatorFreeCodeGrowth)) {
  const sequence = revision.values.map((value) => number(value)).join(" → ");
  setHintsAndAnswer(id, [
    `Løkken har ${number(revision.runder)} runder, så faktoren ${math(number(revision.faktor))} skal brukes akkurat ${number(revision.runder)} ganger.`,
    `Spor verdi etter hver runde: ${math(sequence)}.`,
    `Etter siste runde er verdi ${math(number(revision.values.at(-1)))}. round uten antall desimaler beholder dette heltallet.`,
  ], `Programmet skriver ut ${math(number(revision.values.at(-1)))}.`);
}

const codeConditionValues = {
  "2py27-223": { x: 72, first: false, second: true, result: "middels" },
  "2py27-224": { x: 91, first: false, second: false, result: "høy" },
  "2py27-225": { x: 42, first: true, second: null, result: "lav" },
  "2py27-226": { x: 80, first: false, second: false, result: "høy" },
  "2py27-227": { x: 50, first: false, second: true, result: "middels" },
};
for (const [id, values] of Object.entries(codeConditionValues)) {
  const secondStep = values.first
    ? "Det første vilkåret er sant, så programmet hopper over elif og else."
    : `Det første vilkåret er usant. Deretter er ${math(`${values.x}<80`)} ${values.second ? "sant" : "usant"}.`;
  setHintsAndAnswer(id, [
    `Sett inn ${math(`x=${values.x}`)} i det første vilkåret ${math("x<50")}. Det er ${values.first ? "sant" : "usant"}.`,
    secondStep,
    `Den valgte grenen setter svar til «${values.result}». Det er denne teksten print-linjen viser.`,
  ], `Programmet skriver «${values.result}».`);
}

for (const [id, revision] of Object.entries(calculatorFreeThresholds)) {
  const result = revision.values.length - 1;
  const states = revision.values.map((value, index) => `n=${index}: ${number(value)}`).join(", ");
  setHintsAndAnswer(id, [
    `Start med ${math(`verdi=${number(revision.start)}`)} og ${math("n=0")}. Løkken kjører bare mens ${math(`verdi${revision.comparator}${number(revision.grense)}`)} er sant.`,
    `Spor begge variablene etter hver runde: ${states}.`,
    `Ved ${math(`n=${result}`)} er vilkåret usant for første gang. Da stopper løkken før en ny multiplikasjon.`,
  ], `Løkken kjøres ${math(number(result))} ganger, så programmet skriver ut ${math(number(result))}.`);
}

// Språket i en eksamensoppgave skal hjelpe eleven å forstå hva tallene betyr.
// Ren algebra kan fortsatt være abstrakt, men anvendte oppgaver får navngitte
// størrelser, realistiske enheter og korte situasjoner som tallene passer inn i.
function reviseContext(id, { sporsmal, svar, units, labels, dataCategories } = {}) {
  const question = questions.get(id);
  const changes = {};
  if (sporsmal) changes.sporsmal = sporsmal;
  if (svar) changes.svar = svar;
  if (units || labels) {
    changes.fasit = {
      ...question.fasit,
      verdier: question.fasit.verdier.map((answer, index) => ({
        ...answer,
        ...(units?.[index] !== undefined ? { enhet: units[index] } : {}),
        ...(labels?.[index] ? { etikett: labels[index] } : {}),
      })),
    };
  }
  if (dataCategories) {
    changes.data = {
      ...question.data,
      tabell: { ...question.data.tabell, kategori: dataCategories },
    };
  }
  setQuestion(id, changes);
}

const groupIntroductions2027 = {
  "d2-prosent-01": `Prisen på en varmepumpe er først ${math("28\\,500")} kr. Prisen settes ned med ${math("18\\,\\%")} og økes senere med ${math("25\\,\\%")}.`,
  "d2-prosent-02": `En organisasjon har først ${math("4\\,200")} medlemmer. Medlemstallet øker med ${math("12\\,\\%")} ett år og synker med ${math("8\\,\\%")} året etter.`,
  "d2-prosent-03": `En virksomhet bruker først ${math("185\\,000")} kWh per år. Energibruken reduseres først med ${math("15\\,\\%")} og deretter med ${math("6\\,\\%")}.`,
  "d2-prosent-04": `En nettbutikk har først en årlig omsetning på ${math("760\\,000")} kr. Omsetningen øker først med ${math("20\\,\\%")} og deretter med ${math("10\\,\\%")} året etter.`,
  "d2-prosent-05": `En virksomhet har først et årlig utslipp på ${math("1\\,280")} tonn. Utslippet reduseres med ${math("22\\,\\%")} og øker deretter med ${math("5\\,\\%")}.`,
  "d2-eksponential-01": `Antall månedlige besøk på en digital tjeneste modelleres med ${math("M(x)=3\\,200\\cdot1{,}09^x")}, der ${math("x")} er antall måneder etter start.`,
  "d2-eksponential-02": `Restmengden av et stoff modelleres med ${math("M(x)=850\\cdot0{,}82^x")}, der ${math("x")} er antall timer etter start og ${math("M(x)")} måles i gram.`,
  "d2-eksponential-03": `Antall elsykler i en ordning modelleres med ${math("M(x)=640\\cdot1{,}18^x")}, der ${math("x")} er antall år etter start.`,
  "d2-eksponential-04": `Det årlige vannforbruket modelleres med ${math("M(x)=240\\,000\\cdot0{,}94^x")}, der ${math("x")} er antall år etter start og ${math("M(x)")} måles i m³.`,
  "d2-eksponential-05": `Saldoen på en sparekonto modelleres med ${math("M(x)=18\\,000\\cdot1{,}045^x")}, der ${math("x")} er antall år etter at pengene ble satt inn.`,
  "d2-lineaer-01": `To bildelingstjenester bruker prismodellene ${math("A(x)=180+4{,}5x")} og ${math("B(x)=60+7{,}5x")}, der ${math("x")} er kjørelengden i kilometer og prisen måles i kroner.`,
  "d2-lineaer-02": `To mobilabonnement bruker prismodellene ${math("A(x)=299+0{,}8x")} og ${math("B(x)=149+1{,}8x")}, der ${math("x")} er databruken i GB og prisen måles i kroner.`,
  "d2-lineaer-03": `To treningssentre bruker prismodellene ${math("A(x)=499")} og ${math("B(x)=199+30x")}, der ${math("x")} er antall besøk i en måned og prisen måles i kroner.`,
  "d2-lineaer-04": `To firmaer leier ut samme type verktøy. Prisene modelleres med ${math("A(x)=250+85x")} og ${math("B(x)=550+45x")}, der ${math("x")} er antall døgn.`,
  "d2-lineaer-05": `To ladeavtaler bruker prismodellene ${math("A(x)=79+2{,}4x")} og ${math("B(x)=199+1{,}8x")}, der ${math("x")} er energimengden i kWh og prisen måles i kroner.`,
  "d2-statistikk-01": "Tabellen viser reisetiden til skolen, målt i minutter, for elevene i gruppe A og gruppe B.",
  "d2-statistikk-02": "Tabellen viser daglig skjermtid i minutter for deltakerne i gruppe A og gruppe B.",
  "d2-statistikk-03": "Tabellen viser antall produserte enheter på hvert skift for produksjonslinje A og produksjonslinje B.",
  "d2-statistikk-04": "Tabellen viser ventetid i minutter for kunder ved servicepunkt A og servicepunkt B.",
  "d2-statistikk-05": "Tabellen viser ukentlig treningsmengde i timer for deltakerne i gruppe A og gruppe B.",
  "d2-gruppert-01": "Fordelingen viser reisetiden til jobb for 50 ansatte. Reisetidene er gruppert i intervaller og målt i minutter.",
  "d2-gruppert-02": "Fordelingen viser hvor mange minutter 60 kunder oppholdt seg i en butikk. Tidene er gruppert i intervaller.",
  "d2-gruppert-03": "Fordelingen viser antall enheter som ble produsert per time i 50 registrerte timer. Resultatene er gruppert i intervaller.",
  "d2-gruppert-04": "Fordelingen viser daglig energibruk for 50 dager. Energibruken er gruppert i intervaller og målt i kWh.",
  "d2-gruppert-05": "Fordelingen viser ukentlig treningsmengde for 50 personer. Treningstiden er gruppert i intervaller og målt i timer.",
  "d2-figur-01": "De fire første figurene viser benker som settes sammen etter det samme mønsteret.",
  "d2-figur-02": "De fire første figurene viser hvor mange fliser som trengs rundt et kvadrat som vokser fra figur til figur.",
  "d2-figur-03": "De fire første figurene viser stoler rundt bord som kobles sammen på samme måte.",
  "d2-figur-04": "De fire første figurene viser et trekantmønster av prikker.",
  "d2-figur-05": "De fire første figurene viser antall ruter i en ramme som vokser fra figur til figur.",
  "d2-samfunn-01": "Tabellen viser hvor mange personer som oppga bil, kollektivtransport, sykkel eller gange som sin vanligste reisemåte i to undersøkelser.",
  "d2-samfunn-02": "Tabellen viser energiproduksjon i GWh fra fire energikilder i to ulike år.",
  "d2-samfunn-03": "Tabellen viser antall søkere til fire utdanningsområder i to ulike år.",
  "d2-samfunn-04": "Tabellen viser avfallsmengden i tonn fordelt på fire avfallstyper i to ulike år.",
  "d2-samfunn-05": "Tabellen viser antall besøk, målt i tusen, til fire kulturaktiviteter i to ulike år.",
};

for (const [id, innledning] of Object.entries(groupIntroductions2027)) {
  groups.get(id).innledning = innledning;
}

for (const [id, xUnit] of Object.entries({
  "d2-eksponential-01": "måneder",
  "d2-eksponential-02": "timer",
  "d2-eksponential-03": "år",
  "d2-eksponential-04": "år",
  "d2-eksponential-05": "år",
})) {
  groups.get(id).data.x_enhet = xUnit;
}

const del1ContextRevisions = {
  "2py27-001": {
    sporsmal: `På en aktivitetsdag deltar ${math("240")} elever. ${math("15\\,\\%")} av elevene velger klatring. Hvor mange elever velger klatring?`,
    svar: `Siden 15 % er 10 % og 5 %, får vi ${math("240/10+(240/10)/2=24+12=36")}. Det er ${math("36")} elever som velger klatring.`,
    units: ["elever"],
  },
  "2py27-002": {
    sporsmal: `En konsert har ${math("360")} billetter. Den første dagen blir ${math("25\\,\\%")} av billettene solgt. Hvor mange billetter blir solgt den første dagen?`,
    svar: `Siden 25 % er en firedel, får vi ${math("360/4=90")}. Det blir solgt ${math("90")} billetter.`,
    units: ["billetter"],
  },
  "2py27-003": {
    sporsmal: `En arbeidsplass har ${math("450")} ansatte. ${math("32\\,\\%")} sykler til jobb. Hvor mange ansatte sykler til jobb?`,
    svar: `Del 32 % i 30 % og 2 %: ${math("135+9=144")}. Det er ${math("144")} ansatte som sykler til jobb.`,
    units: ["ansatte"],
  },
  "2py27-004": {
    sporsmal: `Et idrettslag har ${math("640")} medlemmer. ${math("12{,}5\\,\\%")} av medlemmene er trenere. Hvor mange trenere har idrettslaget?`,
    svar: `Siden 12,5 % er en åttedel, får vi ${math("640/8=80")}. Idrettslaget har ${math("80")} trenere.`,
    units: ["trenere"],
  },
  "2py27-005": {
    sporsmal: `I en spørreundersøkelse kom det inn ${math("875")} svar. ${math("8\\,\\%")} svarte «vet ikke». Hvor mange svarte «vet ikke»?`,
    svar: `${math("875\\cdot8/100=7\\,000/100=70")}. Det var ${math("70")} slike svar.`,
    units: ["svar"],
  },
  "2py27-006": { sporsmal: `På en skole reiser ${math("18")} av ${math("80")} elever med tog. Hvor mange prosent av elevene reiser med tog?` },
  "2py27-007": { sporsmal: `I en kantine velger ${math("35")} av ${math("125")} kunder vegetarretten. Hvor mange prosent velger vegetarretten?` },
  "2py27-008": { sporsmal: `I en undersøkelse svarer ${math("66")} av ${math("240")} personer at de bruker kollektivtransport daglig. Hvor mange prosent er dette?` },
  "2py27-009": { sporsmal: `I en medlemsundersøkelse svarer ${math("117")} av ${math("360")} medlemmer ja. Hvor mange prosent svarer ja?` },
  "2py27-010": { sporsmal: `Et teater solgte ${math("275")} av ${math("625")} billetter på nett. Hvor mange prosent av billettene ble solgt på nett?` },
  "2py27-011": {
    sporsmal: `${math("48")} frivillige utgjør ${math("12\\,\\%")} av alle som deltar på en festival. Hvor mange deltakere er det totalt?`,
    svar: `Det er ${math("400")} deltakere på festivalen.`,
    units: ["deltakere"],
  },
  "2py27-012": {
    sporsmal: `${math("64")} sykler utgjør ${math("20\\,\\%")} av alle registrerte kjøretøy i en telling. Hvor mange kjøretøy ble registrert?`,
    svar: `Det ble registrert ${math("320")} kjøretøy.`,
    units: ["kjøretøy"],
  },
  "2py27-013": {
    sporsmal: `${math("190")} billetter utgjør ${math("25\\,\\%")} av alle billettene til en forestilling. Hvor mange billetter er det totalt?`,
    svar: `Det er ${math("760")} billetter totalt.`,
    units: ["billetter"],
  },
  "2py27-014": {
    sporsmal: `${math("162")} ansatte jobber skift. Dette er ${math("30\\,\\%")} av de ansatte i bedriften. Hvor mange ansatte har bedriften?`,
    svar: `Bedriften har ${math("540")} ansatte.`,
    units: ["ansatte"],
  },
  "2py27-015": {
    sporsmal: `${math("360")} plasser utgjør ${math("40\\,\\%")} av kapasiteten i en konsertsal. Hvor mange plasser har salen?`,
    svar: `Konsertsalen har ${math("900")} plasser.`,
    units: ["plasser"],
  },
  "2py27-016": { sporsmal: `Andelen som reiser kollektivt, økte fra ${math("18\\,\\%")} til ${math("27\\,\\%")}. Oppgi økningen i prosentpoeng og i prosent.` },
  "2py27-017": { sporsmal: `Andelen som svarte ja i en undersøkelse, sank fra ${math("40\\,\\%")} til ${math("34\\,\\%")}. Oppgi endringen i prosentpoeng og i prosent.` },
  "2py27-018": { sporsmal: `Renten på et lån økte fra ${math("6\\,\\%")} til ${math("9\\,\\%")}. Oppgi økningen i prosentpoeng og i prosent.` },
  "2py27-019": { sporsmal: `Andelen fornybar energi sank fra ${math("72\\,\\%")} til ${math("63\\,\\%")}. Oppgi endringen i prosentpoeng og i prosent.` },
  "2py27-020": { sporsmal: `Andelen elever med fravær en bestemt dag økte fra ${math("12\\,\\%")} til ${math("15\\,\\%")}. Oppgi økningen i prosentpoeng og i prosent.` },
  "2py27-021": { sporsmal: `Prisen på en vare settes ned med ${math("35\\,\\%")}. Hvilken vekstfaktor skal prisen multipliseres med?` },
  "2py27-022": { sporsmal: `Antall brukere av en tjeneste multipliseres med vekstfaktoren ${math("0{,}82")}. Hva er den prosentvise endringen i antall brukere?` },
  "2py27-023": { sporsmal: `Vannforbruket i en bygning reduseres med ${math("7\\,\\%")}. Hvilken vekstfaktor skal forbruket multipliseres med?` },
  "2py27-024": { sporsmal: `Medlemstallet i et idrettslag multipliseres med vekstfaktoren ${math("1{,}12")}. Hva er den prosentvise endringen i medlemstallet?` },
  "2py27-025": { sporsmal: `Prisen på en tjeneste økes med ${math("45\\,\\%")}. Hvilken vekstfaktor skal prisen multipliseres med?` },
  "2py27-026": {
    sporsmal: `Prisen på en sykkel økes først med ${math("20\\,\\%")} og settes senere ned med ${math("20\\,\\%")}. Hva er den samlede prosentvise endringen i prisen?`,
    svar: `Sluttprisen er ${math("96\\,\\%")} av den opprinnelige prisen. Den samlede endringen er derfor ${math("-4\\,\\%")}.`,
  },
  "2py27-027": {
    sporsmal: `Medlemstallet i en forening synker først med ${math("10\\,\\%")} og øker deretter med ${math("10\\,\\%")}. Hva er den samlede prosentvise endringen?`,
    svar: `Det nye medlemstallet er ${math("99\\,\\%")} av det opprinnelige. Den samlede endringen er derfor ${math("-1\\,\\%")}.`,
  },
  "2py27-077": {
    sporsmal: `En modell for malingsbehov er ${math("D=0{,}04m+1{,}2")}, der ${math("m")} er veggarealet i m² og ${math("D")} er antall liter maling. Finn ${math("D")} når ${math("m=70")}.`,
    svar: `${math("D=0{,}04\\cdot70+1{,}2=2{,}8+1{,}2=4")} liter.`,
    units: ["liter"],
  },
  "2py27-078": {
    sporsmal: `En tank inneholder ${math("120")} liter vann og fylles med ${math("3{,}5")} liter per minutt. Modellen er ${math("V(t)=3{,}5t+120")}. Hvor mange minutter tar det før tanken inneholder ${math("365")} liter?`,
    svar: `${math("t=(365-120)/3{,}5=70")}. Det tar ${math("70")} minutter.`,
    units: ["minutter"],
  },
  "2py27-079": {
    sporsmal: `En drosjetur koster ${math("K(x)=8x+45")} kroner, der ${math("x")} er antall kilometer. Hvor lang er turen når prisen er ${math("285")} kr?`,
    svar: `${math("x=(285-45)/8=30")}. Turen er ${math("30")} km.`,
    units: ["km"],
  },
  "2py27-080": {
    sporsmal: `En ladeavtale har kostnaden ${math("K(x)=2{,}4x+150")} kroner, der ${math("x")} er antall kWh. Hvor mange kWh er brukt når kostnaden er ${math("390")} kr?`,
    svar: `${math("x=(390-150)/2{,}4=100")}. Det er brukt ${math("100")} kWh.`,
    units: ["kWh"],
  },
  "2py27-081": {
    sporsmal: `Et sparebeløp modelleres med ${math("S(m)=12m+75")}, der ${math("m")} er antall måneder. Etter hvor mange måneder er sparebeløpet ${math("495")} kr?`,
    svar: `${math("m=(495-75)/12=35")}. Det tar ${math("35")} måneder.`,
    units: ["måneder"],
  },
  "2py27-082": {
    sporsmal: `Høyden til en plante modelleres med ${math("H(d)=0{,}8d+36")}, der ${math("d")} er antall dager og høyden måles i centimeter. Etter hvor mange dager er planten ${math("100")} cm høy?`,
    svar: `${math("d=(100-36)/0{,}8=80")}. Planten er ${math("100")} cm høy etter ${math("80")} dager.`,
    units: ["dager"],
  },
};

for (const [id, revision] of Object.entries(del1ContextRevisions)) reviseContext(id, revision);

const reversePercentContexts = {
  "2py27-028": {
    sporsmal: `En årsavgift ble økt med ${math("20\\,\\%")} til ${math("816")} kr. Hva var årsavgiften før økningen?`,
    subject: "årsavgiften",
    unit: "kr",
    changedPercent: 120,
    chunkPercent: 10,
    chunkCount: 12,
    chunkValue: 68,
    wholeCount: 10,
  },
  "2py27-029": {
    sporsmal: `En jakke ble satt ned med ${math("10\\,\\%")} og kostet da ${math("630")} kr. Hva kostet jakken før rabatten?`,
    subject: "prisen på jakken",
    unit: "kr",
    changedPercent: 90,
    chunkPercent: 10,
    chunkCount: 9,
    chunkValue: 70,
    wholeCount: 10,
  },
  "2py27-030": {
    sporsmal: `Prisen på en sykkel ble økt med ${math("25\\,\\%")} til ${math("1\\,500")} kr. Hva kostet sykkelen før prisøkningen?`,
    subject: "prisen på sykkelen",
    unit: "kr",
    changedPercent: 125,
    chunkPercent: 25,
    chunkCount: 5,
    chunkValue: 300,
    wholeCount: 4,
  },
  "2py27-031": {
    sporsmal: `Et årskort ble satt ned med ${math("5\\,\\%")} og kostet da ${math("760")} kr. Hva kostet årskortet før rabatten?`,
    subject: "prisen på årskortet",
    unit: "kr",
    changedPercent: 95,
    chunkPercent: 5,
    chunkCount: 19,
    chunkValue: 40,
    wholeCount: 20,
  },
  "2py27-032": {
    sporsmal: `Medlemstallet i en organisasjon økte med ${math("50\\,\\%")} til ${math("1\\,950")}. Hvor mange medlemmer hadde organisasjonen før økningen?`,
    subject: "medlemstallet",
    unit: "medlemmer",
    changedPercent: 150,
    chunkPercent: 50,
    chunkCount: 3,
    chunkValue: 650,
    wholeCount: 2,
  },
};

for (const [id, context] of Object.entries(reversePercentContexts)) {
  const question = questions.get(id);
  const { ny, endring } = question.kontroll.inndata;
  const original = question.kontroll.resultat[0];
  const absoluteChange = Math.abs(endring);
  const changeWord = endring > 0 ? "økning" : "rabatt";
  const paidOperation = endring > 0 ? "+" : "-";
  const valueUnit = context.unit === "kr" ? " kr" : " medlemmer";
  const changeChunks = absoluteChange / context.chunkPercent;
  const changeValue = Math.abs(ny - original);
  const checkedChange = changeChunks === 1
    ? `${math(`${number(absoluteChange)}\\,\\%`)} er én slik del, altså ${math(number(changeValue))}${valueUnit}`
    : `${math(`${number(absoluteChange)}\\,\\%`)} er ${math(number(changeChunks))} slike deler: ${math(`${number(context.chunkValue)}\\cdot${number(changeChunks)}=${number(changeValue)}`)}${valueUnit}`;
  setQuestion(id, {
    sporsmal: context.sporsmal,
    hint: [
      `Hva vet vi? Etter en ${changeWord} på ${math(`${number(absoluteChange)}\\,\\%`)} er ${context.subject} ${math(number(ny))}${valueUnit}. Vi skal finne ${context.subject} før endringen, altså verdien som tilsvarer ${math("100\\,\\%")}.`,
      `Finn prosenten etter endringen: Start med ${math("100\\,\\%")}. Regn ${math(`100${paidOperation}${number(absoluteChange)}=${number(context.changedPercent)}\\,\\%`)}. Dermed vet vi at ${math(`${number(context.changedPercent)}\\,\\%`)} tilsvarer ${math(number(ny))}${valueUnit}.`,
      `Del prosenten etter endringen i ${math(number(context.chunkCount))} like deler: ${math(`${number(context.changedPercent)}/${number(context.chunkCount)}=${number(context.chunkPercent)}\\,\\%`)}.`,
      `Finn verdien av én del: De ${math(number(context.chunkCount))} like delene er til sammen ${math(number(ny))}${valueUnit}. Derfor deler vi ${math(number(ny))} på ${math(number(context.chunkCount))}: ${math(`${number(ny)}/${number(context.chunkCount)}=${number(context.chunkValue)}`)}. Én del, altså ${math(`${number(context.chunkPercent)}\\,\\%`)}, er ${math(number(context.chunkValue))}${valueUnit}.`,
      `Bygg opp ${math("100\\,\\%")} med samme deler: ${math(`100/${number(context.chunkPercent)}=${number(context.wholeCount)}`)}, så hele verdien består av ${math(number(context.wholeCount))} slike deler. Regn ${math(`${number(context.chunkValue)}\\cdot${number(context.wholeCount)}=${number(original)}`)}.`,
      `Svar på spørsmålet: ${context.subject[0].toUpperCase()}${context.subject.slice(1)} var ${math(number(original))} ${context.unit} før endringen.`,
      endring > 0
        ? `Sjekk svaret: ${checkedChange}. Da blir ${math(`${number(original)}+${number(changeValue)}=${number(ny)}`)}, akkurat som i oppgaven.`
        : `Sjekk svaret: ${checkedChange}. Da blir ${math(`${number(original)}-${number(changeValue)}=${number(ny)}`)}, akkurat som i oppgaven.`,
    ],
    svar: `${context.subject[0].toUpperCase()}${context.subject.slice(1)} var ${math(number(original))} ${context.unit}.`,
    fasit: {
      ...question.fasit,
      verdier: question.fasit.verdier.map((answer) => ({ ...answer, enhet: context.unit })),
    },
  });
}

const del1AppliedRevisions = {
  "2py27-103": {
    sporsmal: `Fire penner koster ${math("74")} kr. Prisen ${math("K")} er proporsjonal med antall penner ${math("x")}, slik at ${math("K=kx")}. Finn ${math("k")}, og tolk svaret.`,
    svar: `${math("k=74/4=18{,}5")}. Én penn koster ${math("18{,}5")} kr.`,
    units: ["kr per penn"],
  },
  "2py27-104": {
    sporsmal: `Seks rundstykker koster ${math("51")} kr. Prisen ${math("K")} er proporsjonal med antall rundstykker ${math("x")}, slik at ${math("K=kx")}. Finn ${math("k")}, og tolk svaret.`,
    svar: `${math("k=51/6=8{,}5")}. Ett rundstykke koster ${math("8{,}5")} kr.`,
    units: ["kr per rundstykke"],
  },
  "2py27-105": {
    sporsmal: `En maskin produserer ${math("120")} deler på ${math("8")} timer med jevn fart. Antall deler ${math("y")} er proporsjonalt med tiden ${math("x")}, slik at ${math("y=kx")}. Finn ${math("k")}, og tolk svaret.`,
    svar: `${math("k=120/8=15")}. Maskinen produserer ${math("15")} deler per time.`,
    units: ["deler per time"],
  },
  "2py27-106": {
    sporsmal: `Fem meter stoff koster ${math("325")} kr. Prisen ${math("K")} er proporsjonal med lengden ${math("x")}, slik at ${math("K=kx")}. Finn ${math("k")}, og tolk svaret.`,
    svar: `${math("k=325/5=65")}. Meterprisen er ${math("65")} kr.`,
    units: ["kr per meter"],
  },
  "2py27-107": {
    sporsmal: `En bil kjører ${math("210")} km på ${math("12")} liter drivstoff. Kjørelengden ${math("y")} regnes som proporsjonal med drivstoffmengden ${math("x")}, slik at ${math("y=kx")}. Finn ${math("k")}, og tolk svaret.`,
    svar: `${math("k=210/12=17{,}5")}. Modellen tilsvarer ${math("17{,}5")} km per liter.`,
    units: ["km per liter"],
  },
  "2py27-108": {
    sporsmal: `${math("3")} kg poteter koster ${math("84")} kr. Hva koster ${math("7")} kg når prisen er proporsjonal med vekten?`,
    svar: `Kiloprisen er ${math("84/3=28")} kr. Da koster ${math("7")} kg ${math("7\\cdot28=196")} kr.`,
  },
  "2py27-109": {
    sporsmal: `${math("5")} meter gavebånd koster ${math("42{,}5")} kr. Hva koster ${math("12")} meter når prisen er proporsjonal med lengden?`,
    svar: `Meterprisen er ${math("42{,}5/5=8{,}5")} kr. Da koster ${math("12")} meter ${math("12\\cdot8{,}5=102")} kr.`,
  },
  "2py27-110": {
    sporsmal: `${math("8")} bussbilletter koster ${math("260")} kr. Hva koster ${math("14")} billetter når alle billettene har samme pris?`,
    svar: `Én billett koster ${math("260/8=32{,}5")} kr. Da koster ${math("14")} billetter ${math("14\\cdot32{,}5=455")} kr.`,
  },
  "2py27-111": {
    sporsmal: `${math("6")} meter kabel koster ${math("450")} kr. Hva koster ${math("9")} meter når prisen er proporsjonal med lengden?`,
    svar: `Meterprisen er ${math("450/6=75")} kr. Da koster ${math("9")} meter ${math("9\\cdot75=675")} kr.`,
  },
  "2py27-112": {
    sporsmal: `En oppskrift til ${math("4")} porsjoner bruker ${math("18")} dl suppe. Hvor mye suppe trengs til ${math("15")} porsjoner når mengden er proporsjonal med antall porsjoner?`,
    svar: `Per porsjon trengs ${math("18/4=4{,}5")} dl. Til ${math("15")} porsjoner trengs ${math("15\\cdot4{,}5=67{,}5")} dl.`,
  },
  "2py27-113": {
    sporsmal: `Seks arbeidere bruker ${math("20")} timer på en jobb. Hvor lang tid bruker ${math("8")} arbeidere dersom jobben er den samme og alle arbeider i samme tempo?`,
  },
  "2py27-115": {
    sporsmal: `Fire like pumper tømmer et basseng på ${math("18")} timer. Hvor lang tid bruker ${math("9")} like pumper på samme vannmengde?`,
  },
  "2py27-116": {
    sporsmal: `Tolv like maskiner bruker ${math("30")} dager på en produksjonsordre. Hvor lang tid bruker ${math("20")} slike maskiner på den samme ordren?`,
  },
  "2py27-117": {
    sporsmal: `Fem like kraner flytter en bestemt last på ${math("24")} timer. Hvor lang tid bruker ${math("16")} kraner på den samme lasten?`,
  },
  "2py27-118": {
    sporsmal: `Tiden for å pakke en forsendelse modelleres med ${math("T(x)=240/x+5")}, der ${math("x")} er antall arbeidere og ${math("T(x)")} måles i minutter. Finn ${math("T(8)")}. Hvor mange minutter i modellen er uavhengige av antall arbeidere?`,
    svar: `${math("T(8)=240/8+5=35")} minutter. Konstantleddet viser at ${math("5")} minutter ikke avhenger av antall arbeidere.`,
    units: ["minutter", "minutter"],
    labels: ["Samlet tid", "Fast tid"],
  },
  "2py27-119": {
    sporsmal: `Tiden for å rigge et arrangement modelleres med ${math("T(x)=360/x+12")}, der ${math("x")} er antall arbeidere og ${math("T(x)")} måles i minutter. Finn ${math("T(18)")}. Hvor mange minutter i modellen er uavhengige av antall arbeidere?`,
    svar: `${math("T(18)=360/18+12=32")} minutter. Konstantleddet viser at ${math("12")} minutter ikke avhenger av antall arbeidere.`,
    units: ["minutter", "minutter"],
    labels: ["Samlet tid", "Fast tid"],
  },
  "2py27-120": {
    sporsmal: `Tiden for å sortere en bunke skjemaer modelleres med ${math("T(x)=150/x+4")}, der ${math("x")} er antall arbeidere og ${math("T(x)")} måles i minutter. Finn ${math("T(10)")}. Hvor mange minutter i modellen er uavhengige av antall arbeidere?`,
    svar: `${math("T(10)=150/10+4=19")} minutter. Konstantleddet viser at ${math("4")} minutter ikke avhenger av antall arbeidere.`,
    units: ["minutter", "minutter"],
    labels: ["Samlet tid", "Fast tid"],
  },
  "2py27-121": {
    sporsmal: `Tiden for å kontrollere en vareleveranse modelleres med ${math("T(x)=480/x+7")}, der ${math("x")} er antall arbeidere og ${math("T(x)")} måles i minutter. Finn ${math("T(16)")}. Hvor mange minutter i modellen er uavhengige av antall arbeidere?`,
    svar: `${math("T(16)=480/16+7=37")} minutter. Konstantleddet viser at ${math("7")} minutter ikke avhenger av antall arbeidere.`,
    units: ["minutter", "minutter"],
    labels: ["Samlet tid", "Fast tid"],
  },
  "2py27-122": {
    sporsmal: `Tiden for en varetelling modelleres med ${math("T(x)=900/x+15")}, der ${math("x")} er antall arbeidere og ${math("T(x)")} måles i minutter. Finn ${math("T(30)")}. Hvor mange minutter i modellen er uavhengige av antall arbeidere?`,
    svar: `${math("T(30)=900/30+15=45")} minutter. Konstantleddet viser at ${math("15")} minutter ikke avhenger av antall arbeidere.`,
    units: ["minutter", "minutter"],
    labels: ["Samlet tid", "Fast tid"],
  },
};

for (const [id, revision] of Object.entries(del1AppliedRevisions)) reviseContext(id, revision);

const frequencyContexts = [
  ["2py27-143", 1, "en kundemåling"],
  ["2py27-144", 2, "en elevundersøkelse"],
  ["2py27-145", 3, "en kursvurdering"],
  ["2py27-146", 4, "en publikumsundersøkelse"],
  ["2py27-147", 1, "en serviceundersøkelse"],
];
for (const [id, rating, context] of frequencyContexts) {
  const question = questions.get(id);
  const total = question.kontroll.inndata.frekvenser.reduce((sum, value) => sum + value, 0);
  const frequency = question.kontroll.inndata.frekvenser[rating - 1];
  const cumulative = question.kontroll.inndata.frekvenser.slice(0, rating).reduce((sum, value) => sum + value, 0);
  reviseContext(id, {
    sporsmal: `Deltakerne i ${context} ga en vurdering fra 1 til 4. Tabellen viser frekvensene. Finn relativ frekvens i prosent for vurdering ${rating}, og kumulativ frekvens til og med denne vurderingen.`,
    svar: `Det er ${math(number(total))} svar. Relativ frekvens er ${math(`${number(frequency)}/${number(total)}\\cdot100\\,\\%=${number(frequency / total * 100)}\\,\\%`)}, og kumulativ frekvens til og med vurdering ${rating} er ${math(number(cumulative))}.`,
    dataCategories: [1, 2, 3, 4],
  });
}

const missingAverageContexts = {
  "2py27-148": { noun: "dagstemperaturene", values: "8, 11, 14, 17", count: 5, mean: 13, result: 15, unit: "°C" },
  "2py27-149": { noun: "reisetidene", values: "22, 25, 28, 30, 35", count: 6, mean: 29, result: 34, unit: "minutter" },
  "2py27-150": { noun: "poengsummene", values: "4, 7, 9, 10, 15", count: 6, mean: 9, result: 9, unit: "poeng" },
  "2py27-151": { noun: "testresultatene", values: "60, 72, 75, 81", count: 5, mean: 74, result: 82, unit: "poeng" },
  "2py27-152": { noun: "ventetidene", values: "12, 18, 21, 24, 27", count: 6, mean: 20, result: 18, unit: "minutter" },
};
for (const [id, context] of Object.entries(missingAverageContexts)) {
  reviseContext(id, {
    sporsmal: `${context.noun[0].toUpperCase()}${context.noun.slice(1)} er ${math(context.values)} ${context.unit}. Én observasjon mangler. Gjennomsnittet av alle ${context.count} observasjonene er ${math(number(context.mean))} ${context.unit}. Finn den manglende observasjonen.`,
    svar: `Totalsummen må være ${math(`${number(context.mean)}\\cdot${context.count}=${number(context.mean * context.count)}`)}. Den manglende observasjonen er ${math(number(context.result))} ${context.unit}.`,
    units: [context.unit],
  });
}

const conciseExamWording = {
  "2py27-099": { sporsmal: `Vurder påstanden: «Uttrykkene ${math("2(x+4)")} og ${math("2x+4")} er like for alle ${math("x")}.»` },
  "2py27-163": {
    sporsmal: "I en liten bedrift tjener direktøren langt mer enn de andre ansatte. Hvilket sentralmål gir best bilde av en typisk lønn?",
    svar: "Medianen gir best bilde av en typisk lønn fordi den påvirkes lite av den svært høye direktørlønnen.",
  },
  "2py27-164": {
    sporsmal: "Hvilken framstilling passer best for å vise hvordan strømforbruket utvikler seg fra måned til måned?",
    svar: "Et linjediagram passer best fordi målingene følger en tidsrekkefølge.",
  },
  "2py27-165": {
    sporsmal: "Reisetider er gruppert i sammenhengende intervaller. Hvilken framstilling passer best for å vise fordelingen?",
    svar: "Et histogram passer best for grupperte, sammenhengende måleverdier.",
  },
  "2py27-166": {
    sporsmal: "En butikk vil finne den skostørrelsen som selges oftest. Hvilket sentralmål skal butikken bruke?",
    svar: "Typetallet skal brukes fordi det viser den vanligste skostørrelsen.",
  },
  "2py27-167": {
    sporsmal: "Noen få svært dyre boliger trekker prisene i et område kraftig opp. Hvilket sentralmål gir best bilde av en typisk boligpris?",
    svar: "Medianen gir best bilde av en typisk boligpris fordi den påvirkes lite av de dyreste boligene.",
  },
  "2py27-178": {
    sporsmal: `Et mobilabonnement koster ${math("149")} kr per måned og ${math("3")} kr per brukt GB. La ${math("x")} være antall GB. Velg modellen for månedskostnaden ${math("K(x)")}.`,
  },
  "2py27-181": {
    sporsmal: `En tank inneholder ${math("240")} liter vann og tømmes med ${math("8")} liter per minutt. La ${math("x")} være antall minutter. Velg modellen for vannmengden ${math("f(x)")}.`,
  },
  "2py27-248": { sporsmal: `Et abonnement har kostnadsmodellen ${math("K(x)=250+6x")}. Hva betyr tallet ${math("250")} i modellen?` },
  "2py27-251": { sporsmal: `En proporsjonal graf går gjennom punktet ${math("(4,28)")}. Hva er proporsjonalitetskonstanten?` },
  "2py27-252": { sporsmal: `En omvendt proporsjonal sammenheng har modellen ${math("y=120/x")}. Hvilken påstand er riktig?` },
  "2py27-262": { sporsmal: `Finn verdien av ${math("6x+5")} når ${math("x=7")}.` },
};
for (const [id, revision] of Object.entries(conciseExamWording)) reviseContext(id, revision);

{
  const question = questions.get("2py27-249");
  const correct = "Modellen sier at tanken er tom etter 30 minutter.";
  setQuestion(question.id, {
    sporsmal: `Vannmengden i en tank modelleres med ${math("V(t)=900-30t")}, der ${math("t")} er antall minutter. Hva betyr det at grafen krysser ${math("t")}-aksen ved ${math("30")}?`,
    svar: `Siden ${math("V(30)=0")}, sier modellen at tanken er tom etter ${math("30")} minutter.`,
    fasit: {
      ...question.fasit,
      riktige: [correct],
      alternativer: question.fasit.alternativer.map((option) =>
        option === "Modellen sier at volumet er 0 etter 30 tidsenheter." ? correct : option),
    },
    kontroll: { ...question.kontroll, riktige: [correct] },
  });
}

{
  const question = questions.get("2py27-250");
  const oldCorrect = "Størrelsen synker med 20 % per periode.";
  const correct = "Algemengden synker med 20 % per uke.";
  setQuestion(question.id, {
    sporsmal: `En algekultur modelleres eksponentielt. Algemengden multipliseres med ${math("0{,}8")} hver uke. Hvilken tolkning er riktig?`,
    svar: `Faktoren ${math("0{,}8")} betyr at ${math("80\\,\\%")} er igjen hver uke. Algemengden synker derfor med ${math("20\\,\\%")} per uke.`,
    fasit: {
      ...question.fasit,
      riktige: [correct],
      alternativer: question.fasit.alternativer.map((option) => option === oldCorrect ? correct : option),
    },
    kontroll: { ...question.kontroll, riktige: [correct] },
  });
}

const intersectionContexts = {
  "2py27-183": { context: "To mobilabonnement", x: "antall GB", unit: "GB" },
  "2py27-184": { context: "To trykkerier", x: "antall plakater", unit: "plakater" },
  "2py27-185": { context: "To bildelingstjenester", x: "antall kjørte kilometer", unit: "km" },
  "2py27-186": { context: "To ladeavtaler", x: "antall kWh", unit: "kWh" },
  "2py27-187": { context: "To vaskeritjenester", x: "antall plagg", unit: "plagg" },
};
for (const [id, context] of Object.entries(intersectionContexts)) {
  const question = questions.get(id);
  const { a1, b1, a2, b2 } = question.kontroll.inndata;
  const [xValue, price] = question.kontroll.resultat;
  reviseContext(id, {
    sporsmal: `${context.context} har kostnadsmodellene ${math(`A(x)=${number(b1)}+${number(a1)}x`)} og ${math(`B(x)=${number(b2)}+${number(a2)}x`)}. Her er ${math("x")} ${context.x}, og kostnadene måles i kroner. Når koster tjenestene det samme, og hva er kostnaden da?`,
    svar: `${math(`${number(b1)}+${number(a1)}x=${number(b2)}+${number(a2)}x`)} gir ${math(`x=${number(xValue)}`)}. Tjenestene koster det samme ved ${math(number(xValue))} ${context.unit}, og kostnaden er da ${math(number(price))} kr.`,
    units: [context.unit, "kr"],
    labels: [`Forbruk ved samme kostnad (${context.unit})`, "Felles kostnad"],
  });
}

const exponentialInterpretations = {
  "2py27-193": { subject: "Antall abonnenter", xUnit: "år", yUnit: "abonnenter" },
  "2py27-194": { subject: "Stoffmengden i gram", xUnit: "timer", yUnit: "gram" },
  "2py27-195": { subject: "Antall bakterier i en prøve", xUnit: "timer", yUnit: "bakterier" },
  "2py27-196": { subject: "Et årlig utslipp i tonn", xUnit: "år", yUnit: "tonn" },
  "2py27-197": { subject: "Medlemstallet i en organisasjon", xUnit: "år", yUnit: "medlemmer" },
};
for (const [id, context] of Object.entries(exponentialInterpretations)) {
  const question = questions.get(id);
  const { a, faktor } = question.kontroll.inndata;
  const percent = normalizedNumber((faktor - 1) * 100);
  reviseContext(id, {
    sporsmal: `${context.subject} modelleres med ${math(`f(x)=${number(a)}\\cdot${number(faktor)}^x`)}, der ${math("x")} er antall ${context.xUnit} etter start. Oppgi startverdien og den prosentvise endringen per ${context.xUnit === "år" ? "år" : "time"}.`,
    svar: `Startverdien er ${math(number(a))} ${context.yUnit}. Den prosentvise endringen er ${math(`${number(percent)}\\,\\%`)} per ${context.xUnit === "år" ? "år" : "time"}.`,
    units: [context.yUnit, "%"],
    labels: ["Startverdi", `Prosentvis endring per ${context.xUnit === "år" ? "år" : "time"}`],
  });
}

const averageRateContexts = {
  "2py27-198": {
    sporsmal: `Vannmengden i en tank øker fra ${math("15")} liter ved ${math("t=0")} minutter til ${math("45")} liter ved ${math("t=10")} minutter. Finn den gjennomsnittlige vekstfarten.`,
    svar: `Den gjennomsnittlige vekstfarten er ${math("(45-15)/(10-0)=3")} liter per minutt.`, unit: "liter per minutt",
  },
  "2py27-199": {
    sporsmal: `Temperaturen i en ovn øker fra ${math("30")} °C ved ${math("t=2")} minutter til ${math("78")} °C ved ${math("t=18")} minutter. Finn den gjennomsnittlige vekstfarten.`,
    svar: `Den gjennomsnittlige vekstfarten er ${math("(78-30)/(18-2)=3")} °C per minutt.`, unit: "°C per minutt",
  },
  "2py27-200": {
    sporsmal: `Vannmengden i et basseng øker fra ${math("12")} m³ ved ${math("t=5")} minutter til ${math("61")} m³ ved ${math("t=25")} minutter. Finn den gjennomsnittlige vekstfarten.`,
    svar: `Den gjennomsnittlige vekstfarten er ${math("(61-12)/(25-5)=2{,}45")} m³ per minutt.`, unit: "m³ per minutt",
  },
  "2py27-201": {
    sporsmal: `Temperaturen i en væske synker fra ${math("120")} °C ved ${math("t=0")} minutter til ${math("72")} °C ved ${math("t=8")} minutter. Finn den gjennomsnittlige vekstfarten.`,
    svar: `Den gjennomsnittlige vekstfarten er ${math("(72-120)/(8-0)=-6")} °C per minutt.`, unit: "°C per minutt",
  },
  "2py27-202": {
    sporsmal: `En produksjonslinje har produsert ${math("250")} enheter etter ${math("10")} timer og ${math("610")} enheter etter ${math("40")} timer. Finn den gjennomsnittlige vekstfarten.`,
    svar: `Den gjennomsnittlige vekstfarten er ${math("(610-250)/(40-10)=12")} enheter per time.`, unit: "enheter per time",
  },
};
for (const [id, revision] of Object.entries(averageRateContexts)) {
  reviseContext(id, { sporsmal: revision.sporsmal, svar: revision.svar, units: [revision.unit] });
}

for (const id of ["2py27-243", "2py27-244", "2py27-245", "2py27-246", "2py27-247"]) {
  const question = questions.get(id);
  const result = question.kontroll.resultat[0];
  const total = question.kontroll.inndata.kumulativ.at(-1);
  reviseContext(id, {
    sporsmal: "Deltakerne vurderte et arrangement fra 1 til 4. Tabellen viser frekvens og kumulativ frekvens. Hva er medianvurderingen?",
    svar: `Det er ${math(number(total))} svar. Den midterste plasseringen passeres ved vurdering ${math(number(result))}, så medianvurderingen er ${math(number(result))}.`,
    units: ["vurdering"],
    dataCategories: [1, 2, 3, 4],
  });
}

const del2ShortContexts = {
  "2py27-263": {
    sporsmal: `Prisen på et abonnement økes først med ${math("10\\,\\%")} og deretter med ${math("12\\,\\%")} året etter. Hva er den samlede prosentvise endringen i prisen?`,
    svar: `Samlet vekstfaktor er ${math("1{,}1\\cdot1{,}12=1{,}232")}. Abonnementsprisen har økt med ${math("23{,}2\\,\\%")}.`,
  },
  "2py27-264": {
    sporsmal: `Energibruken i en bygning reduseres først med ${math("8\\,\\%")} og deretter med ${math("5\\,\\%")} året etter. Hva er den samlede prosentvise endringen?`,
    svar: `Samlet vekstfaktor er ${math("0{,}92\\cdot0{,}95=0{,}874")}. Energibruken har gått ned med ${math("12{,}6\\,\\%")}.`,
  },
  "2py27-265": {
    sporsmal: `Medlemstallet i en organisasjon øker først med ${math("25\\,\\%")} og synker deretter med ${math("10\\,\\%")} året etter. Hva er den samlede prosentvise endringen?`,
    svar: `Samlet vekstfaktor er ${math("1{,}25\\cdot0{,}9=1{,}125")}. Medlemstallet har økt med ${math("12{,}5\\,\\%")}.`,
  },
  "2py27-276": {
    sporsmal: `Et nettsted har ${math("1\\,000")} daglige besøk. Antallet øker med ${math("10\\,\\%")} per år. Etter hvor mange hele år er antallet for første gang minst ${math("1\\,300")}?`,
    svar: `Første gang grensen passeres er etter ${math("3")} år. Da gir modellen omtrent ${math("1\\,331")} daglige besøk.`, units: ["år"],
  },
  "2py27-277": {
    sporsmal: `Et årlig utslipp er ${math("2\\,500")} tonn og reduseres med ${math("8\\,\\%")} per år. Etter hvor mange hele år er utslippet for første gang høyst ${math("1\\,900")} tonn?`,
    svar: `Første gang grensen passeres er etter ${math("4")} år. Da gir modellen et utslipp på omtrent ${math("1\\,791")} tonn.`, units: ["år"],
  },
  "2py27-278": {
    sporsmal: `En organisasjon har ${math("800")} medlemmer. Medlemstallet øker med ${math("15\\,\\%")} per år. Etter hvor mange hele år er medlemstallet for første gang minst ${math("1\\,200")}?`,
    svar: `Første gang grensen passeres er etter ${math("3")} år. Da gir modellen omtrent ${math("1\\,217")} medlemmer.`, units: ["år"],
  },
  "2py27-279": {
    sporsmal: `En maskin er verdt ${math("5\\,000")} kr og synker i verdi med ${math("12\\,\\%")} per år. Etter hvor mange hele år er verdien for første gang høyst ${math("3\\,000")} kr?`,
    svar: `Første gang grensen passeres er etter ${math("4")} år. Da er modellverdien omtrent ${math("2\\,998{,}5")} kr.`, units: ["år"],
  },
  "2py27-280": {
    sporsmal: `Et arrangement har ${math("1\\,200")} deltakere. Deltakertallet øker med ${math("6\\,\\%")} per år. Etter hvor mange hele år er deltakertallet for første gang minst ${math("1\\,500")}?`,
    svar: `Første gang grensen passeres er etter ${math("4")} år. Da gir modellen omtrent ${math("1\\,515")} deltakere.`, units: ["år"],
  },
  "2py27-286": { sporsmal: `Reisetiden til jobb for ${math("32")} ansatte er gruppert i intervallene ${math("[0,10), [10,20), [20,40)")}. Frekvensene er henholdsvis ${math("6, 10, 16")}. Finn frekvenstettheten og den relative frekvensen for intervallet ${math("[20,40)")}.` },
  "2py27-287": { sporsmal: `Ventetiden i minutter for ${math("31")} kunder er gruppert med klassegrensene ${math("0, 5, 15, 30")} og frekvensene ${math("4, 12, 15")}. Finn frekvenstettheten og den relative frekvensen for intervallet ${math("[5,15)")}.` },
  "2py27-288": { sporsmal: `Antall kunder per time i ${math("42")} registrerte timer er gruppert med klassegrensene ${math("10, 20, 30, 50")} og frekvensene ${math("8, 14, 20")}. Finn frekvenstettheten og den relative frekvensen for intervallet ${math("[30,50)")}.` },
  "2py27-289": { sporsmal: `Daglig skjermtid i minutter for ${math("39")} personer er gruppert med klassegrensene ${math("0, 20, 30, 60")} og frekvensene ${math("12, 9, 18")}. Finn frekvenstettheten og den relative frekvensen for intervallet ${math("[20,30)")}.` },
  "2py27-290": { sporsmal: `Servicetiden i minutter for ${math("40")} kunder er gruppert med klassegrensene ${math("5, 15, 25, 45")} og frekvensene ${math("7, 11, 22")}. Finn frekvenstettheten og den relative frekvensen for intervallet ${math("[25,45)")}.` },
  "2py27-291": { sporsmal: `Saldoen på en konto modelleres med ${math("S(x)=1\\,200\\cdot1{,}08^x")}, der ${math("x")} er antall år. Finn ${math("S(4)")}.`, svar: `${math("S(4)=1\\,200\\cdot1{,}08^4\\approx1\\,632{,}59")} kr.`, units: ["kr"] },
  "2py27-292": { sporsmal: `Massen av et stoff modelleres med ${math("M(x)=5\\,000\\cdot0{,}93^x")}, der ${math("x")} er antall døgn og massen måles i gram. Finn ${math("M(6)")}.`, svar: `${math("M(6)=5\\,000\\cdot0{,}93^6\\approx3\\,234{,}95")} gram.`, units: ["gram"] },
  "2py27-293": { sporsmal: `Vannmengden i et magasin modelleres med ${math("V(x)=240\\cdot1{,}15^x")}, der ${math("x")} er antall døgn og vannmengden måles i m³. Finn ${math("V(3)")}.`, svar: `${math("V(3)=240\\cdot1{,}15^3\\approx365{,}01")} m³.`, units: ["m³"] },
  "2py27-294": { sporsmal: `Verdien av en maskin modelleres med ${math("V(x)=18\\,000\\cdot0{,}88^x")}, der ${math("x")} er antall år og verdien måles i kroner. Finn ${math("V(5)")}.`, svar: `${math("V(5)=18\\,000\\cdot0{,}88^5\\approx9\\,499{,}17")} kr.`, units: ["kr"] },
  "2py27-295": { sporsmal: `Omsetningen i en virksomhet modelleres med ${math("O(x)=75\\cdot1{,}25^x")}, der ${math("x")} er antall år og omsetningen måles i tusen kroner. Finn ${math("O(4)")}.`, svar: `${math("O(4)=75\\cdot1{,}25^4\\approx183{,}11")} tusen kr.`, units: ["tusen kr"] },
  "2py27-296": { sporsmal: `Tiden for å teste ${math("n")} komponenter modelleres med ${math("T(n)=2{,}5n^{1{,}4}")}, der ${math("T(n)")} måles i minutter. Finn ${math("T(8)")}.`, svar: `${math("T(8)=2{,}5\\cdot8^{1{,}4}\\approx45{,}95")} minutter.`, units: ["minutter"] },
  "2py27-297": { sporsmal: `Kabellengden i et anlegg modelleres med ${math("L(x)=18x^{0{,}5}")}, der ${math("x")} er antall tilkoblede enheter og ${math("L(x)")} måles i meter. Finn ${math("L(16)")}.`, svar: `${math("L(16)=18\\cdot16^{0{,}5}=72")} meter.`, units: ["meter"] },
  "2py27-298": { sporsmal: `Et trekantet område har grunnlinje ${math("1{,}5x")} meter og høyde ${math("x")} meter. Arealet kan da skrives som ${math("A(x)=0{,}75x^2")}. Finn arealet når ${math("x=12")}.`, svar: `${math("A(12)=0{,}75\\cdot12^2=108")} m².`, units: ["m²"] },
  "2py27-299": { sporsmal: `Behandlingstiden modelleres med ${math("T(x)=120x^{-0{,}5}")}, der ${math("x")} er antall prosessorer og ${math("T(x)")} måles i minutter. Finn ${math("T(25)")}.`, svar: `${math("T(25)=120\\cdot25^{-0{,}5}=24")} minutter.`, units: ["minutter"] },
  "2py27-300": { sporsmal: `Kostnaden for å pusse opp et bad modelleres med ${math("K(x)=4{,}2x^{1{,}2}")}, der ${math("x")} er arealet i m² og ${math("K(x)")} måles i tusen kroner. Finn ${math("K(10)")}.`, svar: `${math("K(10)=4{,}2\\cdot10^{1{,}2}\\approx66{,}57")} tusen kr.`, units: ["tusen kr"] },
};
for (const [id, revision] of Object.entries(del2ShortContexts)) reviseContext(id, revision);

const percentCaseNouns = [
  [301, "prisen"],
  [305, "medlemstallet"],
  [309, "energibruken"],
  [313, "omsetningen"],
  [317, "utslippet"],
];
for (const [startId, noun] of percentCaseNouns) {
  const ids = Array.from({ length: 4 }, (_, index) => `2py27-${startId + index}`);
  const [first, second, total, conclusion] = ids.map((id) => questions.get(id));
  setQuestion(first.id, {
    sporsmal: `Beregn ${noun} etter den første prosentendringen.`,
    svar: first.svar.replace("verdien", noun),
  });
  setQuestion(second.id, {
    sporsmal: `Beregn ${noun} etter begge prosentendringene.`,
    svar: second.svar.replace("Sluttverdien", `${noun[0].toUpperCase()}${noun.slice(1)} etter begge endringene`),
  });
  setQuestion(total.id, { sporsmal: `Finn den samlede prosentvise endringen i ${noun}.` });
  setQuestion(conclusion.id, { svar: conclusion.svar.replace("sluttverdien", noun) });
}

{
  const question = questions.get("2py27-306");
  setQuestion(question.id, {
    sporsmal: "Beregn medlemstallet etter begge prosentendringene. Rund av til nærmeste hele medlem.",
    svar: `Beregningen gir ${math("4\\,200\\cdot1{,}12\\cdot0{,}92=4\\,327{,}68")}. Avrundet til nærmeste hele medlem blir dette ${math("4\\,328")} medlemmer.`,
    fasit: {
      ...question.fasit,
      verdier: question.fasit.verdier.map((answer) => ({ ...answer, verdi: 4328, toleranse: 0 })),
    },
    kontroll: { ...question.kontroll, resultat: [4328], avrunding: 0 },
  });
  setQuestion("2py27-308", {
    svar: `Målet er nådd, fordi det beregnede medlemstallet er omtrent ${math("4\\,328")} medlemmer.`,
  });
}

const exponentialCases = [
  { start: 321, group: "d2-eksponential-01", quantity: "antall månedlige besøk", time: "måneder", timeSingular: "måned", yUnit: "besøk" },
  { start: 325, group: "d2-eksponential-02", quantity: "stoffmengden", time: "timer", timeSingular: "time", yUnit: "gram" },
  { start: 329, group: "d2-eksponential-03", quantity: "antall elsykler", time: "år", timeSingular: "år", yUnit: "elsykler" },
  { start: 333, group: "d2-eksponential-04", quantity: "det årlige vannforbruket", time: "år", timeSingular: "år", yUnit: "m³" },
  { start: 337, group: "d2-eksponential-05", quantity: "saldoen", time: "år", timeSingular: "år", yUnit: "kr" },
];
for (const context of exponentialCases) {
  const [parameters, value, threshold] = [0, 1, 2].map((offset) => questions.get(`2py27-${context.start + offset}`));
  const x = value.kontroll.inndata.x;
  reviseContext(parameters.id, {
    sporsmal: `Oppgi startverdien og den prosentvise endringen per ${context.timeSingular}.`,
    svar: parameters.svar.replace("per periode", `per ${context.timeSingular}`).replace("Startverdien er", `Startverdien for ${context.quantity} er`),
    units: [context.yUnit, "%"],
    labels: ["Startverdi", `Prosentvis endring per ${context.timeSingular}`],
  });
  reviseContext(value.id, {
    sporsmal: `Beregn ${context.quantity} etter ${math(number(x))} ${context.time}.`,
    svar: `${value.svar.replace(/\.$/u, "")} ${context.yUnit}.`,
    units: [context.yUnit],
  });
  reviseContext(threshold.id, {
    sporsmal: threshold.sporsmal.replace("hele perioder", `hele ${context.time}`).replace("modellverdien", context.quantity),
    svar: threshold.svar.replaceAll("perioder", context.time),
    units: [context.time],
  });
}

const figureCases = [
  { start: 461, group: "d2-figur-01", noun: "benker" },
  { start: 465, group: "d2-figur-02", noun: "fliser" },
  { start: 469, group: "d2-figur-03", noun: "stoler" },
  { start: 473, group: "d2-figur-04", noun: "prikker" },
  { start: 477, group: "d2-figur-05", noun: "ruter" },
];
for (const context of figureCases) {
  for (let offset = 0; offset < 4; offset += 1) {
    const question = questions.get(`2py27-${context.start + offset}`);
    setQuestion(question.id, {
      sporsmal: question.sporsmal.replaceAll("elementer", context.noun),
      svar: question.svar.replaceAll("elementer", context.noun),
      ...(question.fasit.verdier ? {
        fasit: {
          ...question.fasit,
          verdier: question.fasit.verdier.map((answer) =>
            answer.enhet === "elementer" ? { ...answer, enhet: context.noun } : answer),
        },
      } : {}),
    });
  }
  groups.get(context.group).visualisering.tekstalternativ =
    groups.get(context.group).visualisering.tekstalternativ.replace("Antallene", `Antall ${context.noun}`);
}

reviseContext("2py27-379", {
  sporsmal: `Bruk regresjonsmodellen til å anslå tid per enhet når det er produsert ${math("60")} enheter.`,
});

const contextualRateHints = {
  "2py27-178": "Finn hvor mye kostnaden endres for hver GB, og bestem fortegnet.",
  "2py27-179": "Finn hvor mye vannmengden endres for hvert minutt, og bestem fortegnet.",
  "2py27-180": "Finn hvor mye temperaturen endres for hver time, og bestem fortegnet.",
  "2py27-181": "Finn hvor mye vannmengden endres for hvert minutt, og bestem fortegnet.",
  "2py27-182": "Finn hvor mye kostnaden endres for hver kilometer, og bestem fortegnet.",
  "2py27-251": "Bruk punktet til å finne hvor mye y øker når x øker med 1.",
  "2py27-344": "Stigningstallet viser prisøkningen for hver kilometer.",
  "2py27-348": "Stigningstallet viser prisøkningen for hver GB.",
  "2py27-352": "Stigningstallet viser prisøkningen for hvert besøk.",
  "2py27-356": "Stigningstallet viser prisøkningen for hvert døgn.",
  "2py27-360": "Stigningstallet viser prisøkningen for hver kWh.",
};
for (const [id, replacement] of Object.entries(contextualRateHints)) {
  const question = questions.get(id);
  setQuestion(id, {
    hint: question.hint.map((hint) =>
      /per x-enhet/u.test(hint) ? hint.replace(/[^:]*per x-enhet[^.]*(?:\.|$)/u, replacement) : hint),
  });
}

// Siste pedagogiske reparasjonspass. Her rettes familier der en generell mal
// tidligere skjulte manglende mellomregning, feil variabelnavn eller feil
// avrunding. Passet bruker oppgavenes egne kontrollverdier og er derfor like
// konkret for alle fem variantene i hver familie.
function roundHalfUp(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.sign(value) * Math.round(Math.abs(value) * factor + Number.EPSILON) / factor;
}

function numericMathValues(text) {
  return [...text.matchAll(/\\\((-?\d+(?:\{,\}\d+)?)\\\)/gu)]
    .map((match) => Number(match[1].replace("{,}", ".")))
    .filter(Number.isFinite);
}

function bareFormula(formula) {
  return formula.replace(/^\\\(/u, "").replace(/\\\)$/u, "");
}

function formulaAt(formula, n) {
  const value = number(n);
  return bareFormula(formula)
    .replace(/(\d+)n/gu, `$1\\cdot${value}`)
    .replace(/n(?=\()/gu, `${value}\\cdot`)
    .replaceAll("n", value);
}

function figureValue(groupId, n) {
  const calculators = {
    "d2-figur-01": (value) => 4 * value + 2,
    "d2-figur-02": (value) => value ** 2 + 4 * value,
    "d2-figur-03": (value) => 2 * value + 4,
    "d2-figur-04": (value) => value * (value + 1) / 2,
    "d2-figur-05": (value) => (value + 2) ** 2 - value ** 2,
  };
  return calculators[groupId](n);
}

for (const question of byFamily("d1-potensverdi")) {
  const { grunntall, eksponent } = question.kontroll.inndata;
  const result = question.kontroll.resultat[0];
  const factor = grunntall < 0 ? `(${number(grunntall)})` : number(grunntall);
  const product = Array.from({ length: eksponent }, () => factor).join("\\cdot");
  setHintsAndAnswer(question.id, [
    `Eksponenten ${math(number(eksponent))} betyr at grunntallet ${math(factor)} skal brukes som faktor ${number(eksponent)} ganger.`,
    `Skriv potensen som produktet ${math(product)}.`,
    `${grunntall < 0 ? `Det er ${number(eksponent)} negative faktorer. ${eksponent % 2 === 0 ? "De kan pares, så produktet blir positivt." : "Én negativ faktor blir stående, så produktet blir negativt."}` : "Alle faktorene er positive, så produktet blir positivt."} Regn deretter ut produktet.`,
  ], `${math(`${factor}^{${number(eksponent)}}=${product}=${number(result)}`)}.`);
}

for (const question of byFamily("d1-negativ-eksponent")) {
  const { grunntall, eksponent } = question.kontroll.inndata;
  const positiveExponent = Math.abs(eksponent);
  const denominator = grunntall ** positiveExponent;
  const result = question.kontroll.resultat[0];
  setHintsAndAnswer(question.id, [
    `En negativ eksponent betyr at vi tar den omvendte verdien: ${math(`${number(grunntall)}^{-${number(positiveExponent)}}=1/${number(grunntall)}^{${number(positiveExponent)}}`)}.`,
    `Regn først ut nevneren: ${math(`${number(grunntall)}^{${number(positiveExponent)}}=${number(denominator)}`)}.`,
    `Gjør deretter brøken om til desimaltall: ${math(`1/${number(denominator)}=${number(result)}`)}.`,
  ], `${math(`${number(grunntall)}^{${number(eksponent)}}=1/${number(denominator)}=${number(result)}`)}.`);
}

for (const question of byFamily("d1-ligning")) {
  const { a, b, y } = question.kontroll.inndata;
  const result = question.kontroll.resultat[0];
  const variable = question.svar.match(/\\\(([a-z])=/u)?.[1] ?? "x";
  setHintsAndAnswer(question.id, [
    `Sett modelluttrykket lik den oppgitte sluttverdien: ${math(`${number(a)}${variable}+${number(b)}=${number(y)}`)}.`,
    `Trekk ${math(number(b))} fra begge sider: ${math(`${number(a)}${variable}=${number(y - b)}`)}.`,
    `Del begge sider på koeffisienten ${math(number(a))}: ${math(`${variable}=${number(y - b)}/${number(a)}=${number(result)}`)}.`,
  ], question.svar);
}

for (const question of byFamily("d1-lineart-figurmonster")) {
  const values = numericMathValues(question.sporsmal);
  const start = values[0];
  const increase = values[1];
  const target = values.at(-1);
  const formula = question.fasit.valg.riktige[0];
  const result = question.fasit.verdier[0].verdi;
  setHintsAndAnswer(question.id, [
    `Figur 1 har ${math(number(start))}, og fra figur 1 til figur ${math("n")} skjer det ${math("n-1")} like økninger.`,
    `En generell regel er derfor ${math(`${number(start)}+${number(increase)}(n-1)`)}. Forenkling gir ${formula}.`,
    `Sett inn ${math(`n=${number(target)}`)} i regelen: ${math(`${formulaAt(formula, target)}=${number(result)}`)}.`,
  ], `Formelen er ${formula}. Figur ${math(number(target))} har ${math(number(result))} ${question.fasit.verdier[0].enhet}.`);
}

for (const question of byFamily("d1-kvadratisk-figurmonster")) {
  const values = numericMathValues(question.sporsmal);
  const target = values.at(-1);
  const formula = question.fasit.valg.riktige[0];
  const result = question.fasit.verdier[0].verdi;
  setHintsAndAnswer(question.id, [
    `Test den riktige formelen på figur 1: ${math(`${formulaAt(formula, 1)}=${number(values[0])}`)}.`,
    `Test også figur 2: ${math(`${formulaAt(formula, 2)}=${number(values[1])}`)}. Formelen passer dermed de oppgitte startverdiene.`,
    `Sett inn ${math(`n=${number(target)}`)}: ${math(`${formulaAt(formula, target)}=${number(result)}`)}.`,
  ], `Formelen ${formula} passer tallfølgen. Figur ${math(number(target))} har ${math(number(result))} ${question.fasit.verdier[0].enhet}.`);
}

for (const question of byFamily("d2-figur-a")) {
  const group = groups.get(question.oppgavegruppe.id);
  const sequence = group.data.antall;
  const differences = sequence.slice(1).map((value, index) => value - sequence[index]);
  const result = question.kontroll.resultat[0];
  const nextDifference = result - sequence.at(-1);
  setQuestion(question.id, { hint: [
    `Regn differansene mellom nabotallene: ${math(differences.join(", "))}.`,
    `Fortsett differansemønsteret. Den neste differansen er ${math(number(nextDifference))}.`,
    `Legg den til siste kjente verdi: ${math(`${number(sequence.at(-1))}+${number(nextDifference)}=${number(result)}`)}.`,
  ] });
}

for (const question of byFamily("d2-figur-b")) {
  const group = groups.get(question.oppgavegruppe.id);
  const formula = question.fasit.riktige[0];
  const [first, second] = group.data.antall;
  setQuestion(question.id, { hint: [
    `Test formelen på figur 1: ${math(`${formulaAt(formula, 1)}=${number(first)}`)}.`,
    `Test den på figur 2: ${math(`${formulaAt(formula, 2)}=${number(second)}`)}.`,
    `De andre alternativene feiler på minst én av disse kontrollene. Regelen ${formula} passer også resten av tallfølgen.`,
  ] });
}

for (const question of byFamily("d2-figur-d")) {
  const group = groups.get(question.oppgavegruppe.id);
  const formula = group.visualisering.regel;
  const result = question.kontroll.resultat[0];
  const threshold = question.kontroll.inndata.grense;
  const previousValue = figureValue(group.id, result - 1);
  const currentValue = figureValue(group.id, result);
  setHintsAndAnswer(question.id, [
    `Bruk regelen ${formula} og sammenlign den med grensen ${math(number(threshold))}.`,
    `Kontroller figuren før kandidaten: ${math(`${formulaAt(formula, result - 1)}=${number(previousValue)}`)}. Den når ikke grensen.`,
    `Kontroller kandidaten: ${math(`${formulaAt(formula, result)}=${number(currentValue)}`)}. Denne figuren når grensen.`,
  ], `Det minste figurnummeret som oppfyller kravet, er ${math(number(result))}.`);
}

for (const question of byFamily("d2-samfunn-a")) {
  const { gammel, ny } = question.kontroll.inndata;
  const oldTotal = gammel.reduce((total, value) => total + value, 0);
  const newTotal = ny.reduce((total, value) => total + value, 0);
  const result = roundHalfUp((newTotal - oldTotal) / oldTotal * 100, 1);
  setQuestion(question.id, {
    sporsmal: `${question.sporsmal.replace(/\s*Rund til én desimal\.?$/u, "")} Rund til én desimal.`,
    svar: `Totalene er ${math(number(oldTotal))} og ${math(number(newTotal))}. ${math(`(${number(newTotal)}-${number(oldTotal)})/${number(oldTotal)}\\cdot100\\,\\%=${number(result)}\\,\\%`)}.`,
    fasit: {
      ...question.fasit,
      verdier: question.fasit.verdier.map((answer) => ({ ...answer, verdi: result, toleranse: 0.05 })),
    },
    kontroll: { ...question.kontroll, resultat: [result], avrunding: 1 },
    hint: [
      `Summer kategoriene i år 1: ${math(`${gammel.map((value) => number(value)).join("+")}=${number(oldTotal)}`)}.`,
      `Summer kategoriene i år 2: ${math(`${ny.map((value) => number(value)).join("+")}=${number(newTotal)}`)}.`,
      `Del endringen på totalen i år 1: ${math(`(${number(newTotal)}-${number(oldTotal)})/${number(oldTotal)}\\cdot100\\,\\%=${number(result)}\\,\\%`)}.`,
    ],
  });
}

for (const question of byFamily("d2-samfunn-b")) {
  setQuestion(question.id, {
    sporsmal: `${question.sporsmal.replace(/\s*Rund til én desimal\.?$/u, "")} Rund til én desimal.`,
  });
}

const modelCritiqueHints = {
  "2py27-203": [
    "Datagrunnlaget slutter i 2026, mens anslaget gjelder 2050. Det er ekstrapolasjon langt utenfor det observerte tidsrommet.",
    "En lineær utvikling kan ikke automatisk fortsette når marked, kapasitet og politikk endrer seg.",
    "Konklusjonen må derfor uttrykke stor usikkerhet, ikke behandle 2050-anslaget som sikkert.",
  ],
  "2py27-204": [
    "En eksponentialmodell med vekstfaktor over 1 gir stadig raskere vekst når den brukes om og om igjen.",
    "Bakterier får etter hvert begrenset plass og næring, så den samme prosentveksten kan ikke fortsette ubegrenset.",
    "Modellen kan passe en kort startfase, men trenger et avgrenset gyldighetsområde.",
  ],
  "2py27-205": [
    "En negativ drosjepris er umulig i den praktiske situasjonen.",
    "Resultatet viser at modellen brukes utenfor området der startpris og korteste turer er riktig beskrevet.",
    "Den faglige vurderingen er derfor at modellen eller gyldighetsområdet må endres.",
  ],
  "2py27-206": [
    "Data fra ett døgn beskriver variasjon gjennom akkurat dette døgnet.",
    "Et helt år innebærer andre årstider, værforhold og dagslengder som ikke finnes i datagrunnlaget.",
    "Modellen kan derfor ikke brukes til samme dato neste år uten nye data eller en modell for årstidsvariasjon.",
  ],
  "2py27-207": [
    `Modellen er laget for produksjon mellom ${math("100")} og ${math("500")} enheter.`,
    `Verdien ${math("350")} ligger inne i intervallet: ${math("100<350<500")}. Dette er interpolasjon.`,
    "Interpolasjon er normalt tryggere enn ekstrapolasjon, selv om modellens øvrige forutsetninger fortsatt må vurderes.",
  ],
};
for (const [id, hint] of Object.entries(modelCritiqueHints)) setQuestion(id, { hint });

for (const question of byFamily("d2-eksponential-d")) {
  const group = groups.get(question.oppgavegruppe.id);
  const { a, b } = group.data.modell;
  const percent = Math.abs((b - 1) * 100);
  setQuestion(question.id, { hint: [
    `Modellen starter på ${math(number(a))} og multipliserer med ${math(number(b))} hver periode, altså en ${b > 1 ? "økning" : "nedgang"} på ${math(`${decimal(percent, 2)}\\,\\%`)} hver gang.`,
    `Hvis den samme faktoren brukes ubegrenset, vil modellverdien ${b > 1 ? "vokse uten øvre grense" : "nærme seg null"}. Det er en matematisk følge av modellen, ikke automatisk en realistisk langtidsprognose.`,
    "Sammenlign derfor med praktiske grenser som kapasitet, ressurser og endrede rammevilkår før du vurderer langtidsbruk.",
  ] });
}

for (const question of byFamily("d2-regresjon-a")) {
  const group = groups.get(question.oppgavegruppe.id);
  const { x, y } = group.data;
  const model = question.fasit.riktige[0];
  let hint;
  if (/lineær/u.test(model)) {
    const differences = y.slice(1).map((value, index) => value - y[index]);
    hint = [
      `x-verdiene øker med like store trinn. Beregn derfor første differanser i y: ${math(differences.map((value) => number(value)).join(", "))}.`,
      "Differansene er konstante eller svært nær konstante, mens forholdstallene ikke er det.",
      "Spredningspunktene ligger derfor omtrent langs en rett linje, og en lineær modell passer hovedmønsteret best.",
    ];
  } else if (/eksponential/u.test(model)) {
    const ratios = y.slice(1).map((value, index) => value / y[index]);
    hint = [
      `Beregn forholdet mellom y-verdier som følger etter hverandre: ${math(ratios.map((value) => decimal(value, 2)).join(", "))}.`,
      "Forholdstallene er omtrent konstante, mens første differansene vokser.",
      "Omtrent konstant vekstfaktor kjennetegner en eksponentialmodell.",
    ];
  } else if (/potens/u.test(model)) {
    const squareRatios = x.map((value, index) => y[index] / value ** 2);
    hint = [
      `Bremselengden vokser krumt. Test et kvadratisk potensmønster med ${math("y/x^2")}: ${math(squareRatios.map((value) => decimal(value, 4)).join(", "))}.`,
      `Verdiene av ${math("y/x^2")} er omtrent konstante, så dataene ligger nær formen ${math("y=ax^2")}.`,
      "Dette er en potensmodell med eksponent nær 2, og den passer hovedmønsteret bedre enn en rett linje.",
    ];
  } else {
    const first = y.slice(1).map((value, index) => value - y[index]);
    const second = first.slice(1).map((value, index) => value - first[index]);
    hint = [
      `Første differanser er ${math(first.map((value) => number(value)).join(", "))}, og andre differanser er omtrent ${math(second.map((value) => number(value)).join(", "))}.`,
      "Punktene stiger først, har et toppunkt og synker deretter. Denne krumningen kan ikke beskrives godt av en lineær eller eksponentiell modell.",
      "En andregradsmodell beskriver den parabel-lignende hovedformen best.",
    ];
  }
  setQuestion(question.id, { hint });
}

for (const question of byFamily("d2-regresjon-d")) {
  const group = groups.get(question.oppgavegruppe.id);
  const prediction = bank.oppgaver.find((item) =>
    item.oppgavegruppe?.id === question.oppgavegruppe.id && item.variantfamilie === "d2-regresjon-c");
  const newX = prediction.kontroll.inndata.ny_x;
  const minimum = Math.min(...group.data.x);
  const maximum = Math.max(...group.data.x);
  const inside = newX >= minimum && newX <= maximum;
  setQuestion(question.id, { hint: [
    `Dataene dekker x-intervallet ${math(`[${number(minimum)},${number(maximum)}]`)}, mens anslaget bruker ${math(`x=${number(newX)}`)}.`,
    inside
      ? `${math(`${number(minimum)}\\le${number(newX)}\\le${number(maximum)}`)}, så anslaget er interpolasjon.`
      : `${math(number(newX))} ligger utenfor intervallet, så anslaget er ekstrapolasjon.`,
    inside
      ? "Anslaget ligger innenfor dataområdet og er normalt mindre usikkert enn ekstrapolasjon."
      : "Usikkerheten øker utenfor dataområdet fordi modellen kan endre gyldighet der det ikke finnes observasjoner.",
  ] });
}

const codeAssessmentHints = {
  "2py27-444": [
    "If-vilkåret tar bare med verdier som er minst grensen; både antall og sum oppdateres for disse verdiene.",
    `Den andre utskriften deler summen på antallet. Hvis ingen verdier tas med, blir nevneren ${math("0")}.`,
    "Dermed er både beskrivelsen av gjennomsnittet og risikoen for divisjon på null riktige.",
  ],
  "2py27-448": [
    "While-løkken fortsetter mens verdien er over grensen og stopper ved første hele år der den er høyst grensen.",
    `Hver runde bruker samme faktor ${math("0{,}88")}, altså samme prosentvise nedgang.`,
    "Programmet finner derfor terskelåret, men modellforutsetningen om fast prosentnedgang må vurderes mot virkelige data.",
  ],
  "2py27-452": [
    "De to remove-linjene fjerner én minste og én største observasjon før gjennomsnittet beregnes.",
    "Dette reduserer virkningen av ekstremverdier, men betyr samtidig at reelle observasjoner utelates.",
    "Begge påstandene beskriver derfor henholdsvis algoritmen og en viktig faglig begrensning.",
  ],
  "2py27-456": [
    `Løkken tester bare heltallene fra ${math("0")} til ${math("100")} og stopper ved første verdi der ${math("A\\le B")}.`,
    "Break-linjen gjør at det minste heltallet som oppfyller vilkåret, skrives ut.",
    "Et skjæringspunkt mellom heltall eller utenfor søkeintervallet blir ikke funnet, som er algoritmens begrensning.",
  ],
  "2py27-460": [
    "Programmet summerer frekvensene kumulativt og stopper i den første kategorien som når medianplasseringen.",
    "Utskriften er kategorinummeret, ikke en observert verdi inne i kategorien.",
    "Programmet finner derfor medianens kategori, men kan ikke gi en nøyaktig medianverdi fra grupperte data alene.",
  ],
};
for (const [id, hint] of Object.entries(codeAssessmentHints)) setQuestion(id, { hint });

for (const question of byFamily("d2-samfunn-d")) {
  const group = groups.get(question.oppgavegruppe.id);
  const category = question.sporsmal.match(/«([^»]+)»/u)?.[1];
  const index = group.data.kategorier.indexOf(category);
  const before = group.data["år_1"][index];
  const after = group.data["år_2"][index];
  const absolute = after - before;
  const relative = roundHalfUp(absolute / before * 100, 1);
  setQuestion(question.id, { hint: [
    `Kategorien «${category}» går fra ${math(number(before))} til ${math(number(after))}.`,
    `Den absolutte endringen er ${math(`${number(after)}-${number(before)}=${number(absolute)}`)}.`,
    `Den relative endringen er ${math(`${number(absolute)}/${number(before)}\\cdot100\\,\\%\\approx${number(relative)}\\,\\%`)}. Tallene beskriver endringen, men beviser ikke hva som forårsaket den.`,
  ] });
}

// Alle oppgavene får nå en full worked example. De eksisterende, fagspesifikke
// mellomstegene beholdes, men settes inn i en tydelig progresjon fra forståelse
// via oppsett og utregning til kontroll. Markørene gjør passet idempotent.
const generatedPrefixes = [
  "Forstå oppgaven:",
  "Hva vet vi?",
  "Se etter en enkel vei:",
  "Velg en enkel regnevei:",
  "Velg framgangsmåte:",
  "Lag en plan:",
  "Sett opp:",
  "Gjør første del:",
  "Regn videre:",
  "Gjør neste del:",
  "Regn ut:",
  "Fullfør regningen:",
  "Arbeid videre:",
  "Løsningen samlet:",
  "Svar på spørsmålet:",
  "Kontroller og konkluder:",
  "Sjekk svaret:",
];

function removeGeneratedPrefix(hint) {
  for (const prefix of generatedPrefixes) {
    if (hint.startsWith(prefix)) return hint.slice(prefix.length).trim();
  }
  return hint;
}

const numericAnswerTypes = new Set(["tall", "flere_tall", "valg_og_tall"]);

function answerValues(question) {
  return question.fasit.verdier?.map((answer) => answer.verdi)
    ?? question.kontroll?.resultat
    ?? [];
}

function parseLatexNumber(value) {
  const numeric = Number(String(value)
    .replace(/\\,/gu, "")
    .replace(/\{,\}/gu, ".")
    .replace(",", "."));
  return Number.isFinite(numeric) ? normalizedNumber(numeric) : null;
}

// Valgoppgaver kan bli avslørt av et ferdig mellomresultat selv om selve
// svaralternativet ikke står i hintet. Hent derfor også ferdige tallresultater
// fra løsningsforslaget, for eksempel 170 i 680/4=170.
function solutionResultNumbers(question) {
  const values = new Set(answerValues(question).map((value) => normalizedNumber(value)));
  const numericToken = String.raw`-?\d+(?:\\,\d{3})*(?:\{,\}\d+|[.,]\d+)?`;

  for (const match of question.svar.matchAll(/\\\((.*?)\\\)/gu)) {
    const expression = match[1];
    const relationParts = expression.split(/=|\\approx|\\le|\\ge|[~≈≤≥]/u);
    if (relationParts.length > 1) {
      const leftSide = relationParts.slice(0, -1).join("=");
      const finalPart = relationParts.at(-1).trim();
      const resultMatch = finalPart.match(new RegExp(`^(${numericToken})(?:\\\\,?\\\\?%|\\s*%)?$`, "u"));
      const parsed = resultMatch ? parseLatexNumber(resultMatch[1]) : null;
      if (parsed !== null && /[+\-*/^]|\\(?:cdot|frac|div|sqrt)/u.test(leftSide)) values.add(parsed);
    } else {
      const standaloneMatch = expression.trim().match(new RegExp(`^(${numericToken})(?:\\\\,?\\\\?%|\\s*%)?$`, "u"));
      const parsed = standaloneMatch ? parseLatexNumber(standaloneMatch[1]) : null;
      if (
        parsed !== null
        && !containsStandaloneNumber(questionGivenText(question), plainDecimal(parsed))
      ) values.add(parsed);
    }
  }

  const prose = question.svar.replace(/\\\(.*?\\\)/gu, "");
  const proseResultPattern = new RegExp(
    `(?:er|blir|gir|har|tilsvarer)\\s+(${numericToken})\\s*(?:%|kr|personer|elever|deltakere|billetter|minutter|timer|år|måneder|observasjoner|besøk)`,
    "giu",
  );
  for (const match of prose.matchAll(proseResultPattern)) {
    const parsed = parseLatexNumber(match[1]);
    if (parsed !== null) values.add(parsed);
  }

  return [...values];
}

function equationFromAnswer(question) {
  const expressions = [...question.svar.matchAll(/\\\((.*?)\\\)/gu)].map((match) => match[1]);
  const equation = expressions.find((expression) => expression.includes("="));
  return equation ? `Regn uttrykket helt ut: ${math(equation)}.` : null;
}

const beginnerChoiceEvidence = {
  "2py27-033": `Bruk 100 kr som start: Etter økningen er prisen ${math("100+10=110")} kr. Nedgangen er ${math("10\\,\\%")} av 110 kr, altså ${math("11")} kr, så sluttprisen er ${math("110-11=99")} kr, ikke 100 kr.`,
  "2py27-034": `Prosentpoeng er bare forskjellen mellom prosenttallene: ${math("30-20=10")} prosentpoeng.`,
  "2py27-035": `Test med 100 kr uten mva. Med 25 % mva blir prisen ${math("100+25=125")} kr. Trekker vi 25 % av 125 kr, trekker vi ${math("31{,}25")} kr og får ${math("125-31{,}25=93{,}75")} kr, ikke 100 kr.`,
  "2py27-036": `Bruk 100 kr som start: ${math("100\\cdot1{,}05=105")} og deretter ${math("105\\cdot1{,}05=110{,}25")}. Økningen er dermed ${math("10{,}25\\,\\%")}, som er mer enn 10 %.`,
  "2py27-037": `Økningen er ${math("6-4=2")} prosentpoeng. Målt mot den gamle andelen blir regnestykket ${math("2/4\\cdot100\\,\\%=50\\,\\%")}. Dette er den relative økningen.`,
  "2py27-098": `Regn ut hele forskjellen: ${math("[3(x+1)+7]-(3x+7)=3x+3+7-3x-7=3")}. Sammenlign konstantleddet som står igjen med økningen i påstanden.`,
  "2py27-123": `Regn forholdet i hver kolonne: ${math("5/1=10/2=15/3=20/4=5")}. Vurder hvilket alternativ som kjennetegnes av et konstant forhold.`,
  "2py27-124": `Regn produktet i hver kolonne: ${math("1\\cdot24=2\\cdot12=4\\cdot6=8\\cdot3=24")}. Vurder hvilket alternativ som kjennetegnes av et konstant produkt.`,
  "2py27-125": `Når x øker med 1, øker y hver gang med 4: ${math("11-7=15-11=19-15=4")}. Sjekk også ${math("y(0)=7")} før du velger mellom alternativene.`,
  "2py27-126": `Regn produktet i hver kolonne: ${math("2\\cdot30=3\\cdot20=5\\cdot12=10\\cdot6=60")}. Vurder hvilket alternativ som kjennetegnes av et konstant produkt.`,
  "2py27-127": `Forholdene er ikke like, produktene er ikke like, og y-differansene er ${math("8-2=6")}, ${math("18-8=10")} og ${math("32-18=14")}. Sammenlign disse tre testene med svaralternativene.`,
  "2py27-211": `Første differanser er 3, 5, 7 og 9. De neste differansene er ${math("5-3=7-5=9-7=2")}. Bruk typen differanse som er konstant når du velger modell.`,
  "2py27-253": `Et moteksempel er nok: Tallene 0 og 100 har gjennomsnitt ${math("(0+100)/2=50")}, mens 40 og 70 har gjennomsnitt ${math("(40+70)/2=55")}. Gjennomsnittet steg selv om observasjonen 100 sank til 70.`,
  "2py27-255": `Datasett ${math("4,6")} og ${math("0,10")} har begge gjennomsnitt 5, men variasjonsbreddene er ${math("6-4=2")} og ${math("10-0=10")}. Samme gjennomsnitt betyr derfor ikke samme spredning.`,
};

function choiceWorkedEvidence(question) {
  return beginnerChoiceEvidence[question.id] ?? equationFromAnswer(question);
}

function regressionExpression(question) {
  const input = question.kontroll.inndata;
  const sibling = bank.oppgaver.find((item) =>
    item.oppgavegruppe?.id === question.oppgavegruppe?.id && item.variantfamilie === "d2-regresjon-b");
  const coefficients = sibling?.kontroll.resultat ?? [];
  if (input.modell === "lineær") return `${number(coefficients[0])}\\cdot${number(input.ny_x)}+${number(coefficients[1])}`;
  if (input.modell === "eksponential") return `${number(coefficients[0])}\\cdot${number(coefficients[1])}^{${number(input.ny_x)}}`;
  if (input.modell === "potens") return `${number(coefficients[0])}\\cdot${number(input.ny_x)}^{${number(coefficients[1])}}`;
  if (input.modell === "andregrad") return `${number(coefficients[0])}\\cdot${number(input.ny_x)}^2+${number(coefficients[1])}\\cdot${number(input.ny_x)}+${number(coefficients[2])}`;
  return null;
}

function workedCalculation(question) {
  const method = question.kontroll?.metode;
  const input = question.kontroll?.inndata ?? {};
  const result = answerValues(question);

  if (method === "mean" || method === "d2_stats_mean") {
    const sum = input.verdier.reduce((total, value) => total + value, 0);
    return `Summer først og del på antallet: ${math(`${input.verdier.map((value) => number(value)).join("+")}=${number(sum)}`)} og ${math(`${number(sum)}/${input.verdier.length}=${number(result[0])}`)}.`;
  }
  if (method === "median" || method === "d2_stats_median") {
    const sorted = [...input.verdier].sort((a, b) => a - b);
    if (sorted.length % 2 === 1) {
      const position = (sorted.length + 1) / 2;
      return `Det er ${math(`n=${sorted.length}`)} observasjoner, så medianplassen er ${math(`(${sorted.length}+1)/2=${position}`)}. Verdien på denne plassen er ${math(number(result[0]))}.`;
    }
    const right = sorted.length / 2;
    const left = right - 1;
    return `De to midterste verdiene er ${math(number(sorted[left]))} og ${math(number(sorted[right]))}. Regn ${math(`(${number(sorted[left])}+${number(sorted[right])})/2=${number(result[0])}`)}.`;
  }
  if (method === "mode_range") {
    const minimum = Math.min(...input.verdier);
    const maximum = Math.max(...input.verdier);
    const frequency = input.verdier.filter((value) => value === result[0]).length;
    return `Tallet ${math(number(result[0]))} forekommer ${math(number(frequency))} ganger og er typetallet. Variasjonsbredden er ${math(`${number(maximum)}-${number(minimum)}=${number(result[1])}`)}.`;
  }
  if (method === "relative_cumulative") {
    const total = input.frekvenser.reduce((sum, value) => sum + value, 0);
    const frequency = input.frekvenser[input.indeks];
    const cumulative = input.frekvenser.slice(0, input.indeks + 1).reduce((sum, value) => sum + value, 0);
    return `Total frekvens er ${math(`${input.frekvenser.map((value) => number(value)).join("+")}=${number(total)}`)}. Relativ frekvens er ${math(`${number(frequency)}/${number(total)}\\cdot100\\,\\%=${number(result[0])}\\,\\%`)}, og kumulativ frekvens er ${math(`${input.frekvenser.slice(0, input.indeks + 1).map((value) => number(value)).join("+")}=${number(cumulative)}`)}.`;
  }
  if (method === "missing_from_mean") {
    const knownSum = input.kjente.reduce((sum, value) => sum + value, 0);
    const count = input.kjente.length + 1;
    const targetSum = input.gjennomsnitt * count;
    return `Totalsummen må være ${math(`${number(input.gjennomsnitt)}\\cdot${count}=${number(targetSum)}`)}. De kjente verdiene summeres til ${math(`${input.kjente.map((value) => number(value)).join("+")}=${number(knownSum)}`)}, så den manglende er ${math(`${number(targetSum)}-${number(knownSum)}=${number(result[0])}`)}.`;
  }
  if (method === "weighted_mean") {
    const products = input.verdier.map((value, index) => value * input.frekvenser[index]);
    const weightedSum = products.reduce((sum, value) => sum + value, 0);
    const total = input.frekvenser.reduce((sum, value) => sum + value, 0);
    const terms = input.verdier.map((value, index) =>
      `${number(value)}\\cdot${number(input.frekvenser[index])}=${number(products[index])}`).join(", ");
    return `Multipliser verdi med frekvens: ${math(terms)}. Da er den veide summen ${math(`${products.map((value) => number(value)).join("+")}=${number(weightedSum)}`)}, total frekvens ${math(`${input.frekvenser.map((value) => number(value)).join("+")}=${number(total)}`)} og gjennomsnittet ${math(`${number(weightedSum)}/${number(total)}=${number(result[0])}`)}.`;
  }
  if (method === "table_slope") {
    return `Bruk to nabopunkter: ${math(`(${number(input.y[1])}-${number(input.y[0])})/(${number(input.x[1])}-${number(input.x[0])})=${number(result[0])}`)}.`;
  }
  if (method === "median_category") {
    const total = input.kumulativ.at(-1);
    const category = result[0];
    const previous = category > 1 ? input.kumulativ[category - 2] : 0;
    const current = input.kumulativ[category - 1];
    if (total % 2 === 1) {
      const position = (total + 1) / 2;
      return `Midtposisjonen er ${math(`(${number(total)}+1)/2=${number(position)}`)}, og ${math(`${number(previous)}<${number(position)}\\le${number(current)}`)}. Derfor ligger medianen i kategori ${math(number(category))}.`;
    }
    const left = total / 2;
    const right = left + 1;
    return `De to midterste posisjonene er ${math(number(left))} og ${math(number(right))}, og ${math(`${number(previous)}<${number(left)}<${number(right)}\\le${number(current)}`)}. Begge ligger i kategori ${math(number(category))}.`;
  }
  if (method === "code_sum") {
    return `Følg den løpende summen helt ut: ${math(`${input.verdier.map((value) => number(value)).join("+")}=${number(result[0])}`)}.`;
  }
  if (method === "code_growth") {
    return `Løkken utfører samme multiplikasjon ${math(number(input.runder))} ganger: ${math(`${number(input.start)}\\cdot${number(input.faktor)}^{${number(input.runder)}}=${number(result[0])}`)}.`;
  }
  if (method === "growth_threshold") {
    const periods = result[0];
    const previous = input.start * input.faktor ** (periods - 1);
    const current = input.start * input.faktor ** periods;
    return `Sammenlign to naboperioder: ${math(`${number(input.start)}\\cdot${number(input.faktor)}^{${periods - 1}}\\approx${decimal(previous, 2)}`)} og ${math(`${number(input.start)}\\cdot${number(input.faktor)}^{${periods}}\\approx${decimal(current, 2)}`)}. Bare den siste har passert grensen ${math(number(input.grense))}.`;
  }
  if (method === "d2_exp_threshold") {
    const periods = result[0];
    const previous = input.a * input.b ** (periods - 1);
    const current = input.a * input.b ** periods;
    return `Beregn periodene rundt terskelen: ${math(`${number(input.a)}\\cdot${number(input.b)}^{${periods - 1}}\\approx${decimal(previous, 2)}`)} og ${math(`${number(input.a)}\\cdot${number(input.b)}^{${periods}}\\approx${decimal(current, 2)}`)}. Dermed er ${math(`x=${periods}`)} første hele periode som oppfyller kravet.`;
  }
  if (method === "d2_regression_prediction") {
    const expression = regressionExpression(question);
    return `Sett inn den nye x-verdien og regn helt ut: ${math(`${expression}\\approx${number(result[0])}`)}.`;
  }
  if (method === "d2_grouped_total_cumulative") {
    const total = input.frekvenser.reduce((sum, value) => sum + value, 0);
    const cumulative = input.frekvenser[0] + input.frekvenser[1];
    return `Totalen er ${math(`${input.frekvenser.map((value) => number(value)).join("+")}=${number(total)}`)}. Til og med klasse 2 er kumulativ frekvens ${math(`${number(input.frekvenser[0])}+${number(input.frekvenser[1])}=${number(cumulative)}`)}.`;
  }
  if (method === "d2_grouped_mean") {
    const midpoints = input.frekvenser.map((_, index) => (input.grenser[index] + input.grenser[index + 1]) / 2);
    const products = midpoints.map((midpoint, index) => midpoint * input.frekvenser[index]);
    const weightedSum = products.reduce((sum, value) => sum + value, 0);
    const total = input.frekvenser.reduce((sum, value) => sum + value, 0);
    return `Klassemidtpunktene er ${math(midpoints.map((value) => number(value)).join(", "))}. Den veide summen er ${math(`${products.map((value) => number(value)).join("+")}=${number(weightedSum)}`)}, så anslaget blir ${math(`${number(weightedSum)}/${number(total)}=${number(result[0])}`)}.`;
  }
  if (method === "d2_society_share") {
    const total = input.ny.reduce((sum, value) => sum + value, 0);
    const part = input.ny[input.indeks];
    return `Summer år 2 til ${math(`${input.ny.map((value) => number(value)).join("+")}=${number(total)}`)}. Andelen er ${math(`${number(part)}/${number(total)}\\cdot100\\,\\%=${number(result[0])}\\,\\%`)}.`;
  }
  if (method === "mixed_value" && question.id === "2py27-261") {
    return `Det er fem sorterte verdier. Medianplassen er ${math(`(5+1)/2=3`)}, og den tredje verdien er ${math(number(result[0]))}.`;
  }

  const specialCodeCalculations = {
    "2py27-441": `Fem treff gir ${math("1+1+1+1+1=5")}.`,
    "2py27-443": `Verdiene 61, 73 og 66 gir ${math("1+1+1=3")} treff.`,
    "2py27-445": `Etter fem multiplikasjoner er ${math("900\\cdot0{,}88^5\\approx475\\le500")}.`,
    "2py27-446": `Den andre utskriften kommer fra ${math("900\\cdot0{,}88^5\\approx475")}.`,
    "2py27-447": `${math("900\\cdot0{,}88^3\\approx613>600")}, mens ${math("900\\cdot0{,}88^4\\approx540\\le600")}. Derfor stopper løkken etter 4 runder.`,
    "2py27-450": `Listen har 7 verdier og to fjernes: ${math("7-2=5")}.`,
    "2py27-451": `Etter at ytterverdiene er fjernet, blir gjennomsnittet ${math("130/6\\approx21{,}7")}.`,
    "2py27-453": `Ulikheten ${math("120\\le3x")} gir ${math("x\\ge40")}, så den første utskriften er 40.`,
    "2py27-455": `Med den nye grensen gir ${math("90\\le3x")} at ${math("x\\ge30")}.`,
    "2py27-457": `Halvparten av totalfrekvensen er ${math("26/2=13")}, og ${math("4+7=11<13\\le4+7+9=20")}. Medianen ligger i kategori 3.`,
    "2py27-459": `Med de nye frekvensene er ${math("4<13\\le4+10=14")}. Medianen ligger derfor i kategori 2.`,
  };
  if (specialCodeCalculations[question.id]) return specialCodeCalculations[question.id];

  return equationFromAnswer(question);
}

function workedContext(question) {
  const family = question.variantfamilie;
  const method = question.kontroll?.metode;
  const input = question.kontroll?.inndata ?? {};
  const mixedContexts = {
    "2py27-073": `Formelen er ${math("K=100+5x")}, og ${math("x=20")} kilometer er kjent. Vi skal finne K, altså reiseutgiften, ved å erstatte x med 20.`,
    "2py27-074": `Formelen er ${math("s=vt")}. Vi kjenner ${math("v=4")} m/s og ${math("t=3")} s, og skal finne strekningen s ved å sette begge tallene inn.`,
    "2py27-075": `Formelen er ${math("A=lb")}. Vi kjenner lengden ${math("l=5")} m og bredden ${math("b=4")} m, og skal finne arealet A.`,
    "2py27-076": `Formelen er ${math("F=1{,}8C+32")}, og ${math("C=10")} er kjent. Vi skal finne temperaturen F ved å erstatte C med 10.`,
    "2py27-077": `Formelen er ${math("D=0{,}05m+1")}, og veggarealet er ${math("m=20")} m². Vi skal finne malingsbehovet D ved å erstatte m med 20.`,
    "2py27-078": `Tanken inneholder først ${math("120")} liter og fylles med ${math("3{,}5")} liter per minutt. Vi skal finne antall minutter ${math("t")} når vannmengden er ${math("365")} liter.`,
    "2py27-079": `Drosjeturen har et startbeløp på ${math("45")} kr og koster deretter ${math("8")} kr per kilometer. Vi skal finne antall kilometer ${math("x")} når totalprisen er ${math("285")} kr.`,
    "2py27-080": `Ladeavtalen har et fastbeløp på ${math("150")} kr og koster deretter ${math("2{,}4")} kr per kWh. Vi skal finne antall kWh ${math("x")} når totalprisen er ${math("390")} kr.`,
    "2py27-081": `Sparebeløpet starter på ${math("75")} kr og øker med ${math("12")} kr per måned. Vi skal finne antall måneder ${math("m")} når beløpet er ${math("495")} kr.`,
    "2py27-082": `Planten er ${math("36")} cm høy ved starten og vokser ${math("0{,}8")} cm per dag. Vi skal finne antall dager ${math("d")} før planten er ${math("100")} cm høy.`,
    "2py27-248": `I modellen ${math("K(x)=250+6x")} er 250 leddet uten x. Vi skal finne ut hva dette tallet betyr i situasjonen, ikke bare hva det heter.`,
    "2py27-249": `Grafen krysser t-aksen når høydeverdien er 0. Her betyr skjæringen ved ${math("t=30")} at vi må tolke hva ${math("V(30)=0")} sier om tanken.`,
    "2py27-250": `Algemengden multipliseres med ${math("0{,}8")} hver uke. Faktoren forteller hvor stor del som er igjen, og forskjellen opp til ${math("1")} forteller nedgangen.`,
    "2py27-251": `Den proporsjonale grafen går gjennom ${math("(4,28)")}. Det betyr at 4 enheter av x svarer til 28 enheter av y. Konstanten forteller hvor mye y øker når x øker med 1.`,
    "2py27-252": `Modellen er ${math("y=120/x")}. Vi skal finne en egenskap som må gjelde for alle punkter som følger denne modellen.`,
    "2py27-258": `Tallet er skrevet som ${math("3{,}2\\cdot10^5")}. Tierpotensen bestemmer hvor mange plasser kommaet skal flyttes, mens ${math("3{,}2")} skal beholde de samme sifrene.`,
    "2py27-259": `${math("800")} er hele mengden, altså ${math("100\\,\\%")}. Vi skal finne delen som svarer til ${math("45\\,\\%")} av denne mengden.`,
    "2py27-260": `Grunntallet er ${math("2")}, og eksponenten ${math("8")} forteller at 2 skal brukes som faktor åtte ganger.`,
    "2py27-261": `Tallene er allerede sortert, og det er fem av dem. Medianen er derfor verdien på den ene plassen som ligger nøyaktig i midten.`,
    "2py27-262": `Uttrykket er ${math("6x+5")}, og ${math("x=7")}. Vi skal erstatte x med 7 og bruke multiplikasjon før addisjon.`,
  };

  // Del 1 skal ikke starte med en generell arbeidsordre. Første hint peker ut
  // de faktiske tallene og rollene deres, slik at en nybegynner vet hva som er
  // kjent, hva som er hele mengden, og hva som skal finnes før regningen starter.
  if (question.del === 1) {
    if (mixedContexts[question.id]) return mixedContexts[question.id];
    if (method === "percent_of") {
      return `${math(number(input.total))} er hele mengden, altså ${math("100\\,\\%")}. Vi kjenner prosentdelen ${math(`${number(input.prosent)}\\,\\%`)}, og skal finne hvor mange den delen inneholder.`;
    }
    if (method === "part_as_percent") {
      return `${math(number(input.hel))} er hele mengden, altså ${math("100\\,\\%")}, mens ${math(number(input.del))} er delen. Vi skal finne hvor mange prosent denne delen utgjør.`;
    }
    if (method === "whole_from_part") {
      return `Vi vet at ${math(number(input.del))} tilsvarer ${math(`${number(input.prosent)}\\,\\%`)}. Det vi mangler, er hele mengden, altså ${math("100\\,\\%")}.`;
    }
    if (method === "percentage_points") {
      return `Den gamle andelen er ${math(`${number(input.gammel)}\\,\\%`)}, og den nye er ${math(`${number(input.ny)}\\,\\%`)}. Vi skal finne både forskjellen i prosentpoeng og endringen målt i forhold til den gamle andelen.`;
    }
    if (method === "growth_factor") {
      if (/(?:Hva er|Hvilken) vekstfaktor/u.test(question.sporsmal)) {
        return `En vekstfaktor forteller hvilken del av startverdien som er igjen etter endringen. ${math("1")} betyr ${math("100\\,\\%")}, og endringen er ${math(`${number(input.endring)}\\,\\%`)}.`;
      }
      const factor = normalizedNumber(1 + input.endring / 100);
      return `Vekstfaktoren er ${math(number(factor))}. Vi skal sammenligne den med ${math("1")}, som betyr uendret verdi, og finne prosentendringen.`;
    }
    if (method === "successive_percent") {
      return `Det skjer to endringer etter hverandre: først ${math(`${number(input.endringer[0])}\\,\\%`)}, deretter ${math(`${number(input.endringer[1])}\\,\\%`)}. Den andre prosenten må regnes av mellomverdien, ikke av startverdien.`;
    }
    if (method === "power") {
      return `Grunntallet er ${math(number(input.grunntall))}, og eksponenten er ${math(number(input.eksponent))}. Eksponenten forteller hvordan grunntallet skal brukes; den er ikke en vanlig faktor.`;
    }
    if (method === "standard_form_operation") {
      return `Hvert tall har en faktor foran tierpotensen og en eksponent. Regn med faktorene og eksponentene hver for seg, og samle dem først etterpå.`;
    }
    if (method === "linear_solve") {
      return `Modellen har den ukjente størrelsen multiplisert med ${math(number(input.a))}, et fastledd på ${math(number(input.b))} og en kjent sluttverdi på ${math(number(input.y))}. Målet er å finne den ukjente uten å endre likheten.`;
    }
    if (method === "mean") {
      return `Vi har ${math(number(input.verdier.length))} observasjoner: ${math(input.verdier.map((value) => number(value)).join(", "))}. Gjennomsnitt betyr at totalsummen fordeles likt på alle observasjonene.`;
    }
    if (method === "median") {
      return `Vi har ${math(number(input.verdier.length))} observasjoner. Medianen er verdien i midten etter sortering, så rekkefølgen må ordnes før vi velger midtposisjonen.`;
    }
    if (method === "mode_range") {
      return `De samme observasjonene skal brukes til to ulike mål: typetallet er verdien som forekommer oftest, mens variasjonsbredden er avstanden fra minste til største verdi.`;
    }
    if (method === "relative_cumulative") {
      return `Frekvensene er ${math(input.frekvenser.map((value) => number(value)).join(", "))}. Relativ frekvens sammenligner én frekvens med totalen, mens kumulativ frekvens legger sammen fra starten til den aktuelle kategorien.`;
    }
    if (method === "missing_from_mean") {
      return `Målgjennomsnittet er ${math(number(input.gjennomsnitt))}, og én observasjon mangler. Først finner vi totalsummen som alle observasjonene må ha til sammen.`;
    }
    if (method === "weighted_mean") {
      return `Hver verdi forekommer så mange ganger som frekvensen ved siden av viser. Derfor må hver verdi multipliseres med sin egen frekvens før vi deler på samlet antall observasjoner.`;
    }
    if (method === "slope") {
      return `Linjen går gjennom ${math(`(${number(input.p1[0])},${number(input.p1[1])})`)} og ${math(`(${number(input.p2[0])},${number(input.p2[1])})`)}. Stigningstallet er endringen opp eller ned delt på endringen mot høyre.`;
    }
    if (method === "average_rate") {
      return `Startpunktet er ${math(`(${number(input.x1)},${number(input.y1)})`)}, og sluttpunktet er ${math(`(${number(input.x2)},${number(input.y2)})`)}. Vi skal fordele hele verdiendringen på hele tidsintervallet.`;
    }
    if (method === "line_value") {
      return `I uttrykket ${math(`y=${number(input.a)}x+${number(input.b)}`)} er ${math(`x=${number(input.x)}`)} kjent. Vi skal erstatte x med dette tallet og finne den tilhørende y-verdien.`;
    }
    if (method === "line_intercept") {
      return `Vi kjenner stigningstallet ${math(number(input.a))} og punktet ${math(`(${number(input.x)},${number(input.y)})`)}. Det ukjente konstantleddet er tallet som gjør at punktet passer i linjens uttrykk.`;
    }
    if (method === "line_intersection") {
      return `Skjæringspunktet er stedet der de to modellene gir samme verdi. Først finner vi x-verdien ved å sette uttrykkene lik hverandre; deretter finner vi den felles y-verdien.`;
    }
    if (method === "table_slope") {
      return `Tabellen viser flere punkter på samme rette linje. Vi trenger bare to punkter for å finne hvor mye y endres når x øker.`;
    }
    if (method === "direct_constant") {
      return `${math(number(input.x))} enheter svarer til ${math(number(input.y))}. Konstanten er verdien for én enhet, så totalen skal deles på antallet enheter.`;
    }
    if (method === "direct_scale") {
      return `${math(number(input.x1))} enheter svarer til ${math(number(input.y1))}, og vi skal finne verdien for ${math(number(input.x2))} enheter. Ved proporsjonalitet er verdien per enhet den samme.`;
    }
    if (method === "inverse_scale") {
      return `${math(number(input.x1))} av den første størrelsen hører sammen med ${math(number(input.y1))} av den andre. Ved omvendt proporsjonalitet er produktet konstant når den ene størrelsen endres.`;
    }
    if (method === "inverse_plus_constant") {
      return `Modellen består av en omvendt proporsjonal del, ${math(`${number(input.k)}/x`)}, og et fastledd på ${math(number(input.fast))}. Disse to delene må regnes hver for seg.`;
    }
    if (method === "median_category") {
      return `Den siste kumulative frekvensen, ${math(number(input.kumulativ.at(-1)))}, er totalt antall svar. Medianen finnes ved å plassere midtposisjonen i riktig kategori.`;
    }
    if (method === "code_sum") {
      return `Programmet starter summen på ${math("0")} og legger til verdiene ${math(input.verdier.map((value) => number(value)).join(", "))} én om gangen. Utskriften kommer først etter at hele listen er brukt.`;
    }
    if (method === "code_growth") {
      return `Programmet starter med ${math(number(input.start))} og bruker faktoren ${math(number(input.faktor))} i ${math(number(input.runder))} runder. Hver runde begynner med verdien fra runden før.`;
    }
    if (method === "code_threshold") {
      return `Programmet starter med verdi ${math(number(input.start))} og teller ${math("n=0")}. I hver runde endres verdien med faktor ${math(number(input.faktor))} før stoppgrensen ${math(number(input.grense))} testes på nytt.`;
    }
    if (method === "code_statistics") {
      return `Programmet endrer eller filtrerer listen før det regner. Vi må derfor først finne nøyaktig hvilke verdier som står igjen, og bare bruke disse i sluttregningen.`;
    }
    if (method === "interpret_exponential") {
      return `I modellen er ${math(number(input.a))} startverdien, mens ${math(number(input.faktor))} er faktoren som brukes én gang per periode. Vi skal oversette faktoren til en prosentvis endring.`;
    }
    if (family === "d1-prosent-pastand" || family === "d1-algebra-pastand") {
      return "Påstanden bruker ord som «alltid» eller beskriver en generell regel. Derfor må hvert steg enten bevise regelen generelt eller vise ett konkret moteksempel som avkrefter den.";
    }
    if (family === "d1-tilbud") {
      return "Tilbudene er oppgitt på to ulike måter: ett som prosent og ett som kroner. Før de kan sammenlignes, må prosentavslaget også gjøres om til kroner.";
    }
    if (family === "d1-proporsjonal-tabell") {
      return "Vi skal klassifisere sammenhengen i tabellen. Proporsjonalitet har konstant forhold, omvendt proporsjonalitet har konstant produkt, og en lineær sammenheng har konstant differanse i y for like x-steg.";
    }
    if (/statistikk-valg|kritisk-statistikk|uteliggere/.test(family)) {
      return "Vi skal vurdere hva dataene faktisk gir grunnlag for å si. Skill mellom en beregning for datasettet og en påstand om enkeltobservasjoner, årsaker eller en større befolkning.";
    }
    if (/modellkritikk|modellvalg|lineaer-modell/.test(family)) {
      return "Sammenlign modellen med situasjonen: Se etter startverdi, endring per enhet, gyldig område og om utviklingen er jevn eller prosentvis.";
    }
  }

  if (/kode/.test(family)) {
    return "Noter startverdien til hver variabel. Les deretter løkker og vilkår i samme rekkefølge som programmet utfører dem.";
  }
  if (/pastand/.test(family)) {
    return "Avgjør om påstanden skal gjelde alltid eller bare i ett tilfelle. En generell påstand krever et bevis, mens ett gyldig moteksempel er nok til å avkrefte den.";
  }
  if (family === "d1-formel-innsetting") {
    return "Marker verdiene som skal settes inn, og hvilken størrelse formelen skal beregne. Variablene skal erstattes før regnerekkefølgen brukes.";
  }
  if (family === "d1-prosent-av-tall") {
    return "Marker totalen og prosentandelen. Finn hvor mange den oppgitte prosentandelen tilsvarer.";
  }
  if (family === "d1-finne-prosent") {
    return "Marker delen og totalen. Finn hvor stor del dette er uttrykt i prosent.";
  }
  if (family === "d1-finne-helhet") {
    return "Marker antallet som er oppgitt, og prosenten det tilsvarer. Det totale antallet er ukjent.";
  }
  if (family === "d1-prosentpoeng") {
    return "Marker den gamle og den nye prosentandelen. Du skal skille mellom endring i prosentpoeng og relativ endring i prosent.";
  }
  if (family === "d1-gjennomsnittlig-vekstfart") {
    const ratePhrase = /timer|time/u.test(question.sporsmal) ? "for hver time" : "for hvert minutt";
    return `Marker startpunktet, sluttpunktet og enhetene. Du skal finne hvor mye den målte størrelsen i gjennomsnitt endres ${ratePhrase}.`;
  }
  if (/prosent|vekstfaktor|indeks|tilbud|finne-helhet/.test(family)) {
    return "Marker startverdien, sluttverdien og prosentendringen. Legg merke til hvilken av størrelsene du skal finne.";
  }
  if (/statistikk|frekvens|gjennomsnitt|median|typetall|uteliggere|gruppert|samfunn/.test(family)) {
    return "Finn hvilke observasjoner eller frekvenser som hører med, og marker hvilket statistisk mål eller hvilken sammenligning du skal finne.";
  }
  if (/figur/.test(family)) {
    return "Koble hvert figurnummer til antallet objekter i figuren. Målet er å beskrive mønsteret slik at det også virker for figurer som ikke er tegnet.";
  }
  if (/lineaer|graf|modell|regresjon|eksponential|proporsjonal|stigningstall/.test(family)) {
    return "Marker hvilke størrelser som er input og output, og hva tallene i tabellen, grafen eller modellen representerer.";
  }
  if (/potens|eksponent|standardform|rot/.test(family)) {
    return "Identifiser grunntall, eksponent og regneoperasjon før du bruker en potensregel eller flytter et desimalkomma.";
  }
  if (/ligning|formel|algebra|konstantledd/.test(family)) {
    return "Skriv opp hva som er kjent og hva som er ukjent. Målet er å bevare likheten mens den ukjente størrelsen isoleres.";
  }
  if (question.fasit.type === "valg") {
    return "Finn nøkkelopplysningene som hvert svaralternativ må passe med. Bruk beregning, definisjon eller et moteksempel til å avgjøre valget.";
  }
  return "Skriv opp de gitte størrelsene med riktige enheter, og bestem nøyaktig hvilken størrelse eller påstand som skal finnes.";
}

function workedCheck(question, workedSteps = []) {
  const method = question.kontroll?.metode;
  const input = question.kontroll?.inndata ?? {};
  const result = answerValues(question);

  if (question.fasit.type === "valg") {
    const evidence = choiceWorkedEvidence(question)
      ?? [...workedSteps].reverse().find((hint) => hint !== question.svar);
    return evidence
      ? `${evidence} Derfor passer svaret: ${question.svar}`
      : `Sammenlign det valgte alternativet med alle opplysningene i oppgaven. Ingen opplysning skal motsi valget.`;
  }
  if (method === "percent_of") return `${math(`${number(result[0])}/${number(input.total)}\\cdot100\\,\\%=${number(input.prosent)}\\,\\%`)}. Andelen blir den oppgitte prosenten av totalen.`;
  if (method === "part_as_percent") return `${math(`${number(input.hel)}\\cdot${number(result[0] / 100)}=${number(input.del)}`)}. Vi får tilbake den oppgitte delen.`;
  if (method === "whole_from_part") return `${math(`${number(result[0])}\\cdot${number(input.prosent / 100)}=${number(input.del)}`)}. Den beregnede helheten gir riktig del.`;
  if (method === "percentage_points") {
    const symbol = result[0] < 0 ? "-" : "+";
    return `${math(`${number(input.gammel)}${symbol}${number(Math.abs(result[0]))}=${number(input.ny)}`)}. Prosentpoengsendringen fører tilbake til den nye andelen.`;
  }
  if (method === "growth_factor") {
    const symbol = input.endring < 0 ? "-" : "+";
    return `${math(`1${symbol}${number(Math.abs(input.endring))}/100=${number(1 + input.endring / 100)}`)}. Faktoren har riktig retning og størrelse.`;
  }
  if (method === "power") {
    const { grunntall, eksponent } = input;
    if (eksponent < 0) {
      const denominator = grunntall ** Math.abs(eksponent);
      return `${math(`${number(result[0])}\\cdot${number(denominator)}=1`)}. Desimaltallet og den omvendte potensen gir samme verdi.`;
    }
    const partial = grunntall ** (eksponent - 1);
    return `${math(`${number(result[0])}/${number(partial)}=${number(grunntall)}`)}. Når én faktor tas bort, står grunntallet igjen.`;
  }
  if (method === "linear_solve") return `${math(`${number(input.a)}\\cdot${number(result[0])}+${number(input.b)}=${number(input.y)}`)}. Innsettingen gir den oppgitte sluttverdien.`;
  if (method === "mean" || method === "d2_stats_mean") {
    const sum = input.verdier.reduce((total, value) => total + value, 0);
    return `${math(`${number(result[0])}\\cdot${input.verdier.length}=${number(sum)}`)}. Gjennomsnitt ganger antall observasjoner gir totalsummen.`;
  }
  if (method === "slope") return `${math(`${number(result[0])}\\cdot(${number(input.p2[0])}-${number(input.p1[0])})=${number(input.p2[1])}-${number(input.p1[1])}`)}. Endringen i y stemmer med punktene.`;
  if (method === "average_rate") return `${math(`${number(result[0])}\\cdot(${number(input.x2)}-${number(input.x1)})=${number(input.y2)}-${number(input.y1)}`)}. Vekstfarten ganger tidsintervallet gir hele verdiendringen.`;
  if (method === "weighted_mean") {
    const products = input.verdier.map((value, index) => value * input.frekvenser[index]);
    const weightedSum = products.reduce((sum, value) => sum + value, 0);
    const total = input.frekvenser.reduce((sum, value) => sum + value, 0);
    return `${math(`${number(result[0])}\\cdot${number(total)}=${number(weightedSum)}`)}. Gjennomsnitt ganger samlet frekvens gir den veide summen tilbake.`;
  }
  if (method === "median_category") {
    const total = input.kumulativ.at(-1);
    const category = result[0];
    const previous = category > 1 ? input.kumulativ[category - 2] : 0;
    const current = input.kumulativ[category - 1];
    if (total % 2 === 1) {
      const position = (total + 1) / 2;
      return `${math(`${number(previous)}<${number(position)}\\le${number(current)}`)}. Midtposisjonen ligger derfor i kategori ${math(number(category))}.`;
    }
    const left = total / 2;
    const right = left + 1;
    return `${math(`${number(previous)}<${number(left)}<${number(right)}\\le${number(current)}`)}. Begge midtposisjonene ligger derfor i kategori ${math(number(category))}.`;
  }
  if (method === "code_growth") {
    const previous = normalizedNumber(result[0] / input.faktor);
    return `${math(`${number(result[0])}/${number(input.faktor)}=${number(previous)}`)}. Ett steg bakover gir verdien fra nest siste runde.`;
  }
  if (method === "line_value") {
    const product = input.a * input.x;
    return `${math(`${number(result[0])}-${number(input.b)}=${number(product)}=${number(input.a)}\\cdot${number(input.x)}`)}. Når konstantleddet trekkes fra, står den variable delen igjen.`;
  }
  if (method === "line_intercept") {
    return `${math(`${number(input.a)}\\cdot${number(input.x)}+${number(result[0])}=${number(input.y)}`)}. Punktets x- og y-verdi passer i linjens uttrykk.`;
  }
  if (method === "line_intersection") {
    const first = input.b1 + input.a1 * result[0];
    const second = input.b2 + input.a2 * result[0];
    return `${math(`${number(input.b1)}+${number(input.a1)}\\cdot${number(result[0])}=${number(first)}`)} og ${math(`${number(input.b2)}+${number(input.a2)}\\cdot${number(result[0])}=${number(second)}`)}. Begge modellene gir samme kostnad.`;
  }
  if (method === "direct_constant") return `${math(`${number(result[0])}\\cdot${number(input.x)}=${number(input.y)}`)}. Enhetsverdien ganger antallet gir totalen tilbake.`;
  if (method === "direct_scale") return `${math(`${number(result[0])}\\cdot${number(input.x1)}=${number(input.y1)}\\cdot${number(input.x2)}`)}. Kryssproduktene er like, så skaleringen er proporsjonal.`;
  if (method === "inverse_scale") return `${math(`${number(input.x1)}\\cdot${number(input.y1)}=${number(input.x2)}\\cdot${number(result[0])}`)}. Produktet er det samme før og etter.`;
  if (method === "inverse_plus_constant") return `${math(`(${number(result[0])}-${number(input.fast)})\\cdot${number(input.x)}=${number(input.k)}`)}. Når fastleddet fjernes, får vi den omvendt proporsjonale delen tilbake.`;
  if (method === "code_statistics") {
    const selected = input.variant === 0
      ? [...input.verdier].sort((a, b) => a - b).slice(1, -1)
      : input.verdier.filter((value) => value >= 8);
    const sum = selected.reduce((total, value) => total + value, 0);
    return input.variant === 0
      ? `${math(`${number(result[0])}\\cdot${selected.length}=${number(sum)}`)}. Gjennomsnittet gir summen av verdiene som står igjen.`
      : `${math(`${selected.map((value) => number(value)).join("+")}=${number(result[0])}`)}. Bare verdiene som oppfyller vilkåret, er med i summen.`;
  }
  if (method === "standard_form_operation") {
    const resultExpression = `${number(result[0])}\\cdot10^{${number(result[1])}}`;
    const firstExpression = `${number(input.a)}\\cdot10^{${number(input.m)}}`;
    const secondExpression = `${number(input.b)}\\cdot10^{${number(input.n)}}`;
    return input.operasjon === "produkt"
      ? `${math(`(${resultExpression})/(${secondExpression})=${firstExpression}`)}. Divisjon med den ene faktoren gir den andre tilbake.`
      : `${math(`(${resultExpression})\\cdot(${secondExpression})=${firstExpression}`)}. Multiplikasjon med divisoren gir telleren tilbake.`;
  }
  if (method === "direct_formula") {
    const checks = {
      "2py27-073": "200-100=100=5\\cdot20",
      "2py27-074": "12/3=4",
      "2py27-075": "20/5=4",
      "2py27-076": "50-32=18=1{,}8\\cdot10",
      "2py27-077": "2-1=1=0{,}05\\cdot20",
    };
    return `${math(checks[question.id])}. Den motsatte operasjonen gir den variable delen av formelen tilbake.`;
  }
  if (method === "mixed_value") {
    const checks = {
      "2py27-258": "320\\,000/100\\,000=3{,}2",
      "2py27-259": "360/800\\cdot100\\,\\%=45\\,\\%",
      "2py27-260": "256/16=16=2^4",
      "2py27-261": "(5+1)/2=3",
      "2py27-262": "47-5=42=6\\cdot7",
    };
    if (checks[question.id]) return `${math(checks[question.id])}. Kontrollregningen passer med opplysningene.`;
  }
  if (method === "d2_society_total_change") {
    const oldTotal = input.gammel.reduce((total, value) => total + value, 0);
    const newTotal = input.ny.reduce((total, value) => total + value, 0);
    return `${math(`${number(oldTotal)}\\cdot(1+${number(result[0])}/100)\\approx${number(newTotal)}`)}. Avviket skyldes bare avrunding til én desimal.`;
  }
  if (question.variantfamilie === "d2-figur-d") {
    const group = groups.get(question.oppgavegruppe.id);
    const n = result[0];
    return `${math(`f(${number(n - 1)})=${number(figureValue(group.id, n - 1))}`)} er under grensen, mens ${math(`f(${number(n)})=${number(figureValue(group.id, n))}`)} når den. Derfor er figurnummeret det minste mulige.`;
  }

  const calculation = workedCalculation(question);
  if (calculation) return `Regn med de oppgitte verdiene: ${calculation}`;
  return `${question.svar} Enhet, fortegn og størrelsesorden stemmer med opplysningene.`;
}

function wrapBareDecimalMath(text) {
  return text
    .split(/(\\\(.*?\\\))/gu)
    .map((part) => part.startsWith("\\(")
      ? part
      : part.replace(/-?\d+\{,\}\d+/gu, (token) => math(token)))
    .join("");
}

function greatestCommonDivisor(left, right) {
  let a = Math.abs(Math.round(left));
  let b = Math.abs(Math.round(right));
  while (b !== 0) [a, b] = [b, a % b];
  return a || 1;
}

function reducedFractionStep(numerator, denominator, divisor) {
  const reducedNumerator = numerator / divisor;
  const reducedDenominator = denominator / divisor;
  return `Forkort ved å dele tallet over brøkstreken og tallet under brøkstreken med ${math(number(divisor))}: ${math(`\\frac{${number(numerator)}\\div${number(divisor)}}{${number(denominator)}\\div${number(divisor)}}=\\frac{${number(reducedNumerator)}}{${number(reducedDenominator)}}`)}.`;
}

function signedSumExpression(values) {
  return values.map((value, index) =>
    (index > 0 && value >= 0 ? "+" : "") + number(value)).join("");
}

function percentShortcut(total, percent) {
  const p = Math.abs(percent);
  const value = normalizedNumber(total * p / 100);
  const fractionNames = new Map([
    [50, ["halvparten", 2]],
    [25, ["en firedel", 4]],
    [20, ["en femdel", 5]],
    [12.5, ["en åttedel", 8]],
    [10, ["en tidel", 10]],
  ]);
  if (fractionNames.has(p)) {
    const [name, denominator] = fractionNames.get(p);
    return number(p) + " % er " + name + ". Del derfor " + math(number(total) + "/" + denominator + "=" + number(value)) + " i stedet for å starte med desimaltall.";
  }
  if (p === 5) {
    const tenPercent = normalizedNumber(total / 10);
    return "Finn 10 % og halver: " + math(number(total) + "/10=" + number(tenPercent)) + " og " + math(number(tenPercent) + "/2=" + number(value)) + ".";
  }
  const decompositions = new Map([
    [2, [1, 1]],
    [6, [5, 1]],
    [8, [10, -2]],
    [12, [10, 2]],
    [15, [10, 5]],
    [18, [20, -2]],
    [22, [20, 2]],
    [30, [10, 10, 10]],
    [32, [30, 2]],
    [35, [25, 10]],
    [45, [50, -5]],
  ]);
  const chunks = decompositions.get(p);
  if (!chunks) return null;
  const chunkValues = chunks.map((chunk) => normalizedNumber(total * Math.abs(chunk) / 100));
  let expression = "";
  let description = "";
  chunks.forEach((chunk, index) => {
    const sign = chunk < 0 ? "-" : index === 0 ? "" : "+";
    expression += sign + number(chunkValues[index]);
    description += (index === 0 ? "" : chunk < 0 ? " minus " : " pluss ") + number(Math.abs(chunk)) + " %";
  });
  return "Del prosenten i kjente deler: " + description + ". Da får du " + math(expression + "=" + number(value)) + ".";
}

const simpleStrategyOverrides = {
  "2py27-001": "Ti prosent er én tidel. Del derfor hele gruppen på " + math("10") + ".",
  "2py27-002": "Dette kan gjøres i hodet: 25 % er en firedel. Del 360 i fire like deler og spør hvor stor hver del blir.",
  "2py27-003": "Tretti prosent er tre like 10 %-deler. Finn først 10 % ved å dele på " + math("10") + ", og gang deretter med " + math("3") + ".",
  "2py27-004": "Dette kan gjøres i hodet: 25 % er en firedel. Del 160 i fire like deler.",
  "2py27-005": "Ti prosent er én tidel. Del derfor alle de 350 svarene i ti like deler.",
  "2py27-073": "Regn den variable delen først: " + math("5\\cdot20=100") + ". Legg deretter til startbeløpet på 100 kr.",
  "2py27-074": "Her holder det å bruke det kjente gangestykket " + math("4\\cdot3=12") + ".",
  "2py27-075": "Arealet er lengde ganger bredde. Bruk det kjente gangestykket " + math("5\\cdot4=20") + ".",
  "2py27-076": "Gang først med 10: " + math("1{,}8\\cdot10=18") + ". Legg deretter til 32.",
  "2py27-077": "Tenk at " + math("0{,}05=5/100") + ". Da er " + math("0{,}05\\cdot20=1") + ", før fastleddet legges til.",
  "2py27-078": "Når du har fått " + math("t=245/3{,}5") + ", ganger du både tallet over og tallet under brøkstreken med " + math("2") + ". Brøkens verdi endres ikke når begge ganges med det samme tallet: " + math("t=\\frac{245\\cdot2}{3{,}5\\cdot2}=\\frac{490}{7}=70") + ", siden " + math("7\\cdot70=490") + ".",
  "2py27-079": "Når du har fått " + math("x=240/8") + ", kan du bruke at " + math("8\\cdot30=240") + ". Derfor er " + math("x=30") + ".",
  "2py27-080": "Når du har fått " + math("x=240/2{,}4") + ", ganger du både tallet over og tallet under brøkstreken med " + math("10") + ". Brøkens verdi endres ikke når begge ganges med det samme tallet: " + math("x=\\frac{240\\cdot10}{2{,}4\\cdot10}=\\frac{2\\,400}{24}=100") + ", siden " + math("24\\cdot100=2\\,400") + ".",
  "2py27-081": "Når du har fått " + math("m=420/12") + ", deler du " + math("420") + " i kjente multipler av " + math("12") + ": " + math("420=360+60=12\\cdot30+12\\cdot5") + ". Dermed er " + math("m=30+5=35") + ".",
  "2py27-082": "Når du har fått " + math("d=64/0{,}8") + ", ganger du både tallet over og tallet under brøkstreken med " + math("10") + ". Brøkens verdi endres ikke når begge ganges med det samme tallet: " + math("d=\\frac{64\\cdot10}{0{,}8\\cdot10}=\\frac{640}{8}=80") + ", siden " + math("8\\cdot80=640") + ".",
  "2py27-088": "Regn nær et rundt tall: " + math("4\\cdot15=60") + ", og trekk deretter fra 1.",
  "2py27-089": "Dobling er nok her: " + math("2\\cdot12=24") + ", og så " + math("24+3=27") + ".",
  "2py27-090": "Bruk at 20 tiere er lett å gange: " + math("7\\cdot20=140") + ", og trekk deretter fra 5.",
  "2py27-091": "Sett figurnummeret inn i formelen: " + math("18+5=23") + ".",
  "2py27-092": "Fem ganger 25 er en kjent kvart av 500: " + math("5\\cdot25=125") + ", og så " + math("125-1=124") + ".",
  "2py27-093": "Regn inni parentesen før kvadratet: " + math("8+1=9") + ", så " + math("9^2+1=81+1=82") + ".",
  "2py27-094": "Regn inni parentesen før kvadratet: " + math("7+2=9") + ", så " + math("9^2+1=81+1=82") + ".",
  "2py27-095": "Regn inni parentesen før kvadratet: " + math("6+1=7") + ", så " + math("7^2+2=49+2=51") + ".",
  "2py27-096": "Regn inni parentesen før kvadratet: " + math("9+3=12") + ", så " + math("12^2+1=144+1=145") + ".",
  "2py27-097": "Regn inni parentesen før kvadratet: " + math("10+2=12") + ", så " + math("12^2+2=144+2=146") + ".",
  "2py27-233": "Når bare 8 og 10 står igjen, er gjennomsnittet midt mellom dem: " + math("9") + ". Du trenger ikke en lang utregning.",
  "2py27-234": "Etter vilkåret gjenstår bare den korte summen " + math("9+12=21") + ".",
  "2py27-235": "Når bare 22 og 24 står igjen, er gjennomsnittet midt mellom dem: " + math("23") + ".",
  "2py27-236": "Par ytterverdiene: " + math("9+15=24") + ", og legg til 12 slik at summen blir " + math("36") + ".",
  "2py27-237": "Bruk balansering rundt 24: avvikene er " + math("-3+1+2=0") + ". Gjennomsnittet er derfor 24.",
  "2py27-258": "Flytt kommaet fem plasser mot høyre i stedet for å skrive alle nullene én om gangen: " + math("3{,}2\\cdot10^5=320\\,000") + ".",
  "2py27-259": "Del 45 % i 40 % og 5 %. Av 800 er dette " + math("320+40=360") + ".",
  "2py27-260": "Bruk gjentatt kvadrering: " + math("2^4=16") + " og " + math("2^8=16^2=256") + ".",
  "2py27-261": "Du skal ikke summere tallene. Med fem sorterte tall er medianen ganske enkelt det tredje tallet.",
  "2py27-262": "Ta multiplikasjonen først og bruk et kjent gangestykke: " + math("6\\cdot7=42") + ", deretter " + math("42+5=47") + ".",
};

function mentalStrategyHint(question) {
  if (simpleStrategyOverrides[question.id]) return simpleStrategyOverrides[question.id];

  const method = question.kontroll?.metode;
  const input = question.kontroll?.inndata ?? {};
  const result = answerValues(question);

  if (method === "percent_of") return percentShortcut(input.total, input.prosent);

  if (method === "part_as_percent") {
    const divisor = greatestCommonDivisor(input.del, input.hel);
    const denominator = input.hel / divisor;
    const unitPercents = new Map([[2, 50], [4, 25], [5, 20], [8, 12.5], [10, 10], [20, 5], [25, 4], [40, 2.5]]);
    const unitPercent = unitPercents.get(denominator);
    if (unitPercent) {
      return "Unngå lang divisjon. " + reducedFractionStep(input.del, input.hel, divisor) + " Siden " + math("1/" + number(denominator) + "=" + number(unitPercent) + "\\,\\%") + ", kan prosenten bygges av kjente deler.";
    }
  }

  if (method === "whole_from_part") {
    return null;
  }

  if (method === "percentage_points") {
    return "Når prosentpoengsdifferansen er funnet, skriver du den relative endringen som differansen delt på den gamle andelen. Forkort brøken ved å dele tallet over og tallet under brøkstreken med samme tall.";
  }

  if (method === "growth_factor") {
    const factor = normalizedNumber(1 + input.endring / 100);
    if (/(?:Hva er|Hvilken) vekstfaktor/u.test(question.sporsmal)) {
      return "Tenk i prosent før desimaltall: " + math("100" + (input.endring < 0 ? "-" : "+") + number(Math.abs(input.endring)) + "=" + number(100 + input.endring) + "\\,\\%") + ", som skrives " + math(number(factor)) + ".";
    }
    return "Les faktoren som prosent direkte: " + math(number(factor) + "=" + number(factor * 100) + "\\,\\%") + ". Forskjellen fra 100 % gir endringen.";
  }

  if (method === "successive_percent") {
    return "Velg 100 som tenkt startverdi. Da blir hver prosentendring til hele, oversiktlige deler, og du ser samtidig hvorfor prosentene ikke bare kan legges sammen.";
  }

  if (method === "power") {
    const base = input.grunntall;
    const exponent = input.eksponent;
    const displayedBase = base < 0 ? "(" + number(base) + ")" : number(base);
    if (exponent < 0) {
      const denominator = Math.abs(base) ** Math.abs(exponent);
      return "Regn først den positive potensen og snu brøken etterpå: " + math(displayedBase + "^{" + number(exponent) + "}=1/" + displayedBase + "^{" + number(Math.abs(exponent)) + "}=1/" + number(denominator)) + ".";
    }
    if (exponent >= 2) {
      const square = base ** 2;
      return "Bygg potensen av kjente blokker. Start med " + math(displayedBase + "^2=" + number(square)) + " og bruk dette videre; bestem fortegnet før du regner når grunntallet er negativt.";
    }
  }

  if (method === "standard_form_operation") {
    const coefficientExpression = input.operasjon === "produkt"
      ? number(input.a) + "\\cdot" + number(input.b)
      : number(input.a) + "/" + number(input.b);
    const exponentExpression = input.operasjon === "produkt"
      ? number(input.m) + (input.n < 0 ? "-" : "+") + number(Math.abs(input.n))
      : number(input.m) + (input.n < 0 ? "+" : "-") + number(Math.abs(input.n));
    return "Hold de to små regnestykkene fra hverandre: koeffisienten blir " + math(coefficientExpression) + ", mens tierpotensen bruker " + math(exponentExpression) + ".";
  }

  if (method === "direct_constant") {
    return null;
  }

  if (method === "direct_scale") {
    return null;
  }

  if (method === "inverse_scale") {
    return null;
  }

  if (method === "inverse_plus_constant") {
    const variablePart = normalizedNumber(input.k / input.x);
    return "Del før du legger til fastleddet. Her er " + math(number(input.k) + "/" + number(input.x) + "=" + number(variablePart)) + ", så bare den korte addisjonen " + math(number(variablePart) + "+" + number(input.fast)) + " gjenstår.";
  }

  if (method === "mean") return null;

  if (method === "d2_stats_mean") {
    const mean = result[0];
    if (question.del === 2 && !Number.isInteger(mean)) return null;
    const deviations = input.verdier.map((value) => normalizedNumber(value - mean));
    const deviationSum = deviations.reduce((sum, value) => sum + value, 0);
    return "Bruk balansering rundt " + math(number(mean)) + " i stedet for bare lang summering. Avvikene er " + math(signedSumExpression(deviations) + "=" + number(deviationSum)) + ", så de opphever hverandre.";
  }

  if (method === "median") return null;

  if (method === "d2_stats_median") {
    const sorted = [...input.verdier].sort((a, b) => a - b);
    const middle = sorted.length % 2 === 0
      ? number(sorted.length / 2) + ". og " + number(sorted.length / 2 + 1) + "."
      : number((sorted.length + 1) / 2) + ".";
    return "Ikke summer tallene. Sorter og stryk ett tall fra hver ende; med " + math(number(sorted.length)) + " observasjoner trenger du bare den " + middle + " plassen.";
  }

  if (method === "mode_range") {
    return null;
  }

  if (method === "relative_cumulative") {
    const total = input.frekvenser.reduce((sum, value) => sum + value, 0);
    const frequency = input.frekvenser[input.indeks];
    const divisor = greatestCommonDivisor(frequency, total);
    if (divisor === 1 && total === 40) {
      return "Når totalen er 40, er hver observasjon " + math("100/40=2{,}5\\,\\%") + ". Gang derfor " + math(number(frequency) + "\\cdot2{,}5\\,\\%=" + number(result[0]) + "\\,\\%") + ".";
    }
    return reducedFractionStep(frequency, total, divisor) + " Gjør deretter den forkortede brøken om til prosent.";
  }

  if (method === "missing_from_mean") {
    return null;
  }

  if (method === "weighted_mean") {
    return null;
  }

  if (method === "slope") {
    const deltaX = input.p2[0] - input.p1[0];
    const deltaY = input.p2[1] - input.p1[1];
    return "Finn de to endringene først. Da står bare den korte divisjonen " + math(number(deltaY) + "/" + number(deltaX) + "=" + number(result[0])) + " igjen.";
  }

  if (method === "line_intercept") {
    const product = normalizedNumber(input.a * input.x);
    const interceptExpression = product < 0
      ? number(input.y) + "+" + number(Math.abs(product))
      : number(input.y) + "-" + number(product);
    return "Regn produktet først: " + math(number(input.a) + "\\cdot" + number(input.x) + "=" + number(product)) + ". Trekk så produktet fra begge sider; da er konstantleddet " + math(interceptExpression + "=" + number(result[0])) + ".";
  }

  if (method === "line_intersection") {
    const subtractSlope = Math.min(input.a1, input.a2);
    return "Start med å trekke " + math(number(subtractSlope) + "x") + " fra begge sider. Da forsvinner det minste x-leddet før du arbeider videre med fastbeløpene.";
  }

  if (method === "table_slope") {
    const deltaX = input.x[1] - input.x[0];
    const deltaY = input.y[1] - input.y[0];
    return "Bruk to nabokolonner i stedet for hele tabellen. Endringene er " + math("\\Delta x=" + number(deltaX)) + " og " + math("\\Delta y=" + number(deltaY)) + ", så " + math(number(deltaY) + "/" + number(deltaX) + "=" + number(result[0])) + ".";
  }

  if (method === "interpret_exponential") {
    const factor = input.faktor;
    const percent = normalizedNumber((factor - 1) * 100);
    return "Les vekstfaktoren som prosent i hodet: " + math(number(factor) + "=" + number(factor * 100) + "\\,\\%") + ". Forskjellen fra 100 % er " + math(number(percent) + "\\,\\%") + ".";
  }

  if (method === "average_rate") {
    const deltaX = input.x2 - input.x1;
    const deltaY = input.y2 - input.y1;
    return "Regn endringene før du deler: " + math("\\Delta y=" + number(deltaY)) + " og " + math("\\Delta x=" + number(deltaX)) + ". Da blir vekstfarten " + math(number(deltaY) + "/" + number(deltaX) + "=" + number(result[0])) + ".";
  }

  if (method === "code_growth" || method === "code_threshold") {
    const factorDescriptions = new Map([
      [0.5, "halvere verdien"],
      [0.75, "ta tre firedeler av verdien"],
      [1.1, "legge til en tidel"],
      [1.2, "legge til en femdel"],
      [1.5, "legge til halvparten"],
      [2, "doble verdien"],
    ]);
    const description = factorDescriptions.get(input.faktor);
    if (description) return "Oversett faktoren til hoderegning før du sporer programmet: faktor " + math(number(input.faktor)) + " betyr at du skal " + description + " i hver runde.";
  }

  if (method === "line_value") {
    const product = normalizedNumber(input.a * input.x);
    return "Ta den variable delen først: " + math(number(input.a) + "\\cdot" + number(input.x) + "=" + number(product)) + ". Legg så til konstantleddet " + math(number(input.b)) + ".";
  }

  if (method === "median_category") {
    return null;
  }

  if (method === "discount_vat") {
    const discount = percentShortcut(input.pris, input.rabatt);
    return (discount ? discount + " " : "") + "Når 25 % mva er inkludert, består prisen av fem firedeler; prisen uten mva er derfor fire femdeler av beløpet med mva.";
  }

  if (method === "d2_percent_first") {
    const shortcut = percentShortcut(input.start, Math.abs(input.endring));
    if (shortcut) return "Gjør et overslag uten verktøy først. " + shortcut;
  }

  if (method === "d2_percent_final") {
    const firstValue = normalizedNumber(input.start * (1 + input.endringer[0] / 100));
    const shortcut = percentShortcut(firstValue, Math.abs(input.endringer[1]));
    if (shortcut) return "Den andre prosenten regnes av mellomverdien, ikke av starten. " + shortcut;
  }

  if (method === "relative_change") {
    const difference = normalizedNumber(input.ny - input.gammel);
    const estimate = Math.round(Math.abs(difference / input.gammel * 100));
    return "Gjør et raskt overslag før den nøyaktige beregningen: " + math(number(Math.abs(difference)) + "/" + number(input.gammel)) + " er omtrent " + math(number(estimate) + "\\,\\%") + ". Det gir en nyttig kontroll på kalkulatorsvaret.";
  }

  return null;
}

function normalizedAnswerText(text) {
  return String(text)
    .replace(/\\,/gu, "")
    .replace(/\{,\}/gu, ".")
    .replace(/\\(?:,|;|!|quad|qquad)/gu, "")
    .replace(/\\%/gu, "%")
    .replace(/\s+/gu, "")
    .trim();
}

function escapeRegularExpression(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function containsStandaloneNumber(text, marker) {
  const normalized = normalizedAnswerText(text);
  const escaped = escapeRegularExpression(normalizedAnswerText(marker));
  return new RegExp(`(?<![0-9])(?<![0-9]\\.)${escaped}(?![0-9]|\\.[0-9])`, "u").test(normalized);
}

function questionGivenText(question) {
  const group = question.oppgavegruppe ? groups.get(question.oppgavegruppe.id) : null;
  return [
    question.sporsmal,
    question.data ? JSON.stringify(question.data) : "",
    group?.innledning,
    group?.data ? JSON.stringify(group.data) : "",
    question.visualisering ? JSON.stringify(question.visualisering) : "",
  ].filter(Boolean).join(" ");
}

function replaceStandalone(text, target, replacement) {
  const escaped = escapeRegularExpression(target);
  // Et punktum etter et heltall er ofte bare punktumet som avslutter
  // setningen. Desimalskilletegn skal derimot fortsatt beskytte delene av
  // tallet, slik at svaret 2 ikke maskerer 2,8 eller 0,02.
  return text.replace(
    new RegExp(`(?<![0-9])(?<![0-9][.,])(?<![0-9]\\{,\\})(?<![0-9]\\\\,)${escaped}(?![0-9]|[.,][0-9]|\\{,\\}[0-9]|\\\\,[0-9])`, "gu"),
    replacement,
  );
}

function pureNumericRelationResult(text) {
  return parseLatexNumber(String(text)
    .replace(/\\(?:,|;|!)/gu, "")
    .replace(/\\%|%/gu, "")
    .replace(/\\text\{[^}]*\}/gu, "")
    .trim());
}

function maskFinalAnswer(question, hint) {
  const givenText = questionGivenText(question);
  const answerNumbers = answerValues(question);
  // Et mellomresultat må skjules når det i praksis avslører svaret på en
  // valgoppgave (som rabattbeløpet i en tilbudssammenligning). I talloppgaver
  // er de samme mellomresultatene derimot selve stillaset eleven trenger.
  const derivedNumbers = answerChoiceValues(question).length > 0
    ? solutionResultNumbers(question)
      .filter((value) => !answerNumbers.some((answer) => normalizedNumber(answer) === normalizedNumber(value)))
    : [];
  const hiddenValues = answerNumbers
    .filter((value) => !containsStandaloneNumber(givenText, plainDecimal(value)));
  const hiddenDerivedValues = derivedNumbers
    .filter((value) => !containsStandaloneNumber(givenText, plainDecimal(value)));
  let masked = hint.replace(/\\\((.*?)\\\)/gu, (_match, expression, offset) => {
    let maskedExpression = expression;
    for (const value of [...hiddenValues, ...hiddenDerivedValues]) {
      const variants = new Set([
        number(value),
        plainDecimal(value),
        plainDecimal(value).replace(".", "{,}"),
        plainDecimal(value).replace(".", ","),
      ]);
      for (const variant of variants) maskedExpression = replaceStandalone(maskedExpression, variant, "\\square");
    }
    for (const value of answerNumbers.filter((answer) => !hiddenValues.includes(answer))) {
      const relationMatches = [...maskedExpression.matchAll(/=|\\approx|\\le|\\ge|[~≈≤≥]/gu)];
      const lastRelation = relationMatches.at(-1);
      if (!lastRelation) continue;
      const leftSide = maskedExpression.slice(0, lastRelation.index);
      const resultStart = lastRelation.index + lastRelation[0].length;
      const finalPart = maskedExpression.slice(resultStart);
      // Når fasittallet også står i oppgaven, kan det være en oppgitt verdi i
      // et vanlig innsettingssteg, for eksempel x=12 eller y=-3x+18. Masker
      // bare et rent sluttresultat etter et faktisk regnestykke.
      if (!/[+\-*/^]|\\(?:cdot|frac|div|sqrt)/u.test(leftSide)) continue;
      if (pureNumericRelationResult(finalPart) !== normalizedNumber(value)) continue;
      const variants = new Set([
        number(value),
        plainDecimal(value),
        plainDecimal(value).replace(".", "{,}"),
        plainDecimal(value).replace(".", ","),
      ]);
      for (const variant of variants) {
        const finalIndex = finalPart.indexOf(variant);
        if (finalIndex < 0 || /\d/u.test(finalPart.slice(0, finalIndex))) continue;
        const index = resultStart + finalIndex;
        maskedExpression = `${maskedExpression.slice(0, index)}\\square${maskedExpression.slice(index + variant.length)}`;
        break;
      }
    }
    for (const value of derivedNumbers) {
      const relationMatches = [...maskedExpression.matchAll(/=|\\approx|\\le|\\ge|[~≈≤≥]/gu)];
      const lastRelation = relationMatches.at(-1);
      if (!lastRelation) continue;
      const leftSide = maskedExpression.slice(0, lastRelation.index);
      if (!/[+\-*/^]|\\(?:cdot|frac|div|sqrt)/u.test(leftSide)) continue;
      const resultStart = lastRelation.index + lastRelation[0].length;
      const finalPart = maskedExpression.slice(resultStart);
      if (pureNumericRelationResult(finalPart) !== normalizedNumber(value)) continue;
      for (const variant of new Set([
        number(value),
        plainDecimal(value),
        plainDecimal(value).replace(".", "{,}"),
        plainDecimal(value).replace(".", ","),
      ])) {
        const finalIndex = finalPart.indexOf(variant);
        if (finalIndex < 0 || /\d/u.test(finalPart.slice(0, finalIndex))) continue;
        const index = resultStart + finalIndex;
        maskedExpression = `${maskedExpression.slice(0, index)}\\square${maskedExpression.slice(index + variant.length)}`;
        break;
      }
    }
    if (!/[=~≈≤≥]/u.test(maskedExpression)) {
      const precedingText = hint.slice(Math.max(0, offset - 45), offset);
      const followingText = hint.slice(offset + _match.length, offset + _match.length + 70);
      if (
        (
          /(?:svaret|resultatet|blir|gir|har|koster)\s*$/iu.test(precedingText)
          || /(?:verdien på (?:denne|midt)?plassen|medianen|typetallet|svaret|resultatet)\s+er\s*$/iu.test(precedingText)
          || /^(?:\s|[.,:;])*(?:er|blir|gir|forekommer\b.*\ber)\s+(?:medianen|typetallet|svaret|resultatet)/iu.test(followingText)
        )
        && parseLatexNumber(maskedExpression.trim().replace(/\\,?\\%$/u, "")) !== null
      ) {
        for (const value of [...answerNumbers, ...derivedNumbers]) {
          for (const variant of new Set([
            number(value),
            plainDecimal(value),
            plainDecimal(value).replace(".", "{,}"),
            plainDecimal(value).replace(".", ","),
          ])) maskedExpression = replaceStandalone(maskedExpression, variant, "\\square");
        }
      }
    }
    return math(maskedExpression);
  });

  for (const value of hiddenValues) {
    const variants = new Set([plainDecimal(value), plainDecimal(value).replace(".", ",")]);
    for (const variant of variants) masked = replaceStandalone(masked, variant, "□");
  }
  for (const value of hiddenDerivedValues) {
    const variants = new Set([plainDecimal(value), plainDecimal(value).replace(".", ",")]);
    for (const variant of variants) masked = replaceStandalone(masked, variant, "□");
  }
  for (const choice of answerChoiceValues(question)) {
    if (/^-?\d+(?:[.,]\d+)?$/u.test(choice)) {
      masked = replaceStandalone(masked, choice.replace(",", "."), "□");
      masked = replaceStandalone(masked, choice, "□");
      continue;
    }
    const mathChoice = choice.match(/^\\\((.*)\\\)$/u)?.[1];
    if (mathChoice) {
      masked = masked.replace(/\\\((.*?)\\\)/gu, (_match, expression) =>
        math(expression.replaceAll(mathChoice, "\\square")));
      if (/^-?\d+(?:\{,\}\d+)?$/u.test(mathChoice)) {
        masked = replaceStandalone(masked, mathChoice, "□");
      }
    }
  }
  return masked;
}

function answerChoiceValues(question) {
  return question.fasit.riktige
    ?? question.fasit.valg?.riktige
    ?? [];
}

function allChoiceValues(question) {
  return question.fasit.alternativer
    ?? question.fasit.valg?.alternativer
    ?? [];
}

function answerChoiceAliases(choice) {
  const aliases = {
    "proporsjonal": ["proporsjonalitet"],
    "omvendt proporsjonal": ["omvendt proporsjonalitet"],
    "lineær, men ikke proporsjonal": ["lineær, men ikke proporsjonalitet"],
    "lineær modell": ["lineær"],
    "lineær": ["lineær modell"],
    "eksponentialmodell": ["eksponentiell"],
    "eksponential": ["eksponentialmodell", "eksponentiell modell"],
    "potens": ["potensmodell"],
    "andregrad": ["andregradsmodell"],
    "omvendt proporsjonal modell": ["omvendt proporsjonalitet", "omvendt proporsjonal"],
  };
  return [choice, ...(aliases[choice] ?? [])].sort((left, right) => right.length - left.length);
}

function choiceAliasIndex(text, alias) {
  const escaped = escapeRegularExpression(alias.toLocaleLowerCase("nb-NO"));
  return text.toLocaleLowerCase("nb-NO").search(
    new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "u"),
  );
}

function revealsCorrectChoice(question, hint) {
  const mathMatches = [...hint.matchAll(/\\\((.*?)\\\)/gu)];
  const mentionedAlternatives = allChoiceValues(question).filter((alternative) =>
    answerChoiceAliases(alternative).some((alias) =>
      choiceAliasIndex(hint, alias) >= 0));
  const correctChoices = new Set(answerChoiceValues(question));
  for (const choice of answerChoiceValues(question)) {
    if (/^-?\d+(?:[.,]\d+)?$/u.test(choice)) continue;
    const mathChoice = choice.match(/^\\\((.*)\\\)$/u)?.[1];
    if (mathChoice && mathMatches.some((match) => match[1].includes(mathChoice))) return true;
    for (const alias of answerChoiceAliases(choice)) {
      const index = choiceAliasIndex(hint, alias);
      if (index < 0) continue;
      // Et oversiktshint kan forklare flere alternativer side om side uten å
      // røpe hvilket som passer. Ett riktig alternativ alene er derimot nok
      // til å avsløre en valgoppgave, også uten ordet «derfor».
      if (!mentionedAlternatives.some((alternative) => !correctChoices.has(alternative))) return true;
      continue;
    }
  }
  return false;
}

// Et hint skal ikke vise et ferdig resultat. Fasit vises separat av appen etter
// hintrekken. Vi regner også ferdige mellomresultater i valgoppgaver som
// fasitavslørende når de alene avgjør hvilket alternativ som er riktig.
function revealsFinalAnswer(question, hint) {
  const givenText = questionGivenText(question);
  const numericMarkers = solutionResultNumbers(question).map((value) => plainDecimal(value));
  const mathMatches = [...hint.matchAll(/\\\((.*?)\\\)/gu)];

  for (const match of mathMatches) {
    const expression = normalizedAnswerText(match[1]);
    const relationParts = expression.split(/=|\\approx|\\le|\\ge|[~≈≤≥]/u);
    const finalPart = relationParts.at(-1);
    for (const marker of numericMarkers) {
      const normalizedMarker = normalizedAnswerText(marker);
      const exactResult = relationParts.length > 1
        && new RegExp(`^${escapeRegularExpression(normalizedMarker)}(?![0-9.])`, "u").test(finalPart);
      const precedingText = hint.slice(Math.max(0, match.index - 55), match.index);
      const statedResult = expression === normalizedMarker
        && /(?:svaret|derfor|dermed|altså|blir|er|gir|har|skrives)\s*$/iu.test(precedingText);
      const newAnswerNumber = !containsStandaloneNumber(givenText, marker)
        && containsStandaloneNumber(match[1], marker);
      if (exactResult || statedResult || newAnswerNumber) return true;
    }
  }

  for (const marker of numericMarkers) {
    if (containsStandaloneNumber(givenText, marker)) continue;
    if (containsStandaloneNumber(hint, marker)) return true;
    const escaped = escapeRegularExpression(normalizedAnswerText(marker));
    const visible = normalizedAnswerText(hint.replace(/\\\(|\\\)/gu, ""));
    if (new RegExp(`${escaped}.{0,35}(?:ersvaret|blirsvaret|erderforsvaret)`, "iu").test(visible)) return true;
  }

  return revealsCorrectChoice(question, hint);
}

function finalizeProgressiveHints(question, hints, maximum = 5) {
  const minimum = question.del === 1 ? 3 : 2;
  const withoutConclusions = hints.filter((hint) =>
    !/det riktige alternativet/iu.test(hint)
    && (!revealsCorrectChoice(question, hint) || hints.length <= minimum));
  const unique = withoutConclusions
    .filter((hint) => !/^(?:Svar på spørsmålet|Sjekk svaret|Kontroller og konkluder):/u.test(hint))
    .map(wrapBareDecimalMath)
    .map((hint) => maskFinalAnswer(question, hint))
    .filter((hint, index, all) => all.indexOf(hint) === index);

  // Lange, automatisk oppdelte forløp inneholder ofte både et plansteg og et
  // eget «regn helt ut»-steg for samme uttrykk. Fjern først slike kunstige
  // ekstrasteg; behold forståelse, strategi og de konkrete mellomregningene.
  const removalOrder = [
    /^Fullfør regningen: Regn uttrykket helt ut:/u,
    /^Lag en plan:/u,
    /^Arbeid videre:/u,
  ];
  for (const pattern of removalOrder) {
    while (unique.length > maximum) {
      const index = unique.findIndex((hint, hintIndex) => hintIndex > 0 && pattern.test(hint));
      if (index < 0) break;
      unique.splice(index, 1);
    }
  }
  while (unique.length > maximum) unique.splice(unique.length - 2, 1);

  if (unique.length < minimum) {
    throw new Error(`${question.id} har bare ${unique.length} selvstendige hint etter kvalitetsryddingen.`);
  }
  return unique;
}

function asWorkedExample(question) {
  // Denne familien er skrevet ferdig som et detaljert mønstereksempel ovenfor.
  if (question.variantfamilie === "d1-omvendt-prosent") {
    const worked = [];
    for (const hint of question.hint) {
      if (hint.startsWith("Svar på spørsmålet:")) continue;
      if (hint.startsWith("Sjekk svaret:")) continue;
      if (revealsFinalAnswer(question, hint)) {
        worked.push(maskFinalAnswer(question, hint));
      } else worked.push(hint);
    }
    return finalizeProgressiveHints(question, worked);
  }

  const coreHints = question.hint
    .filter((hint) => ![
      "Forstå oppgaven:",
      "Hva vet vi?",
      "Se etter en enkel vei:",
      "Velg en enkel regnevei:",
      "Løsningen samlet:",
      "Svar på spørsmålet:",
      "Kontroller og konkluder:",
      "Sjekk svaret:",
    ].some((prefix) => hint.startsWith(prefix)))
    .map(removeGeneratedPrefix)
    .filter((hint) => !hint.startsWith("Bruk oppgavens tall og utfør regnestykket:"))
    .filter((hint, index, hints) => hints.indexOf(hint) === index);
  const hasWorkedRelation = /=|\\(?:approx|le|ge)|[≤≥]/u.test(coreHints.join(" "));
  if (numericAnswerTypes.has(question.fasit.type) && !hasWorkedRelation) {
    const calculation = workedCalculation(question);
    if (!calculation) throw new Error(`${question.id} mangler en konkret mellomregning.`);
    coreHints.push(calculation);
  }
  if (question.del === 1 && question.fasit.type === "valg" && !hasWorkedRelation) {
    const evidence = choiceWorkedEvidence(question);
    if (evidence) coreHints.push(evidence);
  }

  const stepLabels = ["Lag en plan", "Gjør første del", "Gjør neste del", "Fullfør regningen"];
  const worked = [`Hva vet vi? ${workedContext(question)}`];
  const addWorkedStep = (label, hint) => {
    const step = `${label}: ${hint}`;
    if (revealsFinalAnswer(question, step)) {
      worked.push(`${label}: ${maskFinalAnswer(question, hint)}`);
    } else worked.push(step);
  };
  const strategyHint = mentalStrategyHint(question);
  const compactStrategyMethods = new Map([
    ["average_rate", 1],
    ["inverse_plus_constant", 2],
    ["line_intercept", 1],
    ["line_value", 1],
    ["slope", 1],
    ["table_slope", 1],
  ]);
  const retainedCoreSteps = compactStrategyMethods.get(question.kontroll?.metode);
  if (strategyHint && retainedCoreSteps !== undefined && coreHints.length > retainedCoreSteps) {
    coreHints.splice(retainedCoreSteps);
  }
  const strategyPlacement = new Map([
    ["average_rate", { afterCoreIndex: 0, replacesCoreIndex: -1 }],
    ["inverse_plus_constant", { afterCoreIndex: 0, replacesCoreIndex: -1 }],
    ["line_intercept", { afterCoreIndex: 0, replacesCoreIndex: -1 }],
    ["line_value", { afterCoreIndex: 0, replacesCoreIndex: -1 }],
    ["part_as_percent", { afterCoreIndex: 0, replacesCoreIndex: 1 }],
    ["percentage_points", { afterCoreIndex: 0, replacesCoreIndex: 1 }],
    ["relative_cumulative", { afterCoreIndex: 0, replacesCoreIndex: -1 }],
    ["slope", { afterCoreIndex: 0, replacesCoreIndex: -1 }],
    ["table_slope", { afterCoreIndex: 0, replacesCoreIndex: -1 }],
    ["linear_solve", { afterCoreIndex: 1, replacesCoreIndex: 2 }],
  ]).get(question.kontroll?.metode);
  if (strategyHint && !strategyPlacement) addWorkedStep("Velg en enkel regnevei", strategyHint);

  coreHints.forEach((hint, index) => {
    if (strategyHint && index === strategyPlacement?.replacesCoreIndex) return;
    const label = stepLabels[index] ?? "Arbeid videre";
    addWorkedStep(label, hint);
    // Noen strategier bygger på et mellomresultat fra den vanlige løsningen.
    // Mellomresultatet må introduseres før strategien vises. Strategien
    // erstatter deretter det parallelle regnesteget, slik at utregningen ikke
    // gjentas ordrett i neste hint.
    if (strategyHint && index === strategyPlacement?.afterCoreIndex) {
      addWorkedStep("Velg en enkel regnevei", strategyHint);
    }
  });

  return finalizeProgressiveHints(question, worked);
}

// Del 2 løses med kalkulator og andre digitale verktøy. Hintene skal derfor
// hjelpe eleven med metode, oppsett og tolkning, ikke gjøre samme utregning
// flere ganger. Appen viser fasiten automatisk etter siste hint, så fasiten og
// et gjentatt kontrollsteg skal ikke ligge i selve hintrekken.
function asPart2Hints(question) {
  const generatedCalculation = workedCalculation(question);
  const removablePrefixes = [
    "Hva vet vi:",
    "Hva vet vi?",
    "Forstå oppgaven:",
    "Se etter en enkel vei:",
    "Velg en enkel regnevei:",
    "Svar på spørsmålet:",
    "Løsningen samlet:",
    "Kontroller og konkluder:",
    "Sjekk svaret:",
  ];

  const candidates = question.hint
    .filter((hint) => !removablePrefixes.some((prefix) => hint.startsWith(prefix)))
    .map(removeGeneratedPrefix)
    .filter((hint) => hint !== question.svar)
    .filter((hint) => hint !== generatedCalculation)
    .filter((hint) => !hint.startsWith("Regn uttrykket helt ut:"))
    .filter((hint) => !hint.startsWith("Regn med de oppgitte verdiene:"))
    .filter((hint, index, hints) => hints.indexOf(hint) === index)
    .map(wrapBareDecimalMath);

  // Korte kalkulatoroppgaver trenger fortsatt et konkret oppsett. Når den
  // eksisterende rekken bare har to generelle metodehint, legg til oppgavens
  // faktiske regnestykke med svarfelt i stedet for ferdig resultat.
  if (numericAnswerTypes.has(question.fasit.type) && candidates.length < 3 && generatedCalculation) {
    candidates.push(maskFinalAnswer(question, removeGeneratedPrefix(generatedCalculation)));
  }

  // Fire trinn er nok selv i de sammensatte Del 2-oppgavene. Dersom en eldre
  // hintrekke er lengre, beholdes de tre første metodestegene og det siste
  // faglige steget slik at både oppsett og konklusjonsgrunnlag er med.
  const concise = candidates.length > 4
    ? [...candidates.slice(0, 3), candidates.at(-1)]
    : candidates;

  if (concise.length < 2) {
    throw new Error(`${question.id} mangler to selvstendige Del 2-hint etter forkortingen.`);
  }
  return finalizeProgressiveHints(question, concise, 4);
}

// Kalibreringen kan også justere noen få oppgavetekster og hint. Den må derfor
// kjøres før det avsluttende hintpasset, slik at ingen senere endring kan legge
// et kontrollhint etter fasitsvaret igjen.
calibrateDifficulty(bank);

// Bygg prosent- og proporsjonalitetshint fra de kalibrerte tallene. Dermed
// viser hvert trinn en ny handling, bruker riktig enhet og kan regenereres uten
// at gamle svarruter eller utdaterte tall blir med videre.
for (const question of bank.oppgaver.filter((item) => item.kontroll?.metode === "whole_from_part")) {
  const input = question.kontroll.inndata;
  const answer = question.fasit.verdier[0];
  const basePercent = greatestCommonDivisor(input.prosent, 100);
  const divideBy = input.prosent / basePercent;
  const baseAmount = normalizedNumber(input.del / divideBy);
  const multiplyBy = 100 / basePercent;
  const hints = divideBy === 1
    ? [
        `Fra ${math(`${number(input.prosent)}\\,\\%`)} til ${math("100\\,\\%")} må prosentdelen ganges med ${math(number(multiplyBy))}. Det samme må gjøres med antallet.`,
        `Sett opp totalen som ${math(`${number(input.del)}\\cdot${number(multiplyBy)}=\\square`)} ${answer.enhet}.`,
        `Svarfeltet skal inneholde hele mengden i enheten ${answer.enhet}, ikke bare antallet i én prosentdel.`,
      ]
    : [
        `Finn først ${math(`${number(basePercent)}\\,\\%`)} ved å dele både prosenttallet og antallet på ${math(number(divideBy))}: ${math(`${number(input.del)}/${number(divideBy)}=${number(baseAmount)}`)}.`,
        `Fra ${math(`${number(basePercent)}\\,\\%`)} til ${math("100\\,\\%")} må antallet ganges med ${math(number(multiplyBy))}.`,
        `Sett opp totalen som ${math(`${number(baseAmount)}\\cdot${number(multiplyBy)}=\\square`)} ${answer.enhet}.`,
      ];
  setQuestion(question.id, {
    hint: hints,
    svar: `Totalt er det ${math(number(answer.verdi))} ${answer.enhet}.`,
  });
}

const directConstantSplits = new Map([
  ["74/4", [72, 2]],
  ["51/6", [48, 3]],
  ["120/8", [80, 40]],
  ["325/5", [300, 25]],
  ["210/12", [180, 30]],
]);
for (const question of bank.oppgaver.filter((item) => item.kontroll?.metode === "direct_constant")) {
  const input = question.kontroll.inndata;
  const answer = question.fasit.verdier[0];
  const split = directConstantSplits.get(`${input.y}/${input.x}`);
  if (!split) throw new Error(`${question.id} mangler en kontrollert divisjonsoppdeling.`);
  const quotients = split.map((part) => normalizedNumber(part / input.x));
  setQuestion(question.id, { hint: [
    `Bruk ${math("k=y/x")}: én-enhetsverdien er totalen delt på antallet, altså ${math(`${number(input.y)}/${number(input.x)}`)}.`,
    `Del opp tallet for å gjøre divisjonen synlig: ${math(`${number(input.y)}=${split.map(number).join("+")}`)}, så ${math(`${number(input.y)}/${number(input.x)}=${quotients.map(number).join("+")}=\\square`)}.`,
    `Tolk k med enheten ${answer.enhet}; den forteller verdien for én enhet.`,
  ] });
}

for (const question of bank.oppgaver.filter((item) => item.kontroll?.metode === "direct_scale")) {
  const input = question.kontroll.inndata;
  const unitValue = normalizedNumber(input.y1 / input.x1);
  setQuestion(question.id, { hint: [
    `Finn først verdien for én enhet: ${math(`${number(input.y1)}/${number(input.x1)}=${number(unitValue)}`)}.`,
    `Skaler enhetsverdien til ${math(number(input.x2))} enheter: ${math(`${number(unitValue)}\\cdot${number(input.x2)}=\\square`)}.`,
    "Kontroller at svaret endrer seg i samme retning som antallet når sammenhengen er proporsjonal.",
  ] });
}

for (const question of bank.oppgaver.filter((item) => item.kontroll?.metode === "inverse_scale")) {
  const input = question.kontroll.inndata;
  const constant = normalizedNumber(input.x1 * input.y1);
  setQuestion(question.id, { hint: [
    `Ved omvendt proporsjonalitet er produktet konstant. Finn det fra det kjente paret: ${math(`${number(input.x1)}\\cdot${number(input.y1)}=${number(constant)}`)}.`,
    `Del konstanten på den nye x-verdien: ${math(`${number(constant)}/${number(input.x2)}=\\square`)}.`,
    "Kontroller retningen: Når den ene størrelsen øker i en omvendt proporsjonal sammenheng, skal den andre minke, og omvendt.",
  ] });
}

for (const question of bank.oppgaver.filter((item) => item.kontroll?.metode === "mode_range")) {
  const values = question.kontroll.inndata.verdier;
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  setQuestion(question.id, { hint: [
    `Lag en liten opptelling: ${[...counts].map(([value, count]) => `${number(value)} forekommer ${number(count)} ${count === 1 ? "gang" : "ganger"}`).join(", ")}.`,
    "Typetallet er verdien med høyest antall i opptellingen. Skriv denne verdien i det første svarfeltet.",
    `Variasjonsbredden er største verdi minus minste verdi: ${math(`${number(maximum)}-${number(minimum)}=\\square`)}.`,
  ] });
}

for (const question of bank.oppgaver.filter((item) => item.kontroll?.metode === "median_category")) {
  const cumulative = question.kontroll.inndata.kumulativ;
  const total = cumulative.at(-1);
  const positionText = total % 2 === 1
    ? `medianplassen ${math(`(${number(total)}+1)/2=${number((total + 1) / 2)}`)}`
    : `de to midtposisjonene ${math(number(total / 2))} og ${math(number(total / 2 + 1))}`;
  setQuestion(question.id, { hint: [
    `Den siste kumulative frekvensen gir totalen: ${math(`n=${number(total)}`)}. Finn deretter ${positionText}.`,
    `Sammenlign plasseringen med de kumulative frekvensene ${math(cumulative.map(number).join(", "))}. Den første frekvensen som når plasseringen, bestemmer kategorien.`,
    "Bruk kategorinavnet eller kategorinummeret i samme rad som denne kumulative frekvensen; ikke selve frekvenstallet.",
  ] });
}

for (const question of bank.oppgaver.filter((item) => item.kontroll?.metode === "code_sum")) {
  const values = question.kontroll.inndata.verdier;
  const running = [];
  values.reduce((sum, value) => {
    const next = sum + value;
    running.push(next);
    return next;
  }, 0);
  const beforeLast = running.at(-2) ?? 0;
  setQuestion(question.id, { hint: [
    `Start med sum = 0 og følg løkken i rekkefølge. Etter de første verdiene blir den løpende summen ${math(running.slice(0, -1).map(number).join(" \\to "))}.`,
    `I siste runde legges ${math(number(values.at(-1)))} til ${math(number(beforeLast))}: ${math(`${number(beforeLast)}+${number(values.at(-1))}=\\square`)}.`,
    "Utskriften står etter løkken, så programmet skriver verdien sum har etter den siste runden.",
  ] });
}

for (const question of bank.oppgaver.filter((item) => item.kontroll?.metode === "successive_percent" && item.del === 1)) {
  const changes = question.kontroll.inndata.endringer;
  let current = 100;
  const first = normalizedNumber(current * (1 + changes[0] / 100));
  const second = normalizedNumber(first * (1 + changes[1] / 100));
  setQuestion(question.id, { hint: [
    `Bruk 100 som tenkt startverdi. Etter den første endringen får du ${math(`100\\cdot${number(1 + changes[0] / 100)}=${number(first)}`)}.`,
    `Den andre prosenten regnes av mellomverdien: ${math(`${number(first)}\\cdot${number(1 + changes[1] / 100)}=${number(second)}`)}.`,
    `Finn samlet relativ endring fra start til slutt: ${math(`(${number(second)}-100)/100\\cdot100\\,\\%=\\square\\,\\%`)}. Fortegnet viser økning eller nedgang.`,
  ] });
}

for (const question of byFamily("d2-kort-rabatt-mva")) {
  const input = question.kontroll.inndata;
  const discountFactor = normalizedNumber(1 - input.rabatt / 100);
  setQuestion(question.id, { hint: [
    `Gjør rabatten om til vekstfaktor: ${math(`1-${number(input.rabatt)}/100=${number(discountFactor)}`)}.`,
    `Prisen etter rabatt settes opp som ${math(`${number(input.pris)}\\cdot${number(discountFactor)}=\\square`)} kr.`,
    `Prisen etter rabatt er ${math(`${number(100 + input.mva)}\\,\\%`)} av prisen uten mva. Bruk svaret fra første felt og del det på ${math(number(1 + input.mva / 100))} for å finne prisen uten mva.`,
  ] });
}

for (const question of bank.oppgaver.filter((item) => item.kontroll?.metode === "histogram_density")) {
  const input = question.kontroll.inndata;
  const lower = input.grenser[input.indeks];
  const upper = input.grenser[input.indeks + 1];
  const frequency = input.frekvenser[input.indeks];
  const total = input.frekvenser.reduce((sum, value) => sum + value, 0);
  const width = upper - lower;
  setQuestion(question.id, { hint: [
    `Klassebredden er ${math(`${number(upper)}-${number(lower)}=${number(width)}`)}.`,
    `Frekvenstettheten er klassefrekvens delt på klassebredde: ${math(`${number(frequency)}/${number(width)}=\\square`)}.`,
    `Relativ frekvens er klassefrekvens delt på totalen: ${math(`${number(frequency)}/${number(total)}\\cdot100\\,\\%=\\square\\,\\%`)}.`,
  ] });
}

for (const question of byFamily("d2-figur-b")) {
  const group = groups.get(question.oppgavegruppe.id);
  setQuestion(question.id, { hint: [
    `Tell først elementene i figur 1 og figur 2: du skal få ${math(number(figureValue(group.id, 1)))} og ${math(number(figureValue(group.id, 2)))}.`,
    "Sett n=1 inn i hvert svaralternativ og stryk formlene som ikke gir antallet i figur 1.",
    "Test de gjenværende formlene med n=2. Velg bare en formel som passer begge figurene.",
  ] });
}

const codeChoiceHints = {
  "2py27-444": [
    "Følg if-vilkåret og noter hvilke variabler som oppdateres når et tall når grensen.",
    "Se deretter på divisjonen i utskriften: Hva kan skje med nevneren dersom ingen verdier tas med?",
    "Vurder hvert svaralternativ mot disse to observasjonene fra koden, uten å anta noe om datasettet utover det programmet faktisk gjør.",
  ],
  "2py27-448": [
    "Oversett while-vilkåret til ord og finn nøyaktig når løkken stopper.",
    "Tolk faktoren som brukes i hver runde, og skill mellom det programmet beregner og antakelsen modellen gjør om utviklingen.",
    "Kontroller hvert alternativ mot både stoppvilkåret og modellforutsetningen.",
  ],
  "2py27-452": [
    "Finn hvilke observasjoner de to remove-linjene tar bort før gjennomsnittet beregnes.",
    "Tenk gjennom både fordelen og ulempen ved å utelate ytterverdier: virkningen deres blir mindre, men informasjon forsvinner også.",
    "Velg påstander som beskriver koden og denne faglige avveiningen presist.",
  ],
  "2py27-456": [
    "Se hvilke x-verdier for-løkken faktisk tester, og hva break gjør når vilkåret blir sant.",
    "Skill mellom den første testede heltallsverdien og et matematisk skjæringspunkt som kan ligge mellom heltall eller utenfor søkeintervallet.",
    "Kontroller hvert alternativ mot både søkeområdet og stoppmekanismen.",
  ],
  "2py27-460": [
    "Følg hvordan kumulativ frekvens bygges opp, og når if-vilkåret stopper løkken.",
    "Undersøk hva variabelen som skrives ut faktisk lagrer: et kategorinummer eller en observert verdi.",
    "Vurder til slutt om grupperte intervaller er nok til å bestemme en nøyaktig verdi inne i kategorien.",
  ],
};
for (const [id, hint] of Object.entries(codeChoiceHints)) setQuestion(id, { hint });

const offerHintRevisions = {
  "2py27-038": [
    "Gjør rabatten som er oppgitt i prosent, om til kroner før tilbudene sammenlignes. Her er 20 % det samme som to 10 %-deler.",
    `Finn 10 % ved å dele på 10: ${math("900/10=90")}.`,
    `Doble 10 %-delen: ${math("90\\cdot2=\\square")}. Dette er prosentavslaget i kroner.`,
    `Sammenlign beløpet du fant med ${math("150")} kr. Det største kronebeløpet gir størst avslag.`,
  ],
  "2py27-039": [
    "Gjør rabatten som er oppgitt i prosent, om til kroner. Del 15 % i 10 % og 5 %.",
    `Finn 10 %: ${math("1\\,250/10=125")}. Fem prosent er halvparten: ${math("125/2=62{,}5")}.`,
    `Legg sammen prosentdelene: ${math("125+62{,}5=\\square")}.`,
    `Sammenlign beløpet du fant med ${math("220")} kr. Det største kronebeløpet gir størst avslag.`,
  ],
  "2py27-040": [
    "Gjør rabatten som er oppgitt i prosent, om til kroner. Siden 25 % er en firedel, skal 680 deles i fire like deler.",
    `Finn firedelen uten lang divisjon ved å halvere to ganger. Første halvering er ${math("680/2=340")}.`,
    `Halver 340 én gang til: ${math("340/2=\\square")}. Dette beløpet er avslaget på 25 %.`,
    `Sammenlign beløpet du fant med ${math("190")} kr. Det største kronebeløpet gir størst avslag.`,
  ],
  "2py27-041": [
    "Gjør rabatten som er oppgitt i prosent, om til kroner. Del 12 % i 10 % og 2 %.",
    `Finn 10 %: ${math("2\\,400/10=240")}. Finn deretter 1 %: ${math("2\\,400/100=24")}.`,
    `To prosent er ${math("24\\cdot2=48")}. Legg sammen: ${math("240+48=\\square")}.`,
    `Sammenlign beløpet du fant med ${math("320")} kr. Det største kronebeløpet gir størst avslag.`,
  ],
  "2py27-042": [
    "Gjør rabatten som er oppgitt i prosent, om til kroner. Det er enkelt å finne 18 % som 20 % minus 2 %.",
    `Finn 20 % som en femdel: ${math("1\\,500/5=300")}. Finn 2 % fra 1 %: ${math("1\\,500/100=15")} og ${math("15\\cdot2=30")}.`,
    `Trekk fra: ${math("300-30=\\square")}. Dette er prosentavslaget i kroner.`,
    `Sammenlign beløpet du fant med ${math("250")} kr. Det største kronebeløpet gir størst avslag.`,
  ],
};
for (const [id, hint] of Object.entries(offerHintRevisions)) setQuestion(id, { hint });

// Frekvenstabellene trenger både nevneren i den relative frekvensen og en
// egen forklaring av hva «kumulativ» betyr. Bygg disse hintene på nytt fra
// dataene, slik at ingen tidligere maskering kan skjule tabellverdier.
for (const question of bank.oppgaver.filter((item) => item.kontroll?.metode === "relative_cumulative")) {
  const input = question.kontroll.inndata;
  const total = input.frekvenser.reduce((sum, value) => sum + value, 0);
  const frequency = input.frekvenser[input.indeks];
  const cumulativeFrequencies = input.frekvenser.slice(0, input.indeks + 1);
  const cumulativeStep = cumulativeFrequencies.length === 1
    ? "Kumulativ frekvens til den første kategorien er frekvensen i den første raden. Skriv denne tabellverdien i det andre svarfeltet."
    : `Legg sammen frekvensene til og med den aktuelle kategorien: ${math(`${cumulativeFrequencies.map(number).join("+")}=\\square`)}.`;
  setQuestion(question.id, { hint: [
    `Finn total frekvens først: ${math(`${input.frekvenser.map(number).join("+")}=${number(total)}`)}.`,
    `Relativ frekvens settes opp som ${math(`${number(frequency)}/${number(total)}\\cdot100\\,\\%=\\square`)}.`,
    cumulativeStep,
  ] });
}

// I deloppgave d er tallet fra b elevens eget mellomresultat. Henvis til det
// uten å skrive det inn i hintet eller erstatte det med et lite hjelpeløst felt.
for (const question of byFamily("d2-sammensatt-prosent-d")) {
  const group = groups.get(question.oppgavegruppe.id);
  const isMaximum = /høyst/.test(question.sporsmal);
  setQuestion(question.id, { hint: [
    "Finn fram sluttverdien du beregnet i deloppgave b.",
    `Tolk målet på ${math(number(group.data.mål))} ${group.data.enhet}: «${isMaximum ? "høyst" : "minst"}» betyr ${isMaximum ? "at sluttverdien ikke kan ligge over grensen" : "at sluttverdien må nå opp til eller passere grensen"}.`,
    "Sammenlign sluttverdien fra b med grensen, og velg bare konklusjonen som passer denne sammenligningen.",
  ] });
}

// En firedel skal ikke forutsette at eleven allerede mestrer divisjon med 4.
// Vis den samme håndregningsideen som i tilbudsoppgaven: halver to ganger.
setQuestion("2py27-002", { hint: [
  `Finn firedelen ved å halvere to ganger. Først: ${math("360/2=180")}.`,
  `Halver deretter 180: ${math("180/2=90")}.`,
  "Resultatet etter to halveringer er én av fire like deler, altså 25 % av billettene.",
] });
setQuestion("2py27-004", { hint: [
  `Finn firedelen ved å halvere to ganger. Først: ${math("160/2=80")}.`,
  `Halver deretter 80: ${math("80/2=40")}.`,
  "Resultatet etter to halveringer er én av fire like deler, altså 25 % av medlemmene.",
] });

for (const question of bank.oppgaver) {
  setQuestion(question.id, {
    hint: question.del === 2 ? asPart2Hints(question) : asWorkedExample(question),
  });
}

// I prosentøvingen i Del 1 skal eleven kunne sammenligne reelt forskjellige
// hoderegningsstrategier. Vi tilbyr to veier bare når begge er naturlige med
// oppgavens tall. Resten av prosentoppgavene beholder én tydelig hovedmetode.
function alternativeRouteHints(question, introduction, steps) {
  const labels = ["Lag en plan", "Gjør første del", "Gjør neste del", "Fullfør regningen"];

  const candidates = [
    question.hint[0],
    `Velg denne veien: ${introduction}`,
    ...steps.map((step, index) => `${labels[index] ?? "Arbeid videre"}: ${step}`),
  ];
  const worked = [];
  for (const hint of candidates) {
    if (revealsFinalAnswer(question, hint)) {
      worked.push(maskFinalAnswer(question, hint));
    } else worked.push(hint);
  }
  return finalizeProgressiveHints(question, worked);
}

const percentageSolutionPaths = {
  "2py27-001": {
    primary: ["prosentbiter", "10 % og 5 %", "Kortest her: bygg 15 % av to enkle prosentbiter."],
    alternative: ["en-prosent", "Finn 1 % først", "En generell metode som virker for alle prosenttall.",
      "Finn først 1 % ved å dele hele mengden på 100.",
      [`Regn ${math("240/100=2{,}4")}. Dermed er 1 % lik 2,4 elever i regnestykket.`, `Bygg 15 % av femten 1 %-deler: ${math("2{,}4\\cdot15=2{,}4\\cdot10+2{,}4\\cdot5=24+12=36")}.`]],
  },
  "2py27-002": {
    primary: ["kjent-brok", "Kjent brøk: en firedel", "Kortest her: 25 % betyr én av fire like deler."],
    alternative: ["prosentbiter", "10 % + 10 % + 5 %", "Viser hvordan 25 % kan bygges av kjente prosentbiter.",
      "Del 25 % opp i 10 %, 10 % og 5 %.",
      [`Finn 10 %: ${math("360/10=36")}. Derfor er 20 % lik ${math("36+36=72")}.`, `Fem prosent er halvparten av 10 %: ${math("36/2=18")}. Legg sammen: ${math("72+18=90")}.`]],
  },
  "2py27-003": {
    primary: ["prosentbiter", "30 % og 2 %", "Bygg 32 % av prosentbiter som passer tallene."],
    alternative: ["en-prosent", "Finn 1 % først", "Går via én hundredel før du bygger 32 %.",
      "Finn verdien av 1 % ved å dele 450 på 100.",
      [`Regn ${math("450/100=4{,}5")}. Dermed er 1 % lik 4,5.`, `Bygg 32 %: ${math("4{,}5\\cdot30=135")} og ${math("4{,}5\\cdot2=9")}. Til sammen blir det ${math("135+9=144")}.`]],
  },
  "2py27-004": {
    primary: ["kjent-brok", "Kjent brøk: en åttedel", "Kortest her: 12,5 % betyr én av åtte like deler."],
    alternative: ["halvering", "Halver tre ganger", "Viser veien 100 % → 50 % → 25 % → 12,5 %.",
      "Hver halvering halverer både antallet og prosenten.",
      [`Halver 640: ${math("640/2=320")}. Det er 50 %. Halver igjen: ${math("320/2=160")}. Det er 25 %.`, `Halver én gang til: ${math("160/2=80")}. Da har du 12,5 %, så svaret er 80.`]],
  },
  "2py27-005": {
    primary: ["per-hundre", "Gang med 8, del på 100", "Bruker direkte at 8 % betyr 8 per 100."],
    alternative: ["en-prosent", "Finn 1 % først", "Gjør prosentbetydningen synlig før du ganger opp.",
      "Finn én hundredel av 875.",
      [`Regn ${math("875/100=8{,}75")}. Dermed er 1 % lik 8,75.`, `Åtte prosent er åtte slike deler: ${math("8{,}75\\cdot8=70")}.`]],
  },
  "2py27-006": {
    primary: ["forkort-brok", "Forkort brøken", "Skriv delen over helheten og gjør brøken enklere."],
    alternative: ["skalering", "Skaler helheten til 100", "Gjør 80 om til 100 og gjør nøyaktig det samme med 18.",
      "Fra 80 til 100 legger vi til en firedel av 80.",
      [`Gjør det samme med delen: En firedel av 18 er ${math("18/4=4{,}5")}.`, `Legg til firedelen: ${math("18+4{,}5=22{,}5")}. Når helheten er 100, er delen 22,5, altså 22,5 %.`]],
  },
  "2py27-007": {
    primary: ["forkort-brok", "Forkort brøken", "Brøken 35 av 125 kan reduseres til deler på 4 %."],
    alternative: ["prosentbiter", "Bygg med prosentbiter", "Finn antall som svarer til 20 % og 8 %.",
      "Finn først 20 % av 125. Det er en femdel.",
      [`Regn ${math("125/5=25")}. Dermed er 25 kunder lik 20 %.`, `Fire prosent av 125 er 5, så 8 % er 10. Da er ${math("25+10=35")}, og ${math("20\\,\\%+8\\,\\%=28\\,\\%")}.`]],
  },
  "2py27-008": {
    primary: ["forkort-brok", "Forkort brøken", "Del både 66 og 240 på 6 og arbeid videre med 11 av 40."],
    alternative: ["prosentbiter", "25 % og 2,5 %", "Finn prosentbiter som til sammen gir akkurat 66 personer.",
      "En firedel av 240 er 60, så 60 personer tilsvarer 25 %.",
      [`Regn ${math("240/4=60")}. Det mangler ${math("66-60=6")} personer.`, `Siden ${math("240/40=6")}, er 6 personer 2,5 %. Dermed er 66 personer ${math("25\\,\\%+2{,}5\\,\\%=27{,}5\\,\\%")}.`]],
  },
  "2py27-009": {
    primary: ["forkort-brok", "Forkort brøken", "Reduser 117 av 360 til 13 av 40."],
    alternative: ["prosentbiter", "25 % + 5 % + 2,5 %", "Bygg delen 117 av tre enkle prosentbiter.",
      "Finn først 25 % av 360 ved å dele på 4.",
      [`Regn ${math("360/4=90")}. Fem prosent er ${math("360/20=18")}, og 2,5 % er halvparten: ${math("18/2=9")}.`, `Tallene gir ${math("90+18+9=117")}. Prosentene gir ${math("25\\,\\%+5\\,\\%+2{,}5\\,\\%=32{,}5\\,\\%")}.`]],
  },
  "2py27-010": {
    primary: ["forkort-brok", "Forkort brøken", "Reduser 275 av 625 til 11 av 25."],
    alternative: ["prosentbiter", "40 % og 4 %", "Bygg 275 billetter av to oversiktlige prosentbiter.",
      "Finn 40 % av 625 som to femdeler.",
      [`En femdel er ${math("625/5=125")}, så 40 % er ${math("2\\cdot125=250")}.`, `Fire prosent er ${math("625/25=25")}. Da er ${math("250+25=275")}, som svarer til ${math("40\\,\\%+4\\,\\%=44\\,\\%")}.`]],
  },
  "2py27-011": {
    primary: ["en-prosent", "Finn 1 % først", "Reduser 12 % til 1 %, og bygg derfra til 100 %."],
    alternative: ["brokdeler", "Tenk 12 % som 3 av 25 deler", "Forkort prosentbrøken før du bygger hele mengden.",
      `Forkort ${math("12/100")} ved å dele både 12 og 100 på 4: ${math("12/100=3/25")}.`,
      [`De 48 personene er derfor 3 like deler. Én del er ${math("48/3=16")}.`, `Hele gruppen består av 25 slike deler: ${math("16\\cdot25=16\\cdot100/4=400")}.`]],
  },
  "2py27-012": {
    primary: ["kjent-brok", "Kjent brøk: en femdel", "20 % er én av fem like deler."],
    alternative: ["ti-prosent", "Finn 10 % først", "Halver den kjente 20 %-delen og bygg til 100 %.",
      "Når 20 % er 64, er 10 % halvparten av 64.",
      [`Regn ${math("64/2=32")}. Dermed er 10 % lik 32.`, `Ti deler på 10 % gir 100 %: ${math("32\\cdot10=320")}.`]],
  },
  "2py27-013": {
    primary: ["kjent-brok", "Kjent brøk: en firedel", "25 % er én av fire like deler."],
    alternative: ["dobling", "Doble to ganger", "Bygg fra 25 % til 50 % og videre til 100 %.",
      "Doble både prosenten og antallet samtidig.",
      [`Fra 25 % til 50 %: ${math("190\\cdot2=380")}.`, `Fra 50 % til 100 %: ${math("380\\cdot2=760")}.`]],
  },
  "2py27-014": {
    primary: ["ti-prosent", "Finn 10 % først", "Del 30 %-delen i tre, og bygg til 100 %."],
    alternative: ["en-prosent", "Finn 1 % først", "En generell vei via én hundredel av helheten.",
      "Når 30 % er 162, finner du 1 % ved først å finne 10 % og så dele på 10.",
      [`Regn ${math("162/3=54")}, og deretter ${math("54/10=5{,}4")}. Dermed er 1 % lik 5,4.`, `Hundre slike deler gir ${math("5{,}4\\cdot100=540")}.`]],
  },
  "2py27-015": {
    primary: ["tjue-prosent", "Finn 20 % først", "Halver 40 %-delen og bygg fem slike deler."],
    alternative: ["ti-prosent", "Finn 10 % først", "Reduser til en kjent tidel og bygg til 100 %.",
      "Når 40 % er 360, er 10 % en firedel av 360.",
      [`Regn ${math("360/4=90")}. Dermed er 10 % lik 90.`, `Ti slike 10 %-deler gir 100 %: ${math("90\\cdot10=900")}.`]],
  },
  "2py27-026": {
    primary: ["start-hundre", "Start med 100", "Gjør prosentene om til konkrete tall og følg endringene."],
    alternative: ["vekstfaktorer", "Bruk vekstfaktorer", "En kortere, mer formell vei som viser begge endringene samlet.",
      "En økning på 20 % gir faktor 1,20. En nedgang på 20 % gir faktor 0,80.",
      [`Gang faktorene: ${math("1{,}20\\cdot0{,}80=0{,}96")}.`, `Faktoren 0,96 betyr at 96 % er igjen. Fra 100 % til 96 % er endringen ${math("96-100=-4\\,\\%")}.`]],
  },
  "2py27-027": {
    primary: ["start-hundre", "Start med 100", "Gjør prosentene om til konkrete tall og følg endringene."],
    alternative: ["vekstfaktorer", "Bruk vekstfaktorer", "En kortere, mer formell vei som samler de to endringene.",
      "En nedgang på 10 % gir faktor 0,90. En økning på 10 % gir faktor 1,10.",
      [`Gang faktorene: ${math("0{,}90\\cdot1{,}10=0{,}99")}.`, `Faktoren 0,99 betyr at 99 % er igjen. Fra 100 % til 99 % er endringen ${math("99-100=-1\\,\\%")}.`]],
  },
  "2py27-028": {
    primary: ["like-prosentdeler", "Bygg fra 10 %", "Reduser 120 % til en enkel 10 %-del og bygg til 100 %."],
    alternative: ["kjent-brok", "Tenk 120 % som seks femdeler", "Bruk brøken 6/5 til å se antallet like deler.",
      `Skriv ${math("120\\,\\%=6/5")}. Den nye prisen på 816 kr er derfor 6 like deler.`,
      [`Finn én del: ${math("816/6=136")}.`, `Den opprinnelige verdien er 5 slike deler: ${math("136\\cdot5=680")}.`]],
  },
  "2py27-029": {
    primary: ["like-prosentdeler", "Bygg fra 10 %", "Reduser 90 % til én 10 %-del og bygg til 100 %."],
    alternative: ["kjent-brok", "Tenk 90 % som ni tideler", "Bruk brøken 9/10 til å se antallet like deler.",
      `Skriv ${math("90\\,\\%=9/10")}. Prisen 630 kr er derfor 9 like deler.`,
      [`Finn én del: ${math("630/9=70")}.`, `Den opprinnelige prisen er 10 slike deler: ${math("70\\cdot10=700")}.`]],
  },
  "2py27-030": {
    primary: ["like-prosentdeler", "Bygg fra 25 %", "Reduser 125 % til en enkel 25 %-del og bygg til 100 %."],
    alternative: ["kjent-brok", "Tenk 125 % som fem firedeler", "Bruk brøken 5/4 til å finne den opprinnelige prisen.",
      `Skriv ${math("125\\,\\%=5/4")}. Den nye prisen på 1 500 kr er derfor 5 like deler.`,
      [`Finn én del: ${math("1\,500/5=300")}.`, `Den opprinnelige prisen er 4 slike deler: ${math("300\\cdot4=1\,200")}.`]],
  },
  "2py27-032": {
    primary: ["like-prosentdeler", "Bygg fra 50 %", "Reduser 150 % til en enkel 50 %-del og bygg til 100 %."],
    alternative: ["kjent-brok", "Tenk 150 % som tre halvdeler", "Bruk brøken 3/2 til å finne den opprinnelige verdien.",
      `Skriv ${math("150\\,\\%=3/2")}. Det nye medlemstallet 1 950 er derfor 3 like deler.`,
      [`Finn én del: ${math("1\,950/3=650")}.`, `Den opprinnelige verdien er 2 slike deler: ${math("650\\cdot2=1\,300")}.`]],
  },
  "2py27-038": {
    primary: ["kjent-brok", "20 % er en femdel", "Kortest her: del 900 i fem like deler."],
    alternative: ["ti-prosent", "Finn 10 % og doble", "Bygg 20 % av to like 10 %-deler.",
      `Finn 10 %: ${math("900/10=90")}.`,
      [`Doble 10 %-delen: ${math("90\\cdot2=\\square")}.`, `Sammenlign beløpet du fant med ${math("150")} kr. Det største beløpet gir størst avslag.`]],
  },
  "2py27-039": {
    primary: ["prosentbiter", "10 % og 5 %", "Bygg 15 % ved å finne 10 % og halvparten av dette."],
    alternative: ["trekk-fra", "20 % minus 5 %", "Bruk at 15 % ligger 5 prosentpoeng under 20 %.",
      `Finn 20 % som en femdel: ${math("1\,250/5=250")}.`,
      [`Fem prosent er halvparten av 10 %. Siden 10 % er 125 kr, er 5 % ${math("125/2=62{,}5")} kr.`, `Trekk fra: ${math("250-62{,}5=187{,}5")} kr. Det er mindre enn 220 kr, så kroneavslaget er best.`]],
  },
  "2py27-040": {
    primary: ["kjent-brok", "25 % er en firedel", "Kortest her: del 680 i fire like deler."],
    alternative: ["halvering", "Halver to ganger", "Gå fra 100 % til 50 % og videre til 25 %.",
      `Halver 680: ${math("680/2=340")}. Det er 50 %.`,
      [`Halver én gang til: ${math("340/2=170")}. Det er 25 %.`, `Sammenlign 170 kr med 190 kr. Siden ${math("170<190")}, er kroneavslaget best.`]],
  },
  "2py27-041": {
    primary: ["prosentbiter", "10 % og 2 %", "Bygg 12 % av to enkle prosentbiter."],
    alternative: ["en-prosent", "Finn 1 % først", "En generell vei som gjør 12 % til tolv like deler.",
      `Finn 1 %: ${math("2\,400/100=24")}.`,
      [`Bygg 12 %: ${math("24\\cdot12=24\\cdot10+24\\cdot2=240+48=288")}.`, `Sammenlign 288 kr med 320 kr. Siden ${math("288<320")}, er kroneavslaget best.`]],
  },
  "2py27-042": {
    primary: ["prosentbiter", "10 % og 8 %", "Bygg 18 % av prosentbiter som passer 1 500."],
    alternative: ["trekk-fra", "20 % minus 2 %", "Finn en rund prosent og trekk fra den lille forskjellen.",
      `Finn 20 % som en femdel: ${math("1\,500/5=300")}.`,
      [`Finn 2 %: 1 % er ${math("1\,500/100=15")}, så 2 % er ${math("15\\cdot2=30")}.`, `Trekk fra: ${math("300-30=270")} kr. Det er mer enn 250 kr, så prosenttilbudet er best.`]],
  },
};

// Vis metodevalg bare når tallene gjør to ulike hovedveier både naturlige og
// enkle uten kalkulator. Lengre omskrivinger av den samme regneveien er ikke
// et reelt valg for eleven og skal derfor ikke publiseres.
const percentageQuestionsWithNaturalChoices = new Set([
  "2py27-002",
  "2py27-009",
  "2py27-010",
  "2py27-012",
  "2py27-026",
  "2py27-027",
  "2py27-038",
]);

for (const question of bank.oppgaver.filter((item) => item.del === 1 && item.tema === "prosent")) {
  delete question.losningsveier;
}

for (const [id, config] of Object.entries(percentageSolutionPaths).filter(([id]) => percentageQuestionsWithNaturalChoices.has(id))) {
  const question = questions.get(id);
  if (!question || question.del !== 1 || question.tema !== "prosent") {
    throw new Error(`${id} er ikke en prosentoppgave i Del 1.`);
  }
  const [primaryId, primaryName, primaryDescription] = config.primary;
  const [alternativeId, alternativeName, alternativeDescription, introduction, steps] = config.alternative;
  setQuestion(id, {
    losningsveier: [
      {
        id: primaryId,
        navn: primaryName,
        forklaring: primaryDescription,
        hint: question.hint,
      },
      {
        id: alternativeId,
        navn: alternativeName,
        forklaring: alternativeDescription,
        hint: alternativeRouteHints(question, introduction, steps),
      },
    ],
  });
}

// Siste sikkerhetsnett for alle publiserte hint: ingen hint skal inneholde
// fasiten. Elevappen viser løsningsforslaget separat etter at hintrekken er
// åpnet. Dette gjelder både hovedløsninger og alternative regneveier.
for (const question of bank.oppgaver) {
  question.hint = question.hint.map((hint) => maskFinalAnswer(question, hint));
  for (const route of question.losningsveier ?? []) {
    route.hint = route.hint.map((hint) => maskFinalAnswer(question, hint));
  }
}

// Faglig gjennomgåtte forløp bygges fra data etter det eldre maskeringspasset.
// Ellers kan en ny kjøring skjule nødvendige mellomresultater igjen.
reviseHintScaffolding(bank, { math, number });
reviseHandArithmetic(bank, { math, number });
for (const question of bank.oppgaver) {
  question.hint = question.hint.map(wrapBareDecimalMath);
  for (const route of question.losningsveier ?? []) route.hint = route.hint.map(wrapBareDecimalMath);
}

// Rydd også i eldre, statiske tekster og kontrollverdier. Dette fjerner både
// binær flyttallsstøy og meningsløse slutt-null­er, men beholder små tall som
// 0,000000605 når nullene faktisk angir desimalplasseringen.
const longDecimalPattern = /-?\d+(?:\{,\}|[.,])\d{5,}/gu;

function normalizeDecimalToken(token) {
  const separator = token.includes("{,}") ? "{,}" : token.includes(",") ? "," : ".";
  const numeric = Number(token.replace("{,}", ".").replace(",", "."));
  const normalized = plainDecimal(numeric);
  if (!normalized.includes(".")) return normalized;
  return normalized.replace(".", separator);
}

function normalizeBankValue(value) {
  if (typeof value === "number") return normalizedNumber(value);
  if (typeof value === "string") {
    return value.replace(longDecimalPattern, normalizeDecimalToken);
  }
  if (Array.isArray(value)) return value.map(normalizeBankValue);
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) value[key] = normalizeBankValue(child);
  }
  return value;
}

normalizeBankValue(bank);

// Synlige tall skal heller ikke ha meningsløse sluttnuller. 6,0000 blir 6,
// 18,50 blir 18,5 og 1,060 blir 1,06. Innledende nuller i små tall beholdes.
const visibleDecimalPatterns = [
  /-?\d+\{,\}\d+/gu,
  /-?\d+\.\d+/gu,
];

function trimTrailingDecimalZeros(token) {
  const separator = token.includes("{,}") ? "{,}" : token.includes(",") ? "," : ".";
  const [integer, decimals] = token.split(separator);
  const trimmedDecimals = decimals.replace(/0+$/u, "");
  return trimmedDecimals ? `${integer}${separator}${trimmedDecimals}` : integer;
}

function normalizeVisibleDecimals(value) {
  if (typeof value === "string") {
    return visibleDecimalPatterns.reduce(
      (text, pattern) => text.replace(pattern, trimTrailingDecimalZeros),
      value,
    );
  }
  if (Array.isArray(value)) return value.map(normalizeVisibleDecimals);
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) value[key] = normalizeVisibleDecimals(child);
  }
  return value;
}

normalizeVisibleDecimals(bank.oppgaver);
normalizeVisibleDecimals(bank.oppgavegrupper);

// Hintene skal bare inneholde forklaringer som hjelper eleven videre. Rydd
// bort eldre formuleringer som beskriver forfatterens valg eller selve malen.
function removeInternalHintLanguage(text) {
  return text
    .replace(/Lag en plan:\s*Skriv en enkel prosentstripe:\s*/gu, "Lag en plan: ")
    .replace(/Vi bruker en prosentstripe hele veien\.\s*/gu, "")
    .replace(/Prøv prosentstripa før en formel:\s*/gu, "")
    .replace(/Sjekk begrunnelsen, ikke bare svaralternativet:\s*/gu, "")
    .replace(/\s*Denne testen støtter konklusjonen:\s*/gu, " Derfor passer svaret: ")
    .replace(/Kontroll med originalopplysningene:\s*/gu, "Regn med de oppgitte verdiene: ")
    .replace(/Kontroll mot oppgaven:\s*/gu, "")
    .replace(/Divisjonen er valgt for hoderegning:\s*/gu, "")
    .replace(/Formelen er allerede et hoderegningsstykke:\s*/gu, "Sett figurnummeret inn i formelen: ")
    .replace(/Med disse tallene blir det\s*/gu, "Da får du ")
    .replace(/, akkurat som i oppgaven\./gu, ", som er den oppgitte verdien.")
    .replace(/som stemmer med oppgaven/gu, "som stemmer med opplysningene")
    .replace(/Andelen stemmer med opplysningen i oppgaven\./gu, "Andelen er den oppgitte prosentdelen.")
    .replace(/som er antallet oppgaven ga\./gu, "som er det oppgitte antallet.");
}

for (const question of bank.oppgaver) {
  question.hint = question.hint.map(removeInternalHintLanguage);
  for (const route of question.losningsveier ?? []) {
    route.hint = route.hint.map(removeInternalHintLanguage);
  }
}

// Oppgavene bruker konstruerte øvingsdata. Det er allerede tydelig av
// konteksten og trenger ikke en gjentatt personvernmerknad til eleven.
for (const group of bank.oppgavegrupper) {
  delete group.dataopprinnelse;
}

// Verifiser at de provoserende standardformuleringene ikke står igjen i de reviderte familiene.
const forbiddenExactHints = new Set([
  "Bruk regelen som passer operasjonen.",
  "Følg regnerekkefølgen.",
  "Løs ligningen og sett x-verdien inn i én av modellene.",
  "Følg programmet linje for linje.",
  "Bruk modellen fra b.",
  "Oversett uttrykket til en beregning.",
  "Kjør den samme algoritmen med den nye inndataen eller parameteren.",
]);
for (const question of bank.oppgaver) {
  for (const hint of question.hint) {
    if (forbiddenExactHints.has(hint)) throw new Error(`${question.id} har fortsatt et ikke-hjelpende hint: ${hint}`);
  }
}

const internalHintLanguage = /prosentstripe|prosentstripa|Vi bruker .* hele veien|Divisjonen er valgt|hoderegningsstykke|Denne testen støtter konklusjonen|Sjekk begrunnelsen, ikke bare svaralternativet|Kontroll (?:mot oppgaven|med originalopplysningene)|Med disse tallene blir det|akkurat som i oppgaven|antallet oppgaven ga|opplysningen i oppgaven/iu;
for (const question of bank.oppgaver) {
  const hintCollections = [question.hint, ...(question.losningsveier ?? []).map((route) => route.hint)];
  for (const hint of hintCollections.flat()) {
    if (internalHintLanguage.test(hint)) {
      throw new Error(`${question.id} har fortsatt en intern kommentar i hintet: ${hint}`);
    }
  }
}

const vagueExamLanguage = /\bEn verdi\b|\bEn størrelse\b|bestemt gruppe|tidsenheter|per x-enhet|kategoriene A-D|kategori 1-4|tegnes direkte i HTML|laget for å trene/iu;
for (const question of bank.oppgaver) {
  if (vagueExamLanguage.test(question.sporsmal)) {
    throw new Error(`${question.id} har fortsatt unødig abstrakt eller intern maltekst: ${question.sporsmal}`);
  }
}
for (const group of bank.oppgavegrupper) {
  if (vagueExamLanguage.test(group.innledning)) {
    throw new Error(`${group.id} har fortsatt unødig abstrakt eller intern maltekst: ${group.innledning}`);
  }
}

const unnecessaryDataDisclaimer = /personvern|personopplys|faktiske persondata|generisk(?:e)? data|syntetisk(?:e)? data|fiktiv(?:e)? data|anonymisert/iu;
if (unnecessaryDataDisclaimer.test(JSON.stringify(bank))) {
  throw new Error("Oppgavebanken har fortsatt en unødvendig merknad om generiske data eller personvern.");
}

if (revisedIds.size !== bank.oppgaver.length) {
  throw new Error(`Alle oppgaver skal revideres. Revidert: ${revisedIds.size} av ${bank.oppgaver.length}.`);
}

bank.samling.versjon = "2027.20";
bank.opphav.merknad = `${bank.opphav.merknad.replace(/\s*Hintene.*$/u, "")} Hintene i Del 1 gir konkrete og gradvise håndregningssteg uten å vise svarverdien. Hintene i Del 2 prioriterer metode, oppsett, digital verktøybruk og tolkning. Fasit og ferdige konklusjoner vises separat etter hintrekken, slik at hvert hint bevarer en reell oppgave for eleven. I prosentøvingen i Del 1 kan eleven velge og sammenligne flere naturlige løsningsveier når tallene egner seg for det. Alle oppgaver er vurdert som milde, middels eller utfordrende etter en streng nivåregel. Anvendte oppgaver bruker konkrete situasjoner, forklarte variabler og realistiske enheter i eksamensnært språk.`;

await writeFile(bankPath, `${JSON.stringify(bank, null, 2)}\n`, "utf8");
console.log(`Reviderte ${revisedIds.size} oppgaver til worked examples i ${bank.oppgaver.length}-oppgavebanken.`);
