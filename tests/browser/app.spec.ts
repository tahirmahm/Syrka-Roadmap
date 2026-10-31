import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { zipSync, strToU8 } from "fflate";
async function nav(page: Page, label: string) {
  if ((page.viewportSize()?.width || 1440) < 768)
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: new RegExp("^" + label) })
    .click();
}
async function choose(page: Page, query: string) {
  await page.goto("/");
  await page.getByLabel("Search career destinations").fill(query);
  await page
    .getByRole("button", { name: "Explore destinations", exact: true })
    .click();
  await expect(page.locator(".career-row").first()).toBeVisible();
  await page
    .locator(".career-row")
    .first()
    .getByRole("button", { name: "Explore roadmap", exact: true })
    .click();
  await expect(page.getByLabel("Search within roadmap")).toBeVisible();
}
async function textPDF(lines: string[]) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  lines.forEach((text, i) =>
    page.drawText(text, { x: 55, y: 740 - i * 30, size: 15, font }),
  );
  return Buffer.from(await doc.save());
}
async function imageCV(page: Page, mime = "image/png") {
  return Buffer.from(
    await page.evaluate((type) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1000;
      canvas.height = 1150;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 1000, 1150);
      ctx.fillStyle = "black";
      ctx.font = "40px Arial";
      [
        "Taylor Candidate",
        "SKILLS",
        "SQL",
        "EDUCATION",
        "Fictional University",
        "Economics 2021 - 2024",
        "GPA 3.7",
      ].forEach((line, i) => ctx.fillText(line, 55, 100 + i * 110));
      return canvas.toDataURL(type).split(",")[1];
    }, mime),
    "base64",
  );
}
async function upload(
  page: Page,
  file: { name: string; mimeType: string; buffer: Buffer },
  academic = false,
) {
  await page.goto(academic ? "/profile" : "/");
  await page
    .getByRole("button", {
      name: academic ? "Import coursework" : "Add your CV",
      exact: true,
    })
    .click();
  await page.getByRole("dialog").getByRole("checkbox").first().check();
  await page.getByLabel("Select CV or academic document").setInputFiles(file);
  await expect(
    page.getByRole("textbox", { name: "Your display name", exact: true }),
  ).toBeVisible({ timeout: 120000 });
  await page
    .getByRole("textbox", { name: "Your display name", exact: true })
    .fill("Taylor Candidate");
}
async function confirmSQL(page: Page) {
  await page
    .getByRole("checkbox", { name: /^Confirm SQL mapping for claim/ })
    .first()
    .check();
  await page
    .getByRole("button", { name: "Confirm profile", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Taylor Candidate", exact: true }),
  ).toBeVisible();
}

test("broad occupational search reaches a non-featured career and source-driven graph", async ({
  page,
  request,
}) => {
  const res = await request.get("/api/catalogue?q=mechanical%20engineer");
  const data = await res.json();
  expect(data.total).toBeGreaterThan(3000);
  expect(data.occupations[0].label).toContain("mechanical engineer");
  await choose(page, "mechanical engineer");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "mechanical engineer",
  );
  await expect(page.locator(".roadmap-explanation")).toContainText(
    "does not establish",
  );
  await expect(page.locator(".onward-grid button")).not.toHaveCount(0);
});
test("AI engineer search disambiguates the source animal-insemination alias", async ({
  page,
}) => {
  await choose(page, "AI engineer");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "artificial intelligence engineer",
  );
  await expect(page.locator(".od-roadmap-heading")).toContainText(
    "Curated learning pathway",
  );
  await expect(page.locator(".od-node")).not.toHaveCount(0);
});
for (const query of ["AI engineer", "economist", "product manager"])
  test(`rich distinct roadmap and learning content: ${query}`, async ({
    page,
  }) => {
    await choose(page, query);
    const text = await page.locator(".od-roadmap-heading p").innerText();
    expect(Number(text.match(/(\d+) topics/)?.[1])).toBeGreaterThan(30);
    await page.getByRole("button", { name: "Reading", exact: true }).click();
    await expect(page.getByLabel("Roadmap reading mode")).toBeVisible();
    const topic = page.locator(".reading-topic").first();
    await topic.click();
    await expect(page.locator(".topic-panel h2")).toBeVisible();
    await page.getByRole("tab", { name: "Learn", exact: true }).click();
    await expect(page.locator(".learning-resource a").first()).toHaveAttribute(
      "href",
      /^https:\/\//,
    );
    await page.getByRole("button", { name: "Quiz Me", exact: true }).click();
    await expect(page.locator(".practice-question")).not.toHaveCount(0);
    await page
      .locator(".practice-question")
      .first()
      .getByRole("button")
      .first()
      .click();
    await expect(
      page.locator(".practice-question").first().locator("p"),
    ).toBeVisible();
  });
test("normal PDF CV is extracted, reviewed, mapped and saved without issuer verification", async ({
  page,
}) => {
  await upload(page, {
    name: "fictional-cv.pdf",
    mimeType: "application/pdf",
    buffer: await textPDF([
      "Taylor Candidate",
      "SKILLS",
      "SQL",
      "Python (computer programming)",
      "EDUCATION",
      "Fictional University 2021 - 2024",
      "GPA 3.7",
    ]),
  });
  const texts = await page
    .locator(".claim-card textarea")
    .evaluateAll((xs) => xs.map((x) => (x as HTMLTextAreaElement).value));
  expect(texts.join(" ")).toContain("Fictional University");
  await confirmSQL(page);
  await expect(page.locator(".assertion-table")).toContainText("SQL");
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!),
  );
  expect(
    state.person.assertions.some((a: { skillId: string }) =>
      a.skillId.endsWith("598de5b0-5b58-4ea7-8058-a4bc4d18c742"),
    ),
  ).toBe(true);
  expect(
    state.person.assertions.every((a: { verification: string }) =>
      ["document-supported", "inferred"].includes(a.verification),
    ),
  ).toBe(true);
  expect(
    state.person.claims.every((c: { approved: boolean }) => c.approved),
  ).toBe(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Taylor Candidate", exact: true }),
  ).toBeVisible();
});
test("DOCX CV parses document XML and preserves source quotations", async ({
  page,
}) => {
  const buffer = Buffer.from(
    zipSync({
      "word/document.xml": strToU8(
        "<w:document><w:body><w:p><w:r><w:t>Taylor Candidate</w:t></w:r></w:p><w:p><w:r><w:t>SKILLS</w:t></w:r></w:p><w:p><w:r><w:t>SQL</w:t></w:r></w:p><w:p><w:r><w:t>PROJECTS</w:t></w:r></w:p><w:p><w:r><w:t>Fictional public policy research project</w:t></w:r></w:p></w:body></w:document>",
      ),
    }),
  );
  await upload(page, {
    name: "fictional-cv.docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer,
  });
  await expect(
    page.locator(".claim-card").filter({ hasText: "PROJECTS" }),
  ).not.toHaveCount(0);
  await confirmSQL(page);
  await expect(page.locator(".assertion-table")).toContainText("user-document");
});
test("scanned PDF runs local OCR and produces reviewable text", async ({
  page,
}) => {
  test.setTimeout(150000);
  await page.goto("/");
  const image = await imageCV(page);
  const pdf = await PDFDocument.create();
  const png = await pdf.embedPng(image);
  const sheet = pdf.addPage([1000, 1150]);
  sheet.drawImage(png, { x: 0, y: 0, width: 1000, height: 1150 });
  await upload(page, {
    name: "fictional-scan.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await pdf.save()),
  });
  await expect(page.locator(".review-summary")).toContainText("1 OCR");
  const values = await page
    .locator(".claim-card textarea")
    .evaluateAll((xs) => xs.map((x) => (x as HTMLTextAreaElement).value));
  expect(values.join(" ").toLowerCase()).toContain("fictional university");
  await confirmSQL(page);
});
for (const mime of ["image/png", "image/jpeg"])
  test(`local image OCR extracts ${mime}`, async ({ page }) => {
    test.setTimeout(150000);
    await page.goto("/");
    const buffer = await imageCV(page, mime);
    await upload(page, {
      name: mime === "image/png" ? "fictional-cv.png" : "fictional-cv.jpg",
      mimeType: mime,
      buffer,
    });
    await expect(page.locator(".review-summary")).toContainText("1 OCR");
    await confirmSQL(page);
  });
test("unsafe or spoofed files fail without changing profile; cancellation remains available", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add your CV", exact: true }).click();
  await page.getByRole("dialog").getByRole("checkbox").first().check();
  await page.getByLabel("Select CV or academic document").setInputFiles({
    name: "fake.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("not a real PDF"),
  });
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "contents",
  );
  await page.getByRole("button", { name: "Close document import" }).click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!).person.assertions
          .length,
    ),
  ).toBe(0);
});
test("fictional coursework links to source competency with provenance", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Load fictional demonstration", exact: true })
    .click();
  await expect(page.getByText("Fictional demo", { exact: true })).toBeVisible();
  await choose(page, "economist");
  await page.getByRole("button", { name: "Reading", exact: true }).click();
  await page
    .getByLabel("Search within roadmap")
    .fill("Econometric foundations");
  await page.locator(".reading-topic").first().click();
  await page.getByRole("tab", { name: /My Coursework/ }).click();
  await expect(
    page.getByRole("heading", { name: "EC202 · Econometrics", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".topic-panel")).toContainText(
    "Fictional Northbridge University",
  );
  await expect(page.locator(".topic-panel")).toContainText(
    "document-supported",
  );
});
test("academic upload maps explicit learning outcomes rather than course title", async ({
  page,
}) => {
  await upload(
    page,
    {
      name: "fictional-syllabus.pdf",
      mimeType: "application/pdf",
      buffer: await textPDF([
        "Taylor Candidate",
        "LEARNING OUTCOMES",
        "SQL",
        "ASSESSMENTS",
        "SQL analysis project",
      ]),
    },
    true,
  );
  await page
    .getByLabel("Institution", { exact: true })
    .fill("Fictional Testing University");
  await page.getByLabel("Programme", { exact: true }).fill("Fictional PPE");
  await page
    .getByLabel("Course title", { exact: true })
    .fill("Quantitative Methods");
  await page.getByLabel("Course code", { exact: true }).fill("QM201");
  await confirmSQL(page);
  await expect(page.locator(".course-grid")).toContainText("QM201");
  const w = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!),
  );
  expect(w.person.courses[0].outcomes[0].skillIds.length).toBeGreaterThan(0);
  expect(w.person.courses[0].verification).toBe("document-supported");
});
test("compare shows actual shared and distinct requirements and opens a competency", async ({
  page,
}) => {
  await page.goto("/discover");
  await page.getByLabel("Search occupations").fill("economist");
  await page
    .getByRole("button", { name: "Compare economist", exact: true })
    .click();
  await page.getByLabel("Search occupations").fill("data analyst");
  await page
    .getByRole("button", { name: "Compare data analyst", exact: true })
    .click();
  await nav(page, "Compare paths");
  await expect(page.locator(".comparison-table thead")).toContainText(
    "economist",
  );
  await expect(page.locator(".comparison-table thead")).toContainText(
    "data analyst",
  );
  await page
    .getByLabel("Shared or distinct requirements")
    .selectOption("shared");
  await expect(page.locator(".comparison-table tbody")).toContainText(
    "Shared requirement",
  );
  await page
    .getByRole("button", { name: "Inspect competency", exact: true })
    .first()
    .click();
  await expect(page.locator(".topic-panel")).toBeVisible();
});
test("progress and route changes persist without changing evidence or other destinations", async ({
  page,
}) => {
  await choose(page, "economist");
  await page.getByRole("button", { name: "Reading", exact: true }).click();
  await page.locator(".reading-topic").first().click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: /Project-based practice/ }).click();
  const before = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!).person.assertions,
  );
  await page
    .getByRole("button", { name: "Mark completed", exact: true })
    .click();
  await page.getByRole("button", { name: "Close topic details" }).click();
  await page.getByRole("button", { name: "Save roadmap", exact: true }).click();
  await page.reload();
  await expect(page.locator(".od-roadmap-heading")).toContainText(
    "1 self-reported",
  );
  await choose(page, "AI engineer");
  await expect(page.locator(".od-roadmap-heading")).toContainText(
    "0 self-reported",
  );
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!),
  );
  expect(state.paths.length).toBe(2);
  expect(state.person.assertions).toEqual(before);
  expect(state.paths[0].routeChoices["topic:micro"]).toBe("project");
});
test("AI disabled still supports catalogue, graph and deterministic learning endpoint", async ({
  request,
}) => {
  const c = await (await request.get("/api/catalogue?q=economist")).json();
  const r = await request.post("/api/learning", {
    data: {
      occupationId: c.occupations[0].id,
      topicId: "topic:micro",
      action: "quiz",
      consent: false,
      evidenceCount: 0,
    },
  });
  expect(r.status()).toBe(200);
  const lesson = await r.json();
  expect(lesson.provider).toBe("deterministic");
  expect(lesson.quiz.length).toBeGreaterThan(0);
  expect(
    (
      await request.post("/api/cv/interpret", {
        data: { consent: false, pages: [] },
      })
    ).status(),
  ).toBe(400);
});
for (const width of [320, 375, 390, 430, 768, 1024, 1440])
  test(`responsive navigation, detailed roadmap and focused reading at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await choose(page, "economist");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width < 768) {
      await expect(page.getByLabel("Roadmap reading mode")).toBeVisible();
      await page.locator(".reading-topic").first().click();
      await expect(
        page.getByRole("dialog", { name: /Topic details/ }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Close topic details" }).click();
    } else {
      await page
        .getByRole("button", { name: "Focus current position" })
        .click();
      await page.getByRole("button", { name: "Reading", exact: true }).click();
      await page.locator(".reading-topic").first().click();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
test("home and document consent dialog pass automated accessibility checks", async ({
  page,
}) => {
  await page.goto("/");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Add your CV", exact: true }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
test("legacy storage is preserved and untrusted issuer flags are downgraded", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "syrka-roadmaps:v1",
      JSON.stringify({
        version: 1,
        profile: {
          name: "Legacy Person",
          headline: "Legacy",
          fictional: false,
          hoursPerWeek: 6,
          evidence: [
            {
              id: "1",
              skillId: "sql",
              title: "Claim",
              verification: "institution-verified",
              sourceSystem: "old",
              sourceRecordId: "1",
              consent: true,
            },
          ],
        },
      }),
    ),
  );
  await page.goto("/profile");
  await expect(
    page.getByRole("heading", { name: "Legacy Person", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("syrka-roadmaps:v1")),
  ).not.toBeNull();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!),
  );
  expect(state.person.assertions[0].verification).toBe("document-supported");
});

test("fictional multidisciplinary CV flows directly to personalized careers with persistent bulk selection", async ({
  page,
}) => {
  await upload(page, {
    name: "fictional-multidisciplinary-cv.pdf",
    mimeType: "application/pdf",
    buffer: await textPDF([
      "Avery Fictional Student",
      "EDUCATION",
      "Northbridge University PPE 2021 - 2024",
      "WORK EXPERIENCE",
      "Policy research internship 2023",
      "PROJECTS",
      "SQL and economic data analysis project",
      "TECHNICAL SKILLS",
      "SQL",
      "Python (computer programming)",
      "economics",
      "apply statistical analysis techniques",
      "conduct literature research",
      "project management",
      "data analysis",
      "LANGUAGES",
      "English",
      "INTERESTS",
      "economics, research, policy",
      "SKILLS",
      "communication",
      "critical thinking",
    ]),
  });
  await expect(
    page
      .getByRole("checkbox", { name: /^Confirm .* mapping for claim/ })
      .first(),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "Deselect All capabilities", exact: true })
    .click();
  expect(
    await page
      .getByRole("checkbox", { name: /^Confirm .* mapping for claim/ })
      .evaluateAll((xs) => xs.every((x) => !(x as HTMLInputElement).checked)),
  ).toBe(true);
  await page.getByRole("button", { name: /^Select All capabilities/ }).click();
  await page
    .getByRole("button", { name: "Continue to career discovery", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Explore careers", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "My possibilities" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".career-row").first()).toBeVisible();
  await page.locator(".match-explanation summary").first().click();
  await expect(page.locator(".match-explanation").first()).toContainText(
    "Capabilities from your profile:",
  );
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!),
  );
  expect(state.person.assertions.length).toBeGreaterThan(3);
  expect(
    state.person.assertions.every(
      (a: { selected: boolean; verification: string }) =>
        a.selected !== false && !a.verification.includes("verified"),
    ),
  ).toBe(true);
  expect(
    state.person.claims.some((c: { kind: string }) => c.kind === "employment"),
  ).toBe(true);
  expect(
    state.person.claims.some((c: { kind: string }) => c.kind === "education"),
  ).toBe(true);
  expect(state.person.imports[0].name).toBe(
    "fictional-multidisciplinary-cv.pdf",
  );
  await nav(page, "My Capabilities");
  await page
    .getByRole("button", { name: "Deselect All capabilities", exact: true })
    .click();
  await page.reload();
  expect(
    await page
      .getByRole("checkbox", { name: /^Use .* for career discovery/ })
      .evaluateAll((xs) => xs.every((x) => !(x as HTMLInputElement).checked)),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Select All capabilities", exact: true })
    .click();
  await nav(page, "Explore Careers");
  await expect(page.locator(".career-row").first()).toBeVisible();
  await page
    .locator(".career-row")
    .first()
    .getByRole("button", { name: "Explore roadmap", exact: true })
    .click();
  await expect(page.locator(".personalized-roadmap-summary")).toContainText(
    "topics have selected profile claims",
  );
  await page.getByRole("button", { name: "Reading", exact: true }).click();
  await page.locator(".reading-topic").first().click();
  await page
    .getByRole("button", { name: "Mark completed", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Close topic details", exact: true })
    .click();
  await page.getByRole("button", { name: "Save roadmap", exact: true }).click();
  await page.reload();
  await expect(page.locator(".od-roadmap-heading")).toContainText(
    "1 self-reported",
  );
  await nav(page, "Explore Careers");
  await page.getByRole("tab", { name: "Full catalogue", exact: true }).click();
  await page.getByLabel("Search occupations").fill("mechanical engineer");
  await expect(page.locator(".career-row").first()).toContainText(
    "mechanical engineer",
  );
});

test("pasted fictional CVs produce different recommendations and global selection survives filtering", async ({
  page,
  browser,
  request,
}) => {
  const titles: string[][] = [];
  for (const [i, career] of [
    "software developer",
    "nurse responsible for general care",
  ].entries()) {
    const ctx = i === 0 ? null : await browser.newContext();
    const p = ctx ? await ctx.newPage() : page;
    try {
      const search = await (
        await request.get("/api/catalogue?q=" + encodeURIComponent(career))
      ).json();
      expect(search.occupations.length).toBeGreaterThan(0);
      const bundle = await (
        await request.get(
          "/api/catalogue?id=" + encodeURIComponent(search.occupations[0].id),
        )
      ).json();
      const labels = bundle.skills
        .filter((s: { id: string }) =>
          bundle.occupation.essential.includes(s.id),
        )
        .slice(0, 8)
        .map((s: { label: string }) => s.label);
      expect(labels.length).toBeGreaterThan(2);
      await p.goto("/");
      await p.getByRole("button", { name: "Add your CV", exact: true }).click();
      await p.getByRole("dialog").getByRole("checkbox").first().check();
      await p.getByText("Paste résumé text instead", { exact: true }).click();
      await p
        .getByLabel("Paste résumé text", { exact: true })
        .fill(
          [
            `Fictional Candidate ${i + 1}`,
            "EDUCATION",
            `Fictional University ${i === 0 ? "Computer Science" : "Nursing"} 2021 - 2024`,
            "WORK EXPERIENCE",
            `Fictional ${i === 0 ? "software team" : "clinical practice"} internship`,
            "SKILLS",
            ...labels,
          ].join("\n"),
        );
      await p
        .getByRole("button", { name: "Build profile from text", exact: true })
        .click();
      await expect(
        p.getByRole("textbox", { name: "Your display name", exact: true }),
      ).toHaveValue(`Fictional Candidate ${i + 1}`);
      await p
        .getByRole("button", {
          name: "Continue to career discovery",
          exact: true,
        })
        .click();
      await expect(p.locator(".career-row").first()).toBeVisible();
      titles.push(await p.locator(".career-title").allTextContents());
      await nav(p, "My Capabilities");
      await p
        .getByLabel("Search my capabilities", { exact: true })
        .fill(labels[0]);
      await expect(p.locator(".assertion-table article").first()).toBeVisible();
      await p
        .getByRole("button", { name: "Deselect All capabilities", exact: true })
        .click();
      const state = await p.evaluate(() =>
        JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!),
      );
      expect(
        state.person.assertions.every(
          (a: { selected: boolean }) => a.selected === false,
        ),
      ).toBe(true);
      await p.getByLabel("Search my capabilities", { exact: true }).fill("");
      await p
        .getByRole("button", { name: "Select All capabilities", exact: true })
        .click();
      await p
        .getByLabel("Filter my capabilities by category")
        .selectOption("Technical");
      await p.getByLabel("Filter my capabilities by category").selectOption("");
    } finally {
      await ctx?.close();
    }
  }
  expect(titles[0].slice(0, 8)).not.toEqual(titles[1].slice(0, 8));
});

test("resource completion and self-reported evidence notes persist without issuing capabilities", async ({
  page,
}) => {
  await choose(page, "economist");
  await page.getByRole("button", { name: "Reading", exact: true }).click();
  await page.locator(".reading-topic").first().click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page
    .getByRole("checkbox", { name: /^Mark resource completed:/ })
    .first()
    .check();
  await page.getByRole("tab", { name: "My Evidence", exact: true }).click();
  await page
    .getByLabel("Evidence note or project reference")
    .fill(
      "Fictional practice project: compared two economic policy arguments. Self-reported reference only.",
    );
  await page
    .getByRole("button", { name: "Attach evidence note", exact: true })
    .click();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!),
  );
  expect(state.paths[0].completedResources.length).toBe(1);
  expect(state.paths[0].evidenceNotes.length).toBe(1);
  expect(state.person.assertions.length).toBe(0);
  expect(state.paths[0].completed.length).toBe(0);
  await page.reload();
  await page.getByRole("button", { name: "Reading", exact: true }).click();
  await page.locator(".reading-topic").first().click();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: /^Mark resource completed:/ }).first(),
  ).toBeChecked();
  await page.getByRole("tab", { name: "My Evidence", exact: true }).click();
  await expect(page.locator(".evidence-row").first()).toContainText(
    "Fictional practice project",
  );
});

test("labelled simulated AI outage preserves profile and progress and supplies deterministic guidance", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Load fictional demonstration", exact: true })
    .click();
  await choose(page, "economist");
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!),
  );
  await page.route("**/api/learning", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Fixture: AI quota exhausted or service unavailable",
      }),
    }),
  );
  await page.getByRole("button", { name: "Reading", exact: true }).click();
  await page.locator(".reading-topic").first().click();
  await page
    .getByRole("checkbox", { name: /Use the configured external AI provider/ })
    .check();
  await page
    .getByRole("button", { name: "Quick Explain", exact: true })
    .click();
  await expect(page.locator(".lesson")).toContainText(
    "Fixture: AI quota exhausted",
  );
  await expect(page.locator(".lesson")).toContainText(
    "Deterministic learning guide",
  );
  const after = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!),
  );
  expect(after.person).toEqual(before.person);
  expect(after.paths).toEqual(before.paths);
});

test("explicit CV AI consent invokes the isolated adapter while retaining local claims (fixture)", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/cv/interpret", (route) => {
    calls++;
    const body = route.request().postDataJSON();
    expect(body.consent).toBe(true);
    expect(body.pages[0].text).toContain("SQL");
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        claims: [],
        notice: "Fixture: no extra claims; original extraction retained",
      }),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Add your CV", exact: true }).click();
  await page.getByRole("dialog").getByRole("checkbox").first().check();
  await page
    .getByRole("checkbox", {
      name: /Use Qwen to interpret this CV after text extraction/,
    })
    .check();
  await page.getByLabel("Select CV or academic document").setInputFiles({
    name: "fictional-ai-consent.pdf",
    mimeType: "application/pdf",
    buffer: await textPDF(["Fictional AI Candidate", "SKILLS", "SQL"]),
  });
  await expect(
    page.getByRole("textbox", { name: "Your display name", exact: true }),
  ).toHaveValue("Fictional AI Candidate");
  expect(calls).toBe(1);
  await expect(
    page.getByRole("checkbox", { name: /^Confirm SQL mapping/ }).first(),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "Continue to career discovery", exact: true })
    .click();
  await expect(page.locator(".career-row").first()).toBeVisible();
});

test("career guidance uses deterministic evidence when AI is unavailable (fixture)", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Load fictional demonstration", exact: true })
    .click();
  await expect(page.getByText("Fictional demo", { exact: true })).toBeVisible();
  await nav(page, "Explore Careers");
  await expect(page.locator(".career-row").first()).toBeVisible();
  await page
    .getByRole("checkbox", { name: /Allow Qwen career guidance/ })
    .check();
  await page
    .locator(".career-row")
    .first()
    .getByRole("button", { name: "Explain with Flash", exact: true })
    .click();
  await expect(page.locator(".career-guidance").first()).toContainText(
    "Deterministic career guidance",
  );
  await expect(page.locator(".career-guidance").first()).toContainText(
    "Formal qualifications",
  );
});

test("cancelling document processing returns to upload without changing the saved profile", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add your CV", exact: true }).click();
  await page.getByRole("dialog").getByRole("checkbox").first().check();
  await page.route("**/api/catalogue?mode=skills", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      await route.continue();
    } catch {}
  });
  await page.getByLabel("Select CV or academic document").setInputFiles({
    name: "fictional-cancel.pdf",
    mimeType: "application/pdf",
    buffer: await textPDF([
      "Fictional Cancellation Candidate",
      "SKILLS",
      "SQL",
      "Python (computer programming)",
    ]),
  });
  await page
    .getByRole("button", { name: "Cancel processing", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Choose file", exact: true }),
  ).toBeVisible();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!),
  );
  expect(state.person.assertions).toEqual([]);
  expect(state.person.claims).toEqual([]);
});
