import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("destination search, graph details, routes, progress and persistent resume", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Where would you like to go?" }),
  ).toBeVisible();
  await page.getByLabel("Search career destinations").fill("front-end");
  await page
    .getByRole("button", { name: "Explore destinations", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Front-end developer", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Data analyst", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Build this roadmap" }).click();
  await expect(
    page.getByRole("heading", { name: "Front-end developer", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open JavaScript foundations", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", {
      name: "Details for JavaScript foundations",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mark completed", exact: true })
    .click();
  await page.getByRole("button", { name: "Close details" }).click();
  await page
    .getByRole("button", { name: "Expand routes for JavaScript foundations" })
    .click();
  await expect(
    page.getByRole("button", { name: "Open Guided learning" }),
  ).toBeAttached();
  await page.getByRole("button", { name: "Save roadmap", exact: true }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "Open JavaScript foundations", exact: true })
    .click();
  await expect(
    page
      .getByRole("complementary", {
        name: "Details for JavaScript foundations",
      })
      .getByText("Completed · self-reported", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close details" }).click();
  await page.getByRole("button", { name: "My progress", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Undo completion" }),
  ).toHaveCount(1);
});
test("compare changes destination and fictional evidence is explicit", async ({
  page,
}) => {
  await page.goto("/compare");
  await expect(
    page.getByRole("heading", { name: "Data analyst", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", { name: "Data analyst", exact: true }),
    })
    .getByRole("button", { name: "Choose this direction" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Data analyst", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "My capabilities", exact: true })
    .click();
  await expect(
    page.getByText("Fictional demonstration records", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("inferred", { exact: true })).toBeVisible();
});
test("invalid import reports error and does not replace profile", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import Passport", exact: true })
    .click();
  await page.getByRole("checkbox").check();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":2}'),
    });
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "does not match",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("consented import preserves provenance and downgrades verification", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import Passport", exact: true })
    .click();
  await page.getByRole("checkbox").check();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "passport.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          version: 1,
          name: "Taylor",
          headline: "Starting fresh",
          hoursPerWeek: 8,
          consent: true,
          evidence: [
            {
              id: "a",
              skillId: "sql",
              title: "Claim",
              verification: "institution-verified",
              sourceSystem: "export",
              sourceRecordId: "record-123",
              timestamp: "2026-01-01T00:00:00Z",
              consent: true,
            },
          ],
        }),
      ),
    });
  await expect(
    page.getByRole("heading", { name: "Taylor", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("document-supported", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("export / record-123", { exact: true }),
  ).toBeVisible();
});
for (const width of [320, 375, 390, 430, 768, 1024, 1440])
  test(`responsive home and roadmap at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Where would you like to go?" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width <= 850) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page
        .getByRole("button", { name: "My roadmap", exact: true })
        .click();
    } else
      await page
        .getByRole("button", { name: "My roadmap", exact: true })
        .click();
    await expect(page.getByLabel("Interactive career roadmap")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Open Interaction design", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Interaction design", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
test("home meets automated accessibility checks", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
test("deterministic explanation works without credentials", async ({
  request,
}) => {
  const r = await request.post("/api/explain", {
    data: { destinationId: "data-analyst" },
  });
  expect(r.ok()).toBe(true);
  expect((await r.json()).provider).toBe("deterministic");
  expect(
    (
      await request.post("/api/explain", {
        data: { destinationId: "nonexistent" },
      })
    ).status(),
  ).toBe(400);
});
test("ESCO source requirements expand with stable source-backed nodes", async ({
  page,
}) => {
  await page.goto("/roadmap");
  await page
    .getByRole("button", {
      name: "Expand routes for Review occupational requirements",
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Open use markup languages",
      exact: true,
    }),
  ).toBeAttached();
  await page
    .getByRole("button", {
      name: "Open Review occupational requirements",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Authoritative source", exact: true }),
  ).toBeVisible();
});
test("roadmap keyboard list opens detail and pan/zoom controls work", async ({
  page,
}) => {
  await page.goto("/roadmap");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await page.getByRole("button", { name: "Return to starting point" }).click();
  await page
    .locator(".canvas-tools")
    .getByRole("button", { name: "Fit roadmap", exact: true })
    .click();
  await page
    .getByText("Accessible roadmap list & pathway explanation", { exact: true })
    .click();
  const item = page
    .locator(".accessible-map")
    .getByRole("button", {
      name: "Interaction design — Missing prerequisite",
      exact: true,
    });
  await item.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Interaction design", exact: true }),
  ).toBeVisible();
});
