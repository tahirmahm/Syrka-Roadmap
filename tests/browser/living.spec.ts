import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function load(page: Page, label: string) {
  await page.goto("/tree");
  await page.getByRole("button", { name: label, exact: true }).click();
  await expect(page.locator(".tree-player")).toContainText("fictional");
  await expect(page.locator(".tree-footnote")).toContainText(
    "Fictional personal records",
  );
  await expect(page.locator(".tree-notice")).toHaveCount(0);
}
async function inspect(page: Page, label: string) {
  await page.getByLabel("Search the living tree").fill(label);
  await page
    .getByRole("button", { name: "Open search result " + label, exact: true })
    .click();
  await expect(page.getByLabel("Living node inspector")).toContainText(label);
}
async function close(page: Page) {
  await page
    .getByRole("button", { name: "Close tree inspector", exact: true })
    .click();
}
for (const width of [390, 1440]) {
  test(`Living journey A PPE consulting to MBA, expansion and themes at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await load(page, "PPE → Consulting → MBA");
    await inspect(page, "McKinsey · Business Analyst");
    await expect(page.getByLabel("Living node inspector")).toContainText(
      "NOT been verified",
    );
    await page
      .getByRole("button", {
        name: /SUPPORTS APPLICATION TO.*Harvard Business School/s,
      })
      .click();
    await expect(page.getByLabel("Living node inspector")).toContainText(
      "Harvard Business School · MBA",
    );
    await expect(page.getByLabel("Living node inspector")).toContainText(
      "neither required nor sufficient",
    );
    await expect(
      page.getByRole("button", {
        name: /RECOMMENDED PREPARATION.*Verify graduate admissions/s,
      }),
    ).toBeVisible();
    await page
      .getByLabel("Application preparation notes")
      .fill("Fictional admissions questions and evidence plan");
    await page
      .getByRole("button", { name: "Save preparation draft", exact: true })
      .click();
    await expect(page.locator(".tree-toast")).toContainText(
      "No application was submitted",
    );
    await page.screenshot({
      path: info.outputPath("mba-light.png"),
      fullPage: true,
    });
    await close(page);
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!).living
            .applications["goal:mba"].notes,
      ),
    ).toBe("Fictional admissions questions and evidence plan");
    await page.screenshot({
      path: info.outputPath("tree-dark.png"),
      fullPage: true,
    });
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(axe.violations).toEqual([]);
    await page
      .getByRole("button", { name: "Compare routes", exact: true })
      .click();
    await expect(page.getByLabel("Route comparison")).toContainText(
      "Shared preparation",
    );
  });
  test(`Living journey B interdisciplinary PPE risk, semester planning and simulation ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await load(page, "PPE → Geopolitical Risk");
    await inspect(page, "Geopolitical risk analysis");
    await expect(page.getByLabel("Living node inspector")).toContainText(
      "Build an evidence-led geopolitical brief",
    );
    await close(page);
    await inspect(page, "Econometrics and evaluation");
    const before = await page.evaluate(
      () => JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!).person,
    );
    await page
      .getByRole("button", { name: "What if I complete this?", exact: true })
      .click();
    await expect(page.locator(".simulation-banner")).toContainText(
      "hypothetical",
    );
    await expect(
      page.getByRole("button", { name: "Record completion", exact: true }),
    ).toBeDisabled();
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!).person,
      ),
    ).toEqual(before);
    await page.screenshot({
      path: info.outputPath("simulation.png"),
      fullPage: true,
    });
    await close(page);
    await page
      .getByRole("button", { name: "Exit simulation", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Semester lab", exact: true })
      .click();
    await expect(page.getByLabel("Academic planner")).toContainText(
      "Proposed combination",
    );
    await expect(page.getByLabel("Academic planner")).toContainText(
      "FICTIONAL",
    );
    await expect(page.getByLabel("Academic planner")).toContainText(
      "Timetable data is missing",
    );
    await page
      .getByRole("button", { name: "Add to semester", exact: true })
      .first()
      .click();
    await page.reload();
    await page
      .getByRole("button", { name: "Semester lab", exact: true })
      .click();
    await expect(
      page
        .getByRole("button", { name: "Remove from semester", exact: true })
        .first(),
    ).toBeVisible();
  });
  test(`Living journey C tax to research preserves history, quests and Guide ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await load(page, "Tax adviser → Academic Research");
    const original = await page.evaluate(
      () => JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!).person,
    );
    await inspect(page, "Doctoral research transition");
    await expect(page.getByLabel("Living node inspector")).toContainText(
      "do not assume a second undergraduate",
    );
    await page
      .getByLabel("Quest evidence note")
      .fill("Fictional research proposal note");
    await page
      .getByRole("button", { name: "Record completion", exact: true })
      .click();
    await expect(page.locator(".tree-toast")).toContainText("self-reported");
    await close(page);
    await page.getByRole("tab", { name: "History", exact: true }).click();
    await expect(page.locator(".tree-stage")).toContainText("tax advisor");
    await page.screenshot({
      path: info.outputPath("history.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Syrka Guide", exact: true })
      .click();
    await page
      .getByLabel("Ask Syrka Guide")
      .fill("How can tax experience support academic research?");
    await page.getByRole("button", { name: "Ask Guide", exact: true }).click();
    await expect(page.locator(".guide-answer")).toContainText(
      "Local source-grounded guide",
    );
    await expect(page.locator(".guide-answer")).toContainText(
      "programme-specific admissions",
    );
    await close(page);
    await page.reload();
    const state = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!),
    );
    expect(state.person).toEqual(original);
    expect(
      state.living.progress.find(
        (p: { nodeId: string }) => p.nodeId === "goal:doctoral",
      ).evidence,
    ).toBe("Fictional research proposal note");
  });
  test(`Living journey D limited student, no invented work and accessible navigation ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await load(page, "Student · limited experience");
    const state = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!),
    );
    expect(
      state.person.claims.some((c: { kind: string }) =>
        ["employment", "internship"].includes(c.kind),
      ),
    ).toBe(false);
    await inspect(page, "Investigate a question you care about");
    await expect(page.getByLabel("Living node inspector")).toContainText(
      "Credit sources",
    );
    const goals = state.living.goals;
    await close(page);
    expect(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!).living.goals,
      ),
    ).toEqual(goals);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page
      .getByRole("button", { name: "Open next action", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Living node inspector")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByLabel("Living node inspector")).toHaveCount(0);
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
        .violations,
    ).toEqual([]);
  });
}
