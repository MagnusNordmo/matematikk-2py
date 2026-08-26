import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const bankPath = join(scriptDir, "..", "public", "oppgaver-2027.json");
const bank = JSON.parse(await readFile(bankPath, "utf8"));
const questions = new Map(bank.oppgaver.map((question) => [question.id, question]));
const groups = new Map(bank.oppgavegrupper.map((group) => [group.id, group]));
const revisedIds = new Set();

function number(value, digits = null) {
  const numeric = Number(value);
  let text = digits === null ? String(numeric) : numeric.toFixed(digits);
  let [integer, decimals] = text.split(".");
  const sign = integer.startsWith("-") ? "-" : "";
  integer = integer.replace("-", "").replace(/\B(?=(\d{3})+(?!\d))/g, "\\,");
  return `${sign}${integer}${decimals === undefined ? "" : `{,}${decimals}`}`;
}

function decimal(value, maxDigits = 4) {
  const rounded = Number(Number(value).toFixed(maxDigits));
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

// Omvendt prosent er mønstereksempelet for resten av banken: hele resonnementet
// vises, ett meningsfullt delmål om gangen, og avsluttes med en kontroll.
for (const question of byFamily("d1-omvendt-prosent")) {
  const { ny, endring } = question.kontroll.inndata;
  const factor = 1 + endring / 100;
  const original = question.fasit.verdier[0].verdi;
  const direction = endring >= 0 ? "økt" : "redusert";
  const factorOperation = endring >= 0 ? "+" : "-";
  setHintsAndAnswer(question.id, [
    `Definer den ukjente: La ${math("x")} være verdien før den ble ${direction} med ${number(Math.abs(endring))} %.`,
    `Finn vekstfaktoren: ${number(Math.abs(endring))} % er ${math(number(Math.abs(endring) / 100))}. Derfor er vekstfaktoren ${math(`1${factorOperation}${number(Math.abs(endring) / 100)}=${number(factor)}`)}.`,
    `Lag ligningen: Gammel verdi multiplisert med vekstfaktoren skal bli den nye verdien. Det gir ${math(`${number(factor)}x=${number(ny)}`)}.`,
    `Isoler den ukjente: Del begge sider på ${math(number(factor))}, slik at ${math(`x=${number(ny)}/${number(factor)}`)}.`,
    `Regn ut: ${math(`x=${number(original)}`)}. Dette er verdien før prosentendringen.`,
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
  "2py27-446": [["Den andre utskriften er verdien idet while-løkken stopper.", `Beregn ${math("900\\cdot0{,}88^5")}.`, "Programmet runder denne verdien til én desimal."], `${math("900\\cdot0{,}88^5\\approx475{,}0")}, så den andre utskriften er 475,0.`],
  "2py27-447": [["Den nye løkken stopper ved første verdi som er høyst 600.", `Følg ${math("900\\cdot0{,}88^n")} for hele n-verdier.`, "Kontroller både n=3 og n=4 for å finne første gang grensen er nådd."], "Verdien er fortsatt over 600 etter 3 år, men under etter 4 år. Programmet skriver ut 4."],
  "2py27-449": [["Programmet fjerner én minste og én største verdi.", "Fra listen fjernes 12 og 45, slik at 14, 15, 17, 18 og 21 står igjen.", "Den numeriske utskriften er gjennomsnittet av de fem gjenværende verdiene."], `${math("(14+15+17+18+21)/5=17{,}0")}. Programmet skriver ut 17,0.`],
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
  if (/prosent|vekstfaktor|indeks|tilbud|finne-helhet/.test(family)) {
    return "Marker startverdien, sluttverdien og prosentendringen. Legg merke til hvilken av størrelsene oppgaven ber deg finne.";
  }
  if (/statistikk|frekvens|gjennomsnitt|median|typetall|uteliggere|gruppert|samfunn/.test(family)) {
    return "Finn hvilke observasjoner eller frekvenser som hører med, og marker hvilket statistisk mål eller hvilken sammenligning oppgaven spør etter.";
  }
  if (/figur/.test(family)) {
    return "Koble hvert figurnummer til antallet elementer. Målet er å beskrive mønsteret slik at det også virker for figurer som ikke er tegnet.";
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

if (revisedIds.size !== bank.oppgaver.length) {
  throw new Error(`Alle oppgaver skal revideres. Revidert: ${revisedIds.size} av ${bank.oppgaver.length}.`);
}

bank.samling.versjon = "2027.3";
bank.opphav.merknad = `${bank.opphav.merknad.replace(/\s*Hintene.*$/u, "")} Hintene er revidert til gradvise worked examples med forståelse, metode, oppsett, utregning, konklusjon og kontroll.`;

await writeFile(bankPath, `${JSON.stringify(bank, null, 2)}\n`, "utf8");
console.log(`Reviderte ${revisedIds.size} oppgaver til worked examples i ${bank.oppgaver.length}-oppgavebanken.`);
