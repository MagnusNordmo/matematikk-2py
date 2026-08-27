import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
    if (changes.hint.length < 3) throw new Error(`${id} må få minst tre trinnvise hint.`);
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
  if (/Hva er vekstfaktoren/.test(question.sporsmal)) {
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
      "Forenkle forskjellen. Hvis x-leddene forsvinner og svaret alltid blir 3, gjelder påstanden for alle x.",
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
    `Isoler b ved å bruke ${math(`b=${number(y)}-(${number(product)})`)}.`,
  ], `${math(`${number(y)}=${number(a)}\\cdot${number(x)}+b=${number(product)}+b`)}, så ${math(`b=${number(y)}-(${number(product)})=${number(b)}`)}.`);
}

for (const question of byFamily("d1-lineaert-skjaeringspunkt")) {
  const { a1, b1, a2, b2 } = question.kontroll.inndata;
  const [x, cost] = question.kontroll.resultat;
  const slopeDifference = Math.abs(a1 - a2);
  const fixedDifference = Math.abs(b1 - b2);
  setHintsAndAnswer(question.id, [
    `Samme kostnad betyr at ${math("A(x)=B(x)")}. Med tallene i oppgaven blir det ${math(`${number(b1)}+${number(a1)}x=${number(b2)}+${number(a2)}x`)}.`,
    `Samle x-leddene på én side og fastbeløpene på den andre. Da får du ${math(`${number(slopeDifference)}x=${number(fixedDifference)}`)}.`,
    `Del begge sider på ${number(slopeDifference)}. Sett deretter x-verdien inn i for eksempel ${math(`A(x)=${number(b1)}+${number(a1)}x`)} for å finne kostnaden.`,
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
      `Hos A er prisen fastbeløpet ${number(A.fast)} pluss ${number(A.per_enhet)} ganger x. Hos B brukes fastbeløpet ${number(B.fast)} og satsen ${number(B.per_enhet)}.`,
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
      "Bruk parameterne fra regresjonsverktøyet med flere sifre enn dem du eventuelt skrev i svarfeltene i b.",
      `Erstatt x med ${number(input.ny_x)}. Regnestykket blir ${math(expression)}.`,
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
      `Multipliser med x og del på ${number(input.T - input.fast)} for å isolere x.`,
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

const partAsPercentWorked = {
  "2py27-006": [`10 % av 80 er ${math("8")}, og 20 % er derfor ${math("16")}.`, `2,5 % av 80 er ${math("2")}, fordi 2,5 % er en firedel av 10 %.`, `Da er ${math("16+2=18")} det samme som 22,5 % av 80.`],
  "2py27-007": [`Skriv forholdet ${math("35/125")}. Målet er å få 100 i nevneren.`, `Gang teller og nevner med 8: ${math("35\\cdot8=280")} og ${math("125\\cdot8=1\\,000")}.`, `${math("280/1\\,000=28/100")}. Dermed var 28 % av svarene positive.`],
  "2py27-008": [`Forkort ${math("66/240")} med 6. Da får du ${math("11/40")}.`, `${math("10/40=25/100")}, altså 25 %. Den siste delen ${math("1/40")} er 2,5 %.`, `Legg sammen: ${math("25+2{,}5=27{,}5")}.`],
  "2py27-009": [`Forkort ${math("117/360")} med 9. Da får du ${math("13/40")}.`, `${math("12/40=30/100")}, altså 30 %. Den siste delen ${math("1/40")} er 2,5 %.`, `Legg sammen: ${math("30+2{,}5=32{,}5")}.`],
  "2py27-010": [`Forkort ${math("275/625")} med 25. Da får du ${math("11/25")}.`, `Gang teller og nevner med 4: ${math("11/25=44/100")}.`, "Dermed var 44 % av svarene positive."],
};
for (const [id, hint] of Object.entries(partAsPercentWorked)) {
  const question = questions.get(id);
  const result = question.kontroll.resultat[0];
  setHintsAndAnswer(id, hint, `Andelen er ${math(`${number(result)}\\,\\%`)}.`);
}

const percentagePointWorked = {
  "2py27-016": { old: 18, next: 27, difference: 9, relative: 50, fraction: "9/18=1/2" },
  "2py27-017": { old: 40, next: 34, difference: -6, relative: -15, fraction: "-6/40=-15/100" },
  "2py27-018": { old: 6, next: 9, difference: 3, relative: 50, fraction: "3/6=1/2" },
  "2py27-019": { old: 72, next: 63, difference: -9, relative: -12.5, fraction: "-9/72=-1/8" },
  "2py27-020": { old: 12, next: 15, difference: 3, relative: 25, fraction: "3/12=1/4" },
};
for (const [id, values] of Object.entries(percentagePointWorked)) {
  setHintsAndAnswer(id, [
    `Finn først forskjellen mellom prosenttallene: ${math(`${number(values.next)}-${number(values.old)}=${number(values.difference)}`)} prosentpoeng.`,
    `Relativ endring måles mot den gamle andelen. Forholdet blir ${math(values.fraction)}.`,
    `Gjør forholdet om til prosent: ${math(`${number(values.relative)}\\,\\%`)}. Fortegnet viser om andelen økte eller sank.`,
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
  "2py27-040": { parts: ["25 % er en firedel av 680.", "680/4=170"], fixed: 190, decision: "kroneavslaget" },
  "2py27-041": { parts: ["10 % av 2 400 er 240, og 2 % er 48.", "240+48=288"], fixed: 320, decision: "kroneavslaget" },
  "2py27-042": { parts: ["10 % av 1 500 er 150, og 8 % er 120.", "150+120=270"], fixed: 250, decision: "prosenttilbudet" },
};
for (const [id, values] of Object.entries(offerWorked)) {
  setHintsAndAnswer(id, [
    `Regn prosentavslaget i deler som er enkle uten kalkulator: ${values.parts[0]}`,
    `Legg sammen delene: ${math(values.parts[1])} kr i prosentavslag.`,
    `Sammenlign ${math(values.parts[1].split("=")[1])} kr med kroneavslaget på ${math(number(values.fixed))} kr. Det største avslaget er best.`,
  ], `Prosentavslaget er ${math(values.parts[1])} kr. Derfor gir ${values.decision} størst avslag.`);
}

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
    `Etter hver ny verdi blir de løpende summene ${running.slice(1).map(number).join(", ")}.`,
    `Når listen er slutt, er sum ${number(total)}. Det er denne verdien print-linjen skriver ut.`,
  ], `Programmet skriver ut ${math(number(total))}.`);
}

for (const [id, revision] of Object.entries(calculatorFreeCodeGrowth)) {
  const sequence = revision.values.map(number).join(" → ");
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
    svar: `${math("240\\cdot0{,}15=36")}. Det er ${math("36")} elever som velger klatring.`,
    units: ["elever"],
  },
  "2py27-002": {
    sporsmal: `En konsert har ${math("360")} billetter. Den første dagen blir ${math("25\\,\\%")} av billettene solgt. Hvor mange billetter blir solgt den første dagen?`,
    svar: `${math("360\\cdot0{,}25=90")}. Det blir solgt ${math("90")} billetter.`,
    units: ["billetter"],
  },
  "2py27-003": {
    sporsmal: `En arbeidsplass har ${math("450")} ansatte. ${math("32\\,\\%")} sykler til jobb. Hvor mange ansatte sykler til jobb?`,
    svar: `${math("450\\cdot0{,}32=144")}. Det er ${math("144")} ansatte som sykler til jobb.`,
    units: ["ansatte"],
  },
  "2py27-004": {
    sporsmal: `Et idrettslag har ${math("640")} medlemmer. ${math("12{,}5\\,\\%")} av medlemmene er trenere. Hvor mange trenere har idrettslaget?`,
    svar: `${math("640\\cdot0{,}125=80")}. Idrettslaget har ${math("80")} trenere.`,
    units: ["trenere"],
  },
  "2py27-005": {
    sporsmal: `I en spørreundersøkelse kom det inn ${math("875")} svar. ${math("8\\,\\%")} svarte «vet ikke». Hvor mange svarte «vet ikke»?`,
    svar: `${math("875\\cdot0{,}08=70")}. Det var ${math("70")} slike svar.`,
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
    hand: `Siden ${math("120\\,\\%=816")} kr, er ${math("10\\,\\%=816/12=68")} kr.`,
  },
  "2py27-029": {
    sporsmal: `En jakke ble satt ned med ${math("10\\,\\%")} og kostet da ${math("630")} kr. Hva kostet jakken før rabatten?`,
    subject: "prisen på jakken",
    unit: "kr",
    hand: `Siden ${math("90\\,\\%=630")} kr, er ${math("10\\,\\%=630/9=70")} kr.`,
  },
  "2py27-030": {
    sporsmal: `Prisen på en sykkel ble økt med ${math("25\\,\\%")} til ${math("1\\,500")} kr. Hva kostet sykkelen før prisøkningen?`,
    subject: "prisen på sykkelen",
    unit: "kr",
    hand: `Siden ${math("125\\,\\%=1\\,500")} kr, er ${math("25\\,\\%=1\\,500/5=300")} kr.`,
  },
  "2py27-031": {
    sporsmal: `Et årskort ble satt ned med ${math("5\\,\\%")} og kostet da ${math("760")} kr. Hva kostet årskortet før rabatten?`,
    subject: "prisen på årskortet",
    unit: "kr",
    hand: `${math("95\\,\\%")} består av 19 deler på ${math("5\\,\\%")}. Derfor er ${math("5\\,\\%=760/19=40")} kr.`,
  },
  "2py27-032": {
    sporsmal: `Medlemstallet i en organisasjon økte med ${math("50\\,\\%")} til ${math("1\\,950")}. Hvor mange medlemmer hadde organisasjonen før økningen?`,
    subject: "medlemstallet",
    unit: "medlemmer",
    hand: `Siden ${math("150\\,\\%=1\\,950")}, er ${math("50\\,\\%=1\\,950/3=650")}.`,
  },
};

for (const [id, context] of Object.entries(reversePercentContexts)) {
  const question = questions.get(id);
  const { ny, endring } = question.kontroll.inndata;
  const original = question.kontroll.resultat[0];
  const factor = 1 + endring / 100;
  setQuestion(id, {
    sporsmal: context.sporsmal,
    hint: [
      `Definer den ukjente: La ${math("x")} være ${context.subject} før prosentendringen.`,
      `Finn vekstfaktoren: ${math(`${Math.abs(endring)}\\,\\%`)} er ${math(number(Math.abs(endring / 100)))}. ${endring > 0 ? "Ved økning legger vi dette tallet til 1" : "Ved nedgang trekker vi dette tallet fra 1"}, og får ${math(number(factor))}.`,
      `Lag ligningen: ${context.subject[0].toUpperCase()}${context.subject.slice(1)} multiplisert med vekstfaktoren skal bli ${math(number(ny))}${context.unit === "kr" ? " kr" : ""}. Det gir ${math(`${number(factor)}x=${number(ny)}`)}.`,
      `Regn uten kalkulator: ${context.hand}`,
      `Regn ut: ${math("100\\,\\%")} er ${math(number(original))}${context.unit === "kr" ? " kr" : " medlemmer"}. Dette er svaret oppgaven spør etter.`,
      `Kontroller svaret: ${math(`${number(original)}\\cdot${number(factor)}=${number(ny)}`)}. Vi får den oppgitte verdien etter prosentendringen.`,
    ],
    svar: `${context.subject[0].toUpperCase()}${context.subject.slice(1)} var ${math(number(original))} ${context.unit}. Kontroll: ${math(`${number(original)}\\cdot${number(factor)}=${number(ny)}`)}.`,
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

// Alle oppgavene får nå en full worked example. De eksisterende, fagspesifikke
// mellomstegene beholdes, men settes inn i en tydelig progresjon fra forståelse
// via oppsett og utregning til kontroll. Markørene gjør passet idempotent.
const generatedPrefixes = [
  "Forstå oppgaven:",
  "Velg framgangsmåte:",
  "Sett opp:",
  "Regn videre:",
  "Arbeid videre:",
  "Løsningen samlet:",
  "Kontroller og konkluder:",
];

function removeGeneratedPrefix(hint) {
  for (const prefix of generatedPrefixes.slice(1, 5)) {
    if (hint.startsWith(prefix)) return hint.slice(prefix.length).trim();
  }
  return hint;
}

function workedContext(question) {
  const family = question.variantfamilie;
  if (/kode/.test(family)) {
    return "Noter startverdien til hver variabel. Les deretter løkker og vilkår i samme rekkefølge som programmet utfører dem.";
  }
  if (family === "d1-prosent-av-tall") {
    return "Marker totalen og prosentandelen. Oppgaven spør etter hvor mange den oppgitte prosentandelen tilsvarer.";
  }
  if (family === "d1-finne-prosent") {
    return "Marker delen og totalen. Oppgaven spør hvor stor del dette er uttrykt i prosent.";
  }
  if (family === "d1-finne-helhet") {
    return "Marker antallet som er oppgitt, og prosenten det tilsvarer. Det totale antallet er ukjent.";
  }
  if (family === "d1-prosentpoeng") {
    return "Marker den gamle og den nye prosentandelen. Du skal skille mellom endring i prosentpoeng og relativ endring i prosent.";
  }
  if (family === "d1-gjennomsnittlig-vekstfart") {
    const timeUnit = /timer|time/u.test(question.sporsmal) ? "time" : "minutt";
    return `Marker startpunktet, sluttpunktet og enhetene. Du skal finne hvor mye den målte størrelsen i gjennomsnitt endres for hvert ${timeUnit}.`;
  }
  if (/prosent|vekstfaktor|indeks|tilbud|finne-helhet/.test(family)) {
    return "Marker startverdien, sluttverdien og prosentendringen. Legg merke til hvilken av størrelsene oppgaven ber deg finne.";
  }
  if (/statistikk|frekvens|gjennomsnitt|median|typetall|uteliggere|gruppert|samfunn/.test(family)) {
    return "Finn hvilke observasjoner eller frekvenser som hører med, og marker hvilket statistisk mål eller hvilken sammenligning oppgaven spør etter.";
  }
  if (/figur/.test(family)) {
    return "Koble hvert figurnummer til antallet objekter i figuren. Målet er å beskrive mønsteret slik at det også virker for figurer som ikke er tegnet.";
  }
  if (/lineaer|graf|modell|regresjon|eksponential|proporsjonal|stigningstall/.test(family)) {
    return "Marker hvilke størrelser som er input og output, og hva tallene i tabellen, grafen eller modellen representerer.";
  }
  if (/potens|standardform|rot/.test(family)) {
    return "Identifiser grunntall, eksponent og regneoperasjon før du bruker en potensregel eller flytter et desimalkomma.";
  }
  if (/ligning|formel|algebra|konstantledd/.test(family)) {
    return "Skriv opp hva som er kjent og hva som er ukjent. Målet er å bevare likheten mens den ukjente størrelsen isoleres.";
  }
  return "Skriv opp de gitte størrelsene med riktige enheter, og bestem nøyaktig hvilken størrelse eller påstand som skal finnes.";
}

function workedCheck(question) {
  const family = question.variantfamilie;
  if (/kode/.test(family)) {
    return "Spor programmet én gang til med de opprinnelige startverdiene. Variablene og stoppvilkåret skal ende på verdiene i løsningen.";
  }
  if (/prosent|vekstfaktor|indeks|tilbud|finne-helhet/.test(family)) {
    return "Gå motsatt vei med prosentregningen, eller sammenlign med startverdien. Da skal du få tilbake den oppgitte verdien og riktig retning på endringen.";
  }
  if (/statistikk|frekvens|gjennomsnitt|median|typetall|uteliggere|gruppert|samfunn/.test(family)) {
    return "Kontroller antall observasjoner, samlet frekvens og eventuell sortering. Svaret skal ligge på en rimelig plass i datamaterialet.";
  }
  if (/figur/.test(family)) {
    return "Prøv regelen på en av de oppgitte figurene og på figuren rett før eller etter. Begge kontrollene skal passe mønsteret.";
  }
  if (/lineaer|graf|modell|regresjon|eksponential|proporsjonal|stigningstall/.test(family)) {
    return "Sett resultatet inn i modellen eller sammenlign det med tabellen og grafen. Fortegn, enhet og størrelsesorden skal passe situasjonen.";
  }
  if (/potens|standardform|rot/.test(family)) {
    return "Regn uttrykket tilbake som et vanlig tall eller bruk en omvendt potensoperasjon. Fortegn og størrelsesorden skal stemme.";
  }
  if (/ligning|formel|algebra|konstantledd/.test(family)) {
    return "Sett den funne verdien inn i den opprinnelige ligningen eller formelen. Venstre og høyre side skal bli like.";
  }
  if (question.fasit.type === "valg") {
    return "Sammenlign konklusjonen med alle opplysningene i oppgaven. Det valgte alternativet skal oppfylle betingelsene, mens de andre bryter minst én av dem.";
  }
  return "Sett svaret tilbake i den opprinnelige sammenhengen, og kontroller enhet, fortegn og størrelsesorden.";
}

function asWorkedExample(question) {
  // Denne familien er skrevet ferdig som et detaljert mønstereksempel ovenfor.
  if (question.variantfamilie === "d1-omvendt-prosent") return question.hint;

  const coreHints = question.hint
    .filter((hint) => ![
      "Forstå oppgaven:",
      "Løsningen samlet:",
      "Kontroller og konkluder:",
    ].some((prefix) => hint.startsWith(prefix)))
    .map(removeGeneratedPrefix);
  const stepLabels = ["Velg framgangsmåte", "Sett opp", "Regn videre"];
  const worked = [`Forstå oppgaven: ${workedContext(question)}`];

  coreHints.forEach((hint, index) => {
    const label = stepLabels[index] ?? "Arbeid videre";
    worked.push(`${label}: ${hint}`);
  });

  worked.push(`Løsningen samlet: ${question.svar}`);
  worked.push(`Kontroller og konkluder: ${workedCheck(question)}`);
  return worked;
}

for (const question of bank.oppgaver) {
  setQuestion(question.id, { hint: asWorkedExample(question) });
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

if (revisedIds.size !== bank.oppgaver.length) {
  throw new Error(`Alle oppgaver skal revideres. Revidert: ${revisedIds.size} av ${bank.oppgaver.length}.`);
}

bank.samling.versjon = "2027.5";
bank.opphav.merknad = `${bank.opphav.merknad.replace(/\s*Hintene.*$/u, "")} Hintene er revidert til gradvise worked examples med forståelse, metode, oppsett, utregning, konklusjon og kontroll. Anvendte oppgaver bruker konkrete situasjoner, forklarte variabler og realistiske enheter i eksamensnært språk.`;

await writeFile(bankPath, `${JSON.stringify(bank, null, 2)}\n`, "utf8");
console.log(`Reviderte ${revisedIds.size} oppgaver til worked examples i ${bank.oppgaver.length}-oppgavebanken.`);
