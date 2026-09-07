import type { Question, QuestionGroup } from './question-bank.ts';
import { evaluateAnswer, parseNorwegianNumber, type AnswerInput } from './answer-engine';

export const CONCEPTS: [string, RegExp, string][] = [
 ['Svarprosent', /svarprosent|spørreskjema/i, 'Svarprosent er antall som svarte delt på antall som fikk undersøkelsen, ganget med 100. Høy svarprosent fjerner ikke nødvendigvis skjevhet i hvem som ble spurt.'],
 ['Besøk og personer', /forskjellige (?:besøkende|personer)|besøkstallet/i, 'Besøk teller hendelser, mens forskjellige besøkende teller personer. Én person kan stå bak flere besøk. Flere besøk betyr derfor ikke nødvendigvis flere personer.'],
 ['Stigningstall og konstantledd', /stigningstall|konstantledd|parallelle|timepris|lineaere_funksjoner/i, 'I en lineær modell y = ax + b er a endringen i y når x øker med én. b er verdien når x er null. Et negativt stigningstall betyr nedgang. Linjer med samme stigningstall har konstant avstand i loddrett retning.'],
 ['Nullpunkt', /nullpunkt|tanken er tom/i, 'Et nullpunkt er en innverdi som gir funksjonsverdi null. I en modell for vannmengde forteller det når den modellerte vannmengden er null.'],
 ['Punkt og koordinater', /koordinat|punkt ligger|punkt-paa-graf/i, 'Et punkt skrives (x, y). Første tall angir plasseringen vannrett, og andre tall angir plasseringen loddrett. På grafen til y = f(x) må andre koordinat være lik f av første koordinat.'],
 ['Sektordiagram', /sektor|sirkel/i, 'Hele sirkelen er 360 grader og representerer hele gruppen. En sektors andel er vinkelen delt på 360. Gang andelen med totalt antall for å finne antallet i sektoren.'],
 ['Linjediagram', /linjediagram|tidsdiagram/i, 'Et linjediagram kobler målepunkter i rekkefølge. Med tid langs den vannrette aksen viser linjen utviklingen gjennom perioden.'],
 ['Tallfølge', /tallfølge|tallfoelge/i, 'En tallfølge er tall i en bestemt rekkefølge. Det første tallet er ledd én. Fast tillegg og fast dobling gir ulike følger, så bruk regelen som er oppgitt.'],
 ['Delt side og dobbeltelling', /delt.*side|deler.*side|ytterkant|hjørne/i, 'Når figurdeler deler en side eller et hjørne, skal den felles delen telles én gang. Teller du hver del separat, må du trekke fra det som ble telt flere ganger.'],
 ['Partall og oddetall', /partall|oddetall/i, 'Et heltall er et partall når det kan deles på to uten rest. Et oddetall har rest én. Én tillatt verdi som bryter en påstand om alle tall, er nok til å motbevise påstanden.'],
 ['Fast tilvekst i en tallfølge', /tilvekst|radnummer|neste rad/i, 'En tallfølge med fast tilvekst får samme tillegg for hvert nytt ledd. Hvis første ledd er 7 og tilveksten er 3, er de neste 10 og 13. Fra ledd 1 til ledd n er det n − 1 tillegg.'],
 ['Naturlig logaritme og exp', /\bln\(|logaritm|\bexp\(/i, 'Den naturlige logaritmen, ln, gjør gangesteg i en eksponentialmodell om til tillegg. exp gjør den motsatte omregningen. Hvis ln(M) = u + vx, kan modellen skrives M = exp(u) · exp(v) opphøyd i x.'],
 ['Koeffisient', /koeffisient|an\^2\+bn/i, 'En koeffisient er et tall som ganges med en variabel eller en potens. I 3n² + 5n + 2 er koeffisientene foran n² og n henholdsvis 3 og 5; konstantleddet er 2.'],
 ['Minste kvadraters metode', /minste kvadrat/i, 'Metoden velger modellen som gir minst mulig sum av kvadrerte avvik mellom målingene og modellen. Kvadrering betyr å gange hvert avvik med seg selv. I lineær regresjon måles avvikene i loddrett retning.'],
 ['Ikke-negative heltall', /ikke-negative heltall/i, 'Dette er tallene 0, 1, 2 og så videre. Desimaltall og negative tall er ikke med. Like tall kan brukes flere ganger når oppgaven tillater det.'],
 ['Strengt billigere og høyst', /strengt|høyst|maksimalt/i, 'Strengt mindre betyr mindre uten at likhet er tillatt. Høyst betyr mindre enn eller lik. Ved hele antall må du kontrollere hvilke heltall som ligger innenfor grensene.'],
 ['Varians', /varians|kvadrerte avvik/i, 'Populasjonsvariansen er gjennomsnittet av de kvadrerte avvikene fra gjennomsnittet. Standardavviket er kvadratroten av variansen og har samme enhet som målingene.'],
 ['Graf og koordinater', /graf|koordinat|punktdiagram/i, 'Et punkt (2, 30) i en graf betyr at x er 2 og y er 30. Finn 2 på den vannrette x-aksen og 30 på den loddrette y-aksen. Aksetitlene forteller hva tallene måler, for eksempel timer og kroner.'],
 ['Proporsjonal sammenheng', /proporsjonal|kilopris/i, 'To størrelser er proporsjonale når du får samme tall hver gang du deler den ene på den andre. Dette kalles et konstant forhold. Ved 30 kroner per kilo uten fast avgift er pris delt på kilo alltid 30; dobbelt så mange kilo gir dobbelt så høy pris. I y = kx er k dette faste forholdet (y/x, for x ulik null).'],
 ['Omvendt proporsjonal', /omvendt.*proporsjonal/i, 'Omvendt proporsjonal betyr at du får samme tall når størrelsene ganges sammen. Hvis 600 kroner deles likt, blir antall personer ganger pris per person alltid 600. Dobbelt så mange personer gir halv pris. I x · y = k er k det faste produktet, altså resultatet av gangingen.'],
 ['Eksponentiell endring', /eksponen|eksponential|vekstfaktor|halver|doblingstid/i, 'Ved eksponentiell endring ganges verdien med samme tall for hver like lange periode. Med 10 % vekst per år blir for eksempel 100 til 110 og deretter 121: begge steg ganger med 1,10. I y = a · b^x er a verdien ved start, b tallet vi ganger med, og x antall perioder.'],
 ['Lineær modell', /lineær|lineaer|stigningstall|konstantledd|fastbeløp|fast avgift/i, 'Lineær betyr at y endres med samme beløp hver gang x øker med én. I prisen y = 30x + 200 legger hver ekstra time til 30 kroner, mens 200 kroner betales fra start. Modellen y = ax + b har fast endring a og startverdi b. Når b = 0, er den også proporsjonal.'],
 ['Stigningstall', /stigningstall/i, 'Stigningstallet er endringen i y for hver økning på én i x. Hvis prisen øker med 60 kroner over to timer, er stigningstallet 60/2 = 30 kroner per time. Et negativt tall betyr nedgang.'],
 ['Konstantledd', /konstantledd|fastbeløp|fast avgift/i, 'Konstantleddet er tallet som ikke ganges med x i en lineær modell. I y = 30x + 200 er det 200. Det er også y-verdien ved x = 0, for eksempel en fast avgift før leien begynner.'],
 ['Vekstfaktor', /vekstfaktor/i, 'Vekstfaktoren er tallet du ganger startverdien med for å finne ny verdi. En økning på 20 % gir faktor 1,20; en nedgang på 20 % gir faktor 0,80.'],
 ['Prosent og prosentgrunnlag', /prosent|%|rabatt|mva/i, 'Prosent betyr hundredeler. Prosentgrunnlaget er helheten som regnes som 100 %. Ved prosentvis endring deler du endringen på startverdien og ganger med 100.'],
 ['Prosentpoeng', /prosentpoeng/i, 'Prosentpoeng er forskjellen mellom to prosenttall. Fra 20 % til 25 % er det 5 prosentpoeng, men økningen i forhold til 20 % er 25 %.'],
 ['Gjennomsnitt', /gjennomsnitt|sentralmål/i, 'Gjennomsnittet er summen av verdiene delt på antall verdier. For 2, 4 og 9 er gjennomsnittet (2 + 4 + 9)/3 = 5. En svært høy eller lav verdi kan påvirke det mye.'],
 ['Median', /median|sentralmål/i, 'Medianen er tallet i midten når tallene er sortert fra minst til størst. For 2, 3 og 10 er den 3. Med fire tall, for eksempel 2, 3, 7 og 10, bruker du gjennomsnittet av de to midterste: (3 + 7)/2 = 5.'],
 ['Typetall', /typetall/i, 'Typetallet er verdien som forekommer flest ganger. I 1, 2, 2, 4 er typetallet 2. Hvis flere verdier deler den høyeste frekvensen, kan datasettet ha flere typetall.'],
 ['Standardavvik', /standardavvik|spredningsmål/i, 'Standardavvik er et mål på hvor spredt tallene ligger rundt gjennomsnittet. For 4, 4, 4 er det 0; for 2, 4, 6 er det større, selv om gjennomsnittet fortsatt er 4. Måles dataene i minutter, er standardavviket også i minutter. Populasjonsstandardavvik bruker alle observasjonene i det beskrevne datasettet.'],
 ['Variasjonsbredde', /variasjonsbredde|spredningsmål/i, 'Variasjonsbredden er største verdi minus minste verdi. Den beskriver avstanden mellom ytterpunktene, men ikke hvordan resten av tallene fordeler seg.'],
 ['Sentralmål og spredning', /sentralmål|spredning|homogen/i, 'Sentralmål beskriver en typisk eller sentral verdi, mens spredningsmål beskriver forskjellene mellom verdiene. Listene 4, 4, 4 og 2, 4, 6 har samme gjennomsnitt, men ulik spredning. Homogen betyr her at verdiene er forholdsvis like.'],
 ['Frekvens', /frekvens/i, 'Frekvens er antall ganger en verdi eller kategori forekommer. Relativ frekvens er dette antallet delt på totalt antall, gjerne oppgitt i prosent.'],
 ['Kumulativ frekvens', /kumulativ/i, 'Kumulativ betyr oppsummert fram til en grense. For en enkeltverdi teller kumulativ frekvens alle observasjoner som er mindre enn eller lik verdien. For intervaller må du følge grensene i tabellen.'],
 ['Klassemidtpunkt', /klassemidt|grupperte data|gruppert gjennomsnitt/i, 'Klassemidtpunktet ligger halvveis mellom grensene i et intervall. Når det representerer alle observasjonene i intervallet, blir beregnet gjennomsnitt vanligvis et anslag.'],
 ['Intervall', /intervall|\[[0-9., ]+\)/i, 'Et intervall er et område mellom to grenser. [0, 10) inneholder 0 og verdier mindre enn 10, men ikke 10. En hake betyr at grensen er med; en parentes betyr at den ikke er med.'],
 ['Histogram', /histogram|frekvenstetthet/i, 'Et histogram samler tallverdier i intervaller, for eksempel reisetid 0–10 og 10–20 minutter. Når søylearealet viser antallet, beregnes høyden som antall delt på intervallbredde. Denne høyden kalles frekvenstetthet. Med 20 elever i et intervall som er 10 minutter bredt, blir høyden 2 elever per minutt.'],
 ['Anslag og jevn fordeling', /anslag|anslå|jevn fordeling|interpol/i, 'Et anslag er en tilnærmet verdi. Jevn fordeling innenfor et intervall betyr at vi antar like mange observasjoner per like stor del av intervallet. Lineær interpolasjon bruker en rett linje mellom kjente punkter.'],
 ['Utvalg og representativitet', /utvalg|representativ|generaliser|kildekritikk/i, 'Et utvalg er dem som undersøkes. Det er representativt hvis det gir et rimelig bilde av gruppen vi vil si noe om. Følgerne til en treningsprofil kan for eksempel trene mer enn befolkningen ellers; da er utvalget skjevt. Å generalisere betyr å la konklusjonen gjelde flere enn dem som svarte.'],
 ['Sammenheng og årsak', /årsak|samvariasjon/i, 'At to størrelser endrer seg sammen, viser ikke alene at den ene er årsak til den andre. Andre forhold kan påvirke begge.'],
 ['Moteksempel', /moteksempel/i, 'Et moteksempel er ett tilfelle som viser at en påstand om alle tilfeller er feil. Påstanden «Alle partall er delelige med 4» motbevises av tallet 6. Eksemplet må oppfylle utgangspunktet i påstanden: 6 er faktisk et partall.'],
 ['Potens', /potens|eksponent(?!i)|\^/i, 'I 2³ er 2 grunntallet og det lille tallet 3 eksponenten. Det betyr 2 · 2 · 2 = 8. En negativ eksponent gir en brøk, for eksempel 2⁻³ = 1/2³ = 1/8; den gjør ikke svaret negativt. Et grunntall ulik null opphøyd i 0 er 1.'],
 ['Kvadratrot', /kvadratrot|rotuttrykk|sqrt|√/i, 'Kvadratroten av et ikke-negativt tall er det ikke-negative tallet som ganget med seg selv gir tallet. Derfor er √49 = 7.'],
 ['Standardform', /standardform|tierpotens/i, 'På standardform skrives et positivt tall som a · 10ⁿ, der 1 ≤ a < 10 og n er et heltall. For eksempel er 4500 = 4,5 · 10³.'],
 ['Variabel og formel', /variabel|formel|uttrykk|modell|figur|verdien av/i, 'En variabel er en bokstav som står for en verdi, for eksempel x for antall timer. Et uttrykk som 30x betyr 30 ganger x. En formel beskriver en sammenheng mellom størrelser, for eksempel P = 30x for pris P. Når x = 2, blir prisen 60.'],
 ['Likning', /likning|ligning/i, 'En likning er en likhet der vi skal finne en ukjent verdi. I x + 3 = 8 må x være 5. Du kan trekke 3 fra begge sider for å beholde likheten og få x alene.'],
 ['Modell og definisjonsområde', /modell|definisjons/i, 'En modell er en forenklet matematisk beskrivelse av en situasjon. Definisjonsområdet sier hvilke verdier som kan brukes. Hvis x er antall besøk, er x for eksempel et ikke-negativt heltall; 2,5 besøk passer ikke i denne modellen.'],
 ['Regresjon', /regresjon/i, 'Regresjon bruker flere målepunkter til å finne en modell som passer til dataene. Programmet justerer tallene i modellen etter en bestemt metode. Det er som å finne en linje eller kurve som beskriver hovedmønsteret; den trenger ikke treffe alle punktene nøyaktig.'],
 ['Vekstfart', /vekstfart/i, 'Gjennomsnittlig vekstfart forteller hvor mye en verdi endres per enhet over et intervall. Hvis høyden øker fra 10 til 16 cm på tre uker, er vekstfarten (16 − 10)/3 = 2 cm per uke. Bruk sluttverdi minus startverdi; en nedgang gir negativ vekstfart.'],
 ['Tangent', /tangent|momentan/i, 'En tangent er en rett linje som følger grafens retning i ett punkt. Stigningen til linjen viser hvor raskt verdien endrer seg akkurat der. Dette kalles momentan vekstfart: vekstfart i øyeblikket, til forskjell fra gjennomsnittet over et helt intervall.'],
 ['Skjæringspunkt', /skjæringspunkt|skjaeringspunkt/i, 'I et skjæringspunkt har to grafer samme y-verdi ved samme x-verdi. I prismodeller betyr det at prisene er like ved denne mengden.'],
 ['Indeks', /indeks/i, 'En indeks sammenlikner med et valgt utgangspunkt, ofte et basisår som får indeks 100. Hvis en pris går fra 200 kroner i basisåret til 240 kroner, blir indeksen 240/200 · 100 = 120. Det betyr 20 % økning, ikke en pris på 120 kroner.'],
 ['Merverdiavgift', /mva|merverdiavgift/i, 'Merverdiavgift, ofte kalt mva., er en avgift som legges til prisen uten avgift. Bruk satsen som er oppgitt i oppgaven.'],
 ['Figurmønster', /figurmønster|figurmønster|figurmonster|figur /i, 'Et figurmønster bygges etter en bestemt regel. Figurnummeret n angir hvilken figur vi ser på. En generell formel må passe til konstruksjonsregelen, ikke bare noen få kjente tall.'],
 ['Søylediagram og akser', /søyle|akse|diagram/i, 'Et søylediagram sammenlikner kategorier med søyler. Aksetitlene forteller hva som måles, og skalaen viser tallverdiene. En avkuttet tallakse kan få små forskjeller til å se store ut.'],
 ['Enhet', /kron|\bkr\b|meter|minutt|timer|kg|tonn|liter/i, 'Enheten forteller hva tallet måler, for eksempel kroner, minutter eller kilo. Verdier må ha samme enhet før de sammenliknes eller legges sammen.'],
];

export type ConceptExplanation = { term: string; explanation: string; example?: string };

export function questionCode(question: Question, group?: QuestionGroup): string {
 const sources = [question.data?.programkode, question.visualisering?.kode, group?.data.programkode, group?.visualisering?.kode];
 return sources.find((source): source is string => typeof source === 'string') ?? '';
}

function codeConcepts(code: string): ConceptExplanation[] {
 if (!code) return [];
 const concepts: ConceptExplanation[] = [];
 const add = (term: string, explanation: string, example?: string) => concepts.push({ term, explanation, example });
 const forLine = code.match(/^\s*for (\w+) in (.+):/m);
 if (forLine) add('for-løkke (for loop)', `En løkke er kode som gjentas. Her starter den med ordet \`for\`: Dette er en for-løkke, eller «for loop» på engelsk. Variabelen \`${forLine[1]}\` får én verdi om gangen fra \`${forLine[2]}\`. For hver verdi kjøres linjene med innrykk under for-linjen.`, forLine[0].trim());
 const whileLine = code.match(/^\s*while (.+):/m);
 if (whileLine) add('while-løkke (while loop)', 'En while-løkke gjentar de innrykkede linjene så lenge testen etter `while` er sann. Testen sjekkes før hver runde; er den usann allerede første gang, kjøres ingen runder.', whileLine[0].trim());
 const range = code.match(/range\(([^)]+)\)/);
 if (range) add('range: hvilke tall brukes?', '`range(stopp)` gir heltall fra 0 til rett før stopp. `range(4)` gir altså 0, 1, 2 og 3: fire runder. Med to tall, som `range(1, 4)`, starter vi på 1 og får 1, 2, 3. Et eventuelt tredje tall angir steglengden. Stoppverdien er aldri med.', range[0]);
 if (/^\s*(if|elif) /m.test(code)) add('if, elif og else: velg en gren', '`if` betyr «hvis» og tester et vilkår, altså noe som kan være sant eller usant. Ved sant vilkår kjøres de innrykkede linjene under. `elif` betyr «ellers hvis» og tester neste mulighet; `else` brukes hvis ingen av de tidligere testene var sanne. Dette er et valg, ikke i seg selv en løkke.', code.match(/^\s*if .+:/m)?.[0].trim());
 if (forLine || whileLine || /^\s*if /m.test(code)) add('Innrykk: hva hører sammen?', 'Mellomrommene foran en linje viser hvilken blokk den tilhører. Linjene med innrykk under `for` eller `while` gjentas. En `print`-linje som står helt til venstre etter løkken, kjøres først når løkken er ferdig.');
 if (/^\s*\w+\s*=(?!=)/m.test(code)) add('Variabel og = i Python', 'En variabel er et navn som husker en verdi. `total = 0` lagrer 0 under navnet total. `=` betyr her «lagre verdien på høyre side i navnet på venstre side». Det er en instruks, ikke en likning som skal løses.');
 if (/\+=|^\s*(\w+)\s*=\s*\1\s*\+/m.test(code)) add('Oppdatere en sum eller teller', '`total = total + x` legger x til den gamle totalen og lagrer den nye. `total += x` betyr det samme. `antall += 1` øker en teller med én. Dette kalles noen ganger akkumulering: å samle opp litt for hver runde.');
 if (/\[[^\]]*\]/.test(code)) add('Liste i Python', '`tall = [2, 4, 8]` lager en liste med tre verdier i en bestemt rekkefølge. Hakeparentesene markerer listen; kommaene skiller verdiene. En for-løkke kan bruke hver verdi i listen etter tur.');
 if (/\blen\(/.test(code)) add('len: antall verdier', '`len(tall)` teller hvor mange verdier listen tall inneholder. For `[2, 4, 8]` er resultatet 3, ikke summen 14.');
 if (/\bsum\(/.test(code)) add('sum: legg sammen listen', '`sum(tall)` legger sammen verdiene i listen tall. For `[2, 4, 8]` blir summen 14. `sum(tall) / len(tall)` regner derfor gjennomsnittet.');
 if (/\bprint\(/.test(code)) add('print: det programmet viser', '`print(...)` viser verdien som står inne i parentesene når linjen kjøres. Se på plasseringen: Inne i en løkke kan den gi flere utskrifter; etter løkken viser den resultatet på det tidspunktet.');
 if (/\bround\(/.test(code)) add('round: avrunding', '`round(verdi)` avrunder til nærmeste heltall. `round(verdi, 1)` avrunder til én desimal. I Python avrundes en nøyaktig halvverdi mot nærmeste partall, for eksempel `round(2.5)` til 2.');
 if (/\b(min|max)\(/.test(code)) add('min og max: ytterverdiene', '`min(tall)` finner den minste verdien i listen; `max(tall)` finner den største. For `[2, 4, 8]` er disse 2 og 8.');
 if (/\.remove\(/.test(code)) add('remove: fjern en verdi', '`tall.remove(4)` fjerner den første forekomsten av 4 fra listen. Senere beregninger bruker listen slik den er etter fjerningen.');
 if (/[<>]|==|!=/.test(code)) add('Sammenlikning i Python', '`<` betyr mindre enn, `>` større enn, og `<=` og `>=` tar også med likhet. `==` tester om to verdier er like; `!=` tester om de er ulike. Testen får resultatet sant eller usant.');
 if (/\*\*|\/\/|%/.test(code)) add('Regnetegn i Python', '`**` betyr potens: `2 ** 3` er 8. `//` deler og runder ned: `7 // 2` er 3. `%` gir resten etter divisjon: `7 % 2` er 1. Her betyr `%` ikke prosent.');
 return concepts;
}

export function questionConcepts(question: Question, group?: QuestionGroup, input?: AnswerInput | null): ConceptExplanation[] {
 const code = questionCode(question, group);
 const choices = question.fasit.type === 'valg' ? question.fasit : question.fasit.type === 'valg_og_tall' ? question.fasit.valg : null;
 const topic = question.deltema.replaceAll('_', ' ') + ' ' + (question.tema ?? '').replaceAll('_', ' ');
 const primary = [question.sporsmal, topic, group?.innledning ?? ''].join(' ');
 // Answer options provide necessary vocabulary, but cannot outrank the question.
 const secondary = [question.svar, ...question.hint ?? [], ...(choices?.alternativer ?? [])].join(' ');
 const selected = input ? [...input.choices, ...(choices?.riktige ?? [])].join(' ') : '';
 const math = CONCEPTS.filter(([,pattern]) => pattern.test(primary + ' ' + secondary))
  .map(([term,pattern,explanation], index) => ({term,explanation, score: (pattern.test(selected) ? 8 : 0) + (pattern.test(topic) ? 4 : 0) + (pattern.test(primary) ? 2 : 0), index}))
  .sort((a,b) => b.score-a.score || a.index-b.index)
  .map(({term,explanation}) => ({term,explanation}));
 const relevantMath = code ? math.filter(c => c.term !== 'Variabel og formel') : math;
 const result = [...codeConcepts(code), ...relevantMath];
 return result.filter((concept, index) => result.findIndex(c => c.term === concept.term) === index);
}
export function answerFeedback(question: Question, input: AnswerInput, group?: QuestionGroup) {
 const result = evaluateAnswer(input, question.fasit);
 if (result.correct) return null;
 if (question.fasit.type === 'flere_tall' && question.fasit.konstruksjon === 'datasett') {
  const values=input.numbers.map(parseNorwegianNumber), ordered=[...values].sort((a,b)=>a-b);
  if (question.fasit.vilkaar) {
   const rules = question.fasit.vilkaar;
   if (values.length !== rules.antall || !values.every(v => Number.isFinite(v) && v >= rules.minimum && (!rules.heltall || Number.isInteger(v)))) return `Skriv ${rules.antall} ${rules.heltall ? 'heltall' : 'tall'} som alle er minst ${rules.minimum}. Kontroller formatet og prøv igjen.`;
   const middle = Math.floor(values.length / 2);
   const median = values.length % 2 ? ordered[middle] : (ordered[middle-1]+ordered[middle])/2;
   const mean = values.reduce((a,b)=>a+b,0)/values.length;
   const format = (value: number) => new Intl.NumberFormat('nb-NO',{maximumFractionDigits:3}).format(value);
   return `Tallene dine har gjennomsnitt ${format(mean)} (${Math.abs(mean-rules.gjennomsnitt)<1e-9 ? 'riktig' : 'kravet er '+format(rules.gjennomsnitt)}) og median ${format(median)} (${median===rules.median ? 'riktig' : 'kravet er '+format(rules.median)}). Medianen finnes etter sortering; gjennomsnittet er summen delt på antall tall.`;
  }
  if (!values.every(v=>Number.isInteger(v)&&v>=0)) return 'Alle fem tall må være ikke-negative heltall. Kontroller tallene og prøv igjen.';
  return `Tallene dine har gjennomsnitt ${new Intl.NumberFormat('nb-NO',{maximumFractionDigits:3}).format(values.reduce((a,b)=>a+b,0)/5)} og median ${ordered[2]}. Kravene er gjennomsnitt 10 og median 8. Medianen finnes etter sortering; gjennomsnittet er summen delt på fem.`;
 }
 if (question.fasit.type === 'flere_tall' && question.fasit.konstruksjon === 'moteksempel') return 'Kontroller at tallene før har sum 100 og tallene etter sum 110, og at minst én av de samme observasjonene synker. En høyere sum krever ikke at begge tallene øker.';
 if (question.laeringsstotte?.feil) {
  const specific = input.choices.map(choice => question.laeringsstotte?.feilvalg?.[choice]).find(Boolean);
  return specific ?? question.laeringsstotte.feil;
 }
 const key=question.fasit.type==='valg'?question.fasit:question.fasit.type==='valg_og_tall'?question.fasit.valg:null;
 const wrong=input.choices.find(c=>!key?.riktige.includes(c));
 if (wrong && /eksponen/i.test(wrong) && key?.riktige.some(c=>/^proporsjonal$/i.test(c))) return 'Du valgte eksponentiell vekst. Sammenlikn om like store steg gir samme prosentvise endring, eller om forholdet mellom størrelsene er konstant. Begrepene forklares nedenfor.';
 if (wrong && /proporsjonal/i.test(wrong)) return 'Kontroller forskjellen mellom et konstant forhold (dele) og et konstant produkt (gange). Bruk tallene i oppgaven til å undersøke hvilket krav som er oppfylt.';
 if (questionCode(question, group)) {
  const code = questionCode(question, group);
  return /^\s*(for|while) /m.test(code)
   ? 'Følg koden i rekkefølge og noter hva variablene inneholder etter hver runde. Kontroller deretter hva som står inne i print-parentesen, og om print kjøres inne i eller etter løkken.'
   : 'Følg kodelinjene fra toppen og noter hva variablene eller listen inneholder etter hver endring. Kontroller hva print-linjen faktisk viser.';
 }
 if (wrong) return `Valget «${wrong}» passer ikke. Sammenlikn kjennetegnene i begrepsforklaringene med opplysningene i oppgaven.`;
 if (/prosent|rabatt/.test(question.tema + question.deltema)) return 'Kontroller hvilken verdi som er 100 % i denne beregningen. Ved prosentvis endring er det startverdien du deler på.';
 if (/statistikk/.test(question.tema)) return 'Kontroller at du bruker alle observasjonene som hører til beregningen, og at du har valgt riktig statistisk mål.';
 return 'Kontroller innsettingen og regningen ett steg om gangen. Bruk enheten og avrundingen som oppgaven ber om.';
}
