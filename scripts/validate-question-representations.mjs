import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = dirname(scriptDir);
const bank = JSON.parse(
  await readFile(join(projectDir, "public", "oppgaver-2027.json"), "utf8"),
);

const supportedTypes = new Set([
  "figurmønster",
  "funksjonsgraf",
  "funksjonsgrafer",
  "gruppert_søylediagram",
  "histogramdata",
  "omvendt_proporsjonal_graf",
  "programkode",
  "prosentforløp",
  "punktdiagram",
  "sammenlignende_punktdiagram",
  "spredningsdiagram",
  "tabell",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function isFiniteNumberArray(value) {
  return isNonEmptyArray(value) && value.every(Number.isFinite);
}

function tabularColumns(data) {
  if (!isRecord(data)) return null;
  const columns = Object.entries(data).filter(([, value]) => Array.isArray(value));
  if (columns.length < 2 || columns[0][1].length === 0) return null;
  return columns.every(([, values]) => values.length === columns[0][1].length)
    ? columns
    : null;
}

function isRenderableExpression(expression) {
  const compact = String(expression ?? "").replace(/\s/g, "");
  return [
    /^([+-]?\d+(?:\.\d+)?)\*([+-]?\d+(?:\.\d+)?)\^x$/,
    /^([+-]?\d+(?:\.\d+)?)\+([+-]?\d+(?:\.\d+)?)\*x$/,
    /^([+-]?\d+(?:\.\d+)?)\*x\+([+-]?\d+(?:\.\d+)?)$/,
  ].some((pattern) => pattern.test(compact));
}

function validateVisualization(owner) {
  const visualization = owner.visualisering;
  if (!visualization) return;
  const prefix = `${owner.id} (${visualization.type})`;
  assert(supportedTypes.has(visualization.type), `${prefix} har en visualisering appen ikke støtter.`);

  switch (visualization.type) {
    case "tabell": {
      assert(isNonEmptyArray(visualization.kolonner), `${prefix} mangler kolonner.`);
      assert(isNonEmptyArray(visualization.rader), `${prefix} mangler rader.`);
      assert(
        visualization.rader.every((row) => Array.isArray(row) && row.length === visualization.kolonner.length),
        `${prefix} har rader som ikke passer med kolonnene.`,
      );
      break;
    }
    case "figurmønster": {
      const values = isNonEmptyArray(visualization.verdier)
        ? visualization.verdier
        : visualization.figurer?.map((figure) => figure.antall);
      assert(isFiniteNumberArray(values), `${prefix} mangler figurer som kan tegnes.`);
      assert(visualization.tekstalternativ?.trim(), `${prefix} mangler en tekstbeskrivelse.`);
      break;
    }
    case "gruppert_søylediagram": {
      assert(isNonEmptyArray(visualization.kategorier), `${prefix} mangler kategorier.`);
      assert(isNonEmptyArray(visualization.serier), `${prefix} mangler dataserier.`);
      assert(
        visualization.serier.every((series) =>
          series.navn?.trim() && isFiniteNumberArray(series.verdier) && series.verdier.length === visualization.kategorier.length),
        `${prefix} har en dataserie som ikke passer med kategoriene.`,
      );
      break;
    }
    case "histogramdata": {
      assert(isFiniteNumberArray(visualization.klassegrenser), `${prefix} mangler klassegrenser.`);
      assert(isFiniteNumberArray(visualization.frekvenser), `${prefix} mangler frekvenser.`);
      assert(
        visualization.klassegrenser.length === visualization.frekvenser.length + 1,
        `${prefix} må ha én flere klassegrense enn frekvenser.`,
      );
      assert(
        visualization.klassegrenser.every((value, index, values) => index === 0 || value > values[index - 1]),
        `${prefix} har klassegrenser som ikke er strengt stigende.`,
      );
      break;
    }
    case "prosentforløp": {
      assert(isNonEmptyArray(visualization.etiketter), `${prefix} mangler etiketter.`);
      assert(isFiniteNumberArray(visualization.verdier), `${prefix} mangler verdier.`);
      assert(visualization.etiketter.length === visualization.verdier.length, `${prefix} har ulikt antall etiketter og verdier.`);
      break;
    }
    case "sammenlignende_punktdiagram": {
      assert(isNonEmptyArray(visualization.serier), `${prefix} mangler dataserier.`);
      assert(
        visualization.serier.every((series) => series.navn?.trim() && isFiniteNumberArray(series.verdier)),
        `${prefix} har en tom eller ugyldig dataserie.`,
      );
      break;
    }
    case "punktdiagram":
    case "spredningsdiagram": {
      assert(isFiniteNumberArray(visualization.x), `${prefix} mangler x-verdier.`);
      assert(isFiniteNumberArray(visualization.y), `${prefix} mangler y-verdier.`);
      assert(visualization.x.length === visualization.y.length, `${prefix} har ulikt antall x- og y-verdier.`);
      break;
    }
    case "funksjonsgraf":
    case "funksjonsgrafer": {
      assert(isNonEmptyArray(visualization.grafer), `${prefix} mangler funksjoner.`);
      assert(
        visualization.grafer.every((graph) => graph.etikett?.trim() && isRenderableExpression(graph.uttrykk)),
        `${prefix} har et funksjonsuttrykk som ikke kan tegnes.`,
      );
      break;
    }
    case "omvendt_proporsjonal_graf": {
      assert(Number.isFinite(visualization.x_min) && Number.isFinite(visualization.x_max), `${prefix} mangler x-område.`);
      assert(visualization.x_max > visualization.x_min, `${prefix} har ugyldig x-område.`);
      assert(Number.isFinite(visualization.fast_ledd), `${prefix} mangler fastledd.`);
      assert(Number.isFinite(owner.data?.observasjon?.x) && Number.isFinite(owner.data?.observasjon?.T), `${prefix} mangler observasjonen som bestemmer grafen.`);
      break;
    }
    case "programkode": {
      assert(visualization.kode?.trim(), `${prefix} mangler programkode.`);
      break;
    }
  }
}

const groupsById = new Map(bank.oppgavegrupper.map((group) => [group.id, group]));
const allOwners = [...bank.oppgaver, ...bank.oppgavegrupper];

for (const owner of allOwners) {
  validateVisualization(owner);
  if (owner.data?.tabell) {
    assert(tabularColumns(owner.data.tabell), `${owner.id} har en tabell med tomme kolonner eller ulike kolonnelengder.`);
  }
}

function contextsFor(question) {
  const group = question.oppgavegruppe ? groupsById.get(question.oppgavegruppe.id) : null;
  return group ? [question, group] : [question];
}

function hasTable(contexts) {
  return contexts.some((owner) =>
    owner.visualisering?.type === "tabell" ||
    tabularColumns(owner.data?.tabell) ||
    tabularColumns(owner.data),
  );
}

function hasVisualization(contexts, acceptedTypes) {
  return contexts.some((owner) => acceptedTypes.has(owner.visualisering?.type));
}

for (const question of bank.oppgaver) {
  const contexts = contextsFor(question);
  if (/\btabell(?:en|er|ene)?\b/i.test(question.sporsmal)) {
    assert(hasTable(contexts), `${question.id} viser til en tabell som ikke kan presenteres som tabell.`);
  }
  if (/\bfigur(?:en|er|ene|mønster(?:et|e)?)?\b/i.test(question.sporsmal)) {
    assert(hasVisualization(contexts, new Set(["figurmønster"])), `${question.id} viser til en figur som ikke kan tegnes.`);
  }
  if (/\b(?:program(?:met|mer|mene)?|kode(?:n)?)\b/i.test(question.sporsmal)) {
    assert(hasVisualization(contexts, new Set(["programkode"])), `${question.id} viser til programkode som ikke blir vist.`);
  }
  if (/\b(?:grafen viser|les av[^.]*graf|grafen nedenfor|diagrammet viser|histogrammet viser)\b/i.test(question.sporsmal)) {
    assert(
      hasVisualization(contexts, new Set([
        "funksjonsgraf",
        "funksjonsgrafer",
        "gruppert_søylediagram",
        "histogramdata",
        "omvendt_proporsjonal_graf",
        "punktdiagram",
        "sammenlignende_punktdiagram",
        "spredningsdiagram",
      ])),
      `${question.id} viser til en graf eller et diagram som ikke kan tegnes.`,
    );
  }
}

for (const group of bank.oppgavegrupper) {
  const text = `${group.tittel} ${group.innledning}`;
  const contexts = [group];
  if (/\btabell(?:en|er|ene)?\b/i.test(text)) {
    assert(hasTable(contexts), `${group.id} viser til en tabell som ikke kan presenteres som tabell.`);
  }
  if (/\bfigur(?:en|er|ene|mønster(?:et|e)?)?\b/i.test(text)) {
    assert(hasVisualization(contexts, new Set(["figurmønster"])), `${group.id} viser til en figur som ikke kan tegnes.`);
  }
  if (/\b(?:program(?:met|mer|mene)?|kode(?:n)?)\b/i.test(text)) {
    assert(hasVisualization(contexts, new Set(["programkode"])), `${group.id} viser til programkode som ikke blir vist.`);
  }
}

console.log(
  `Representasjonskontroll bestått: ${allOwners.filter((owner) => owner.visualisering).length} visualiseringer og ${allOwners.filter((owner) => owner.data?.tabell).length} innebygde tabeller.`,
);
