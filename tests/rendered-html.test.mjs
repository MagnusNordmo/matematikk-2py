import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("gjengir den ferdige elevappen uten utviklingsmerking", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.doesNotMatch(html, developmentPreviewMeta);
  assert.match(html, /Matematikk 2PY/);
});

test("den selvstendige kontrollsiden inneholder hele banken", async () => {
  const html = await readFile(new URL("../public/oppgaver-og-hint.html", import.meta.url), "utf8");
  const match = html.match(/<script id="question-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(match, "Mangler innebygd oppgavebank");
  const embedded = JSON.parse(match[1].replaceAll("<\\/script", "</script"));
  assert.equal(embedded.oppgaver.length, 500);
  assert.equal(embedded.groups, 50);
  assert.equal(embedded.oppgaver.filter((question) => question.del === 1).length, 262);
  assert.equal(embedded.oppgaver.filter((question) => question.del === 2).length, 238);
  assert.ok(html.includes("data:font/woff2;base64,"));
  assert.ok(html.includes('id="part-filters"'));
  assert.doesNotMatch(html, /\b(?:500|262|238) oppgaver\b/);
  assert.doesNotMatch(html, /\b50 Del 2-case\b/);
});

test("elevflaten viser ikke størrelsen på oppgavebanken", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\b(?:500|262|238) oppgaver\b/);
  assert.doesNotMatch(source, /\b50 case\b/);
});
