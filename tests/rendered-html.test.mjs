import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("alle oppgaver har en forklarende hintstige", async () => {
  const bankUrl = new URL("../public/oppgaver.json", import.meta.url);
  const bank = JSON.parse(await readFile(bankUrl, "utf8"));

  assert.equal(bank.oppgaver.length, 80);
  const hintCounts = new Set();

  for (const question of bank.oppgaver) {
    hintCounts.add(question.hints.length);
    assert.ok(
      question.hints.length >= 2,
      `${question.id} har for få hint til å forklare løsningen`,
    );
    assert.ok(
      question.hints.every((hint) => hint.trim().length >= 10),
      `${question.id} har et hint som er for kort til å forklare steget`,
    );
    assert.ok(
      question.hints.at(-1).trim().length >= 10,
      `${question.id} mangler et forklarende sluttsteg`,
    );
  }

  assert.ok(
    hintCounts.size >= 4,
    "Antall hint skal følge løsningslengden, ikke en fast mal",
  );

  const percentChange = bank.oppgaver.find(
    (question) => question.id === "p-09",
  );
  assert.ok(percentChange, "Mangler kontrolloppgaven p-09");
  assert.match(
    percentChange.hints.join(" "),
    /\\frac\{50\}\{200\}=\\frac\{25\}\{100\}/,
    "p-09 må forklare omformingen fra 50/200 til 25/100",
  );
  assert.match(
    percentChange.hints.at(-1),
    /25\s*%/,
    "p-09 må føre eleven helt fram til 25 %",
  );

  const proportionality = bank.oppgaver.find(
    (question) => question.id === "pr-01",
  );
  assert.ok(proportionality, "Mangler kontrolloppgaven pr-01");
  const proportionalityHints = proportionality.hints.join(" ");
  assert.match(
    proportionalityHints,
    /0,4=40\\%/,
    "pr-01 må forklare at 0,4 er det samme som 40 %",
  );
  assert.match(
    proportionalityHints,
    /120:10=12/,
    "pr-01 må vise hvordan 10 % av 120 blir 12",
  );
  assert.match(
    proportionalityHints,
    /4\\cdot12=48/,
    "pr-01 må vise hvordan 40 % av 120 blir 48",
  );
});
