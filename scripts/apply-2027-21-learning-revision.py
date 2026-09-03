"""Apply the reviewed 2027.21 learning-quality revision to the published bank.

This is the reproducible recipe for the targeted changes in the authoritative
JSON file. It refuses to run on an unexpected bank version.
"""

import json
from pathlib import Path


path = Path(__file__).resolve().parents[1] / "public" / "oppgaver-2027.json"
bank = json.loads(path.read_text(encoding="utf-8"))
if bank["samling"].get("versjon") != "2027.20":
    raise SystemExit("Forventet oppgavebank 2027.20")

by_id = {question["id"]: question for question in bank["oppgaver"]}
groups = {group["id"]: group for group in bank["oppgavegrupper"]}


def q(number: int):
    return by_id[f"2py27-{number:03d}"]


def numeric(number, value, unit, tolerance=0):
    q(number)["fasit"] = {
        "type": "tall",
        "verdier": [{"verdi": value, "enhet": unit, "toleranse": tolerance}],
    }


# Correct internally inconsistent content.
q(7)["hint"] = [
    r"Hva vet vi? \(100\) kunder er hele mengden, altså \(100\,\%\), mens \(25\) kunder er delen vi skal beskrive med prosent.",
    r"Lag en plan: Skriv delen over helheten som \(25/100\). En brøk med nevner 100 kan leses direkte som prosent.",
    r"Velg en enkel regnevei: Du kan også forkorte brøken ved å dele både teller og nevner med \(25\): \(\frac{25\div25}{100\div25}=\frac{1}{4}\).",
    r"Gjør neste del: Gjør firedelen om til prosent ved å regne \(\frac{1}{4}\cdot100\,\%=\square\,\%\).",
]
q(7)["kontroll"]["inndata"] = {"del": 25, "hel": 100}
q(7)["kontroll"]["resultat"] = [25]

q(406)["hint"][-1] = (
    r"Klassemidtpunktene er \(2{,}5, 7{,}5, 15, 30\). Den veide summen er "
    r"\(20+127{,}5+300+450=897{,}5\), så anslaget blir \(897{,}5/60=\square\)."
)

# Use figures and prompts that have one unambiguous mathematical answer.
q(210)["sporsmal"] = "Hvilket uttrykk passer nøyaktig til tabellen?"
q(210)["hint"] = [
    r"Hva vet vi? Tabellen gir fem par av x- og y-verdier, og ett av uttrykkene skal passe til alle parene.",
    r"Lag en plan: Sammenlign y-verdien med \(x^2\) i flere rader før du velger et alternativ.",
    r"Gjør første del: Regn \(3/1^2=3\), \(12/2^2=3\) og \(27/3^2=3\). Det samme forholdet går igjen.",
    r"Gjør neste del: Sett også inn \(x=4\) i alternativene, og velg uttrykket som gir tabellverdien \(48\).",
]
q(210)["svar"] = r"Uttrykket \(y=3x^2\) passer alle radene."
q(210)["fasit"] = {
    "type": "valg", "flervalg": False, "riktige": [r"\(y=3x^2\)"],
    "alternativer": [r"\(y=3x^2\)", r"\(y=3\cdot2^x\)", r"\(y=3x+3\)", r"\(y=3/x\)"],
}
q(210)["kontroll"] = {"operasjon": "valg", "riktige": [r"\(y=3x^2\)"]}

q(212)["sporsmal"] = "Hvilken type proporsjonalitet viser tabellen?"
q(212)["hint"] = [
    r"Hva vet vi? Når x dobles i tabellen, blir y halvert. Vi skal knytte dette mønsteret til riktig type proporsjonalitet.",
    r"Lag en plan: Undersøk både forholdet \(y/x\) og produktet \(x\cdot y\) i flere rader.",
    r"Gjør første del: Produktene er \(1\cdot64=64\), \(2\cdot32=64\) og \(4\cdot16=64\), mens forholdet ikke er konstant.",
    r"Gjør neste del: Velg alternativet som kjennetegnes ved at produktet av de to størrelsene er konstant.",
]
q(212)["svar"] = r"Tabellen viser omvendt proporsjonalitet fordi \(x\cdot y=64\) i alle radene."
q(212)["fasit"] = {
    "type": "valg", "flervalg": False, "riktige": ["omvendt proporsjonal"],
    "alternativer": ["proporsjonal", "omvendt proporsjonal", "lineær, men ikke proporsjonal", "ingen av disse"],
}
q(212)["kontroll"] = {"operasjon": "valg", "riktige": ["omvendt proporsjonal"]}

# Revise arithmetic that obscured the intended method in Part 1.
q(10).update({
    "niva": 2,
    "sporsmal": r"Et teater solgte \(220\) av \(500\) billetter på nett. Hvor mange prosent av billettene ble solgt på nett?",
    "hint": [
        r"Hva vet vi? \(500\) billetter er hele mengden, altså \(100\,\%\), og \(220\) billetter er delen vi skal skrive som prosent.",
        r"Lag en plan: Skriv delen over helheten som \(220/500\), der tallet under brøkstreken er helheten som skal gjøres om til 100 uten lang divisjon.",
        r"Velg en enkel regnevei: Del teller og nevner med \(5\). Regn \(220\div5=\square\), og legg merke til at \(500\div5=100\).",
        r"Gjør neste del: Det første resultatet blir tallet over brøkstreken når nevneren er 100, og viser derfor prosenten.",
    ],
    "svar": r"\(220/500=44/100\), så andelen er \(44\,\%\).",
    "kontroll": {"operasjon": "beregning", "metode": "part_as_percent", "inndata": {"del": 220, "hel": 500}, "resultat": [44], "avrunding": 0},
})
numeric(10, 44, "%", 0)
q(10)["losningsveier"] = [
    {"id": "forkort-brok", "navn": "Forkort brøken", "forklaring": "Gjør nevneren om til 100.", "hint": [
        r"Hva vet vi? \(500\) billetter er hele mengden, og \(220\) billetter er delen som skal skrives som prosent.",
        r"Lag en plan: Skriv delen over totalen som \(\frac{220}{500}\), der tallet under brøkstreken er helheten som skal gjøres om til 100.",
        r"Velg en enkel regnevei: Del både teller og nevner med \(5\). Regn \(220\div5=\square\), mens \(500\div5=100\).",
        r"Gjør neste del: Det første resultatet blir tallet over brøkstreken og viser prosenten når nevneren er 100.",
    ]},
    {"id": "prosentbiter", "navn": "40 % og 4 %", "forklaring": "Bygg delen av kjente prosentbiter.", "hint": [
        r"Hva vet vi? \(500\) billetter er hele mengden, og vi vil bygge \(220\) av oversiktlige prosentbiter.",
        r"Velg denne veien: Ti prosent av \(500\) er \(50\), så \(40\,\%\) er \(4\cdot50=200\) billetter.",
        r"Finn resten: Det mangler \(220-200=20\) billetter. Én prosent er \(500/100=5\) billetter.",
        r"Gjør neste del: Regn \(20/5=\square\,\%\), og legg denne prosenten til \(40\,\%\).",
    ]},
]

q(28).update({
    "niva": 2,
    "sporsmal": r"En årsavgift ble økt med \(20\,\%\) til \(720\) kr. Hva var årsavgiften før økningen?",
    "hint": [
        r"Hva vet vi? Etter en økning på \(20\,\%\) er årsavgiften \(720\) kr. Vi skal finne den gamle avgiften som svarer til \(100\,\%\).",
        r"Finn prosenten etter endringen: \(100+20=120\,\%\). Del prosenten etter endringen i seks like deler, slik at hver del er \(20\,\%\).",
        r"Finn verdien av én del: De seks like delene er til sammen \(720\) kr. Derfor deler vi \(720/6=120\) kr.",
        r"Bygg opp \(100\,\%\): Hele den gamle avgiften består av fem slike deler. Regn \(5\cdot120=\square\).",
    ],
    "svar": r"Den gamle avgiften var \(600\) kr. En økning på \(20\,\%\) er \(120\) kr, og \(600+120=720\).",
    "kontroll": {"operasjon": "beregning", "metode": "reverse_percent", "inndata": {"ny": 720, "endring": 20}, "resultat": [600], "avrunding": 0},
})
numeric(28, 600, "kr", 0)

q(31).update({
    "niva": 2,
    "sporsmal": r"Et årskort ble satt ned med \(20\,\%\) og kostet da \(640\) kr. Hva kostet årskortet før rabatten?",
    "hint": [
        r"Hva vet vi? Etter en rabatt på \(20\,\%\) er prisen \(640\) kr. Vi skal finne den gamle prisen som svarer til \(100\,\%\).",
        r"Finn prosenten etter endringen: \(100-20=80\,\%\). Del prosenten etter endringen i åtte like deler, slik at hver del er \(10\,\%\).",
        r"Finn verdien av én del: De åtte like delene er til sammen \(640\) kr. Derfor deler vi \(640/8=80\) kr.",
        r"Bygg opp \(100\,\%\): Hele den gamle prisen består av ti slike deler. Regn \(80\cdot10=\square\).",
    ],
    "svar": r"Årskortet kostet \(800\) kr. Rabatten er \(160\) kr, og \(800-160=640\).",
    "kontroll": {"operasjon": "beregning", "metode": "reverse_percent", "inndata": {"ny": 640, "endring": -20}, "resultat": [800], "avrunding": 0},
})
numeric(31, 800, "kr", 0)

q(69)["hint"] = [
    r"Hva vet vi? Vi skal sammenligne to potenser og en kvadratrot og ordne uttrykkene etter tallverdien.",
    r"Lag en plan: Gjør hvert uttrykk om til et vanlig tall før du sammenligner dem.",
    r"Velg en enkel regnevei: Regn \(2^4=2\cdot2\cdot2\cdot2\), finn tallet som ganget med seg selv blir \(400\), og regn \(3^3=3\cdot3\cdot3\).",
    r"Gjør neste del: Skriv uttrykkene i stigende rekkefølge etter de tre tallverdiene du fant.",
]
q(69)["svar"] = r"Tallverdiene er \(2^4=16\), \(\sqrt{400}=20\), \(3^3=27\). Riktig rekkefølge er derfor \(2^4\), \(\sqrt{400}\), \(3^3\)."
q(69)["data"]["uttrykk"] = [r"\(2^4\)", r"\(\sqrt{400}\)", r"\(3^3\)"]
order = [r"\(2^4\), \(\sqrt{400}\), \(3^3\)"]
q(69)["fasit"] = {"type": "valg", "flervalg": False, "riktige": order, "alternativer": [
    r"\(3^3\), \(\sqrt{400}\), \(2^4\)", r"\(\sqrt{400}\), \(2^4\), \(3^3\)",
    r"\(\sqrt{400}\), \(3^3\), \(2^4\)", order[0],
]}
q(69)["kontroll"] = {"operasjon": "valg", "riktige": order}

friendly_scales = {
    107: (r"En bil kjører \(180\) km på \(10\) liter drivstoff. Kjørelengden \(y\) regnes som proporsjonal med drivstoffmengden \(x\), slik at \(y=kx\). Finn \(k\), og tolk svaret.",
          [r"Hva vet vi? \(10\) liter svarer til \(180\) km, og konstanten \(k\) viser kjørelengden for én liter.", r"Lag en plan: Bruk \(k=y/x\), altså total kjørelengde delt på antall liter.", r"Velg en enkel regnevei: Del på ti ved å flytte desimalkommaet én plass: \(180/10=\square\).", r"Gjør neste del: Tolk tallet med enheten kilometer per liter; det beskriver verdien for én liter."],
          r"\(k=180/10=18\). Modellen tilsvarer \(18\) km per liter.", 18, "km per liter", "direct_constant", {"x": 10, "y": 180}),
    109: (r"\(5\) meter gavebånd koster \(40\) kr. Hva koster \(8\) meter når prisen er proporsjonal med lengden?",
          [r"Hva vet vi? \(5\) meter koster \(40\) kr, og samme pris per meter skal brukes for \(8\) meter.", r"Lag en plan: Finn først prisen for én meter ved å dele totalprisen på antall meter.", r"Velg en enkel regnevei: \(40/5=8\) kr per meter er et regnestykke i den lille gangetabellen.", r"Gjør neste del: Gang meterprisen med den nye lengden: \(8\cdot8=\square\)."],
          r"Meterprisen er \(40/5=8\) kr. Da koster \(8\) meter \(64\) kr.", 64, "kr", "direct_scale", {"x1": 5, "y1": 40, "x2": 8}),
    110: (r"\(8\) bussbilletter koster \(240\) kr. Hva koster \(10\) billetter når alle billettene har samme pris?",
          [r"Hva vet vi? \(8\) billetter koster \(240\) kr, og alle billettene har samme pris.", r"Lag en plan: Finn først prisen per billett ved å dele totalprisen på åtte.", r"Velg en enkel regnevei: Siden \(8\cdot30=240\), er prisen per billett \(30\) kr.", r"Gjør neste del: Gang prisen per billett med \(10\): \(30\cdot10=\square\)."],
          r"Én billett koster \(30\) kr. Da koster \(10\) billetter \(300\) kr.", 300, "kr", "direct_scale", {"x1": 8, "y1": 240, "x2": 10}),
    112: (r"En oppskrift til \(4\) porsjoner bruker \(20\) dl suppe. Hvor mye suppe trengs til \(8\) porsjoner når mengden er proporsjonal med antall porsjoner?",
          [r"Hva vet vi? \(4\) porsjoner bruker \(20\) dl, og suppemengden øker i samme forhold som antall porsjoner.", r"Lag en plan: \(8\) porsjoner er dobbelt så mange som \(4\) porsjoner, så mengden skal dobles.", r"Velg en enkel regnevei: Doble ved å legge mengden til seg selv: \(20+20=\square\) dl."],
          r"Til \(8\) porsjoner trengs \(40\) dl suppe.", 40, "dl", "direct_scale", {"x1": 4, "y1": 20, "x2": 8}),
    116: (r"\(6\) like maskiner bruker \(30\) dager på en produksjonsordre. Hvor lang tid bruker \(10\) slike maskiner på den samme ordren?",
          [r"Hva vet vi? \(6\) maskiner bruker \(30\) dager på den samme arbeidsmengden, og flere like maskiner gir kortere tid.", r"Lag en plan: Ved omvendt proporsjonalitet er produktet av antall maskiner og dager konstant.", r"Gjør første del: Finn konstanten med det kjente paret: \(6\cdot30=180\).", r"Gjør neste del: Del konstanten på \(10\) maskiner: \(180/10=\square\) dager."],
          r"Tiden blir \(180/10=18\) dager.", 18, "dager", "inverse_scale", {"x1": 6, "y1": 30, "x2": 10}),
    117: (r"\(4\) like kraner flytter en bestemt last på \(24\) timer. Hvor lang tid bruker \(8\) kraner på den samme lasten?",
          [r"Hva vet vi? \(4\) kraner bruker \(24\) timer på den samme lasten, og vi øker til \(8\) kraner.", r"Lag en plan: Antall kraner dobles fra \(4\) til \(8\). Ved omvendt proporsjonalitet skal tiden da halveres.", r"Velg en enkel regnevei: Halver \(24\) timer ved å regne \(24/2=\square\) timer."],
          r"Åtte kraner bruker \(12\) timer.", 12, "timer", "inverse_scale", {"x1": 4, "y1": 24, "x2": 8}),
}
for number, (prompt, hints, answer, value, unit, method, inputs) in friendly_scales.items():
    q(number)["sporsmal"], q(number)["hint"], q(number)["svar"] = prompt, hints, answer
    q(number)["kontroll"] = {"operasjon": "beregning", "metode": method, "inndata": inputs, "resultat": [value]}
    numeric(number, value, unit, 0)

q(260)["sporsmal"] = r"Finn tallet som beskrives av \(2^6\)."
q(260)["hint"] = [
    r"Hva vet vi? Grunntallet er \(2\), og eksponenten \(6\) betyr at tallet 2 skal brukes som faktor seks ganger.",
    r"Lag en plan: Del de seks faktorene i to like grupper med tre faktorer i hver gruppe.",
    r"Velg en enkel regnevei: \(2^3=2\cdot2\cdot2=8\), så \(2^6=(2^3)^2=8^2\).",
    r"Gjør neste del: Regn ut \(8\cdot8=\square\) ved hjelp av den lille gangetabellen.",
]
q(260)["svar"] = r"\(2^6=64\)."
numeric(260, 64, None, 0)
q(260)["kontroll"] = {"operasjon": "beregning", "metode": "mixed_value", "inndata": {"beskrivelse": r"\(2^6\)"}, "resultat": [64]}

# Figures show the mathematical construction rather than a generic capped dot grid.
for number in range(88, 93):
    q(number)["visualisering"]["monster"] = "lineaer_tilvekst"
for number, offset, extra in [(93, 1, 1), (94, 2, 1), (95, 1, 2), (96, 3, 1), (97, 2, 2)]:
    q(number)["visualisering"].update({"monster": "kvadrat_med_tillegg", "sideforskyvning": offset, "tillegg": extra})
for group_id, pattern in {
    "d2-figur-01": "benker", "d2-figur-02": "flisramme_uten_hjorner",
    "d2-figur-03": "bord_og_stoler", "d2-figur-04": "trekant",
    "d2-figur-05": "ramme",
}.items():
    groups[group_id]["visualisering"]["monster"] = pattern

# Histogram area must represent frequency when class widths differ.
for number in range(286, 291):
    q(number)["visualisering"]["bruk_frekvenstetthet"] = True

# Do not expose results in percent-progress graphics before the student solves them.
for number in range(1, 6):
    groups[f"d2-prosent-{number:02d}"]["visualisering"]["skjul_verdier"] = True

# Make the selected regression type explicit in the shared prompt.
groups["d2-regresjon-03"]["innledning"] = (
    "Tabellen viser bremselengde som funksjon av fart. Bruk potensregresjon til å beskrive sammenhengen."
)
q(369)["sporsmal"] = "Hvilken regresjonstype er oppgitt at du skal bruke?"
q(369)["hint"] = [
    "Les den felles oppgaveteksten før du velger regresjonstype.",
    r"En potensmodell har formen \(y=a\cdot x^b\).",
]
q(369)["svar"] = "Oppgaven ber om potensregresjon."

# The two central observations now lie in the same class.
group = groups["d2-gruppert-05"]
group["data"]["frekvenser"] = [10, 14, 18, 8]
group["visualisering"]["frekvenser"] = [10, 14, 18, 8]
q(417)["hint"][-1] = r"Totalen er \(10+14+18+8=\square\). Til og med klasse 2 er kumulativ frekvens \(10+14=\square\)."
q(417)["svar"] = r"Det er \(50\) observasjoner totalt. Kumulativ frekvens etter klasse 2 er \(24\)."
q(417)["fasit"]["verdier"][1]["verdi"] = 24
q(417)["kontroll"]["inndata"]["frekvenser"] = [10, 14, 18, 8]
q(417)["kontroll"]["resultat"] = [50, 24]
q(418)["hint"][-1] = r"Klassemidtpunktene er \(1, 3, 5, 8\). Den veide summen er \(10+42+90+64=206\), så anslaget blir \(206/50=\square\)."
q(418)["svar"] = r"Med klassemidtpunktene blir anslått gjennomsnitt \(4{,}12\) timer."
q(418)["fasit"]["verdier"][0]["verdi"] = 4.12
q(418)["kontroll"]["inndata"]["frekvenser"] = [10, 14, 18, 8]
q(418)["kontroll"]["resultat"] = [4.12]
q(419)["hint"] = [
    r"Det er \(50\) observasjoner, så de to midterste er nummer 25 og 26.",
    r"Kumulativ frekvens er \(10\), \(24\), \(42\), \(50\). Både nummer 25 og 26 ligger derfor i den tredje klassen.",
]

# State precision and align tolerances with it.
for number in range(291, 301):
    q(number)["sporsmal"] += " Rund svaret til to desimaler."
    q(number)["fasit"]["verdier"][0]["toleranse"] = 0.005
for number, answer in [(297, r"\(L(16)=18\cdot16^{0{,}5}=72{,}00\) meter."),
                       (298, r"\(A(12)=0{,}75\cdot12^2=108{,}00\) m²."),
                       (299, r"\(T(25)=120\cdot25^{-0{,}5}=24{,}00\) minutter.")]:
    q(number)["svar"] = answer

coefficient_tolerances = {
    362: [0.005, 0.05], 366: [0.5, 0.005], 370: [0.00005, 0.005],
    374: [0.005, 0.005, 0.005], 378: [0.005, 0.05],
}
for number, tolerances in coefficient_tolerances.items():
    for answer, tolerance in zip(q(number)["fasit"]["verdier"], tolerances):
        answer["toleranse"] = tolerance
for number in [363, 367, 371, 375, 379, 482, 486, 490, 494, 498]:
    q(number)["fasit"]["verdier"][-1]["toleranse"] = 0.05

# One genuinely challenging Part 1 task in proportionality compares a claim
# with two model values instead of creating difficulty through awkward division.
q(122).update({
    "niva": 3,
    "sporsmal": r"Tiden for en varetelling modelleres med \(T(x)=900/x+15\), der \(x\) er antall arbeidere og \(T(x)\) måles i minutter. Bestem \(T(30)\) og \(T(60)\). Velg deretter riktig vurdering av påstanden «Når antall arbeidere dobles, blir den samlede tiden halvert».",
    "hint": [
        r"Hva vet vi? Modellen består av den variable delen \(900/x\) og et fast tillegg på \(15\) minutter som ikke endres med antall arbeidere.",
        r"Lag en plan: Sett først \(x=30\) og deretter \(x=60\) inn i den samme modellen, og regn divisjonen før du legger til fastleddet.",
        r"Velg en enkel regnevei: Regn \(T(30)=900/30+15=\square\) og \(T(60)=900/60+15=\square\). Begge divisjonene kan sees fra den lille gangetabellen og tiermultipler.",
        r"Gjør neste del: Sammenlign den andre tiden med halvparten av den første. Legg merke til at bare brøkdelen halveres når x dobles, mens fastleddet er uendret.",
    ],
    "svar": r"\(T(30)=45\) minutter og \(T(60)=30\) minutter. Påstanden er feil: Den variable delen halveres, men fastleddet på \(15\) minutter gjør at den samlede tiden ikke halveres.",
    "fasit": {
        "type": "valg_og_tall",
        "valg": {
            "type": "valg", "flervalg": False,
            "riktige": ["Påstanden er feil fordi fastleddet på 15 minutter ikke halveres."],
            "alternativer": [
                "Påstanden er riktig fordi antall arbeidere dobles.",
                "Påstanden er feil fordi fastleddet på 15 minutter ikke halveres.",
                "Påstanden er riktig fordi produktet av x og hele T(x) alltid er 900.",
            ],
        },
        "verdier": [
            {"verdi": 45, "enhet": "minutter", "toleranse": 0, "etikett": "T(30)"},
            {"verdi": 30, "enhet": "minutter", "toleranse": 0, "etikett": "T(60)"},
        ],
    },
    "kontroll": {"operasjon": "beregning_og_valg", "metode": "inverse_plus_constant_compare", "inndata": {"k": 900, "fast": 15, "x": [30, 60]}, "resultat": [45, 30]},
})

# Ask for actual reasoning in conceptual tasks. The choice is auto-checked; the
# written explanation is compared with the worked solution shown afterwards.
reasoning_numbers = [253, 254, 255, 256, 257, 384, 388, 392, 396, 400, 404, 408, 412, 416, 420]
for number in reasoning_numbers:
    q(number)["sporsmal"] = q(number)["sporsmal"].rstrip() + " Begrunn valget med én eller to setninger."
    q(number)["fasit"]["krever_begrunnelse"] = True

# Routine recognition and substitution belong at the middle level.
for number in [118, 119, 120, 121, 253, 254, 255, 257,
               324, 328, 332, 336, 340, 384, 388, 392, 396, 400,
               404, 408, 412, 416, 420]:
    q(number)["niva"] = 2

bank["samling"]["versjon"] = "2027.21"
bank["statistikk"]["fordeling_niva"] = {
    str(level): sum(question["niva"] == level for question in bank["oppgaver"])
    for level in (1, 2, 3)
}
path.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
