import type { Question, QuestionGroup } from './question-bank.ts';
import { evaluateAnswer, parseNorwegianNumber, type AnswerInput } from './answer-engine';

export const CONCEPTS: [string, RegExp, string][] = [
 ['Graf og koordinater', /graf|koordinat|punktdiagram/i, 'En graf viser sammenhengen mellom to størrelser. Punktet (x, y) leses med x på den vannrette aksen og y på den loddrette. Bruk aksetitler og skala for å tolke verdiene.'],
 ['Proporsjonal sammenheng', /proporsjonal|kilopris/i, 'To størrelser er proporsjonale når forholdet mellom dem er konstant: y = kx. Dobles x, dobles y. For eksempel koster 2 kg dobbelt så mye som 1 kg ved fast kilopris uten fast avgift.'],
 ['Omvendt proporsjonal', /omvendt.*proporsjonal/i, 'To størrelser er omvendt proporsjonale når produktet er konstant: x · y = k. For positive størrelser vil dobling av x halvere y. At y bare synker når x øker, er ikke nok.'],
 ['Eksponentiell endring', /eksponen|eksponential|vekstfaktor|halver|doblingstid/i, 'Ved eksponentiell endring ganges verdien med samme faktor for hver like lange periode. Det gir samme prosentvise endring, ikke samme tillegg i antall. Modellen er y = a · b^x, med startverdi a og vekstfaktor b.'],
 ['Lineær modell', /lineær|lineaer|stigningstall|konstantledd|fastbeløp|fast avgift/i, 'En lineær modell har formen y = ax + b. Verdien endres med samme beløp a når x øker med én. b er verdien når x er null. Modellen er også proporsjonal når b = 0.'],
 ['Stigningstall', /stigningstall|lineær|lineaer/i, 'Stigningstallet forteller hvor mye y endres når x øker med én. Det regnes som endring i y delt på endring i x. Et negativt stigningstall betyr at grafen synker.'],
 ['Konstantledd', /konstantledd|fastbeløp|fast avgift/i, 'Konstantleddet er verdien når x = 0. I en prismodell kan det være en fast avgift som betales uansett mengde.'],
 ['Vekstfaktor', /vekstfaktor|prosent|%/i, 'Vekstfaktoren er tallet du ganger startverdien med for å finne ny verdi. En økning på 20 % gir faktor 1,20; en nedgang på 20 % gir faktor 0,80.'],
 ['Prosent og prosentgrunnlag', /prosent|%|rabatt|mva/i, 'Prosent betyr hundredeler. Prosentgrunnlaget er helheten som regnes som 100 %. Ved prosentvis endring deler du endringen på startverdien og ganger med 100.'],
 ['Prosentpoeng', /prosentpoeng/i, 'Prosentpoeng er forskjellen mellom to prosenttall. Fra 20 % til 25 % er det 5 prosentpoeng, men økningen i forhold til 20 % er 25 %.'],
 ['Gjennomsnitt', /gjennomsnitt|sentralmål/i, 'Gjennomsnittet er summen av verdiene delt på antall verdier. For 2, 4 og 9 er gjennomsnittet (2 + 4 + 9)/3 = 5. En svært høy eller lav verdi kan påvirke det mye.'],
 ['Median', /median|sentralmål/i, 'Medianen er den midterste verdien når tallene er sortert. Ved et partall observasjoner tar du gjennomsnittet av de to midterste.'],
 ['Typetall', /typetall/i, 'Typetallet er verdien som forekommer flest ganger. Flere verdier kan dele denne plassen.'],
 ['Standardavvik', /standardavvik|spredningsmål/i, 'Standardavvik beskriver spredningen rundt gjennomsnittet og har samme enhet som dataene. Ved populasjonsstandardavvik tar man kvadratroten av gjennomsnittet av de kvadrerte avvikene fra gjennomsnittet.'],
 ['Variasjonsbredde', /variasjonsbredde|spredningsmål/i, 'Variasjonsbredden er største verdi minus minste verdi. Den beskriver avstanden mellom ytterpunktene, men ikke hvordan resten av tallene fordeler seg.'],
 ['Sentralmål og spredning', /sentralmål|spredning|homogen/i, 'Sentralmål, som gjennomsnitt og median, beskriver nivået i dataene. Spredningsmål beskriver hvor mye verdiene varierer. Homogen betyr her at verdiene er forholdsvis like.'],
 ['Frekvens', /frekvens/i, 'Frekvens er antall ganger en verdi eller kategori forekommer. Relativ frekvens er dette antallet delt på totalt antall, gjerne oppgitt i prosent.'],
 ['Kumulativ frekvens', /kumulativ/i, 'Kumulativ betyr oppsummert fram til en grense. For en enkeltverdi teller kumulativ frekvens alle observasjoner som er mindre enn eller lik verdien. For intervaller må du følge grensene i tabellen.'],
 ['Klassemidtpunkt', /klassemidt|grupperte|gruppert|intervall/i, 'Klassemidtpunktet ligger halvveis mellom grensene i et intervall. Når det representerer alle observasjonene i intervallet, blir beregnet gjennomsnitt vanligvis et anslag.'],
 ['Intervall', /intervall|\[\d/i, 'Et intervall er et område mellom to grenser. [0, 10) inneholder 0 og verdier mindre enn 10, men ikke 10. En hake betyr at grensen er med; en parentes betyr at den ikke er med.'],
 ['Histogram', /histogram|frekvenstetthet/i, 'Et histogram viser grupperte talldata. Når søylearealet skal svare til frekvensen, er høyden frekvens delt på intervallbredde. Ulike bredder gjør at høyden alene ikke viser antallet.'],
 ['Anslag og jevn fordeling', /anslag|anslå|jevn fordeling|interpol/i, 'Et anslag er en tilnærmet verdi. Jevn fordeling innenfor et intervall betyr at vi antar like mange observasjoner per like stor del av intervallet. Lineær interpolasjon bruker en rett linje mellom kjente punkter.'],
 ['Utvalg og representativitet', /utvalg|representativ|generaliser|kildekritikk/i, 'Et utvalg er de personene eller observasjonene som undersøkes. Et representativt utvalg gjenspeiler gruppen vi vil si noe om. Et skjevt utvalg kan gi et misvisende bilde selv om mange har svart. Å generalisere er å la konklusjonen gjelde en større gruppe.'],
 ['Sammenheng og årsak', /årsak|samvariasjon/i, 'At to størrelser endrer seg sammen, viser ikke alene at den ene er årsak til den andre. Andre forhold kan påvirke begge.'],
 ['Moteksempel', /moteksempel|må ha|alltid/i, 'Et moteksempel oppfyller premissene i en påstand, men viser at konklusjonen ikke alltid stemmer. Ett gyldig moteksempel er nok til å avkrefte en påstand om alle tilfeller.'],
 ['Potens', /potens|eksponent|\^/i, 'En potens består av et grunntall og en eksponent. For eksempel er 2³ = 2 · 2 · 2. For a ulik null er a⁰ = 1 og a⁻ⁿ = 1/aⁿ.'],
 ['Kvadratrot', /kvadratrot|rotuttrykk|sqrt|√/i, 'Kvadratroten av et ikke-negativt tall er det ikke-negative tallet som ganget med seg selv gir tallet. Derfor er √49 = 7.'],
 ['Standardform', /standardform|tierpotens/i, 'På standardform skrives et positivt tall som a · 10ⁿ, der 1 ≤ a < 10 og n er et heltall. For eksempel er 4500 = 4,5 · 10³.'],
 ['Variabel og formel', /variabel|formel|uttrykk|modell|figur|verdien av/i, 'En variabel er et symbol for en størrelse som kan variere, for eksempel x eller n. En formel beskriver en sammenheng. Sett inn den aktuelle verdien for variabelen når du skal beregne et bestemt tilfelle.'],
 ['Likning', /likning|ligning/i, 'En likning sier at to uttrykk er like. Å løse den betyr å finne verdier som gjør likheten sann. Du kan utføre samme regneoperasjon på begge sider når operasjonen er gyldig.'],
 ['Modell og definisjonsområde', /modell|definisjons/i, 'En matematisk modell beskriver en situasjon med tall og sammenhenger. Definisjonsområdet er verdiene variabelen kan ha. En modell passer ikke nødvendigvis utenfor området eller forutsetningene den er laget for.'],
 ['Regresjon', /regresjon/i, 'Regresjon finner en modell som passer til et sett målepunkter etter en bestemt tilpasningsmetode. Modellen trenger ikke gå gjennom hvert punkt.'],
 ['Vekstfart', /vekstfart/i, 'Gjennomsnittlig vekstfart er endring i funksjonsverdi delt på lengden av intervallet. Momentan vekstfart gjelder ett punkt og beskrives av stigningen til tangenten der.'],
 ['Tangent', /tangent/i, 'En tangent er en rett linje som følger grafens retning i et punkt. Stigningstallet til tangenten gir den momentane vekstfarten.'],
 ['Skjæringspunkt', /skjæringspunkt|skjaeringspunkt/i, 'I et skjæringspunkt har to grafer samme y-verdi ved samme x-verdi. I prismodeller betyr det at prisene er like ved denne mengden.'],
 ['Indeks', /indeks/i, 'En indeks sammenlikner verdier med et basisår, som vanligvis får indeks 100. Indeks 120 betyr 20 % høyere verdi enn i basisåret.'],
 ['Merverdiavgift', /mva|merverdiavgift/i, 'Merverdiavgift, ofte kalt mva., er en avgift som legges til prisen uten avgift. Bruk satsen som er oppgitt i oppgaven.'],
 ['Løkke og vilkår', /program|løkke|kode|range|print/i, 'En løkke gjentar instruksjoner. Et vilkår avgjør om noe skal utføres eller gjentas. print viser en verdi; len teller elementer. En variabel som oppdateres i løkken kan inneholde noe annet enn den siste utskriften.'],
 ['Sum og akkumulering', /summer|total|akkumul/i, 'En sum legger sammen verdier. Å akkumulere betyr å bygge opp en sum steg for steg. I kode legger total = total + verdi den nye verdien til det som allerede er samlet.'],
 ['Figurmønster', /figurmønster|figurmønster|figurmonster|figur /i, 'Et figurmønster bygges etter en bestemt regel. Figurnummeret n angir hvilken figur vi ser på. En generell formel må passe til konstruksjonsregelen, ikke bare noen få kjente tall.'],
 ['Søylediagram og akser', /søyle|akse|diagram/i, 'Et søylediagram sammenlikner kategorier med søyler. Aksetitlene forteller hva som måles, og skalaen viser tallverdiene. En avkuttet tallakse kan få små forskjeller til å se store ut.'],
 ['Enhet', /kron|\bkr\b|meter|minutt|timer|kg|tonn|liter/i, 'Enheten forteller hva tallet måler, for eksempel kroner, minutter eller kilo. Verdier må ha samme enhet før de sammenliknes eller legges sammen.'],
];

export function questionConcepts(question: Question, group?: QuestionGroup) {
 const text = [question.sporsmal, question.deltema, question.svar, JSON.stringify(question.fasit), group?.innledning ?? ''].join(' ');
 return CONCEPTS.filter(([,pattern]) => pattern.test(text)).map(([term,, explanation]) => ({term,explanation}));
}
export function answerFeedback(question: Question, input: AnswerInput) {
 const result = evaluateAnswer(input, question.fasit);
 if (result.correct) return question.svar;
 if (question.fasit.type === 'flere_tall' && question.fasit.konstruksjon === 'datasett') {
  const values=input.numbers.map(parseNorwegianNumber), ordered=[...values].sort((a,b)=>a-b);
  if (!values.every(v=>Number.isInteger(v)&&v>=0)) return 'Alle fem tall må være ikke-negative heltall. Kontroller tallene og prøv igjen.';
  return `Tallene dine har gjennomsnitt ${new Intl.NumberFormat('nb-NO',{maximumFractionDigits:3}).format(values.reduce((a,b)=>a+b,0)/5)} og median ${ordered[2]}. Kravene er gjennomsnitt 10 og median 8. Medianen finnes etter sortering; gjennomsnittet er summen delt på fem.`;
 }
 if (question.fasit.type === 'flere_tall' && question.fasit.konstruksjon === 'moteksempel') return 'Kontroller at tallene før har sum 100 og tallene etter sum 110, og at minst én av de samme observasjonene synker. En høyere sum krever ikke at begge tallene øker.';
 const key=question.fasit.type==='valg'?question.fasit:question.fasit.type==='valg_og_tall'?question.fasit.valg:null;
 const wrong=input.choices.find(c=>!key?.riktige.includes(c));
 if (wrong && /eksponen/i.test(wrong) && key?.riktige.some(c=>/^proporsjonal$/i.test(c))) return 'Eksponentiell vekst gir samme prosentvise økning for like store steg i x. En proporsjonal sammenheng har derimot konstant forhold y/x og formen y = kx. Undersøk forholdet mellom verdiene i denne oppgaven.';
 if (wrong && /proporsjonal/i.test(wrong)) return 'Proporsjonal betyr at forholdet y/x er konstant. Omvendt proporsjonal betyr at produktet x · y er konstant. En fast avgift i tillegg kan gjøre at ingen av disse kravene er oppfylt. Kontroller hvilket kjennetegn dataene har.';
 if (wrong) return `Valget «${wrong}» passer ikke til opplysningene. ${question.svar}`;
 return 'Minst ett tall stemmer ikke med kravene. Kontroller prosentgrunnlag, enhet og avrunding der det er relevant. Begrepsforklaringene under kan hjelpe deg; du kan også åpne løsningen og prøve på nytt.';
}
