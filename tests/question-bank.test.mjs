import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bank = JSON.parse(
  await readFile(new URL("../public/oppgaver-2027.json", import.meta.url), "utf8"),
);

test("oppgavebanken har 500 komplette og unike oppgaver", () => {
  assert.equal(bank.samling.antall, 500);
  assert.equal(bank.oppgaver.length, 500);
  assert.equal(new Set(bank.oppgaver.map((question) => question.id)).size, 500);
  assert.equal(bank.oppgavegrupper.length, 50);

  for (const question of bank.oppgaver) {
    assert.ok(question.id?.trim(), "Alle oppgaver må ha ID");
    assert.ok([1, 2].includes(question.del), `${question.id} har ugyldig del`);
    assert.equal(question.hjelpemidler, question.del === 1 ? "uten" : "med");
    assert.ok(question.sporsmal?.trim(), `${question.id} mangler spørsmål`);
    assert.ok(question.svar?.trim(), `${question.id} mangler løsning`);
    const minimumHintCount = question.del === 1 ? 3 : 2;
    assert.ok(Array.isArray(question.hint) && question.hint.length >= minimumHintCount, `${question.id} har for få hint`);
    assert.ok(question.hint.length <= (question.del === 1 ? 5 : 4), `${question.id} har for mange hint`);
    assert.ok(question.hint.every((hint) => typeof hint === "string" && hint.trim().length >= 20), `${question.id} har et kort eller tomt hint`);
    assert.ok(["tall", "flere_tall", "valg", "valg_og_tall"].includes(question.fasit?.type), `${question.id} har ugyldig svarformat`);
  }
});

test("fordelingen mellom deler og svarformater er bevart", () => {
  assert.equal(bank.oppgaver.filter((question) => question.del === 1).length, 262);
  assert.equal(bank.oppgaver.filter((question) => question.del === 2).length, 238);
  const expected = { tall: 260, flere_tall: 70, valg: 160, valg_og_tall: 10 };
  for (const [type, count] of Object.entries(expected)) {
    assert.equal(bank.oppgaver.filter((question) => question.fasit.type === type).length, count, type);
  }
});

test("alle oppgaver har et gjennomgått og tilgjengelig nivå", () => {
  assert.deepEqual(bank.nivaaer, {
    "1": "mild",
    "2": "middels",
    "3": "utfordrende",
  });

  const distribution = Object.fromEntries(
    [1, 2, 3].map((level) => [String(level), bank.oppgaver.filter((question) => question.niva === level).length]),
  );
  assert.deepEqual(distribution, { "1": 103, "2": 266, "3": 131 });
  assert.deepEqual(bank.statistikk.fordeling_niva, distribution);

  for (const question of bank.oppgaver) {
    assert.ok([1, 2, 3].includes(question.niva), `${question.id} mangler gyldig nivå`);
  }

  const partThemes = new Set(bank.oppgaver.map((question) => `${question.del}:${question.tema}`));
  for (const partTheme of partThemes) {
    const [part, theme] = partTheme.split(":");
    const questions = bank.oppgaver.filter((question) => String(question.del) === part && question.tema === theme);
    for (const level of [1, 2, 3]) {
      assert.ok(questions.some((question) => question.niva === level), `${partTheme} mangler nivå ${level}`);
    }
  }

  assert.equal(bank.oppgaver.find((question) => question.id === "2py27-010").niva, 3);
});

test("alle oppgaver med flere svarbestanddeler har tydelige feltetiketter", () => {
  const multipartQuestions = bank.oppgaver.filter((question) =>
    ["flere_tall", "valg_og_tall"].includes(question.fasit.type),
  );

  for (const question of multipartQuestions) {
    const labels = question.fasit.verdier.map((answer) => answer.etikett);
    assert.ok(
      labels.every((label) => typeof label === "string" && label.trim().length > 0),
      `${question.id} mangler en tydelig feltetikett`,
    );
    assert.equal(
      new Set(labels).size,
      labels.length,
      `${question.id} har svarfelt som ikke kan skilles fra hverandre`,
    );
  }
});

test("Del 2-case har fire sammenhengende deloppgaver", () => {
  const groupIds = new Set(bank.oppgavegrupper.map((group) => group.id));
  for (const group of bank.oppgavegrupper) {
    assert.equal(group.del, 2);
    assert.ok(group.tittel?.trim());
    assert.ok(group.innledning?.trim());
    const questions = bank.oppgaver
      .filter((question) => question.oppgavegruppe?.id === group.id)
      .sort((a, b) => a.oppgavegruppe.rekkefolge - b.oppgavegruppe.rekkefolge);
    assert.equal(questions.length, 4, group.id);
    assert.deepEqual(questions.map((question) => question.oppgavegruppe.rekkefolge), [1, 2, 3, 4]);
    assert.deepEqual(questions.map((question) => question.oppgavegruppe.deloppgave), ["a", "b", "c", "d"]);
  }
  for (const question of bank.oppgaver.filter((item) => item.oppgavegruppe)) {
    assert.ok(groupIds.has(question.oppgavegruppe.id), `${question.id} viser til ukjent case`);
  }
});

test("oppgavebanken dekker digitale representasjoner uten filinnlevering", () => {
  assert.equal(bank.oppgaver.filter((question) => question.tema === "programmering").length, 45);
  assert.ok(bank.oppgaver.some((question) => question.visualisering?.type === "figurmønster"));
  assert.ok(bank.oppgavegrupper.some((group) => group.visualisering?.type === "spredningsdiagram"));
  assert.ok(bank.oppgaver.every((question) => !/last opp|lever inn|excel-fil/i.test(question.sporsmal)));
});

test("hintforløpene er tilpasset hjelpemidlene i hver eksamensdel", () => {
  const forbiddenHints = new Set([
    "Bruk regelen som passer operasjonen.",
    "Følg regnerekkefølgen.",
    "Løs ligningen og sett x-verdien inn i én av modellene.",
    "Følg programmet linje for linje.",
    "Bruk modellen fra b.",
    "Oversett uttrykket til en beregning.",
    "Kjør den samme algoritmen med den nye inndataen eller parameteren.",
  ]);
  const numericTypes = new Set(["tall", "flere_tall", "valg_og_tall"]);

  for (const question of bank.oppgaver) {
    assert.ok(
      question.hint.every((hint) => !forbiddenHints.has(hint)),
      `${question.id} har fortsatt et hint som bare gjentar arbeidsordren`,
    );
    if (question.del === 1) {
      assert.ok(question.hint.length >= 3 && question.hint.length <= 5, `${question.id} skal ha 3–5 meningsfulle hint`);
      assert.ok(question.hint.join(" ").length >= 250, `${question.id} har for lite konkret forklaring`);
      assert.equal(new Set(question.hint).size, question.hint.length, `${question.id} gjentar et Del 1-hint`);
      assert.ok(
        question.hint.every((hint) => !/^(?:Svar på spørsmålet|Sjekk svaret|Kontroller og konkluder):/u.test(hint)),
        `${question.id} blander fasit eller kontroll inn i hintrekken`,
      );

      if (numericTypes.has(question.fasit.type)) {
        const workedSteps = question.hint.slice(1).join(" ");
        assert.match(
          workedSteps,
          /=|\\(?:approx|le|ge|cdot|frac|div)|[+*/≤≥]/u,
          `${question.id} mangler et konkret matematisk oppsett`,
        );
      }
    } else {
      assert.ok(question.hint.length >= 2 && question.hint.length <= 4, `${question.id} skal ha 2–4 korte Del 2-hint`);
      assert.ok(question.hint.join(" ").length <= 600, `${question.id} har fortsatt et for omstendelig Del 2-forløp`);
      assert.ok(
        question.hint.every((hint) => !/^(?:Hva vet vi|Velg en enkel regnevei|Svar på spørsmålet|Sjekk svaret|Kontroller og konkluder)/u.test(hint)),
        `${question.id} har beholdt rammetekst eller fasitgjentakelse i Del 2`,
      );
      assert.equal(new Set(question.hint).size, question.hint.length, `${question.id} gjentar et Del 2-hint`);
    }
  }

  const del1 = bank.oppgaver.filter((question) => question.del === 1);
  const del1HintCount = del1.reduce((total, question) => total + question.hint.length, 0);
  assert.ok(del1HintCount >= 1000, "Del 1 har for få trinn til å støtte framgangsmåten");
  assert.ok(del1HintCount <= 1150, "Del 1 har igjen fått unødvendig lange hintrekker");
});

test("fasiten holdes utenfor hintrekken og vises separat", () => {
  const groups = new Map(bank.oppgavegrupper.map((group) => [group.id, group]));
  const normalize = (text) => String(text)
    .replace(/\\,/gu, "")
    .replace(/\{,\}/gu, ".")
    .replace(/\\(?:,|;|!|quad|qquad)/gu, "")
    .replace(/\\%/gu, "%")
    .replace(/\s+/gu, "");
  const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const containsNumber = (text, value) => {
    const marker = escapeRegex(normalize(value));
    return new RegExp(`(?<![0-9])(?<![0-9]\\.)${marker}(?![0-9]|\\.[0-9])`, "u").test(normalize(text));
  };
  const choiceAliases = (choice) => [choice, ...({
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
  }[choice] ?? [])];

  const containsChoice = (text, choice) => choiceAliases(choice).some((alias) => {
    const escaped = escapeRegex(normalize(alias).toLocaleLowerCase("nb-NO"));
    return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "u")
      .test(normalize(text).toLocaleLowerCase("nb-NO"));
  });

  for (const question of bank.oppgaver) {
    const group = question.oppgavegruppe ? groups.get(question.oppgavegruppe.id) : null;
    const givenText = [
      question.sporsmal,
      question.data ? JSON.stringify(question.data) : "",
      group?.innledning,
      group?.data ? JSON.stringify(group.data) : "",
      question.visualisering ? JSON.stringify(question.visualisering) : "",
    ].filter(Boolean).join(" ");
    const collections = [
      ["hovedløsning", question.hint],
      ...(question.losningsveier ?? []).map((route) => [route.id, route.hint]),
    ];

    for (const [name, hints] of collections) {
      assert.ok(
        hints.every((hint) => !/(?:Svar på spørsmålet:|Sjekk svaret:|Derfor passer svaret|det riktige alternativet)/u.test(hint)),
        `${question.id}/${name} inneholder fasittekst eller redaksjonell plassholder`,
      );
      assert.doesNotMatch(hints.join(" "), /\\square\{,\}|□\{,\}/u, `${question.id}/${name} har en ødelagt svarrute`);

      for (const value of question.fasit.verdier?.map((answer) => answer.verdi) ?? []) {
        if (!containsNumber(givenText, value)) {
          assert.ok(
            hints.every((hint) => !containsNumber(hint, value)),
            `${question.id}/${name} viser svarverdien ${value} i hintrekken`,
          );
        }
      }

      const correctChoices = question.fasit.riktige ?? question.fasit.valg?.riktige ?? [];
      const alternatives = question.fasit.alternativer ?? question.fasit.valg?.alternativer ?? [];
      for (const hint of hints) {
        for (const choice of correctChoices.filter((choice) => !/^-?\d+(?:[.,]\d+)?$/u.test(choice))) {
          if (!containsChoice(hint, choice)) continue;
          assert.ok(
            alternatives.some((alternative) => !correctChoices.includes(alternative) && containsChoice(hint, alternative)),
            `${question.id}/${name} viser riktig alternativ alene i et hint`,
          );
        }
      }
    }
  }
});

test("hintrekken starter med oppgitte verdier og ender uten skjult fasit", () => {
  const byId = (id) => bank.oppgaver.find((question) => question.id === id);

  for (const question of bank.oppgaver) {
    assert.doesNotMatch(question.hint[0], /\\square|□/u, `${question.id} starter med et tomt svarfelt i stedet for kjente opplysninger`);
    assert.doesNotMatch(
      question.hint.join(" "),
      /\\square\d|\d\\square|□\d|\d□|\\square\{,\}|□\{,\}/u,
      `${question.id} har et ødelagt eller delvis maskert tall`,
    );
  }

  assert.match(byId("2py27-150").hint[0], /Målgjennomsnittet er .*9/u);
  assert.match(byId("2py27-193").hint[0], /840.*startverdien/u);
  assert.doesNotMatch(byId("2py27-133").hint.join(" "), /Verdien på denne plassen er .*7/u);
  assert.doesNotMatch(byId("2py27-138").hint.join(" "), /4.*er typetallet/u);
  assert.doesNotMatch(byId("2py27-386").hint.join(" "), /Verdien på denne plassen er .*140/u);
  assert.doesNotMatch(byId("2py27-462").hint.join(" "), /4n\+2/u);
  assert.doesNotMatch(byId("2py27-444").hint.join(" "), /begge.*riktige|Dermed er/u);
});

test("elevhint inneholder ikke interne redaksjonelle kommentarer", () => {
  const internalHintLanguage = /prosentstripe|prosentstripa|Vi bruker .* hele veien|Divisjonen er valgt|hoderegningsstykke|Denne testen støtter konklusjonen|Sjekk begrunnelsen, ikke bare svaralternativet|Kontroll (?:mot oppgaven|med originalopplysningene)|Med disse tallene blir det|akkurat som i oppgaven|antallet oppgaven ga|opplysningen i oppgaven/iu;

  for (const question of bank.oppgaver) {
    const hintCollections = [question.hint, ...(question.losningsveier ?? []).map((route) => route.hint)];
    for (const hint of hintCollections.flat()) {
      assert.doesNotMatch(hint, internalHintLanguage, `${question.id} har en intern kommentar i et elevhint`);
    }
  }
});

test("regneoppgavene viser smarte hoderegningsveier når tallene inviterer til det", () => {
  const byId = (id) => bank.oppgaver.find((question) => question.id === id);
  const strategies = bank.oppgaver
    .filter((question) => question.del === 1)
    .flatMap((question) => question.hint)
    .filter((hint) => /^(?:Velg en enkel regnevei|Hjelp med divisjonen|Forkort brøken|Del y-endringen|Finn det som mangler):/u.test(hint));
  // The repaired figure tasks now test alternatives instead of front-loading
  // the correct formula as a so-called mental-arithmetic strategy.
  assert.ok(strategies.length >= 100, "For få Del 1-oppgaver har fått et eget strategihint der dette trengs");
  assert.ok(new Set(strategies).size >= 100, "Strategihintene er for generiske eller gjentatte");
  assert.ok(strategies.every((hint) => hint.length >= 60), "Et strategihint er for kort til å hjelpe");
  assert.doesNotMatch(strategies.join(" "), /--|\+-|skal (?:legg|halver)\b/u, "Et strategihint har uklar matematikk eller språk");

  const quarterQuestion = byId("2py27-002");
  assert.match(quarterQuestion.hint.join(" "), /Dette kan gjøres i hodet/u);
  assert.match(quarterQuestion.hint.join(" "), /25 % er en firedel/u);
  assert.match(quarterQuestion.hint.join(" "), /360\/2=180/u);
  assert.match(quarterQuestion.hint.join(" "), /180\/2=\\square/u);
  assert.doesNotMatch(quarterQuestion.hint.join(" "), /90/u);
  assert.doesNotMatch(quarterQuestion.svar, /0\{,\}25/u);

  assert.match(byId("2py27-001").hint.join(" "), /Ti prosent er én tidel/u);
  assert.match(byId("2py27-004").hint.join(" "), /25 % er (?:det samme som )?en firedel/u);
  assert.match(byId("2py27-004").hint.join(" "), /160\/2=80.*80\/2=\\square/u);
  const offerHints = byId("2py27-040").hint.join(" ");
  assert.match(offerHints, /680\/2=340/u, "2py27-040 viser ikke første halvering");
  assert.match(offerHints, /340\/2=\\square/u, "2py27-040 støtter ikke den andre halveringen");
  assert.doesNotMatch(offerHints, /170|kroneavslaget størst/u, "2py27-040 røper svaret i hintrekken");
  assert.match(byId("2py27-103").hint.join(" "), /74=72\+2.*74\/4=18\+0\{,\}5=\\square/u);
  assert.match(byId("2py27-128").hint.join(" "), /4\+6\+7\+8\+10=35.*35\/5.*35=30\+5.*30\/5=6.*5\/5=1/u);
  assert.match(byId("2py27-213").hint.join(" "), /20\+12=\\square/u);
  assert.match(byId("2py27-043").hint.join(" "), /\(-3\)\^2=9/u);
  assert.match(byId("2py27-243").hint.join(" "), /\(21\+1\)\/2=11/u);
});

test("Del 1 viser alle avgjørende operasjoner for en nybegynner", () => {
  const byId = (id) => bank.oppgaver.find((question) => question.id === id);
  const numericTypes = new Set(["tall", "flere_tall", "valg_og_tall"]);
  const numericDel1 = bank.oppgaver.filter((question) =>
    question.del === 1 && numericTypes.has(question.fasit.type));

  const shortenedFractions = numericDel1.filter((question) => /tallet over brøkstreken/u.test(question.hint.join(" ")));
  assert.ok(shortenedFractions.length >= 9);
  for (const question of shortenedFractions) {
    const hints = question.hint.join(" ");
    assert.match(hints, /tallet over brøkstreken/u, `${question.id} forklarer ikke telleren`);
    assert.match(hints, /tallet under brøkstreken/u, `${question.id} forklarer ikke nevneren`);
    assert.match(hints, /\\div/u, `${question.id} viser ikke divisjonen over og under brøkstreken`);
  }

  const percentExample = byId("2py27-008").hint.join(" ");
  assert.match(percentExample, /66\\div6/u);
  assert.match(percentExample, /240\\div6/u);
  assert.match(percentExample, /11.*40/u);

  for (const question of numericDel1.filter((item) => item.variantfamilie === "d1-veid-gjennomsnitt")) {
    assert.match(question.hint.join(" "), /Multipliser hver verdi med frekvensen/u, question.id);
    assert.match(question.hint.join(" "), /\\cdot.*=/u, question.id);
  }
  for (const question of numericDel1.filter((item) => item.variantfamilie === "d1-grafavlesning")) {
    assert.match(question.hint.join(" "), /Erstatt.*x.*linjens uttrykk/u, question.id);
    assert.match(question.hint.join(" "), /Legg (?:så )?til konstantleddet/u, question.id);
  }
  for (const question of numericDel1.filter((item) =>
    ["d1-konstantledd", "d1-lineaert-skjaeringspunkt"].includes(item.variantfamilie))) {
    assert.match(question.hint.join(" "), /fra begge sider/u, question.id);
  }

  const cumulativeMedian = numericDel1.filter((item) => item.variantfamilie === "d1-kumulativ-median");
  assert.match(byId("2py27-245").hint.join(" "), /to midtposisjonene.*15.*16/u);
  for (const question of cumulativeMedian) {
    assert.doesNotMatch(question.hint.join(" "), /21\/2=11|35\/2=18|45\/2=23/u, question.id);
  }

  for (const question of numericDel1.filter((item) => item.variantfamilie === "d1-kode-vekst")) {
    const visible = question.hint.join(" ");
    assert.match(visible, /\^\{\d+\}=/u, question.id);
    assert.doesNotMatch(visible, /\^\{[^}]*=/u, question.id);
  }

  assert.doesNotMatch(
    numericDel1.flatMap((question) => question.hint).join(" "),
    /Bruk oppgavens tall og utfør regnestykket/u,
  );
});

test("ligningshint forklarer mellomresultater og desimaldivisjon i riktig rekkefølge", () => {
  const byId = (id) => bank.oppgaver.find((question) => question.id === id);

  for (const id of ["2py27-078", "2py27-079", "2py27-080", "2py27-081", "2py27-082"]) {
    const question = byId(id);
    const subtractionIndex = question.hint.findIndex((hint) => hint.startsWith("Gjør første del:"));
    const strategyIndex = question.hint.findIndex((hint) => hint.startsWith("Velg en enkel regnevei:"));
    assert.ok(subtractionIndex >= 0, `${id} mangler steget der fastleddet trekkes fra`);
    assert.ok(strategyIndex > subtractionIndex, `${id} bruker et mellomresultat før det er forklart`);
  }

  for (const id of ["2py27-078", "2py27-080", "2py27-082"]) {
    const strategy = byId(id).hint.find((hint) => hint.startsWith("Velg en enkel regnevei:"));
    assert.match(strategy, /tallet over og tallet under brøkstreken/u, `${id} forklarer ikke hvilke tall som endres`);
    assert.match(strategy, /Brøkens verdi endres ikke når begge ganges med det samme tallet/u, `${id} forklarer ikke hvorfor omformingen er gyldig`);
    assert.match(strategy, /siden .*\\cdot/u, `${id} mangler en kontroll av den siste divisjonen`);
  }

  assert.match(byId("2py27-082").hint[0], /36.*0\{,\}8.*dager.*100/u);
});

test("formelhint bruker de samme tallene som de nivåjusterte oppgavene", () => {
  const byId = (id) => bank.oppgaver.find((question) => question.id === id);
  const expected = {
    "2py27-073": [/K=100\+5x/u, /5\\cdot20=100/u, /100\+100=\\square/u],
    "2py27-074": [/s=vt/u, /4\\cdot3=\\square/u],
    "2py27-075": [/A=lb/u, /5\\cdot4=\\square/u],
    "2py27-076": [/F=1\{,\}8C\+32/u, /1\{,\}8\\cdot10=18/u, /18\+32=\\square/u],
    "2py27-077": [/D=0\{,\}05m\+1/u, /0\{,\}05\\cdot20=1/u, /1\+1=\\square/u],
  };

  for (const [id, patterns] of Object.entries(expected)) {
    const visible = [byId(id).sporsmal, ...byId(id).hint].join(" ");
    for (const pattern of patterns) assert.match(visible, pattern, `${id} har et hint fra en eldre oppgavevariant`);
  }

  assert.doesNotMatch(
    Object.keys(expected).flatMap((id) => byId(id).hint).join(" "),
    /3\{,\}8\\cdot75|0\{,\}5\\cdot12|0\{,\}04\\cdot70/u,
  );
});

test("prosentpoenghint forklarer subtraksjon og forkorting uten å hoppe til ferdig brøk", () => {
  const byId = (id) => bank.oppgaver.find((question) => question.id === id);

  for (const id of ["2py27-016", "2py27-017", "2py27-018", "2py27-019", "2py27-020"]) {
    const question = byId(id);
    const differenceIndex = question.hint.findIndex((hint) => hint.startsWith("Finn forskjellen:"));
    const strategyIndex = question.hint.findIndex((hint) => hint.startsWith("Forkort brøken:"));
    assert.equal(differenceIndex, 1);
    assert.ok(strategyIndex > differenceIndex, `${id} bruker prosentpoengsdifferansen før den er regnet ut`);
    assert.match(question.hint[differenceIndex], /=.*=/u, `${id} mangler hjelp med selve subtraksjonen`);
    assert.match(question.hint[2], /Sett inn endringen.*d/u);
    assert.ok(question.hint[2].includes(`\\frac{d}{${question.kontroll.inndata.gammel}}`));
    assert.match(question.hint[strategyIndex], /\\frac\{d\\div.*\}\{\d+\\div/u);
    assert.match(question.hint.at(-1), /Del 100 på nevneren.*gang.*telleren/u);
    assert.doesNotMatch(question.hint.join(" "), /\\square|□|Den forkortede brøken er|\\frac\{1\}\{2\}/u);
    assert.equal(
      question.hint.filter((hint) => /tallet over.*tallet under brøkstreken/u.test(hint)).length,
      1,
      `${id} gjentar samme forkorting`,
    );
  }
});

test("hver hovedløsning i Del 1 holder fast ved én tydelig metode", () => {
  const del1 = bank.oppgaver.filter((question) => question.del === 1);
  const byId = (id) => bank.oppgaver.find((question) => question.id === id);

  for (const question of del1) {
    assert.match(question.hint[0], /^Hva vet vi\?/u, `${question.id} starter ikke med kjente opplysninger`);
    assert.doesNotMatch(
      question.hint[0],
      /Marker verdiene|Finn nøkkelopplysningene|Skriv opp de gitte størrelsene/u,
      `${question.id} starter fortsatt med en generell arbeidsordre`,
    );
    assert.ok(question.hint.every((hint) => !hint.includes(question.svar)), `${question.id} gjentar fasiten i hintrekken`);
  }

  for (const question of del1.filter((item) => item.variantfamilie === "d1-omvendt-prosent")) {
    const hints = question.hint.join(" ");
    assert.match(hints, /Del prosenten etter endringen i .* like deler/u, question.id);
    assert.match(hints, /like delene er til sammen/u, question.id);
    assert.match(hints, /Derfor deler vi/u, question.id);
    assert.doesNotMatch(hints, /vekstfaktor|Lag ligningen|\bx\b/u, `${question.id} skifter metode underveis`);
  }

  const annualPass = byId("2py27-031").hint.join(" ");
  assert.match(annualPass, /95\/19=5/u);
  assert.match(annualPass, /760\/19=40/u);
  assert.match(annualPass, /40\\cdot20=\\square/u);

  for (const id of ["2py27-033", "2py27-035", "2py27-036", "2py27-037", "2py27-098", "2py27-123", "2py27-124", "2py27-125", "2py27-126", "2py27-127", "2py27-211", "2py27-253", "2py27-255"]) {
    assert.match(byId(id).hint.join(" "), /=/u, `${id} viser ikke den avgjørende testen før svaret`);
  }
});

test("prosentøvingen lar eleven sammenligne naturlige løsningsveier", () => {
  const percentQuestions = bank.oppgaver.filter((question) => question.del === 1 && question.tema === "prosent");
  const withPaths = percentQuestions.filter((question) => question.losningsveier);
  const byId = (id) => bank.oppgaver.find((question) => question.id === id);

  assert.equal(bank.samling.versjon, "2027.20");
  assert.equal(percentQuestions.length, 42);
  assert.equal(withPaths.length, 7);
  assert.deepEqual(
    withPaths.map((question) => question.id),
    ["2py27-002", "2py27-009", "2py27-010", "2py27-012", "2py27-026", "2py27-027", "2py27-038"],
  );

  for (const question of withPaths) {
    assert.equal(question.losningsveier.length, 2, `${question.id} skal ha to oversiktlige metodevalg`);
    assert.equal(new Set(question.losningsveier.map((path) => path.id)).size, 2, `${question.id} har like metode-ID-er`);
    assert.ok(question.losningsveier.every((path) => path.navn.length >= 8), `${question.id} har et uklart metodenavn`);
    assert.ok(question.losningsveier.every((path) => path.forklaring.length >= 25), `${question.id} forklarer ikke når metoden passer`);
    for (const path of question.losningsveier) {
      assert.ok(path.hint.length >= 3 && path.hint.length <= 5, `${question.id}/${path.id} skal ha 3–5 løsningssteg`);
      assert.match(path.hint[0], /^Hva vet vi\?/u, `${question.id}/${path.id} starter ikke med forståelse`);
      assert.ok(path.hint.every((hint) => !/Svar på spørsmålet:|Sjekk svaret:/u.test(hint)), `${question.id}/${path.id} inneholder fasittekst`);
    }
    assert.notDeepEqual(
      question.losningsveier[0].hint,
      question.losningsveier[1].hint,
      `${question.id} viser samme løsning to ganger`,
    );
  }

  assert.deepEqual(byId("2py27-002").losningsveier.map((path) => path.navn), [
    "Kjent brøk: en firedel",
    "10 % + 10 % + 5 %",
  ]);
  assert.deepEqual(byId("2py27-026").losningsveier.map((path) => path.navn), [
    "Start med 100",
    "Bruk vekstfaktorer",
  ]);
  assert.equal(byId("2py27-031").losningsveier, undefined, "95 %-oppgaven skal ikke få et kunstig metodevalg");

  for (const id of ["2py27-001", "2py27-003", "2py27-004", "2py27-005", "2py27-006", "2py27-007", "2py27-008", "2py27-011", "2py27-013", "2py27-014", "2py27-015", "2py27-028", "2py27-029", "2py27-030", "2py27-032", "2py27-039", "2py27-040", "2py27-041", "2py27-042"]) {
    assert.equal(byId(id).losningsveier, undefined, `${id} skal bruke den ene naturlige hovedveien uten metodevalg`);
  }

  for (const question of percentQuestions.filter((item) =>
    ["d1-prosentpoeng", "d1-vekstfaktor", "d1-prosent-pastand"].includes(item.variantfamilie))) {
    assert.equal(question.losningsveier, undefined, `${question.id} har fått et kunstig metodevalg`);
  }
});

test("hintene har korrekt mål, avrunding og matematikkvisning", () => {
  const byId = (id) => bank.oppgaver.find((question) => question.id === id);

  for (const id of ["2py27-021", "2py27-023", "2py27-025"]) {
    const question = byId(id);
    assert.match(question.svar, /^Vekstfaktoren er/u, `${id} svarer ikke på det oppgaven spør om`);
    assert.doesNotMatch(question.svar, /prosentvise endringen/u, `${id} svarer fortsatt med prosentendring`);
  }

  assert.match(byId("2py27-099").hint.join(" "), /ulike|sammenlign/u);
  assert.doesNotMatch(byId("2py27-099").hint.at(-1), /Venstre og høyre side skal bli like/u);

  for (const id of ["2py27-198", "2py27-199", "2py27-200", "2py27-201", "2py27-202"]) {
    assert.match(byId(id).hint.join(" "), /tidsintervallet|verdiendringen/u);
    assert.doesNotMatch(byId(id).hint.join(" "), /samlet frekvens|sortering/u);
  }

  const roundedQuestion = byId("2py27-481");
  assert.equal(roundedQuestion.fasit.verdier[0].verdi, 6.3);
  assert.equal(roundedQuestion.kontroll.resultat[0], 6.3);
  assert.match(roundedQuestion.svar, /6\{,\}3/);
  assert.doesNotMatch(roundedQuestion.svar, /6\{,\}2/);

  for (const question of bank.oppgaver) {
    const hintCollections = [question.hint, ...(question.losningsveier ?? []).map((path) => path.hint)];
    for (const [collectionIndex, hints] of hintCollections.entries()) {
      for (const [index, hint] of hints.entries()) {
        const outsideMath = hint.replace(/\\\(.*?\\\)/gu, "");
        assert.doesNotMatch(
          outsideMath,
          /\{,\}|\\(?:cdot|frac|div|sqrt)|\^/u,
          `${question.id} løsningsvei ${collectionIndex + 1}, hint ${index + 1} har matematikkkode utenfor matematikkmarkører`,
        );
      }
    }
  }
});

test("synlige tall har fornuftige desimaler uten flyttallsstøy", () => {
  const decimalPattern = /-?\d+(?:\{,\}|[.,])\d{5,}/gu;
  const normalizeToken = (token) => {
    const separator = token.includes("{,}") ? "{,}" : token.includes(",") ? "," : ".";
    const numeric = Number(token.replace("{,}", ".").replace(",", "."));
    const normalized = Number(numeric.toPrecision(12)).toLocaleString("en-US", {
      useGrouping: false,
      maximumSignificantDigits: 12,
      maximumFractionDigits: 20,
    });
    return normalized.includes(".") ? normalized.replace(".", separator) : normalized;
  };
  const visit = (value, path) => {
    if (typeof value === "number") {
      assert.equal(value, Number(value.toPrecision(12)), `${path} inneholder unødvendig flyttallsstøy`);
      return;
    }
    if (typeof value === "string") {
      for (const match of value.matchAll(decimalPattern)) {
        assert.equal(match[0], normalizeToken(match[0]), `${path} har et urimelig desimaltall: ${match[0]}`);
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((child, index) => visit(child, `${path}[${index}]`));
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) visit(child, `${path}.${key}`);
    }
  };

  visit(bank.oppgaver, "oppgaver");
  const factorQuestion = bank.oppgaver.find((question) => question.id === "2py27-022");
  assert.match(factorQuestion.hint.join(" "), /0\{,\}82/);
  assert.match(factorQuestion.hint.join(" "), /-0\{,\}18/);
  assert.doesNotMatch(factorQuestion.hint.join(" "), /000000000|999999999/);
});

test("Del 1 er konstruert for håndregning uten kalkulator", () => {
  const del1 = bank.oppgaver.filter((question) => question.del === 1);
  const visibleText = (question) => JSON.stringify({
    sporsmal: question.sporsmal,
    hint: question.hint,
    svar: question.svar,
    fasit: question.fasit,
  });

  for (const question of del1) {
    const text = visibleText(question);
    assert.doesNotMatch(text, /\\\\approx|≈|digitalt verktøy|logaritm/iu, `${question.id} krever tilnærming eller digital metode`);
    assert.doesNotMatch(text, /-?\d+\{,\}\d*0(?!\d)/u, `${question.id} viser en meningsløs desimalnull`);
    assert.doesNotMatch(text, /-?\d+\.\d*0(?!\d)/u, `${question.id} viser en meningsløs desimalnull`);
  }

  for (const question of del1.filter((item) => item.variantfamilie === "d1-omvendt-prosent")) {
    const { ny, endring } = question.kontroll.inndata;
    const original = question.kontroll.resultat[0];
    assert.ok(Number.isInteger(original), `${question.id} har ikke en hel opprinnelig verdi`);
    assert.equal(original * (1 + endring / 100), ny, `${question.id} har ikke en eksakt prosentkontroll`);
  }

  for (const question of del1.filter((item) => item.variantfamilie === "d1-kode-vekst")) {
    const { start, faktor, runder } = question.kontroll.inndata;
    const result = start * faktor ** runder;
    assert.ok(runder <= 3, `${question.id} krever for mange gjentatte multiplikasjoner`);
    assert.ok(Math.abs(result - Math.round(result)) < 1e-9, `${question.id} ender i tung desimalregning`);
    assert.equal(Math.round(result), question.kontroll.resultat[0]);
    assert.equal(question.data.programkode, question.visualisering.kode);
  }

  for (const question of del1.filter((item) => item.variantfamilie === "d1-kode-terskel")) {
    const { start, faktor, grense } = question.kontroll.inndata;
    let value = start;
    let rounds = 0;
    const shouldContinue = () => faktor > 1 ? value < grense : value > grense;
    while (shouldContinue() && rounds < 10) {
      value *= faktor;
      rounds += 1;
      assert.ok(Number.isInteger(value), `${question.id} får en tung mellomverdi`);
    }
    assert.ok(rounds <= 4, `${question.id} krever for lang sporing`);
    assert.equal(rounds, question.kontroll.resultat[0]);
    assert.equal(question.data.programkode, question.visualisering.kode);
  }

  assert.match(bank.oppgaver.find((question) => question.id === "2py27-031").sporsmal, /760/);
  assert.doesNotMatch(bank.oppgaver.find((question) => question.id === "2py27-070").svar, /3\{,\}16|\\\\approx/);
  assert.equal(bank.oppgaver.find((question) => question.id === "2py27-091").fasit.valg.riktige[0], "\\(n+5\\)");
});

test("anvendte oppgaver bruker eksamensnært språk og forklarte størrelser", () => {
  const forbiddenTemplateLanguage = /\bEn verdi\b|\bEn størrelse\b|bestemt gruppe|tidsenheter|per x-enhet|kategoriene A-D|kategori 1-4|tegnes direkte i HTML|laget for å trene/iu;

  for (const question of bank.oppgaver) {
    const visibleText = [question.sporsmal, question.svar, ...question.hint].join(" ");
    assert.doesNotMatch(visibleText, forbiddenTemplateLanguage, `${question.id} har abstrakt eller intern maltekst`);
  }
  for (const group of bank.oppgavegrupper) {
    assert.doesNotMatch(group.innledning, forbiddenTemplateLanguage, `${group.id} har abstrakt eller intern maltekst`);
  }

  assert.equal(bank.samling.versjon, "2027.20");
  assert.match(bank.oppgaver.find((question) => question.id === "2py27-026").sporsmal, /sykkel/);
  assert.match(bank.oppgaver.find((question) => question.id === "2py27-031").sporsmal, /årskort/);
  assert.match(bank.oppgaver.find((question) => question.id === "2py27-187").sporsmal, /vaskeritjenester/);
  assert.match(bank.oppgavegrupper.find((group) => group.id === "d2-figur-01").innledning, /benker/);
  assert.equal(bank.oppgaver.find((question) => question.id === "2py27-306").fasit.verdier[0].verdi, 4328);
});

test("oppgavebanken har ikke overflødige personvernmerknader om øvingsdata", () => {
  const unnecessaryDataDisclaimer = /personvern|personopplys|faktiske persondata|generisk(?:e)? data|syntetisk(?:e)? data|fiktiv(?:e)? data|anonymisert/iu;

  assert.ok(
    bank.oppgavegrupper.every((group) => !("dataopprinnelse" in group)),
    "En oppgavegruppe har fortsatt dataopprinnelse som elevtekst",
  );
  assert.doesNotMatch(JSON.stringify(bank), unnecessaryDataDisclaimer);
});

test("standardformoppgaven viser samme tall som fasiten", () => {
  const question = bank.oppgaver.find((item) => item.id === "2py27-062");
  assert.match(question.sporsmal, /0\{,\}000000605/);
  assert.equal(question.fasit.riktige[0], "\\(6{,}05\\cdot10^{-7}\\)");
  assert.match(question.svar, /0\{,\}000000605=6\{,\}05/);
});
