import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import katex from "katex";

const bank = JSON.parse(await readFile(new URL("../public/oppgaver-2027.json", import.meta.url), "utf8"));
const get = (id) => bank.oppgaver.find((q) => q.id === `2py27-${id}`);
const visible = (id) => get(id).hint.join(" ");

test("begge vekstfaktorstier forklarer heltallsprodukt, desimaler og tolkning i rekkefølge", () => {
  for (const [id, product, value] of [["026", "12\\cdot8", 96], ["027", "9\\cdot11", 99]]) {
    const q = get(id);
    const route = q.losningsveier.find((r) => r.id === "vekstfaktorer");
    assert.equal(route.hint.length, 5);
    assert.match(route.hint[2], /Regn uten komma.*=.*=.*=/u);
    assert.ok(route.hint[2].includes(product));
    assert.match(route.hint[3], /Hver opprinnelig faktor har én desimal.*deles på hundre/u);
    assert.ok(route.hint[3].includes(`${value}/100=`));
    assert.ok(route.hint[4].includes(`${value}-100`));
    assert.doesNotMatch(route.forklaring, /kortere/u);
    assert.deepEqual(q.losningsveier[0].hint, q.hint);
    assert.doesNotMatch(q.hint.join(" "), /\\cdot|vekstfaktor/u, "100-kronersveien skal ikke skifte til faktorregning");
  }
});

test("desimaldivisjon omskrives før eleven forventes å utføre den", () => {
  for (const [id, integer] of [["064", "84/21"], ["066", "96/32"]]) {
    assert.match(visible(id), /Gang både teller og nevner med 10/u);
    assert.ok(visible(id).includes(integer));
    assert.match(visible(id), /gjentatt addisjon/u);
  }
  assert.match(visible("186"), /150\/2\{,\}5=300\/5/u);
  assert.match(visible("186"), /Del så 300 på 10 og doble/u);
});

test("skalering bruker korte regneveier i den lille gangetabellen", () => {
  assert.match(visible("109"), /40\/5=8.*8\\cdot8=\\square/u);
  assert.match(visible("110"), /8\\cdot30=240.*30\\cdot10=\\square/u);
  assert.match(visible("112"), /dobbelt.*20\+20=\\square/iu);
  for (const id of ["145"]) {
    assert.match(visible(id), /100\/40=10\/4=2\{,\}5/u);
    assert.match(visible(id), /halv/u);
  }
});

test("vekstkode viser regneoperasjonene bak sporet, ikke bare ferdige verdier", () => {
  for (const id of ["218", "219", "220", "221", "222"]) {
    const hints = get(id).hint;
    assert.match(hints[2], /Regn de første stegene.*\//u);
    assert.match(hints[3], /Fullfør deretter/u);
    assert.doesNotMatch(hints.join(" "), /→|Etter siste runde er verdi/u);
  }
});

test("alle hovedhint og alternative hint har gyldig matematikk", () => {
  for (const q of bank.oppgaver) {
    for (const hints of [q.hint, ...(q.losningsveier ?? []).map((r) => r.hint)]) {
      for (const hint of hints) {
        for (const match of hint.matchAll(/\\\((.*?)\\\)/gu)) {
          assert.doesNotThrow(() => katex.renderToString(match[1], { throwOnError: true, strict: "ignore" }), `${q.id}: ${match[1]}`);
        }
      }
    }
  }
});
