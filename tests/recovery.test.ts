import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { catalogue } from "../src/odyssey/server/data";
import { discover, discoveryBand, mapText } from "../src/odyssey/catalogue";
import { extractClaims, approveClaims } from "../src/odyssey/documents";
import {
  emptyPerson,
  emptyWorkspace,
  parseWorkspace,
} from "../src/odyssey/profile";
import { capabilityBrain } from "../src/odyssey/capability-model";
import { buildRoadmap, nextRoadmapTopic } from "../src/odyssey/graph";
import type { ExtractedDocument, Catalogue } from "../src/odyssey/types";
test("an empty profile has no invented recommendations", () =>
  assert.deepEqual(discover(catalogue, emptyPerson()), []));
test("specific evidence outranks duplicated generic overlap and unconsented assertions", () => {
  const base = catalogue.occupations[0];
  const data: Catalogue = {
    ...catalogue,
    occupations: [
      { ...base, id: "specific", label: "Specific", essential: ["rare"] },
      ...Array.from({ length: 20 }, (_, i) => ({
        ...base,
        id: "generic" + i,
        label: "Generic " + i,
        essential: [
          "common",
          ...Array.from({ length: 40 }, (_, j) => "other" + j),
        ],
      })),
    ],
  };
  const person = {
    ...emptyPerson(),
    assertions: ["rare", "common"].map((skillId, i) => ({
      id: String(i),
      skillId,
      label: skillId,
      claimId: "c",
      sourceSystem: "user-document",
      sourceRecordId: "doc",
      quote: skillId,
      verification: "document-supported" as const,
      consent: true,
    })),
  };
  assert.equal(discover(data, person)[0].occupation.id, "specific");
  assert.equal(
    discover(data, {
      ...person,
      assertions: person.assertions.map((a) => ({ ...a, consent: false })),
    }).length,
    0,
  );
});
test("three fictional life stages retain literal evidence and produce distinct plausible directions", async () => {
  const top: string[][] = [];
  for (const name of ["school", "university", "professional"]) {
    const text = await readFile(`tests/fixtures/recovery/${name}.txt`, "utf8");
    const doc: ExtractedDocument = {
      id: name,
      name: name + ".txt",
      mime: "text/plain",
      pages: [{ number: 1, text, method: "text" }],
      createdAt: new Date().toISOString(),
      status: "review-required",
    };
    const claims = await extractClaims(doc, catalogue.skills);
    assert.ok(claims.every((c) => text.includes(c.quote)));
    if (name === "school")
      assert.ok(!claims.some((c) => c.kind === "employment"));
    const person = approveClaims(doc, claims, emptyPerson());
    const matches = discover(catalogue, person, 10);
    assert.ok(matches.length > 0);
    assert.ok(
      matches.every((m) => m.shared.length || m.interest.matched.length),
    );
    assert.ok(matches.every((m) => m.requirements.status === "not-assessed"));
    assert.ok(
      matches.every((m) =>
        [
          "Realistic opportunities",
          "Adjacent opportunities",
          "Aspirational opportunities",
        ].includes(discoveryBand(m)),
      ),
    );
    const labels = matches.map((m) => m.occupation.label);
    top.push(labels);
    if (name === "professional") assert.match(labels[0], /software developer/);
    assert.match(
      labels.join(" "),
      name === "school"
        ? /web|interface|software/
        : name === "university"
          ? /econom|financial/
          : /computer|database|intelligence/,
    );
    const o = matches[0].occupation;
    const graph = buildRoadmap(
      o,
      catalogue.skills.filter((s) =>
        [...o.essential, ...o.optional].includes(s.id),
      ),
      [],
    );
    const next = nextRoadmapTopic(graph, person, []);
    assert.ok(next);
    assert.ok(next.resources.some((r) => r.url.startsWith("https://")));
    const before = JSON.parse(JSON.stringify(capabilityBrain(person)));
    const workspace = emptyWorkspace(person);
    workspace.paths = [
      {
        id: "path",
        occupationId: o.id,
        title: o.label,
        createdAt: "now",
        updatedAt: "now",
        completed: [next.id],
        working: [],
        expanded: [],
        routeChoices: {},
      },
    ];
    assert.deepEqual(
      capabilityBrain(parseWorkspace(JSON.stringify(workspace))!.person),
      before,
    );
    assert.ok(
      !person.assertions.some((a) => a.verification.includes("verified")),
    );
  }
  assert.notDeepEqual(top[0], top[1]);
  assert.notDeepEqual(top[1], top[2]);
});
test("non-English section headings preserve original facts without inventing translated capabilities", async () => {
  const text =
    "Formation\nUniversité fictive, 2022 - 2026\nCompétences\nPython\nProjets\nAnalyse de données";
  const claims = await extractClaims(
    { pages: [{ number: 1, text, method: "text" }] } as ExtractedDocument,
    catalogue.skills,
  );
  assert.equal(claims[0].kind, "education");
  assert.equal(claims[1].kind, "skill");
  assert.equal(claims[2].kind, "project");
  assert.ok(claims.every((c) => text.includes(c.quote)));
});

test("broad data analysis cannot assert an absent specialist domain through alias-token unions", () => {
  const mappings = mapText(
    "Statistical analysis of economic data using Python and SQL",
    catalogue.skills,
  );
  assert.ok(!mappings.some((m) => /genetic|biomedical|battery/.test(m.label)));
  assert.ok(mappings.some((m) => /statistic|SQL|Python/.test(m.label)));
});
