import type { Question } from './question-bank';

// These equivalences describe the mathematical work, independent of topic labels.
const patternFamilies: Record<string, string[]> = {
  'andel-i-prosent': ['d1-finne-prosent','d2-samfunn-b','variasjon-d1-andel-av-befolkning','variasjon-d1-svarprosent'],
  'prosentvis-endring': ['d2-samfunn-a','d2-kort-indeks','utvidelse-d2-indeks-nytt-grunnlag'],
  'prosent-og-prosentpoeng': ['d1-prosentpoeng','utvidelse-d1-andel-og-prosentpoeng','d2-kort-samfunn-prosent'],
  'gjentatt-prosentendring': ['d1-sammensatt-prosent','d1-prosent-pastand','utvidelse-d1-to-motsatte-endringer','d2-kort-sammensatt-prosent','d2-sammensatt-prosent-b'],
  'manglende-observasjon': ['d1-manglende-gjennomsnitt','utvidelse-d1-manglende-observasjon'],
  'vektet-gjennomsnitt': ['d1-veid-gjennomsnitt','utvidelse-d2-vektet-gjennomsnitt-grupper'],
  'klassemidtpunkt': ['utvidelse-d1-klassemidtpunkt-anslag','d2-gruppert-b'],
  'formelinnsetting': ['d1-formel-innsetting','d1-grafavlesning','d2-kort-lineaer-verdi','d2-kort-eksponentialverdi','d2-kort-potensmodell','d2-eksponential-b','d2-regresjon-c','d2-figur-a','d2-figur-c','d2-kort-monster-verdi','utvidelse-d2-energi-modellverdi','variasjon-d1-bruke-lineaer-modell','variasjon-d2-formel-til-tabell'],
  'lineaer-likning': ['d1-ligning','d2-kort-monster-invers','variasjon-d1-finne-tid-fra-pris','variasjon-d1-finne-figurnummer','variasjon-d1-nullpunkt-praktisk'],
  'lineaert-skjaeringspunkt': ['d1-lineaert-skjaeringspunkt','d2-kort-lineaert-skjaeringspunkt','d2-lineaer-b','variasjon-d1-skjaeringspunkt-avtaler'],
  'lineaere-parametre': ['d1-stigningstall','d1-lineaer-tabell','utvidelse-d1-lineaer-fra-to-priser','variasjon-d2-tabell-til-lineaer-formel'],
  'tolke-konstantledd': ['d1-tolke-representasjon','variasjon-d1-tolke-konstantledd'],
  'modelltype-fra-data': ['d1-modellvalg','d1-proporsjonal-tabell','d2-regresjon-a','variasjon-d2-tabell-veksttype'],
  'gjennomsnittlig-vekstfart': ['d1-gjennomsnittlig-vekstfart','gjennomsnittlig_vekstfart_del2','utvidelse-d2-energi-gjennomsnittlig-vekstfart','variasjon-d2-enheter-i-tabell'],
  'lineaert-figurmoenster': ['d1-lineart-figurmonster','d2-figur-b','d2-kort-monster-formel','variasjon-d1-fyrstikker-delte-sider'],
  'histogram-fra-tabell': ['d2-kort-histogram','utvidelse-d2-histogram-hoeyder'],
  'aksekritikk': ['d2-kort-samfunn-akse','variasjon-d1-akse-og-visuelt-forhold'],
  'utvalgskritikk': ['d2-kort-samfunn-utvalg','variasjon-d1-representativt-utvalg'],
  'konstruksjon-datasett': ['d2-konstruere-datasett','utvidelse-d2-konstruere-datasett'],
};
const patterns = new Map(Object.entries(patternFamilies).flatMap(([pattern,families])=>families.map(family=>[family,pattern] as const)));
export function taskPattern(question: Question) {
  return patterns.get(question.variantfamilie) ?? question.variantfamilie;
}
export type WorkKind = 'beregne' | 'tolke' | 'representere' | 'resonnere';
export function workKind(question: Question): WorkKind {
  if ((question.fasit.type === 'flere_tall' && question.fasit.konstruksjon) || question.ferdighet.some(s=>/begrunne|generalisere|vurdere/.test(s))) return 'resonnere';
  if (question.ferdighet.some(s=>/skifte_framstilling|velge_diagram|representasjon/.test(s)) || /grafavlesning|histogram|standardform|tabell/.test(question.variantfamilie)) return 'representere';
  if (question.fasit.type === 'valg' || /tolke|modellkritikk|modellbegrensning/.test(question.variantfamilie)) return 'tolke';
  return 'beregne';
}
