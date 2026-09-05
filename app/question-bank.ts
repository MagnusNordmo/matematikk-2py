export type Part = 1 | 2;

export type NumericAnswer = {
  verdi: number;
  etikett?: string;
  enhet?: string;
  toleranse?: number;
};

export type ChoiceAnswer = {
  type: "valg";
  flervalg: boolean;
  riktige: string[];
  alternativer: string[];
  krever_begrunnelse?: boolean;
  aapen?: boolean;
  vurderingskriterier?: string[];
};

export type AnswerKey =
  | { type: "tall"; verdier: NumericAnswer[] }
  | { type: "flere_tall"; verdier: NumericAnswer[] }
  | ChoiceAnswer
  | { type: "valg_og_tall"; valg: ChoiceAnswer; verdier: NumericAnswer[] };

export type Visualization = {
  type: string;
  tekstalternativ?: string;
  [key: string]: unknown;
};

export type SolutionPath = {
  id: string;
  navn: string;
  forklaring: string;
  hint: string[];
};

export type Question = {
  id: string;
  del: Part;
  tema: string;
  deltema: string;
  ferdighet: string[];
  niva: 1 | 2 | 3;
  hjelpemidler: "uten" | "med";
  sporsmal: string;
  hint: string[];
  losningsveier?: SolutionPath[];
  svar: string;
  fasit: AnswerKey;
  variantfamilie: string;
  data?: Record<string, unknown>;
  visualisering?: Visualization;
  oppgavegruppe?: {
    id: string;
    deloppgave: string;
    rekkefolge: number;
  };
};

export type QuestionGroup = {
  id: string;
  del: 2;
  tittel: string;
  innledning: string;
  data: Record<string, unknown>;
  visualisering?: Visualization;
};

export type QuestionBank = {
  samling: {
    id: string;
    tittel: string;
    malgruppe: string;
    antall: number;
    deler: Part[];
  };
  oppgavegrupper: QuestionGroup[];
  oppgaver: Question[];
};

export type Theme = {
  id: string;
  navn: string;
  kortnavn: string;
  beskrivelse: string;
  symbol: string;
};

export const THEMES: Theme[] = [
  {
    id: "prosent",
    navn: "Prosent og vekst",
    kortnavn: "Prosent",
    beskrivelse: "Prosentdel, endring, prosentpoeng og vekstfaktor.",
    symbol: "%",
  },
  {
    id: "potenser",
    navn: "Potenser og standardform",
    kortnavn: "Potenser",
    beskrivelse: "Potensregler, tierpotenser og store eller små tall.",
    symbol: "aⁿ",
  },
  {
    id: "variabler",
    navn: "Variabler og formler",
    kortnavn: "Variabler",
    beskrivelse: "Regne med uttrykk, løse likninger og bruke formler.",
    symbol: "x",
  },
  {
    id: "variabler_og_monstre",
    navn: "Variabler og mønstre",
    kortnavn: "Mønstre",
    beskrivelse: "Generalisere mønstre og beskrive dem med formler.",
    symbol: "▦",
  },
  {
    id: "proporsjonalitet",
    navn: "Proporsjonalitet",
    kortnavn: "Proporsjonalitet",
    beskrivelse: "Direkte og omvendt proporsjonale sammenhenger.",
    symbol: "∝",
  },
  {
    id: "statistikk",
    navn: "Statistikk",
    kortnavn: "Statistikk",
    beskrivelse: "Sentralmål, spredning, tabeller og diagrammer.",
    symbol: "x̄",
  },
  {
    id: "statistikk_og_samfunn",
    navn: "Statistikk og samfunn",
    kortnavn: "Samfunnsdata",
    beskrivelse: "Tolke og vurdere statistikk i en samfunnskontekst.",
    symbol: "▥",
  },
  {
    id: "representasjoner",
    navn: "Representasjoner",
    kortnavn: "Representasjoner",
    beskrivelse: "Sammenhenger mellom tekst, tabell, formel og graf.",
    symbol: "↔",
  },
  {
    id: "lineaere_funksjoner",
    navn: "Lineære funksjoner",
    kortnavn: "Lineære funksjoner",
    beskrivelse: "Stigningstall, konstantledd og praktiske modeller.",
    symbol: "y",
  },
  {
    id: "funksjoner_og_modeller",
    navn: "Funksjoner og modeller",
    kortnavn: "Modeller",
    beskrivelse: "Tolke, bruke og vurdere matematiske modeller.",
    symbol: "f",
  },
  {
    id: "programmering",
    navn: "Programmering",
    kortnavn: "Programmering",
    beskrivelse: "Forstå algoritmer, løkker og matematisk kode.",
    symbol: "</>",
  },
];

export function answerPartCount(question: Question) {
  if (question.fasit.type === "valg") return (question.fasit.aapen ? 0 : question.fasit.riktige.length) + (question.fasit.vurderingskriterier?.length ?? 0);
  if (question.fasit.type === "valg_og_tall") {
    return (question.fasit.valg.aapen ? 0 : question.fasit.valg.riktige.length) + question.fasit.verdier.length + (question.fasit.valg.vurderingskriterier?.length ?? 0);
  }
  return question.fasit.verdier.length;
}
