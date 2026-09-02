// These sequences are authored from the task data, not from a worked answer.
// Run after legacy answer masking: a number's pedagogical role cannot be
// inferred from whether the same digits also occur in the answer.
export function reviseHintScaffolding(bank, { math, number }) {
  const groups = new Map(bank.oppgavegrupper.map((group) => [group.id, group]));
  const sum = (values) => values.reduce((total, value) => total + value, 0);
  const expression = (values) => values.map((value) => number(value)).join("+");
  const differencePlans = {
    "2py27-016": ["27-18=27-20+2=7+2", "Trekk først fra 20 og legg tilbake 2, fordi du bare skulle trekke fra 18.", "d"],
    "2py27-017": ["40-34=40-30-4=10-4", "Finn først størrelsen på nedgangen. Endringen d er negativ, så sett minus foran resultatet.", "2"],
    "2py27-018": ["9-6=10-6-1=4-1", "Regn fra 6 til 10 og trekk fra det ene steget du gikk for langt.", "d"],
    "2py27-019": ["72-63=72-60-3=12-3", "Finn først størrelsen på nedgangen. Endringen d er negativ, så sett minus foran resultatet.", "-d"],
    "2py27-020": ["15-12=15-10-2=5-2", "Trekk fra 10 først, og trekk deretter fra de siste 2.", "d"],
  };

  for (const question of bank.oppgaver) {
    const input = question.kontroll?.inndata ?? {};
    const method = question.kontroll?.metode;
    const introduction = question.hint[0];
    let hints;

    if (method === "percentage_points") {
      const [calculation, explanation, divisor] = differencePlans[question.id];
      const old = number(input.gammel);
      hints = [
        introduction,
        `Finn forskjellen: ${explanation} ${math(calculation)}. Fullfør den siste regningen. Kall den ferdige endringen i prosentpoeng d.`,
        `Sett opp relativ endring: Vi sammenligner med den gamle andelen, ${math(`${old}\\,\\%`)}, ikke den nye. Brøken er derfor ${math(`\\frac{d}{${old}}`)}. Sett inn endringen du nettopp fant som d.`,
        `Forkort brøken: Del tallet over brøkstreken og tallet under brøkstreken på ${math(divisor)}: ${math(`\\frac{d\\div(${divisor})}{${old}\\div(${divisor})}`)}. ${divisor === "-d" ? "Siden d er negativ, er -d den positive størrelsen på nedgangen." : "Samme divisjon over og under brøkstreken bevarer brøkens verdi."} Regn ut de to divisjonene selv.`,
        "Gjør om til prosent: Bruk brøken du fikk. Del 100 på nevneren, og gang deretter med telleren. Behold et eventuelt minustegn. Svar i prosentpoeng i det første feltet og prosent i det andre.",
      ];
    }

    if (method === "mean") {
      const total = sum(input.verdier);
      const count = input.verdier.length;
      const firstPart = (Math.floor(total / count) - 1) * count;
      const secondPart = total - firstPart;
      hints = [
        introduction,
        `Summer observasjonene: ${math(`${expression(input.verdier)}=${number(total)}`)}. Dette er totalsummen, ikke gjennomsnittet.`,
        `Fordel summen likt: Det er ${math(number(count))} observasjoner. Regnestykket for gjennomsnittet er derfor ${math(`${number(total)}/${count}`)}.`,
        `Hjelp med divisjonen: Del opp totalsummen som ${math(`${number(total)}=${number(firstPart)}+${number(secondPart)}`)}. Del begge delene på ${count}: ${math(`${number(firstPart)}/${count}=${number(firstPart / count)}`)} og ${math(`${number(secondPart)}/${count}=${number(secondPart / count)}`)}. Legg sammen de to kvotientene selv.`,
      ];
    }

    if (method === "missing_from_mean") {
      const count = input.kjente.length + 1;
      const target = input.gjennomsnitt * count;
      const known = sum(input.kjente);
      hints = [
        introduction,
        `Finn nødvendig totalsum: Gjennomsnitt ganger antall observasjoner gir ${math(`${number(input.gjennomsnitt)}\\cdot${count}=${number(target)}`)}.`,
        `Finn summen vi allerede kjenner: ${math(`${expression(input.kjente)}=${number(known)}`)}.`,
        `Finn det som mangler: Trekk den kjente summen fra den nødvendige totalsummen, ${math(`${number(target)}-${number(known)}`)}. Du kan telle opp fra ${number(known)} til ${number(target)} i enkle hopp og legge sammen hoppene.`,
      ];
    }

    if (["slope", "table_slope", "average_rate"].includes(method)) {
      const [x1, y1] = method === "slope" ? input.p1 : method === "table_slope" ? [input.x[0], input.y[0]] : [input.x1, input.y1];
      const [x2, y2] = method === "slope" ? input.p2 : method === "table_slope" ? [input.x[1], input.y[1]] : [input.x2, input.y2];
      hints = [
        introduction,
        `Finn endringen i y: Bruk sluttverdi minus startverdi, ${math(`\\Delta y=${number(y2)}-${number(y1)}`)}. Behold minustegnet hvis verdien synker.`,
        `Finn endringen i x i samme retning: ${math(`\\Delta x=${number(x2)}-${number(x1)}=${number(x2 - x1)}`)}.`,
        `Del y-endringen på x-endringen: ${math(`\\frac{${number(y2)}-${number(y1)}}{${number(x2)}-${number(x1)}}`)}. Regn ut telleren først. Ved divisjonen kan du finne hvilket tall som, ganget med nevneren, gir telleren.`,
      ];
    }

    if (method === "d2_inverse_constant") {
      const remainder = input.T - input.fast;
      hints = [
        `Sett observasjonen inn i modellen med k som ukjent: ${math(`${number(input.T)}=k/${number(input.x)}+${number(input.fast)}`)}.`,
        `Trekk den faste tiden fra begge sider: ${math(`${number(input.T)}-${number(input.fast)}=k/${number(input.x)}`)}, altså ${math(`${number(remainder)}=k/${number(input.x)}`)}.`,
        `Gang begge sider med ${number(input.x)} for å oppheve divisjonen: ${math(`k=${number(remainder)}\\cdot${number(input.x)}`)}. Regn ut produktet selv.`,
      ];
    }

    if (method === "growth_threshold" || method === "d2_figure_threshold") {
      const figure = method === "d2_figure_threshold";
      hints = [
        figure ? "Finn fram formelen du valgte i deloppgave b. Bruk n som figurnummer; n må være et positivt heltall." : "Bruk vekstmodellen med antall perioder som eksponent. Antall hele perioder må være et ikke-negativt heltall.",
        "Lag en tabell med heltall i den første kolonnen og tilhørende modellverdier i den andre. Regn fra de tidlige verdiene og fortsett til kravet i oppgaven er oppfylt.",
        "Velg det første heltallet som oppfyller kravet. Kontroller også heltallet rett før: verdien der må ennå ikke oppfylle kravet. Bruk «minst» eller «større enn» slik det står i oppgaven.",
      ];
    }

    if (question.variantfamilie === "d2-samfunn-d") {
      const group = groups.get(question.oppgavegruppe.id);
      const category = question.sporsmal.match(/«([^»]+)»/u)[1];
      const index = group.data.kategorier.indexOf(category);
      const before = number(group.data["år_1"][index]);
      const after = number(group.data["år_2"][index]);
      hints = [
        `Kategorien «${category}» går fra ${math(before)} til ${math(after)}.`,
        `Absolutt endring er ny verdi minus gammel verdi: ${math(`${after}-${before}`)}. Regn ut forskjellen og behold fortegnet.`,
        `Relativ endring sammenligner forskjellen med den gamle verdien: ${math(`\\frac{${after}-${before}}{${before}}\\cdot100\\,\\%`)}. Regn telleren først, del på nevneren og gang med 100.`,
        "Sammenlign beregningene med påstandene. Skill også mellom det å beskrive en endring og det å bevise hva som forårsaket den.",
      ];
    }

    if (["d1-lineart-figurmonster", "d1-kvadratisk-figurmonster"].includes(question.variantfamilie)) {
      const values = question.visualisering.verdier;
      const target = question.sporsmal.match(/figur \\\((\d+)\\\)/u)?.[1];
      if (!target) throw new Error(`${question.id}: mangler etterspurt figurnummer`);
      hints = [
        introduction,
        `Test alle svaralternativene med ${math("n=1")}. Erstatt hver n med 1 og regn parenteser, potenser og deretter resten. Stryk alternativene som ikke gir ${math(number(values[0]))}.`,
        `Test de gjenværende alternativene med ${math("n=2")} og ${math("n=3")}. De må gi henholdsvis ${math(number(values[1]))} og ${math(number(values[2]))}.`,
        `Bruk formelen som passer alle de oppgitte figurene. Sett inn ${math(`n=${target}`)} i denne formelen.`,
        "Regn først inni parentesene. En andre potens betyr at tallet skal ganges med seg selv. Gjør multiplikasjonene før du legger til eller trekker fra de siste leddene.",
      ];
    }

    if (question.id === "2py27-057") {
      hints = [
        introduction,
        `Undersøk ${math("b^2/b^2")} når b ikke er null. Ved divisjon av potenser med samme grunntall trekkes eksponentene fra hverandre.`,
        `Potensregelen gir ${math("b^{2-2}=b^0")}. Brøken kan også forstås som et tall delt på det samme tallet.`,
        "Hvilket tall får du når et tall som ikke er null, deles på seg selv? De to regnemåtene må gi samme verdi. Velg alternativet som passer.",
      ];
    }
    if (question.id === "2py27-070") {
      hints = [
        introduction,
        `Skriv ${math("10^{1/2}=\\sqrt{10}")}. Sammenlign 10 med kvadratet av verdien du får fra ${math("2^2")}; kvadratroten bevarer rekkefølgen for positive tall.`,
        `Kubikkroten ${math("\\sqrt[3]{125}")} er tallet som ganget med seg selv tre ganger gir 125. Prøv heltall og sammenlign kubene med 125.`,
        "Plasser de tre verdiene på en tallinje. Velg svaralternativet som følger tallinjen fra venstre mot høyre.",
      ];
    }
    if (question.id === "2py27-443") {
      hints = [
        "Med ny grense 60 tas bare verdier som er minst 60 med. Likhet med grensen teller også.",
        "Gå gjennom den opprinnelige listen ett tall om gangen. Skriv ja eller nei ved hvert tall ut fra det nye vilkåret.",
        "Start antall på null. Legg til én for hver ja-markering, og les av antall når hele listen er gjennomgått.",
      ];
    }

    if (hints) question.hint = hints;
  }
}
