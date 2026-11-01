import { test, expect, type Page } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import type { Workspace } from "../../src/odyssey/types";
import type { JourneyAction } from "../../src/journey/schema";
const CLOCK = "2026-11-03T08:00:00.000Z";
const STORAGE = "syrka-roadmaps:v2";
const state = (page: Page) =>
  page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE,
  ) as Promise<Workspace>;
const dock = (page: Page) =>
  page.getByRole("complementary", {
    name: "Today and this week quest dock",
    exact: true,
  });
async function load(page: Page, label = "PPE → Consulting → MBA") {
  await page.clock.setFixedTime(new Date(CLOCK));
  await page.goto("/tree");
  await expect(page.locator("[data-workspace-ready=true]")).toBeVisible();
  await page.locator(".tree-universe-search summary").click();
  await page.getByRole("button", { name: label, exact: true }).click();
  await expect(page.locator(".tree-player")).toContainText("fictional");
  await expect(page.locator(".tree-notice")).toHaveCount(0);
  if (
    await page
      .getByRole("button", { name: "Dismiss message", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Dismiss message", exact: true })
      .click();
  await expect(dock(page)).toBeVisible();
}
async function close(page: Page) {
  await page
    .getByRole("button", { name: "Close tree inspector", exact: true })
    .click();
}
async function inspect(page: Page, label: string) {
  if (
    !(await page
      .getByLabel("Search the living tree", { exact: true })
      .isVisible())
  )
    await page
      .getByRole("button", { name: "Explore & tools", exact: true })
      .click();
  await page.getByLabel("Search the living tree", { exact: true }).fill(label);
  await page
    .getByRole("button", { name: "Open search result " + label, exact: true })
    .click();
  if (
    await page
      .getByRole("button", { name: "Close tools", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Close tools", exact: true })
      .click();
  if (
    await page
      .getByRole("button", { name: "Expand node sheet", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Expand node sheet", exact: true })
      .click();
  await expect(page.locator(".tree-inspector")).toContainText(label);
}
async function inbox(page: Page) {
  if (
    await page
      .getByRole("button", { name: "Close tree inspector", exact: true })
      .isVisible()
  )
    await close(page);
  await dock(page)
    .getByRole("button", { name: "Open integration inbox", exact: true })
    .click();
  await expect(page.locator(".journey-inbox")).toBeVisible();
}
async function review(page: Page, payload: unknown, pretty = false) {
  await page
    .getByLabel("Action import format", { exact: true })
    .selectOption("json");
  await page
    .getByLabel("Action import text", { exact: true })
    .fill(JSON.stringify(payload, null, pretty ? 2 : undefined));
  await page
    .getByRole("checkbox", {
      name: /I am authorised to use this source export/,
    })
    .check();
  await page
    .getByRole("button", { name: "Review imported actions", exact: true })
    .click();
  await expect(
    page.getByLabel("Pending action imports", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Accept reviewed import", exact: true })
    .last()
    .click();
}

for (const width of [390, 1440])
  test(`Odyssey A: next action visible, one activation opens real work, draft and self-report persist (${width}px fictional)`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await load(page);
    await expect(dock(page).locator(".journey-next-action")).toContainText(
      "Complete the public-policy essay",
    );
    await expect(dock(page).locator(".journey-action-reason")).toContainText(
      "deadline",
    );
    await expect(
      page.getByLabel("Living tree reading mode", { exact: true }),
    ).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath("entry-dark.png"),
      fullPage: true,
    });
    const original = (await state(page)).person;
    // One activation from the initially visible dock opens its actual local work surface.
    await dock(page)
      .getByRole("button", { name: "Continue essay", exact: true })
      .click();
    await expect(page.locator(".journey-action-surface")).toContainText(
      "Complete the public-policy essay",
    );
    await expect(
      page.getByLabel("Action work notes", { exact: true }),
    ).toBeEditable();
    await page
      .getByLabel("Action work notes", { exact: true })
      .fill(
        "Fictional sourced outline: I used SQL and data analysis to compare a public budget table, documented the method and limitations.",
      );
    await page
      .getByLabel("Action evidence note", { exact: true })
      .fill(
        "Fictional working draft only; no institution has reviewed it. I used SQL and data analysis to compare a public budget table and documented the method and limitations.",
      );
    await page
      .getByRole("button", { name: "Save action draft", exact: true })
      .click();
    await expect(page.locator(".journey-action-surface")).toContainText(
      "No submission or qualification was verified",
    );
    await page.screenshot({
      path: info.outputPath("action-work.png"),
      fullPage: true,
    });
    await page.locator(".journey-evidence-review summary").click();
    await expect(
      page.getByRole("button", { name: "Record action complete", exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("checkbox", {
        name: "I completed the action and have reviewed its completion criteria.",
        exact: true,
      })
      .check();
    await page
      .getByRole("button", { name: "Record action complete", exact: true })
      .click();
    await expect(page.locator(".journey-action-surface")).toContainText(
      "self-reported activity",
    );
    const after = await state(page);
    expect(after.person).toEqual(original);
    expect(
      after.living!.journey!.actions.find(
        (a) => a.source.recordId === "ppe-essay",
      )?.progress,
    ).toBe("completed");
    expect(
      after.living!.journey!.actions.find(
        (a) => a.source.recordId === "ppe-class",
      )?.progress,
    ).toBe("planned");
    await page.reload();
    await expect(dock(page)).toBeVisible();
    const saved = (await state(page)).living!.journey!.actions.find(
      (a) => a.source.recordId === "ppe-essay",
    )!;
    expect(saved.notes).toContain("Fictional sourced outline");
    expect(saved.evidenceStatus).toBe("self-reported");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.screenshot({
      path: info.outputPath("entry-reduced-motion.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Switch to light theme", exact: true })
      .click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.screenshot({
      path: info.outputPath("entry-light.png"),
      fullPage: true,
    });
    // Actual authored work becomes evidence only through the existing explicit local review.
    if (
      await page
        .getByRole("button", { name: "Expand node sheet", exact: true })
        .isVisible()
    )
      await page
        .getByRole("button", { name: "Expand node sheet", exact: true })
        .click();
    let aiCalls = 0;
    page.on("request", (r) => {
      if (r.url().includes("/api/cv/interpret")) aiCalls++;
    });
    await page
      .getByRole("button", { name: "Review work as evidence", exact: true })
      .click();
    const review = page.locator(".document-modal");
    await expect(review).toContainText("Review your work as evidence");
    await expect(
      review.getByRole("button", {
        name: "Build profile from text",
        exact: true,
      }),
    ).toBeDisabled();
    await review.getByRole("checkbox").first().check();
    await expect(
      review.getByLabel("Paste résumé text", { exact: true }),
    ).toHaveValue(/SQL and data analysis/);
    await review
      .getByRole("button", { name: "Build profile from text", exact: true })
      .click();
    await expect(
      review.getByRole("checkbox", { name: /^Confirm SQL mapping/ }).first(),
    ).toBeChecked();
    await review
      .getByRole("button", { name: "Confirm profile", exact: true })
      .click();
    await expect(page.locator(".document-modal")).toHaveCount(0);
    const reviewed = await state(page),
      added = reviewed.person.assertions.filter(
        (a) => !original.assertions.some((old) => old.id === a.id),
      );
    expect(added.length).toBeGreaterThan(0);
    expect(reviewed.person.fictional).toBe(true);
    expect(added.every((a) => a.verification === "self-reported")).toBe(true);
    expect(reviewed.person.courses).toEqual(original.courses);
    expect(reviewed.living!.goals).toEqual(after.living!.goals);
    expect(
      reviewed.person.claims.some((c) =>
        c.quote.includes("SQL and data analysis"),
      ),
    ).toBe(true);
    expect(aiCalls).toBe(0);
    expect(
      reviewed.person.imports?.some(
        (record) => record.name === "User-authored work note.txt",
      ),
    ).toBe(true);
    await expect(
      page.getByLabel("Progression universe", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath("reviewed-work-return-to-route.png"),
      fullPage: true,
    });
  });

test("Odyssey A source update: reviewed extension reranks work, duplicate does not multiply it, same-version conflict preserves deadline", async ({
  page,
}) => {
  await load(page);
  const initial = await state(page),
    journey = initial.living!.journey!,
    essay = journey.actions.find((a) => a.source.recordId === "ppe-essay")!;
  const deadline = "2026-11-13T08:00:00.000Z";
  const changed = {
    ...essay,
    source: { ...essay.source, version: 2, observedAt: CLOCK },
    deadline: {
      kind: "instant",
      at: deadline,
      timezone: journey.timezone,
      confirmed: true,
      authority: "source",
    },
    updatedAt: CLOCK,
  };
  const payload = {
    version: "syrka.actions/1",
    ownerId: journey.ownerId,
    tenantId: essay.source.tenantId,
    actions: [changed],
  };
  await inbox(page);
  await review(page, payload);
  await expect(page.locator(".journey-inbox")).toContainText("1 updated");
  await review(page, payload, true);
  await expect(page.locator(".journey-inbox")).toContainText(
    "1 duplicates ignored",
  );
  const updated = (await state(page)).living!.journey!;
  expect(
    updated.actions.filter(
      (a) =>
        a.source.app === essay.source.app &&
        a.source.recordId === essay.source.recordId,
    ),
  ).toHaveLength(1);
  expect(
    updated.actions.find((a) => a.source.recordId === "ppe-essay")?.deadline,
  ).toMatchObject({ kind: "instant", at: deadline });
  await close(page);
  await expect(
    dock(page).locator(".journey-alternative-title").first(),
  ).toHaveText("Prepare for the internship interview");
  await inbox(page);
  await review(page, {
    ...payload,
    actions: [
      {
        ...changed,
        deadline: { ...changed.deadline, at: "2026-11-20T08:00:00.000Z" },
      },
    ],
  });
  await expect(page.locator(".journey-inbox")).toContainText(
    "same-version source content conflicts",
  );
  expect(
    (await state(page)).living!.journey!.actions.find(
      (a) => a.source.recordId === "ppe-essay",
    )?.deadline,
  ).toMatchObject({ at: deadline });
  expect((await state(page)).person).toEqual(initial.person);
});

test("Odyssey B: pin, shared collapse, recursive child and Back preserve route context, zoom and canonical evidence", async ({
  page,
}, info) => {
  await load(page);
  const person = (await state(page)).person;
  await inspect(page, "McKinsey · Business Analyst");
  await page.getByRole("button", { name: "Pin route", exact: true }).click();
  const pinned = (await state(page)).living!.navigation!;
  expect(pinned.pinned).toContain("goal:mckinsey");
  await inspect(page, "Statistics");
  const child = (await state(page)).living!.navigation!;
  expect(child.selected).toMatch(/^cap:|^subject:/);
  expect(child.routeId).toBe("goal:mckinsey");
  expect(child.camera.zoom).toBeCloseTo(pinned.camera.zoom, 2);
  await page.goBack();
  await expect(page.locator(".tree-inspector")).toContainText(
    "McKinsey · Business Analyst",
  );
  expect((await state(page)).living!.navigation!.selected).toBe(
    "goal:mckinsey",
  );
  await inspect(page, "Statistics");
  await page
    .getByRole("button", { name: "Back to previous tree context", exact: true })
    .click();
  await expect(page.locator(".tree-inspector")).toContainText(
    "McKinsey · Business Analyst",
  );
  expect((await state(page)).living!.navigation!.camera.zoom).toBeCloseTo(
    pinned.camera.zoom,
    2,
  );
  await inspect(page, "Geopolitical risk analysis");
  await page
    .getByRole("button", { name: "Collapse branch", exact: true })
    .click();
  const collapsed = (await state(page)).living!.navigation!;
  expect(collapsed.expanded).not.toContain("goal:risk");
  expect(collapsed.pinned).toContain("goal:mckinsey");
  await close(page);
  await page
    .getByRole("button", { name: "Explore & tools", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Show reading tree", exact: true })
    .click();
  await page.getByRole("button", { name: "Close tools", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Inspect Statistics", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("shared-route-reading-alternative.png"),
    fullPage: true,
  });
  expect((await state(page)).person).toEqual(person);
});

test("Odyssey C: preview and OSINT simulation leave actual evidence and adopted goals unchanged", async ({
  page,
}, info) => {
  await load(page);
  const before = await state(page);
  await inspect(page, "Geopolitical risk analysis");
  await page
    .getByRole("button", { name: "Try this route", exact: true })
    .click();
  await expect(page.locator(".journey-preview-banner")).toContainText(
    "goals and actual evidence unchanged",
  );
  await inspect(page, "OSINT research");
  await page
    .getByRole("button", { name: "What if I complete this?", exact: true })
    .click();
  await expect(page.locator(".simulation-banner")).toContainText(
    "hypothetical",
  );
  await page.screenshot({
    path: info.outputPath("adjacent-hypothetical.png"),
    fullPage: true,
  });
  await close(page);
  await page
    .getByRole("button", { name: "Exit simulation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Discard preview", exact: true })
    .click();
  const after = await state(page);
  expect(after.person).toEqual(before.person);
  expect(after.living!.goals).toEqual(before.living!.goals);
  expect(after.living!.progress).toEqual(before.living!.progress);
  expect(after.living!.navigation!.previewRouteId).toBeNull();
});

test("Odyssey D: weekly budget exposes impossible workload and elective comparison preserves the saved plan", async ({
  page,
}, info) => {
  await load(page);
  const before = await state(page);
  await dock(page).getByRole("tab", { name: "This week", exact: true }).click();
  await page.getByLabel("Weekly available minutes", { exact: true }).fill("30");
  await expect(
    page.getByLabel("Weekly workload plan", { exact: true }),
  ).toContainText("This plan does not fit");
  await expect(
    page.getByLabel("Weekly workload plan", { exact: true }),
  ).toContainText("obligations have not been moved");
  expect(
    (await state(page)).living!.journey!.actions.find(
      (a) => a.source.recordId === "ppe-class",
    )?.event,
  ).toEqual(
    before.living!.journey!.actions.find(
      (a) => a.source.recordId === "ppe-class",
    )?.event,
  );
  await page
    .getByRole("button", { name: "Explore & tools", exact: true })
    .click();
  await page.getByRole("button", { name: "Semester lab", exact: true }).click();
  await page
    .getByText("Compare two elective combinations", { exact: true })
    .click();
  await page
    .getByRole("checkbox", {
      name: "Combination A: Econometrics and evaluation",
      exact: true,
    })
    .check();
  await page
    .getByRole("checkbox", {
      name: "Combination B: Political theory and argument",
      exact: true,
    })
    .check();
  await expect(
    page.getByLabel("Combination A result", { exact: true }),
  ).toContainText("known credits");
  await expect(
    page.getByLabel("Combination B result", { exact: true }),
  ).toContainText("Needs confirmation");
  await expect(
    page.getByLabel("Capability trade-offs", { exact: true }),
  ).toContainText("Additional preparation");
  await page.getByText("Limits of this comparison", { exact: true }).click();
  await expect(page.locator(".semester-comparison")).toContainText(
    "admissions",
  );
  await page.screenshot({
    path: info.outputPath("semester-and-workload.png"),
    fullPage: true,
  });
  expect((await state(page)).living!.plannedCourses).toEqual(
    before.living!.plannedCourses,
  );
});

test("Odyssey G: wrong-owner import is rejected, reviewed mail can be revoked, Calendar export is proposal-only", async ({
  page,
}) => {
  await load(page);
  const before = await state(page),
    journey = before.living!.journey!,
    base = journey.actions.find(
      (a) => a.source.recordId === "professor-feedback",
    )!;
  await inbox(page);
  const wrong = {
    version: "syrka.actions/1",
    ownerId: "another-person",
    tenantId: null,
    actions: [],
  };
  await page
    .getByLabel("Action import text", { exact: true })
    .fill(JSON.stringify(wrong));
  await page
    .getByRole("checkbox", {
      name: /I am authorised to use this source export/,
    })
    .check();
  await page
    .getByRole("button", { name: "Review imported actions", exact: true })
    .click();
  await expect(page.locator(".journey-inbox")).toContainText("owner");
  expect((await state(page)).living!.journey!.actions.length).toBe(
    journey.actions.length,
  );
  const mail: JourneyAction = {
    ...base,
    id: "fictional-mail-request",
    source: {
      ...base.source,
      app: "mail",
      recordId: "fictional-professor-mail",
      tenantId: null,
      version: 1,
      authority: "reviewed-import",
    },
    title: "Reviewed fictional professor request",
  };
  await review(page, {
    version: "syrka.actions/1",
    ownerId: journey.ownerId,
    tenantId: null,
    actions: [mail],
  });
  await expect(
    page.getByLabel("Source connection status", { exact: true }),
  ).toContainText("reviewed-import");
  await page.getByText("Review a Calendar proposal", { exact: true }).click();
  const action = (await state(page)).living!.journey!.actions.find(
    (a) => a.source.recordId === "fictional-professor-mail",
  )!;
  await page
    .getByLabel("Calendar proposal action", { exact: true })
    .selectOption(action.id);
  await page
    .getByLabel("Calendar proposal local start", { exact: true })
    .fill("2026-11-04T10:00");
  await page
    .getByLabel("Calendar proposal local end", { exact: true })
    .fill("2026-11-04T11:00");
  await expect(
    page.getByRole("button", {
      name: "Export reviewed Calendar proposal",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", {
      name: /I reviewed the action, local times and timezone/,
    })
    .check();
  const externalWrites: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      !request.url().startsWith(new URL(page.url()).origin)
    )
      externalWrites.push(request.url());
  });
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Export reviewed Calendar proposal",
      exact: true,
    })
    .click();
  const file = await download;
  const path = await file.path();
  const proposal = JSON.parse(await readFile(path!, "utf8"));
  expect(proposal.contract).toBe("syrka.calendar-action.v1");
  expect(proposal.requires_review).toBe(true);
  expect(externalWrites).toEqual([]);
  await expect(page.locator(".journey-inbox")).toContainText(
    "No event or live integration was created",
  );
  await page
    .getByRole("button", { name: "Revoke mail consent", exact: true })
    .click();
  await expect(
    page.getByLabel("Source connection status", { exact: true }),
  ).toContainText("revoked");
  await expect(
    page.getByRole("button", {
      name: "Export reviewed Calendar proposal",
      exact: true,
    }),
  ).toBeDisabled();
  const revoked = (await state(page)).living!.journey!.actions.find(
    (a) => a.source.recordId === "fictional-professor-mail",
  )!;
  expect(revoked.source.consent).toBe(false);
  expect((await state(page)).person).toEqual(before.person);
});

test("Odyssey performance fixture: 1000 nodes and 2500 edges stay bounded, with recorded Chromium interaction trace", async ({
  page,
  context,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await load(page);
  const ids = [
    "person",
    "goal:mckinsey",
    "goal:mba",
    ...Array.from({ length: 997 }, (_, i) => "benchmark:" + i),
  ];
  const source = {
    kind: "fixture",
    reference: "Explicit synthetic performance fixture",
    version: "1",
    checkedAt: null,
    quality: "fictional",
  };
  const nodes = ids.map((id) => ({
    id,
    label:
      id === "person"
        ? "Synthetic character"
        : id === "goal:mckinsey"
          ? "Synthetic consulting destination"
          : id === "goal:mba"
            ? "Synthetic graduate destination"
            : "Synthetic capability " + id.slice(10),
    kind:
      id === "person"
        ? "PersonProfile"
        : id.startsWith("goal:")
          ? "Occupation"
          : "Capability",
    summary:
      "Synthetic presentation benchmark; no institutional requirements or personal history.",
    domain: "Research",
    skillIds: [],
    source,
    requirement: "unknown",
    status: "available",
    evidence: [],
    actions: [],
    prerequisites: [],
  }));
  const edges: {
    id: string;
    from: string;
    to: string;
    relation: string;
    rationale: string;
    source: typeof source;
    requirement: string;
  }[] = [];
  for (let i = 0; i < 997; i++) {
    edges.push({
      id: "person:" + i,
      from: "person",
      to: "benchmark:" + i,
      relation: "RELATED_TO",
      rationale: "Synthetic display context only",
      source,
      requirement: "advisory",
    });
    edges.push({
      id: "route:" + i,
      from: "benchmark:" + i,
      to: "goal:mckinsey",
      relation: "CONTRIBUTES_TO",
      rationale: "Synthetic preparation relation",
      source,
      requirement: "advisory",
    });
  }
  for (let i = 0; edges.length < 2500; i++)
    edges.push({
      id: "bridge:" + i,
      from: "benchmark:" + i,
      to: "goal:mba",
      relation: "CONTRIBUTES_TO",
      rationale: "Synthetic shared preparation",
      source,
      requirement: "advisory",
    });
  const fixture = {
    version: "syrka.living/1",
    nodes,
    edges,
    notice:
      "Synthetic 1000-node / 2500-edge fixture; not live ontology/evidence.",
    catalogueVersion: "synthetic-performance-1",
  };
  await page.route("**/api/living", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(fixture),
    }),
  );
  await context.tracing.start({
    screenshots: true,
    snapshots: true,
    sources: false,
  });
  try {
    await page.reload();
    await expect(page.locator(".tree-notice")).toHaveCount(0);
    await expect(page.locator(".tree-canvas")).toHaveAttribute(
      "data-disclosed-count",
      "150",
    );
    await expect(page.locator(".journey-hidden-notice")).toContainText(
      "850 more nodes",
    );
    expect(
      await page.locator(".react-flow__node-living").count(),
    ).toBeLessThanOrEqual(150);
    await page
      .getByRole("button", { name: "Explore & tools", exact: true })
      .click();
    await page
      .getByLabel("Search the living tree", { exact: true })
      .fill("Synthetic consulting destination");
    await page.evaluate(() => {
      const values: {
        input: number;
        feedback: number | null;
        longTasks: number[];
      } = { input: 0, feedback: null, longTasks: [] };
      (window as unknown as { odysseyMetrics: typeof values }).odysseyMetrics =
        values;
      window.addEventListener(
        "pointerdown",
        () => {
          values.input = performance.now();
        },
        { capture: true, once: true },
      );
      const root = document.querySelector("[data-semantic-scale]")!;
      const observer = new MutationObserver(() => {
        if (
          values.input &&
          values.feedback === null &&
          root.getAttribute("data-semantic-scale") === "route"
        ) {
          values.feedback = performance.now() - values.input;
          observer.disconnect();
        }
      });
      observer.observe(root, {
        attributes: true,
        attributeFilter: ["data-semantic-scale"],
      });
      if (PerformanceObserver.supportedEntryTypes.includes("longtask"))
        new PerformanceObserver((list) =>
          values.longTasks.push(
            ...list.getEntries().map((entry) => entry.duration),
          ),
        ).observe({ entryTypes: ["longtask"] });
    });
    await page
      .getByRole("button", {
        name: "Open search result Synthetic consulting destination",
        exact: true,
      })
      .click();
    await expect(page.locator("[data-semantic-scale]")).toHaveAttribute(
      "data-semantic-scale",
      "route",
    );
    const metrics = await page.evaluate(
      () =>
        (
          window as unknown as {
            odysseyMetrics: { feedback: number | null; longTasks: number[] };
          }
        ).odysseyMetrics,
    );
    expect(metrics.feedback).not.toBeNull();
    expect(metrics.feedback!).toBeLessThan(1000);
    await close(page);
    if (
      await page
        .getByRole("button", { name: "Close tools", exact: true })
        .isVisible()
    )
      await page
        .getByRole("button", { name: "Close tools", exact: true })
        .click();
    const start = performance.now();
    await page.mouse.move(350, 260);
    await page.mouse.down();
    await page.mouse.move(470, 340, { steps: 10 });
    await page.mouse.up();
    const panSequenceMs = performance.now() - start;
    await page.mouse.wheel(0, -120);
    await page.screenshot({
      path: info.outputPath("synthetic-1000-2500.png"),
      fullPage: true,
    });
    const finalMetrics = await page.evaluate(
      () =>
        (
          window as unknown as {
            odysseyMetrics: { feedback: number | null; longTasks: number[] };
          }
        ).odysseyMetrics,
    );
    const measurement = {
      fixtureNodes: 1000,
      fixtureEdges: 2500,
      detailedVisible: 150,
      mutationAcknowledgementMs: finalMetrics.feedback,
      longTaskDurationsMs: finalMetrics.longTasks,
      driverPanSequenceMs: panSequenceMs,
      browser: "headless Chromium",
      viewport: "1440x1000",
      hardware:
        "managed Linux execution environment; not MacBook Air or physical phone",
      fps: "not measured",
      interpretation:
        "Mutation acknowledgement target <100 ms; measured result is reported, not inferred from driver timing.",
    };
    const measurementPath = info.outputPath("interaction-measurements.json");
    await writeFile(measurementPath, JSON.stringify(measurement, null, 2));
    await info.attach("interaction-measurements", {
      path: measurementPath,
      contentType: "application/json",
    });
    console.log("ODYSSEY_PERFORMANCE " + JSON.stringify(measurement));
  } finally {
    await context.tracing.stop({
      path: info.outputPath("synthetic-interaction-trace.zip"),
    });
  }
});

test("Odyssey viewport restore: desktop route stays selected and physically visible after mobile resize and reload", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await load(page);
  await inspect(page, "McKinsey · Business Analyst");
  await close(page);
  const before = (await state(page)).living!.navigation!;
  expect(before.scale).toBe("route");
  expect(before.selected).toBe("goal:mckinsey");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator("[data-workspace-ready=true]")).toBeVisible();
  await expect(page.locator(".tree-notice")).toHaveCount(0);
  await expect
    .poll(async () => {
      const marker = page.getByRole("button", {
          name: "Inspect McKinsey · Business Analyst",
          exact: true,
        }),
        box = await marker.boundingBox();
      if (!box) return false;
      const x = box.x + box.width / 2,
        y = box.y + box.height / 2;
      return x >= 0 && x <= 390 && y >= 50 && y <= 800;
    })
    .toBe(true);
  const after = (await state(page)).living!.navigation!;
  expect(after.scale).toBe("route");
  expect(after.selected).toBe("goal:mckinsey");
  await page.screenshot({
    path: info.outputPath("desktop-route-restored-on-mobile.png"),
    fullPage: true,
  });
});

test("Odyssey isolation: unscoped or foreign-account browser journal cannot restore another context with the same person ID", async ({
  page,
}) => {
  await load(page);
  await inspect(page, "McKinsey · Business Analyst");
  const before = await state(page),
    nav = before.living!.navigation!;
  const forged = {
    ...nav,
    selected: "goal:risk",
    routeId: "goal:risk",
    scale: "route" as const,
  };
  // Synthetic history events only: this is not a claim of hosted SDK authentication testing.
  await page.evaluate(
    ({ personId, navigation }) => {
      window.dispatchEvent(
        new PopStateEvent("popstate", {
          state: {
            ...window.history.state,
            odyssey: { owner: personId, scope: "foreign-account", navigation },
          },
        }),
      );
      window.dispatchEvent(
        new PopStateEvent("popstate", {
          state: {
            ...window.history.state,
            odyssey: {
              owner: "syrka-roadmaps:account:foreign-account:" + personId,
              scope: "foreign-account",
              navigation,
            },
          },
        }),
      );
    },
    { personId: before.person.id, navigation: forged },
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(page.locator(".tree-inspector")).toContainText(
    "McKinsey · Business Analyst",
  );
  expect((await state(page)).living!.navigation!.selected).toBe(
    "goal:mckinsey",
  );
  expect((await state(page)).person).toEqual(before.person);
});

test("Odyssey blocked priority: a feasible declared dependency replaces a disabled next-action dead end", async ({
  page,
}) => {
  await load(page);
  const before = await state(page),
    journey = before.living!.journey!,
    base = journey.actions.find((a) => a.source.recordId === "ppe-essay")!;
  const source = {
    ...base.source,
    app: "manual" as const,
    tenantId: null,
    authority: "self-reported" as const,
    recordId: "declared-final",
    observedAt: CLOCK,
  };
  const blocked: JourneyAction = {
    ...base,
    id: "declared-final",
    title: "Finish the blocked fictional essay",
    verb: "Continue blocked essay",
    source,
    dependsOn: ["declared-feedback"],
    feasibility: "blocked",
    deadline: {
      kind: "instant",
      at: "2026-11-04T04:00:00.000Z",
      timezone: "Europe/Prague",
      confirmed: true,
      authority: "user",
    },
    priority: 3,
    notes:
      "This is explicitly fictional manual work with a declared dependency.",
  };
  const dependency: JourneyAction = {
    ...base,
    id: "declared-feedback",
    title: "Read feedback before revising the essay",
    verb: "Review blocking feedback",
    source: { ...source, recordId: "declared-feedback" },
    deadline: undefined,
    mandatory: false,
    priority: 1,
    category: "preparation",
    dependsOn: [],
    feasibility: "actionable",
    nodeIds: [],
    notes:
      "Fictional feedback: revise the unsupported claim before continuing.",
    work: { kind: "local-note", label: "Review blocking feedback" },
  };
  await page.evaluate(
    ({ key, workspace }) => {
      localStorage.setItem(key, JSON.stringify(workspace));
    },
    {
      key: STORAGE,
      workspace: {
        ...before,
        living: {
          ...before.living!,
          journey: { ...journey, actions: [blocked, dependency] },
        },
      },
    },
  );
  await page.reload();
  await expect(page.locator("[data-workspace-ready=true]")).toBeVisible();
  await expect(dock(page)).toBeVisible();
  await expect(dock(page).locator(".journey-next-action")).toContainText(
    "Read feedback before revising the essay",
  );
  const primary = dock(page).getByRole("button", {
    name: "Review blocking feedback",
    exact: true,
  });
  await expect(primary).toBeEnabled();
  await primary.click();
  await expect(page.locator(".journey-action-surface")).toContainText(
    "Read feedback before revising the essay",
  );
  await expect(
    page.getByLabel("Action work notes", { exact: true }),
  ).toHaveValue(/revise the unsupported claim/);
  expect((await state(page)).person).toEqual(before.person);
});
