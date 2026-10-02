"use client";

type Reminder = {
  id: string;
  title: string;
  short: string;
  source: string;
  example: string;
  steps: string[];
  answer: string;
  remember: string;
  variant?: { explanation: string; calculation: string };
};

const reminders: Reminder[] = [
  {
    id: "estimate",
    title: "«Omtrent»: finn en enkel regnevei",
    short: "Står det «omtrent»? Finn et fornuftig anslag. Se om du kan gjøre regningen enklere, og vis hvordan du tenker.",
    source: "Våren 2020 · Del 1 · Oppgave 4",
    example: "45 tonn hengelåser ble fjernet fra en bro. Anta at hver lås veide 50 gram i gjennomsnitt. Omtrent hvor mange låser var det? Skriv svaret på standardform.",
    steps: [
      "Begynn med ett kilo. To låser veier 50 + 50 = 100 gram.",
      "Ti slike par veier 1000 gram. Det blir 20 låser på ett kilo.",
      "Ett tonn er 1000 kilo. Derfor er 45 tonn = 45 000 kilo.",
      "45 000 · 20 er det samme som 45 000 · 2 · 10. Det blir 90 000 · 10 = 900 000 låser.",
      "900 000 = 9 · 10⁵. Det er svaret på standardform.",
    ],
    answer: "Det var omtrent 900 000 hengelåser, altså 9 · 10⁵ låser.",
    remember: "Svaret er omtrentlig fordi vi antar at hver lås veier 50 gram. Tallene i denne oppgaven er allerede fine å regne med.",
    variant: {
      explanation: "Her endrer vi tallene for å øve på avrunding før regningen. Dette er en egen øvingsvariant: 44,8 tonn låser, med antatt gjennomsnittsvekt på 49 gram.",
      calculation: "Bruk omtrent 45 tonn og 50 gram i et grovt overslag. Da kan du følge regneveien over og få omtrent 900 000 låser. Skriv hvilke tall du har rundet til.",
    },
  },
  {
    id: "ten-percent",
    title: "20 %? Ta veien om 10 %",
    short: "20 % er to porsjoner med 10 %. Finn én porsjon først.",
    source: "2026 · Del 1 · Oppgave 1",
    example: "En bonde leverer 5200 egg. 20 % av eggene er brune. Hvor mange egg er brune?",
    steps: ["Tenk at du deler de 5200 eggene i ti like store grupper.", "Hver gruppe har 5200 : 10 = 520 egg. Det er 10 %.", "20 % er to grupper: 520 + 520 = 1040 egg."],
    answer: "1040 egg er brune.",
    remember: "30 % er tre slike grupper. 5 % er halvparten av én gruppe.",
  },
  {
    id: "whole-from-part",
    title: "Kjenner du en del? Finn hele",
    short: "Vet du hva 30 % er? Del i tre for å finne 10 %. Da er veien kort til 100 %.",
    source: "Høsten 2024 · Del 1 · Oppgave 1",
    example: "En butikk satte opp prisen med 12 kroner. Dette tilsvarte 30 %. Hva kostet varen før prisøkningen?",
    steps: ["30 % er 12 kroner. Vi vil først finne 10 %.", "Del i tre: 12 : 3 = 4. Altså: 10 % er 4 kroner.", "Hele prisen er ti slike tideler: 10 · 4 = 40 kroner.", "Sjekk: 10 % av 40 er 4. Tre ganger 4 er 12. Det stemmer med prisøkningen."],
    answer: "Varen kostet 40 kroner før prisøkningen.",
    remember: "Det er den gamle prisen som er 100 %. Vi har funnet prisen før økningen.",
  },
  {
    id: "not-participating",
    title: "Se etter ordet «ikke»",
    short: "Handler antallet om dem som ikke deltar? Finn prosenten som ikke deltar først.",
    source: "Våren 2025 · Del 1 · Oppgave 1",
    example: "88 % av elevene deltar i en undersøkelse. Tre elever deltar ikke. Hvor mange elever er det i klassen?",
    steps: ["Hele klassen er 100 %. De som ikke deltar, er 100 % − 88 % = 12 %.", "Disse 12 prosentene er tre elever. Del på tre for å finne andelen til én elev: 12 % : 3 = 4 %.", "Én elev er altså 4 % av klassen. Hvor mange firere trenger vi for å komme til 100?", "100 : 4 = 25. Det er 25 elever i klassen."],
    answer: "Det er 25 elever i klassen. De tre som ikke deltar, utgjør 12 %.",
    remember: "De tre elevene er resten av klassen. Derfor må du først finne 100 % − 88 %.",
  },
  {
    id: "start-at-hundred",
    title: "Ingen startpris? Prøv med 100 kroner",
    short: "Skal du undersøke prosentendringer, og startprisen ikke er oppgitt? Prøv med 100 kroner.",
    source: "2026 · Del 1 · Oppgave 4",
    example: "En pris settes først ned med 20 %, så opp med 20 %. Er prisen nå høyere, lavere eller den samme? Begrunn svaret.",
    steps: ["Start med 100 kroner. 20 % av 100 er 20 kroner.", "Etter nedgangen: 100 − 20 = 80 kroner.", "Nå skal du legge til 20 % av 80 kroner. 10 % er 8, så 20 % er 8 + 8 = 16 kroner.", "Etter økningen: 80 + 16 = 96 kroner."],
    answer: "Prisen blir lavere enn før. Med en startpris på 100 kroner ender den på 96 kroner. Den andre prosenten regnes av den nye, lavere prisen.",
    remember: "Du bruker et nytt beløp når du regner prosent for andre gang.",
  },
  {
    id: "percentage-points",
    title: "Prosentpoeng: trekk fra",
    short: "Spør oppgaven om prosentpoeng? Trekk de to prosenttallene fra hverandre.",
    source: "2026 · Del 1 · Oppgave 6a",
    example: "Renten går fra 6 % til 5,46 %. Hvor mange prosentpoeng er renten satt ned med?",
    steps: ["Skriv 6 som 6,00. Da har tallene like mange desimaler.", "Trekk fra: 6,00 − 5,46 = 0,54.", "Oppgaven spør om prosentpoeng. Sett dette ordet etter tallet."],
    answer: "Renten er satt ned med 0,54 prosentpoeng.",
    remember: "Dette kortet handler om forskjellen mellom de to prosenttallene. Prosentvis nedgang får et eget kort.",
  },
  {
    id: "percentage-change",
    title: "Prosent: sammenlikn med det gamle",
    short: "Prosentvis nedgang forteller hvor stor del av den gamle verdien som har forsvunnet.",
    source: "2026 · Del 1 · Oppgave 6b",
    example: "Renten går fra 6 % til 5,46 %. Hvor mange prosent er renten satt ned med?",
    steps: ["Finn nedgangen: 6,00 − 5,46 = 0,54 prosentpoeng.", "Vi sammenlikner nedgangen med den gamle renten, 6 %.", "1 % av den gamle renten er 6 : 100 = 0,06 prosentpoeng.", "Hvor mange slike deler blir 0,54? Tenk 54 : 6 = 9. Derfor er 0,54 = 9 · 0,06.", "Nedgangen er ni slike deler. Det betyr en nedgang på 9 %."],
    answer: "Renten er satt ned med 9 % sammenliknet med den gamle renten.",
    remember: "0,54 prosentpoeng og 9 % beskriver den samme nedgangen på to forskjellige måter. Les hvilket ord oppgaven bruker.",
  },
  {
    id: "quarter-kilo",
    title: "250 gram? Tenk en fjerdedel",
    short: "Fire porsjoner på 250 gram blir ett kilo. Derfor koster én porsjon en fjerdedel av kiloprisen.",
    source: "2026 · Del 1 · Oppgave 11",
    example: "Kyllingfilet koster 120 kroner per kilo. Hva koster 250 gram når pris og vekt er proporsjonale? Her betyr det at kiloprisen er den samme.",
    steps: ["Ett kilo er 1000 gram: 250 + 250 + 250 + 250 = 1000 gram.", "Tenk at du deler ett kilo i fire like pakker. De fire pakkene koster 120 kroner til sammen.", "Finn halvparten av 120: 60 kroner.", "Finn halvparten av 60: 30 kroner. Det er en fjerdedel av 120."],
    answer: "250 gram kyllingfilet skulle kostet 30 kroner.",
    remember: "Å finne halvparten to ganger er det samme som å dele på fire.",
  },
  {
    id: "one-and-four-tenths",
    title: "1,4 kilo? Del mengden i biter",
    short: "1,4 kilo er ett helt kilo og fire porsjoner på 100 gram. Regn prisen for hver del.",
    source: "2026 · Del 1 · Oppgave 11",
    example: "Kyllingfilet koster 120 kroner per kilo. Hva koster 1,4 kilo når kiloprisen er den samme?",
    steps: ["Ett helt kilo koster 120 kroner.", "100 gram er en tidel av ett kilo. Prisen er 120 : 10 = 12 kroner.", "Fire porsjoner på 100 gram koster 4 · 12 = 48 kroner.", "Legg sammen delene: 120 + 48 = 168 kroner."],
    answer: "1,4 kilo kyllingfilet skulle kostet 168 kroner.",
    remember: "Når et desimaltall ser vanskelig ut, kan du dele det i ett helt tall og en mindre del.",
  },
  {
    id: "median",
    title: "Median: stryk ett tall fra hver ende",
    short: "Sorter tallene. Stryk så det minste og det største, ett par om gangen. Til slutt finner du midten.",
    source: "Våren 2025 · Del 1 · Oppgave 2a",
    example: "Antall personer i ti skiheisvogner: 6, 3, 2, 4, 4, 6, 2, 7, 8, 8. Finn medianen.",
    steps: ["Sorter fra minst til størst: 2, 2, 3, 4, 4, 6, 6, 7, 8, 8.", "Stryk én 2 fra venstre og én 8 fra høyre. Stryk deretter den andre 2 og den andre 8.", "Stryk 3 og 7. Stryk så den ytterste 4 og den ytterste 6.", "Du sitter igjen med 4 og 6. Midt mellom dem ligger 5: (4 + 6) : 2 = 5."],
    answer: "Medianen er 5 personer.",
    remember: "Er det bare ett tall igjen i midten, er dette medianen. Er det to, legger du dem sammen og deler på to.",
  },
  {
    id: "mean",
    title: "Gjennomsnitt: let etter tiervenner",
    short: "Før du legger sammen en lang liste: Se om noen av tallene kan bli 10 sammen. Del summen på antall tall.",
    source: "Våren 2025 · Del 1 · Oppgave 2a",
    example: "Antall personer i ti skiheisvogner: 6, 3, 2, 4, 4, 6, 2, 7, 8, 8. Finn gjennomsnittet.",
    steps: ["Sett sammen tallene i par. Kryss av hvert tall du bruker.", "6 + 4 = 10. Den andre 6 og den andre 4 gir også 10.", "3 + 7 = 10. Begge parene med 2 + 8 gir også 10.", "Fem tiere blir 50 personer.", "Det var ti vogner: 50 : 10 = 5 personer i gjennomsnitt."],
    answer: "Det var i gjennomsnitt 5 personer per vogn.",
    remember: "Bruk hvert tall én gang. Hvis en annen liste har nuller, må du også telle dem med når du finner antall tall.",
  },
  {
    id: "cumulative",
    title: "Kumulativ: stopp etter alle sekserne",
    short: "Kumulativ frekvens for seks betyr at du teller alle med seks eller færre. Ta med de mindre tallene også.",
    source: "Våren 2025 · Del 1 · Oppgave 2b",
    example: "Antall personer i ti skiheisvogner: 6, 3, 2, 4, 4, 6, 2, 7, 8, 8. Finn den kumulative frekvensen for seks personer, og forklar svaret.",
    steps: ["Sorter tallene: 2, 2, 3, 4, 4, 6, 6, 7, 8, 8.", "Tenk at du går langs tallrekken fra venstre. Stopp etter alle sekserne.", "Du har passert 2, 2, 3, 4, 4, 6 og 6. Det er sju tall.", "Hvert tall beskriver én vogn. Derfor er det sju vogner med seks eller færre personer."],
    answer: "Den kumulative frekvensen er 7. Sju av vognene hadde seks eller færre personer.",
    remember: "Å telle bare sekserne gir to vogner. Kumulativ betyr at du også tar med dem med færre personer.",
  },
];

export function ExamReminders({ onBack }: { onBack: () => void }) {
  return <div className="page reminders-page">
    <button className="back-link" onClick={onBack}>← Til startsiden</button>
    <section className="section-heading">
      <p className="eyebrow">Små råd som hjelper i del 1</p>
      <h1>Ting å huske på eksamen</h1>
      <p>Les ett råd om gangen. Trykk på «Se mer» for å se hvordan du kan tenke uten kalkulator, med eksempler fra eksamen.</p>
    </section>
    <section className="reminder-list" aria-label="Huskeregler">
      {reminders.map((reminder, index) => <article className="reminder-card" key={reminder.id}>
        <h2 id={`reminder-${reminder.id}`}><span className="reminder-number" aria-hidden="true">{index + 1}</span>{reminder.title}</h2>
        <p>{reminder.short}</p>
        <details>
          <summary aria-describedby={`reminder-${reminder.id}`}><span className="reminder-more">Se mer</span><span className="reminder-less">Vis mindre</span></summary>
          <div className="reminder-example">
            <p className="reminder-source">{reminder.source}</p>
            <h3>Et eksempel fra eksamen</h3><p>{reminder.example}</p>
            <ol>{reminder.steps.map(step => <li key={step}>{step}</li>)}</ol>
            <div className="reminder-answer"><h3>Slik kan du skrive svaret</h3><p>{reminder.answer}</p></div>
            <p className="reminder-takeaway"><strong>Husk:</strong> {reminder.remember}</p>
            {reminder.variant && <div className="reminder-variant"><h3>Ekstra øvingsvariant</h3><p>{reminder.variant.explanation}</p><p>{reminder.variant.calculation}</p></div>}
          </div>
        </details>
      </article>)}
    </section>
    <aside className="reminder-check" aria-labelledby="reminder-check-title">
      <h2 id="reminder-check-title">Før du går videre</h2>
      <ul><li>Har jeg svart på det oppgaven spør om?</li><li>Har jeg skrevet riktig enhet, for eksempel kroner eller meter?</li><li>Virker svaret mulig? 20 % av 5200 egg kan ikke være mer enn 5200 egg.</li><li>Står det «begrunn»? Skriv hvorfor svaret ditt stemmer. Du kan begynne med «Jeg vet dette fordi …».</li></ul>
    </aside>
  </div>;
}
