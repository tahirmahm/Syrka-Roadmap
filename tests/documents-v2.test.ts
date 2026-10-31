import { test } from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import {
  validateDocument,
  extractDocx,
  extractClaims,
  approveClaims,
  mergeCandidateClaims,
} from "../src/odyssey/documents";
import type { Person } from "../src/odyssey/types";
const p: Person = {
  id: "p",
  name: "A",
  headline: "",
  fictional: false,
  hoursPerWeek: 6,
  interests: [],
  locations: [],
  languages: [],
  budget: "free-resources",
  claims: [],
  assertions: [],
  courses: [],
};
test("DOCX extraction reads text without evaluating macros, embedded code or XML entities", () => {
  const bytes = zipSync({
    "word/document.xml": strToU8(
      "<w:document><w:p><w:r><w:t>Economics course</w:t></w:r></w:p><w:p><w:r><w:t>Research &amp; analysis</w:t></w:r></w:p></w:document>",
    ),
    "word/vbaProject.bin": strToU8("untrusted macro"),
  });
  assert.equal(
    validateDocument(
      bytes,
      "cv.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ),
    "docx",
  );
  const text = extractDocx(bytes);
  assert.ok(text.includes("Economics course"));
  assert.ok(!text.includes("untrusted macro"));
  assert.throws(
    () =>
      extractDocx(
        zipSync({
          "word/document.xml": strToU8(
            '<!DOCTYPE x [<!ENTITY foo SYSTEM "file:///etc/passwd">]><w:document/>',
          ),
        }),
      ),
    /Unsafe/,
  );
});
test("MIME spoofing, empty files, unsafe expansion and unsupported files fail clearly", () => {
  assert.throws(() =>
    validateDocument(strToU8("not a PDF"), "cv.pdf", "application/pdf"),
  );
  assert.throws(() =>
    validateDocument(strToU8("%PDF-12345"), "cv.pdf", "image/png"),
  );
  assert.throws(
    () =>
      validateDocument(
        new Uint8Array(9 * 1024 * 1024),
        "cv.pdf",
        "application/pdf",
      ),
    /8 MB/,
  );
  assert.throws(
    () =>
      extractDocx(
        zipSync({ "word/document.xml": new Uint8Array(17 * 1024 * 1024) }),
      ),
    /large/,
  );
});
test("claims default to selected, respect deselection and preserve source without verification", async () => {
  const doc = {
    id: "d",
    name: "cv.pdf",
    mime: "application/pdf",
    pages: [
      {
        number: 2,
        text: "SKILLS\nData analysis\nEDUCATION\nFictional University 2022–2025",
        method: "text" as const,
      },
    ],
    status: "review-required" as const,
    createdAt: new Date().toISOString(),
  };
  const claims = await extractClaims(doc, [
    { id: "esco:1", label: "Data analysis", aliases: [] },
  ]);
  assert.equal(claims[0].page, 2);
  assert.equal(claims[0].mappings[0].confirmed, false);
  assert.equal(claims[0].mappings[0].selected, true);
  assert.equal(approveClaims(doc, claims, p).assertions.length, 1);
  assert.equal(
    approveClaims(doc, claims, p).assertions[0].verification,
    "document-supported",
  );
  claims[0].mappings[0].selected = false;
  assert.equal(approveClaims(doc, claims, p).assertions.length, 0);
  claims[0].mappings[0].selected = true;
  claims[0].approved = true;
  claims[0].text = "Corrected data analysis";
  const reviewed = approveClaims(doc, claims, p);
  assert.equal(reviewed.assertions[0].quote, "Data analysis");
  assert.equal(reviewed.assertions[0].verification, "self-reported");
});
test("coursework mapping comes from explicit reviewed outcomes, not course titles", () => {
  const claims = [
    {
      id: "c",
      kind: "learning-outcome" as const,
      text: "Interpret economic data",
      quote: "Interpret economic data",
      page: 1,
      section: "Learning outcomes",
      mappings: [
        {
          skillId: "esco:economics",
          label: "Economics",
          method: "exact" as const,
          confidence: "high" as const,
          confirmed: true,
        },
      ],
      approved: true,
    },
  ];
  const result = approveClaims({ id: "d", name: "syllabus" }, claims, p, {
    institution: "Fictional",
    programme: "PPE",
    code: "EC201",
    title: "Econometrics",
    status: "reported-complete",
  });
  assert.equal(result.courses[0].outcomes[0].skillIds[0], "esco:economics");
  assert.equal(result.courses[0].verification, "document-supported");
  assert.equal(result.courses[0].campusUrl, undefined);
});

test("new CV imports reconcile exact duplicates without overwriting edited records", async () => {
  const doc = {
    id: "first",
    name: "first.pdf",
    mime: "application/pdf",
    pages: [
      {
        number: 1,
        text: "TECHNICAL SKILLS\nData analysis\nWORK EXPERIENCE\nResearch internship",
        method: "text" as const,
      },
    ],
  };
  const claims = await extractClaims(
    { ...doc, status: "review-required", createdAt: new Date().toISOString() },
    [{ id: "skill", label: "Data analysis", aliases: [] }],
  );
  const first = approveClaims(doc, claims, p);
  first.claims[0].text = "Manually corrected skill description";
  const next = approveClaims(
    { ...doc, id: "second", name: "new.pdf" },
    claims,
    first,
  );
  assert.equal(next.claims[0].text, "Manually corrected skill description");
  assert.equal(next.claims.length, first.claims.length);
  assert.equal(next.assertions.length, first.assertions.length);
  assert.equal(next.imports?.length, 2);
});

test("AI enhancement preserves edited claims and deselected mappings", async () => {
  const doc = {
    id: "d",
    name: "cv.txt",
    mime: "text/plain",
    pages: [
      { number: 1, text: "SKILLS\nData analysis", method: "text" as const },
    ],
    status: "review-required" as const,
    createdAt: new Date().toISOString(),
  };
  const claims = await extractClaims(doc, [
    { id: "s1", label: "Data analysis", aliases: [] },
  ]);
  claims[0].text = "My edited description";
  claims[0].mappings[0].selected = false;
  const output = mergeCandidateClaims(claims, [
    {
      ...claims[0],
      text: "AI replacement",
      mappings: [
        { ...claims[0].mappings[0], selected: true },
        {
          ...claims[0].mappings[0],
          skillId: "s2",
          label: "Candidate",
          method: "ai-candidate",
          confidence: "low",
        },
      ],
    },
  ]);
  assert.equal(output[0].text, "My edited description");
  assert.equal(output[0].mappings[0].selected, false);
  assert.equal(output[0].mappings[1].selected, true);
  assert.equal(output[0].mappings[1].confirmed, false);
});
