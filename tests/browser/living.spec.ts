import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function openTools(page: Page) {
  if (
    !(await page
      .getByRole("button", { name: "Close tools", exact: true })
      .isVisible())
  )
    await page
      .getByRole("button", { name: "Explore & tools", exact: true })
      .click();
}
async function closeTools(page: Page) {
  const close = page.getByRole("button", { name: "Close tools", exact: true });
  if (await close.isVisible()) await close.click();
}
async function revealNodeDetails(page: Page, name: string | RegExp) {
  const summary = page
    .getByLabel("Living node inspector", { exact: true })
    .locator("summary")
    .filter({ hasText: name })
    .first();
  if ((await summary.locator("..").getAttribute("open")) === null)
    await summary.click();
}
async function load(page: Page, label: string) {
  await page.goto("/tree");
  await expect(page.locator("[data-workspace-ready=true]")).toBeVisible();
  if (
    await page
      .getByRole("button", { name: "Switch to light theme", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Switch to light theme", exact: true })
      .click();
  await openTools(page);
  const destinations = page.locator(".tree-universe-search");
  if ((await destinations.getAttribute("open")) === null)
    await destinations.locator("summary").click();
  await page.getByRole("button", { name: label, exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!).person
            .fictional,
      ),
    )
    .toBe(true);
  await closeTools(page);
  await expect(
    page.getByLabel("Discipline wheel", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".tree-notice")).toHaveCount(0);
}
async function inspect(page: Page, label: string) {
  if (!(await page.getByLabel("Search the living tree").isVisible()))
    await openTools(page);
  await page.getByLabel("Search the living tree").fill(label);
  await page
    .getByRole("button", { name: "Open search result " + label, exact: true })
    .click();
  await expect(page.getByLabel("Living node inspector")).toContainText(label);
  await closeTools(page);
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
    await expect(page.locator(".radial-scene")).toHaveClass(/radial-overview/);
    await expect(
      page.getByLabel("Discipline wheel", { exact: true }),
    ).toBeVisible();
    await expect(page.locator(".tree-canvas")).toHaveCount(0);
    await expect(page.getByLabel("Living tree reading mode")).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath("discipline-wheel-before.png"),
      fullPage: true,
    });
    await inspect(page, "McKinsey · Business Analyst");
    await expect(
      page.locator(".radial-branch-node.is-selected"),
    ).toBeAttached();
    await page.getByRole("button", { name: /^Show preparation/ }).click();
    await expect(
      page.getByRole("button", { name: /^Collapse branch/ }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!).living
              .navigation.expanded,
        ),
      )
      .toContain("goal:mckinsey");
    await expect(
      page.getByRole("region", { name: /preparation tree$/ }),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath("discipline-branch-expanded.png"),
      fullPage: true,
    });
    await expect(page.getByLabel("Living node inspector")).toContainText(
      "NOT been verified",
    );
    await revealNodeDetails(page, /^Related paths and shared preparation/);
    await page
      .getByRole("button", {
        name: /SUPPORTS APPLICATION TO.*Harvard Business School/s,
      })
      .click();
    await expect(page.getByLabel("Living node inspector")).toContainText(
      "Harvard Business School · MBA",
    );
    await revealNodeDetails(page, /^Related paths and shared preparation/);
    await expect(page.getByLabel("Living node inspector")).toContainText(
      "neither required nor sufficient",
    );
    await expect(
      page.getByRole("button", {
        name: /RECOMMENDED PREPARATION.*Verify graduate admissions/s,
      }),
    ).toBeVisible();
    await revealNodeDetails(page, "Application preparation draft");
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
    await openTools(page);
    await page.getByRole("button", { name: "Compare", exact: true }).click();
    await expect(page.getByLabel("Route comparison")).toContainText(
      "Shared preparation",
    );
    await page.goto("/roadmaps");
    await expect(page.getByLabel("Living goals")).toContainText(
      "Harvard Business School",
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
    await revealNodeDetails(page, "Goals, comparison and simulation");
    await page
      .getByRole("button", { name: "What if I complete this?", exact: true })
      .click();
    await expect(page.locator(".simulation-banner")).toContainText(
      "hypothetical",
    );
    await revealNodeDetails(page, "Completion criteria and progress notes");
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
    await openTools(page);
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
    await expect(page.locator("[data-workspace-ready=true]")).toBeVisible();
    await openTools(page);
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
    await revealNodeDetails(page, "Source, scope and uncertainty");
    await expect(page.getByLabel("Living node inspector")).toContainText(
      "do not assume a second undergraduate",
    );
    await revealNodeDetails(page, "Completion criteria and progress notes");
    await page
      .getByLabel("Quest evidence note")
      .fill("Fictional research proposal note");
    await page
      .getByRole("button", { name: "Record completion", exact: true })
      .click();
    await expect(page.locator(".tree-toast")).toContainText("self-reported");
    await close(page);
    await openTools(page);
    await page.getByRole("button", { name: "History", exact: true }).click();
    await expect(
      page.getByLabel("Evidence inventory", { exact: true }),
    ).toContainText("tax advisor");
    await page.screenshot({
      path: info.outputPath("history.png"),
      fullPage: true,
    });
    await close(page);
    await openTools(page);
    await page
      .getByRole("button", { name: "Show reading tree", exact: true })
      .click();
    await closeTools(page);
    await expect(page.getByLabel("Living tree reading mode")).toContainText(
      "Doctoral research transition",
    );
    await page.screenshot({
      path: info.outputPath("research-outline.png"),
      fullPage: true,
    });
    await openTools(page);
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
    await page.goto("/progress");
    await expect(page.getByLabel("Living quest progress")).toContainText(
      "Fictional research proposal note",
    );
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
    await revealNodeDetails(page, "Completion criteria and progress notes");
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
    await page.getByRole("button", { name: /^Today ·/ }).click();
    const dock = page.getByRole("complementary", {
      name: "Today and this week quest dock",
      exact: true,
    });
    await dock.locator(".journey-next-action .primary").focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("region", { name: "Action work surface", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("region", { name: "Action work surface", exact: true }),
    ).toHaveCount(0);
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
        .violations,
    ).toEqual([]);
  });
}

test("reviewed education chronology survives CV import without converting attendance into a degree (fictional text)", async ({
  page,
}) => {
  await page.goto("/tree");
  await expect(page.locator("[data-workspace-ready=true]")).toBeVisible();
  await page
    .getByRole("button", { name: "Explore & tools", exact: true })
    .click();
  await page.getByRole("button", { name: "Add your CV", exact: true }).click();
  await page.getByRole("dialog").getByRole("checkbox").first().check();
  await page.getByText("Paste résumé text instead", { exact: true }).click();
  await page
    .getByLabel("Paste résumé text", { exact: true })
    .fill(
      "Fictional Lifecycle Candidate\nEDUCATION\nAttended Example University 2017–2019, degree incomplete\nCurrently enrolled at Example Institute, expected 2028\nPROJECTS\nReviewed public budget data using statistical methods and wrote a sourced research report.",
    );
  await page
    .getByRole("button", { name: "Build profile from text", exact: true })
    .click();
  const states = page.getByRole("combobox", {
    name: /Education status for claim/,
  });
  await expect(states).toHaveCount(2);
  await expect(states.nth(0)).toHaveValue("incomplete");
  await expect(states.nth(1)).toHaveValue("current");
  await page
    .getByRole("button", { name: "Continue to career discovery", exact: true })
    .click();
  const person = await page.evaluate(
    () => JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!).person,
  );
  expect(
    person.claims
      .filter((c: { kind: string }) => c.kind === "education")
      .map((c: { educationState: string }) => c.educationState),
  ).toEqual(["incomplete", "current"]);
  await page.goto("/tree");
  await expect(page.locator("[data-workspace-ready=true]")).toBeVisible();
  await page
    .getByRole("button", { name: "Explore & tools", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open evidence inventory", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Suggest evidence connections",
      exact: true,
    }),
  ).toBeDisabled();
  // Explicit fixture tests the review UI, never claims live Qwen access.
  await page.route("**/api/relationships", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        relationships: [],
        uncertainties: [
          "Fixture: insufficient evidence for a formal requirement.",
        ],
        notice: "Fixture: model transport not used.",
      }),
    }),
  );
  await page
    .getByRole("checkbox", { name: /I consent to sending these up to eight/ })
    .check();
  await page
    .getByRole("button", { name: "Suggest evidence connections", exact: true })
    .click();
  await expect(
    page.getByLabel("Evidence inventory", { exact: true }),
  ).toContainText("Fixture: model transport not used.");
});
