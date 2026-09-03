import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bank = JSON.parse(
  await readFile(new URL("../public/oppgaver-2027.json", import.meta.url), "utf8"),
);

test("middels prosentoppgaver har synlige tallforhold for hoderegning", () => {
  const byId = new Map(bank.oppgaver.map((question) => [question.id, question]));

  for (const [id, part, whole] of [
    ["2py27-008", 110, 400],
    ["2py27-009", 130, 400],
  ]) {
    const question = byId.get(id);
    assert.equal(question.niva, 2, `${id} skal fortsatt være middels`);
    assert.equal(question.kontroll.inndata.del, part);
    assert.equal(question.kontroll.inndata.hel, whole);
    assert.match(question.sporsmal, new RegExp(`\\\\\\(${part}\\\\\\) av \\\\\\(${whole}\\\\\\)`));
    assert.ok(
      question.hint.join(" ").includes("25 %") && question.hint.join(" ").includes("2,5 %"),
      `${id} skal kunne løses med synlige prosentbiter`,
    );
  }
});
