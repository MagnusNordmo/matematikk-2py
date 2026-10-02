"use client";

const reminders = [
  { title: "Finn 10 % først", short: "Skal du finne 20 %? Del tallet på 10, og ta svaret to ganger.", example: "Finn 20 % av 5200 egg.", steps: ["Finn 10 %: 5200 : 10 = 520 egg.", "20 % er dobbelt så mye: 520 + 520 = 1040 egg."], remember: "30 % er tre ganger 10 %. 5 % er halvparten av 10 %." },
  { title: "«Omtrent» betyr at du kan runde av", short: "Du trenger vanligvis ikke mange desimaler når oppgaven spør om et omtrentlig svar.", example: "Kalkulatoren viser at du trenger 485 294,1176 kronestykker.", steps: ["Behold desimalene mens du regner med kalkulator.", "Rund av til slutt: Du trenger omtrent 485 000 kronestykker."], remember: "Gjør du et overslag med enklere tall, skriv hvilke tall du bruker. Ikke rund så mye at svaret blir misvisende." },
  { title: "Hva gjelder prosenten?", short: "Finn ut hvilken del av hele gruppen oppgaven snakker om.", example: "88 % av elevene deltar. Tre elever deltar ikke. Hvor mange elever er det i klassen?", steps: ["Hele klassen er 100 %.", "De som ikke deltar, er 100 % − 88 % = 12 %.", "12 % er altså 3 elever.", "Finn hele klassen: 3 : 0,12 = 25 elever."], remember: "De tre elevene er 12 % av klassen, fordi det er de som ikke deltar." },
  { title: "Prøv med 100 kroner", short: "Samme prosent ned og opp gir ikke prisen du startet med.", example: "Prisen settes ned 20 %, og deretter opp 20 %.", steps: ["Start med 100 kroner. 20 % er 20 kroner.", "Etter nedgangen: 100 − 20 = 80 kroner.", "Nå regner du 20 % av 80: 10 % er 8, så 20 % er 16 kroner.", "Etter økningen: 80 + 16 = 96 kroner."], remember: "Prisen er lavere enn før. Den andre prosenten regnes av 80 kroner, ikke 100." },
  { title: "Prosentpoeng: trekk fra", short: "Spør oppgaven om prosentpoeng? Trekk de to prosenttallene fra hverandre.", example: "Renten går fra 6 % til 5,46 %.", steps: ["Nedgangen i prosentpoeng: 6 − 5,46 = 0,54 prosentpoeng.", "Spør oppgaven i stedet om prosent? Sammenlikn nedgangen med den gamle renten.", "0,54 : 6 · 100 = 9 %. Renten er satt ned med 9 %."], remember: "Se etter ordet «prosent» eller «prosentpoeng». De gir forskjellige svar." },
  { title: "Median: sorter først", short: "Sett tallene fra minst til størst. Finn så midten.", example: "Tallene er 8, 2, 5, 1 og 4.", steps: ["Sorter: 1, 2, 4, 5, 8.", "Tallet i midten er 4. Medianen er 4.", "Er det to tall i midten? Legg dem sammen og del på 2.", "Hvis de to midterste er 4 og 6: (4 + 6) : 2 = 5."], remember: "Du må sortere før du finner midten." },
  { title: "Gjennomsnitt: legg sammen og del", short: "Legg sammen alle tallene. Del på hvor mange tall det er.", example: "Fire elever har 0, 2, 2 og 8 fraværsdager.", steps: ["Legg sammen: 0 + 2 + 2 + 8 = 12 dager.", "Det er fire elever. Del på 4: 12 : 4 = 3.", "Gjennomsnittet er 3 fraværsdager."], remember: "Eleven med 0 fraværsdager skal også telles med. Derfor deler du på 4." },
  { title: "Kumulativ: tell alle opp til grensen", short: "Kumulativ frekvens for 5 betyr at du teller alle med 5 eller færre.", example: "Fem elever har 0, 1, 2, 5 og 8 fraværsdager.", steps: ["Finn alle med 5 eller færre: 0, 1, 2 og 5.", "Dette er fire elever.", "Skriv: Fire elever har 5 eller færre fraværsdager."], remember: "Ikke tell bare dem som har akkurat 5. De med mindre skal også være med." },
  { title: "Bruk samme enhet", short: "Gjør gram og kilogram, eller meter og millimeter, om til samme enhet før du regner.", example: "1 kg koster 120 kroner. Hva koster 250 g hvis kiloprisen er den samme?", steps: ["1 kg = 1000 g.", "250 g er en fjerdedel av 1000 g.", "Prisen er også en fjerdedel: 120 : 4 = 30 kroner."], remember: "Sjekk enheten bak hvert tall før du begynner." },
  { title: "«Til sammen»: legg sammen", short: "Verdien i én uke er noe annet enn summen av flere uker.", example: "Du sykler 10 km i uke 1, 15 km i uke 2 og 20 km i uke 3.", steps: ["Hvor langt sykler du i uke 3? 20 km.", "Hvor langt sykler du til sammen i tre uker? Legg sammen alle ukene.", "10 + 15 + 20 = 45 km."], remember: "Sett gjerne en strek under «til sammen» i oppgaveteksten." },
  { title: "«Begrunn»: skriv hvorfor", short: "Skriv svaret ditt. Legg så til en setning som forklarer hvorfor det stemmer.", example: "Oppgaven spør om prisen er lavere enn før.", steps: ["Svar: Ja, prisen er lavere.", "Forklar: Den kostet 100 kroner før og koster 96 kroner nå."], remember: "Du kan starte med: «Jeg vet dette fordi …». Bruk tallene eller regningen din til å forklare." },
];

export function ExamReminders({ onBack }: { onBack: () => void }) {
  return <div className="page reminders-page">
    <button className="back-link" onClick={onBack}>← Til startsiden</button>
    <section className="section-heading">
      <p className="eyebrow">Små råd som hjelper</p>
      <h1>Ting å huske på eksamen</h1>
      <p>Les ett råd om gangen. Trykk på «Se mer» når du vil se et eksempel, steg for steg.</p>
    </section>
    <section className="reminder-list" aria-label="Huskeregler">
      {reminders.map((reminder, index) => <article className="reminder-card" key={reminder.title}>
        <h2><span className="reminder-number" aria-hidden="true">{index + 1}</span>{reminder.title}</h2>
        <p>{reminder.short}</p>
        <details>
          <summary aria-label={`Se mer: ${reminder.title}`}><span className="reminder-more">Se mer</span><span className="reminder-less">Vis mindre</span></summary>
          <div className="reminder-example">
            <h3>Et eksempel</h3><p>{reminder.example}</p>
            <ol>{reminder.steps.map(step => <li key={step}>{step}</li>)}</ol>
            <p className="reminder-takeaway"><strong>Husk:</strong> {reminder.remember}</p>
          </div>
        </details>
      </article>)}
    </section>
    <aside className="reminder-check" aria-labelledby="reminder-check-title">
      <h2 id="reminder-check-title">Før du går videre</h2>
      <ul><li>Har jeg svart på det oppgaven spør om?</li><li>Har jeg skrevet riktig enhet, for eksempel kroner eller meter?</li><li>Virker svaret mulig? 20 % av 5200 egg kan ikke være mer enn 5200 egg.</li></ul>
    </aside>
  </div>;
}
