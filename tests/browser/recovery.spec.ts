import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { zipSync, strToU8 } from "fflate";
import AxeBuilder from "@axe-core/playwright";
for (const width of [390, 1440]) {
  for (const [profile, name, format, expected] of [
    ["school", "Alex Fictional", "text", /web|interface|software/],
    ["university", "Sam Fictional", "pdf", /econom|financial/],
    [
      "professional",
      "Morgan Fictional",
      "docx",
      /computer|database|intelligence/,
    ],
  ] as const)
    test(`recovery: ${profile} ${format} journey at ${width}px (local, no live provider)`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 950 });
      const text = await readFile(
        `tests/fixtures/recovery/${profile}.txt`,
        "utf8",
      );
      await page.goto("/");
      await expect(page.locator("[data-workspace-ready=true]")).toBeVisible();
      await page
        .getByRole("button", { name: "Explore & tools", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Add your CV", exact: true })
        .click();
      await page.getByRole("dialog").getByRole("checkbox").first().check();
      if (format === "text") {
        await page
          .getByText("Paste résumé text instead", { exact: true })
          .click();
        await page.getByLabel("Paste résumé text", { exact: true }).fill(text);
        await page
          .getByRole("button", { name: "Build profile from text" })
          .click();
      } else if (format === "pdf") {
        const doc = await PDFDocument.create(),
          p = doc.addPage([612, 792]),
          font = await doc.embedFont(StandardFonts.Helvetica);
        text
          .trim()
          .split("\n")
          .forEach((line, i) =>
            p.drawText(line, { x: 40, y: 750 - i * 25, size: 12, font }),
          );
        await page.getByLabel("Select CV or academic document").setInputFiles({
          name: "fictional-university.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from(await doc.save()),
        });
      } else {
        const xml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${text
          .trim()
          .split("\n")
          .map((line) => `<w:p><w:r><w:t>${line}</w:t></w:r></w:p>`)
          .join("")}</w:document>`;
        await page.getByLabel("Select CV or academic document").setInputFiles({
          name: "fictional-professional.docx",
          mimeType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          buffer: Buffer.from(zipSync({ "word/document.xml": strToU8(xml) })),
        });
      }
      await page
        .getByRole("textbox", { name: "Your display name", exact: true })
        .fill(name);
      // Exercise a real correction before the explicit approval boundary.
      await page
        .locator(".claim-card textarea")
        .first()
        .fill(name + " — reviewed");
      await page.screenshot({
        path: info.outputPath("review.png"),
        fullPage: true,
      });
      await page
        .getByRole("button", {
          name: "Continue to career discovery",
          exact: true,
        })
        .click();
      await expect(page.locator(".career-row").first()).toBeVisible();
      const titles = await page.locator(".career-title").allTextContents();
      expect(titles.slice(0, 10).join(" ")).toMatch(expected);
      await page.locator(".match-explanation summary").first().click();
      await expect(page.locator(".supporting-evidence").first()).toBeVisible();
      await expect(page.locator(".match-dimensions").first()).toContainText(
        /Realistic|Adjacent|Aspirational/,
      );
      await page.screenshot({
        path: info.outputPath("careers.png"),
        fullPage: true,
      });
      await page
        .locator(".career-row")
        .first()
        .getByRole("button", { name: "Explore roadmap", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Open next task", exact: true })
        .click();
      await expect(page.locator(".topic-panel")).toContainText(
        "How to demonstrate it",
      );
      await page.getByRole("tab", { name: "Learn", exact: true }).click();
      await expect(
        page.locator(".learning-resource a").first(),
      ).toHaveAttribute("href", /^https:\/\//);
      await page
        .getByRole("button", { name: "Mark completed", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Close topic details", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Save roadmap", exact: true })
        .click();
      await page.screenshot({
        path: info.outputPath("roadmap.png"),
        fullPage: true,
      });
      await page.reload();
      await expect(page.locator(".od-roadmap-heading")).toContainText(
        "1 self-reported",
      );
      await page.goto("/");
      await expect(page.locator("[data-workspace-ready=true]")).toBeVisible();
      await page
        .getByRole("button", { name: "Explore & tools", exact: true })
        .click();
      await expect(page.getByLabel("Your professional overview")).toContainText(
        name,
      );
      await expect(
        page.getByRole("button", { name: "Resume my roadmap" }),
      ).toBeVisible();
      await expect(
        page.locator(".living-node,.tree-reading-node").first(),
      ).toBeVisible();
      await page.screenshot({
        path: info.outputPath("overview.png"),
        fullPage: true,
      });
      const state = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!),
      );
      expect(state.person.claims[0].text).toContain("reviewed");
      if (profile === "school")
        expect(
          state.person.claims.some(
            (c: { kind: string }) => c.kind === "employment",
          ),
        ).toBe(false);
      expect(
        state.person.assertions.some((a: { verification: string }) =>
          a.verification.includes("verified"),
        ),
      ).toBe(false);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    });
}
test("account snapshot endpoint requires auth and rejects cross-origin mutation", async ({
  request,
}) => {
  expect((await request.get("/api/workspace")).status()).toBe(401);
  expect(
    (
      await request.put("/api/workspace", {
        headers: { Origin: "https://example.com" },
        data: {},
      })
    ).status(),
  ).toBe(403);
});

test("correcting an extracted skill clears stale mappings and preserves the original quote", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("[data-workspace-ready=true]")).toBeVisible();
  await page
    .getByRole("button", { name: "Explore & tools", exact: true })
    .click();
  await page.getByRole("button", { name: "Add your CV", exact: true }).click();
  await page.getByRole("dialog").getByRole("checkbox").first().check();
  await page.getByText("Paste résumé text instead", { exact: true }).click();
  await page
    .getByLabel("Paste résumé text", { exact: true })
    .fill("Correction Fictional\nSKILLS\nPython\nINTERESTS\ndata analysis");
  await page.getByRole("button", { name: "Build profile from text" }).click();
  await page
    .getByRole("textbox", { name: "Your display name", exact: true })
    .fill("Correction Fictional");
  await page
    .getByRole("textbox", { name: "Claim 2 text", exact: true })
    .fill("SQL");
  const claim = page.locator(".claim-card").nth(1);
  await expect(
    claim.getByRole("checkbox", { name: /Confirm .*Python/ }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Refresh capability suggestions for claim 2" })
    .click();
  await expect(
    claim.getByRole("checkbox", { name: /Confirm SQL mapping/ }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "Continue to career discovery", exact: true })
    .click();
  await expect(page.locator(".career-row").first()).toBeVisible();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!),
  );
  expect(
    state.person.assertions.some((a: { label: string }) =>
      a.label.includes("Python"),
    ),
  ).toBe(false);
  const sql = state.person.assertions.find(
    (a: { label: string }) => a.label === "SQL",
  );
  expect(sql.quote).toBe("Python");
  expect(sql.verification).toBe("self-reported");
});
