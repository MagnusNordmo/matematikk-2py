// Explicit arithmetic support for the no-calculator tasks and every route.
// Authored after legacy masking so useful intermediate values are preserved.
export function reviseHandArithmetic(bank, { math: m, number: n }) {
  const byId = new Map(bank.oppgaver.map((q) => [q.id, q]));
  const set = (id, steps) => {
    const q = byId.get(`2py27-${id}`);
    q.hint = [q.hint[0], ...steps];
    if (q.losningsveier) q.losningsveier[0].hint = [...q.hint];
  };

  set("026", [
    `Velg en enkel regnevei: Start med 100 kr. Da er 20 % lik 20 kr. Etter økningen er prisen ${m("100+20=120")} kr.`,
    `Finn rabatten av den nye prisen: 10 % er ${m("120/10=12")} kr. Doble dette for å finne 20 %: ${m("12+12=24")} kr.`,
    `Trekk rabatten fra den nye prisen: ${m("120-24=120-20-4=96")} kr.`,
    `Sammenlign med de opprinnelige 100 kronene. Sluttprisen er 96 % av startprisen. Regn ${m("96-100")} for å finne endringen i prosent; et negativt svar betyr nedgang.`,
  ]);
  set("027", [
    `Velg en enkel regnevei: Start med 100 kr. Ti prosent er 10 kr, så etter nedgangen er prisen ${m("100-10=90")} kr.`,
    `Den neste økningen regnes av 90 kr. Finn en tidel: ${m("90/10=9")} kr.`,
    `Legg økningen til den nye prisen: ${m("90+9=99")} kr.`,
    `Sammenlign med de opprinnelige 100 kronene. Sluttprisen er 99 % av startprisen. Regn ${m("99-100")} for å finne endringen i prosent; et negativt svar betyr nedgang.`,
  ]);
  for (const [id, factorText, multiplication, product, decimal] of [
    ["026", "20 % opp gir faktor 1,2, mens 20 % ned gir faktor 0,8.", "12\\cdot8=10\\cdot8+2\\cdot8=80+16=96", 96, "0{,}96"],
    ["027", "10 % ned gir faktor 0,9, mens 10 % opp gir faktor 1,1.", "9\\cdot11=9\\cdot10+9=90+9=99", 99, "0{,}99"],
  ]) {
    const q = byId.get(`2py27-${id}`);
    const route = q.losningsveier.find((r) => r.id === "vekstfaktorer");
    route.forklaring = "Øv på vekstfaktorer med forklart heltallsregning og plassering av komma.";
    route.hint = [
      q.hint[0],
      `Lag faktorene: ${factorText} Gang dem for å finne den samlede faktoren.`,
      `Regn uten komma først: ${m(multiplication)}. Produktet regnes ved å dele opp ett av heltallene.`,
      `Sett kommaet tilbake: Hver opprinnelig faktor har én desimal. Heltallene var derfor ti ganger så store hver, og produktet må deles på hundre: ${m(`${product}/100=${decimal}`)}.`,
      `Tolk faktoren: ${m(decimal)} betyr at ${product} % av startprisen er igjen. Regn ${m(`${product}-100`)} for å finne den samlede prosentendringen.`,
    ];
  }

  set("036", [
    "Lag en plan: Test påstanden med en startpris på 100 kr. Den andre økningen må regnes av prisen etter den første.",
    `Fem prosent av 100 kr er 5 kr, så første pris er ${m("100+5=105")} kr.`,
    `Finn 5 % av 105 kr ved først å finne 10 %: ${m("105/10=10{,}5")}. Halvparten er ${m("10/2+0{,}5/2=5+0{,}25=5{,}25")} kr.`,
    `Ny sluttpris finnes med ${m("105+5{,}25")}. Sammenlign den med prisen etter én økning på 10 %, ${m("100+10=110")} kr. Avgjør selv om påstanden stemmer.`,
  ]);
  for (const [id, decimal, integer, exponent] of [
    ["064", "8{,}4/2{,}1", "84/21", "7-2"],
    ["066", "9{,}6/3{,}2", "96/32", "-3-(-5)"],
  ]) set(id, [
    `Velg en enkel regnevei: Gjør nevneren til et heltall. Gang både teller og nevner med 10; brøkens verdi er uendret: ${m(`${decimal}=${integer}`)}.`,
    `Regn heltallsdivisjonen. Tell hvor mange ganger ${integer.split("/")[1]} går opp i ${integer.split("/")[0]}, for eksempel ved gjentatt addisjon. Dette gir faktoren foran tierpotensen.`,
    `Ved divisjon av tierpotenser trekkes eksponentene fra hverandre: ${m(exponent)}. Å trekke fra et negativt tall betyr å legge til det tilsvarende positive tallet.`,
    "Sett faktoren du regnet ut, foran tierpotensen med eksponenten du fant. På standardform skal faktoren være minst 1 og mindre enn 10.",
  ]);
  set("067", [
    `Velg en enkel regnevei: Å gange med 2 betyr å doble. Del ${m("4{,}5")} i en heltallsdel og en desimaldel.`,
    `Doble delene hver for seg: ${m("4\\cdot2=8")} og ${m("0{,}5\\cdot2=1")}. Legg sammen disse resultatene selv for å finne faktoren.`,
    `Ved produkt av tierpotenser legges eksponentene sammen: ${m("8+(-3)=8-3")}. Regn dette ut selv.`,
    "Sett faktoren og tierpotensen sammen. Kontroller at faktoren er minst 1 og mindre enn 10.",
  ]);
  for (const [id, unit, whole, fraction, product] of [
    ["109", "42{,}5/5=40/5+2{,}5/5=8+0{,}5=8{,}5", "8\\cdot12=8\\cdot10+8\\cdot2=80+16=96", "0{,}5\\cdot12=12/2=6", "96+6"],
    ["110", "260/8=240/8+20/8=30+2{,}5=32{,}5", "32\\cdot14=32\\cdot10+32\\cdot4=320+128=448", "0{,}5\\cdot14=14/2=7", "448+7"],
    ["112", "18/4=16/4+2/4=4+0{,}5=4{,}5", "4\\cdot15=4\\cdot10+4\\cdot5=40+20=60", "0{,}5\\cdot15=15/2=7{,}5", "60+7{,}5"],
  ]) set(id, [
    `Finn verdien for én enhet ved å dele opp totalen: ${m(unit)}.`,
    `Gang heltallsdelen med det nye antallet: ${m(whole)}.`,
    `Gang deretter den halve enheten med antallet. En halv gang et tall er halvparten av tallet: ${m(fraction)}.`,
    `Legg de to bidragene sammen: ${m(product)}. Dette gir verdien for det nye antallet enheter.`,
  ]);
  for (const [id, numerator] of [["008", 11], ["009", 13]]) {
    const q = byId.get(`2py27-${id}`);
    q.hint[q.hint.length - 1] = `Gjør brøken om til prosent uten lang multiplikasjon: ${m("100/40=10/4=2{,}5")}. Regn ${m(`${numerator}\\cdot2`)} og halvparten ${m(`${numerator}/2`)} hver for seg. Legg dem sammen; dette er ${m(`${numerator}\\cdot2{,}5`)} prosent.`;
    if (q.losningsveier) q.losningsveier[0].hint = [...q.hint];
  }
  set("145", [
    `Finn total frekvens: ${m("5+11+17+7=40")}. Den aktuelle kategorien har frekvens 17.`,
    `Én observasjon utgjør ${m("100/40=10/4=2{,}5")} %. For 17 observasjoner skal du regne ${m("17\\cdot2{,}5")}.`,
    `Del 2,5 i 2 og en halv: ${m("17\\cdot2=34")} og ${m("17/2=8{,}5")}. Legg disse bidragene sammen selv for å finne prosenten.`,
    `Kumulativ frekvens betyr at du legger sammen fra første kategori til og med den aktuelle: ${m("5+11+17")}. Dette er et antall, ikke en prosent.`,
  ]);
  const intersection = byId.get("2py27-186");
  intersection.hint[intersection.hint.length - 1] = `Del begge sider på 2,5. Fjern desimalen ved å gange teller og nevner med 2: ${m("x=150/2{,}5=300/5")}. Del så 300 på 10 og doble kvotienten for å få divisjon på 5. Sett din x-verdi inn i én av prismodellene for å finne felles pris.`;
  set("259", [
    "Velg en enkel regnevei: Del 45 % i 40 % og 5 %. Finn først en tidel av 800.",
    `Ti prosent er ${m("800/10=80")}. Fire slike deler gir 40 %: ${m("80\\cdot4=320")}.`,
    `Fem prosent er halvparten av 10 %: ${m("80/2=40")}.`,
    `Legg sammen de to prosentdelene: ${m("320+40")}. Summen er 45 % av den opprinnelige mengden.`,
  ]);
  const offer = byId.get("2py27-039");
  offer.hint[2] = `Finn 10 %: ${m("1\\,250/10=125")}. For 5 % halverer du ved å dele opp: ${m("125/2=120/2+5/2=60+2{,}5=62{,}5")}.`;

  const roundSteps = {
    "218": ["1\\,000/10=100", "1\\,000+100=1\\,100", "1\\,100/10=110", "1\\,100+110"],
    "219": ["800/2=400", "400/2=200", null, "200/2"],
    "220": ["2\\,500/5=500", "2\\,500+500=3\\,000", "3\\,000/5=600", "3\\,000+600"],
    "221": ["600/2=300", "600+300=900", "900/2=450", "900+450"],
    "222": ["1\\,200/4=300", "1\\,200-300=900", "900/4=800/4+100/4=200+25=225", "900-225"],
  };
  for (const [id, [part, first, nextPart, final]] of Object.entries(roundSteps)) {
    const q = byId.get(`2py27-${id}`);
    const { start, faktor, runder } = q.kontroll.inndata;
    const strategy = id === "222" ? "Faktor 0,75 betyr at en firedel trekkes fra i hver runde." : q.hint[1];
    q.hint = [
      q.hint[0], strategy,
      `Regn de første stegene: ${m(part)}, og deretter ${m(first)}.`,
      `Bruk den nye verdien i neste runde. ${nextPart ? `Finn først delen: ${m(nextPart)}. ` : ""}Fullfør deretter ${m(final)} selv.`,
      `Utskriften kommer etter alle ${runder} rundene. Den samme beregningen kan skrives ${m(`${n(start)}\\cdot${n(faktor)}^{${runder}}=\\square`)}. Her blir resultatet et heltall, så round endrer det ikke.`,
    ];
  }
}
