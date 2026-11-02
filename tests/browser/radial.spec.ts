import { test, expect, type Page, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { livingDemo } from "../../src/living/demos";
import { catalogue } from "../../src/odyssey/server/data";
import { ppeJourney } from "../../src/journey/fixtures";
import type { Workspace } from "../../src/odyssey/types";
const CLOCK = "2026-11-03T08:00:00.000Z",
  STORAGE = "syrka-roadmaps:v2";
const wheel = (page: Page) =>
  page.getByRole("region", { name: "Discipline wheel", exact: true });
const sectors = (page: Page) =>
  wheel(page).getByRole("button", { name: /^Open / });
const readState = (page: Page) =>
  page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE,
  ) as Promise<Workspace>;
const persisted = (page: Page) =>
  page.evaluate((key) => localStorage.getItem(key), STORAGE);
const branch = (page: Page) => page.locator(".radial-branch");
function fictionalProfile(dense = false) {
  const w = livingDemo(catalogue.skills, "ppe-consulting");
  w.living!.journey = ppeJourney(w.person.id, CLOCK);
  w.person.name = dense
    ? "Sam · fictional dense reviewed profile"
    : "Sam · fictional wheel profile";
  if (dense) {
    const skills = catalogue.skills
      .filter((s) => s.label.length < 90)
      .slice(0, 1000);
    w.person.claims = skills.map((skill, i) => ({
      id: `dense-project:${i}`,
      kind: "project",
      text: `Fictional project ${i + 1}: ${skill.label}`,
      quote: `Fictional reviewed exercise ${i + 1} applied ${skill.label} to a sourced analysis. This is a synthetic load fixture, not actual verified work.`,
      page: 1,
      section: "Fictional reviewed projects",
      mappings: [
        {
          skillId: skill.id,
          label: skill.label,
          method: "user-confirmed",
          confidence: "medium",
          confirmed: true,
          selected: true,
        },
      ],
      approved: true,
    }));
    w.person.assertions = skills.map((skill, i) => ({
      id: `dense-assertion:${i}`,
      skillId: skill.id,
      label: skill.label,
      claimId: `dense-project:${i}`,
      sourceSystem: "fictional-fixture",
      sourceRecordId: `synthetic:${i}`,
      quote: w.person.claims[i].quote,
      verification: "document-supported",
      consent: true,
      selected: true,
    }));
  }
  return w;
}
async function seed(page: Page, dense = false) {
  await page.clock.setFixedTime(new Date(CLOCK));
  const fixture = fictionalProfile(dense);
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(value));
    },
    { key: STORAGE, value: fixture },
  );
  const response = page.waitForResponse(
    (r) => r.url().includes("/api/living") && r.request().method() === "POST",
  );
  await page.goto("/tree");
  await expect(page.locator("[data-workspace-ready=true]")).toBeVisible();
  const result = await response;
  expect(result.ok()).toBe(true);
  const graph = (await result.json()) as {
    nodes: { id: string; domain: string }[];
    edges: { id: string; from: string; to: string }[];
  };
  await expect(wheel(page)).toBeVisible();
  await expect(sectors(page).first()).toBeVisible();
  if (
    await page
      .getByRole("button", { name: "Dismiss message", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Dismiss message", exact: true })
      .click();
  return { fixture, graph };
}
async function openSector(page: Page, sector: Locator) {
  const id = await sector.getAttribute("data-domain-id");
  expect(id).toBeTruthy();
  if ((page.viewportSize()?.width || 1440) < 600) await sector.tap();
  else await sector.click();
  await expect(branch(page)).toBeVisible();
  await expect(branch(page)).toHaveAttribute("data-domain-id", id!);
  const rootId = (await readState(page)).living?.navigation?.routeId;
  if (rootId)
    await expect
      .poll(async () => {
        const marker = await page
            .locator(`[data-canonical-id=${JSON.stringify(rootId)}]`)
            .boundingBox(),
          view = page.viewportSize()!;
        return (
          !!marker &&
          marker.x + marker.width / 2 >= 0 &&
          marker.x + marker.width / 2 <= view.width &&
          marker.y + marker.height / 2 >= 55 &&
          marker.y + marker.height / 2 <= view.height
        );
      })
      .toBe(true);
  return id!;
}
async function toWheel(page: Page) {
  await page.getByRole("button", { name: "Wheel", exact: true }).click();
  await expect(wheel(page)).toBeVisible();
  await expect(page.locator(".react-flow__node")).toHaveCount(0);
}
async function openFirstNode(page: Page) {
  const node = branch(page)
    .getByRole("button", { name: /^Inspect / })
    .first();
  await expect(node).toBeVisible();
  const label = await node.getAttribute("aria-label");
  if ((page.viewportSize()?.width || 1440) < 600) await node.tap();
  else await node.click();
  await expect(page.locator(".tree-inspector")).toBeVisible();
  await expect
    .poll(async () => {
      const selected = await page
          .locator(".radial-branch-node.is-selected")
          .boundingBox(),
        panel = await page.locator(".tree-inspector").boundingBox();
      if (!selected || !panel) return false;
      const x = selected.x + selected.width / 2,
        y = selected.y + selected.height / 2,
        view = page.viewportSize()!;
      return (
        x >= 0 &&
        x <= view.width &&
        y >= 55 &&
        y <= view.height &&
        !(
          x >= panel.x &&
          x <= panel.x + panel.width &&
          y >= panel.y &&
          y <= panel.y + panel.height
        )
      );
    })
    .toBe(true);
  return label;
}
for (const width of [390, 1440]) {
  test.describe(`${width}px radial interaction`, () => {
    test.use({ hasTouch: width < 600, isMobile: width < 600 });
    test(`Radial wheel: clean black/light sectors, nonmutating hover/focus and one-tap domains (${width}px fictional)`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 1000 });
      await seed(page);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await expect(page.locator(".react-flow__node")).toHaveCount(0);
      await expect(page.locator(".tree-inspector")).toHaveCount(0);
      const stage = page.locator(".radial-scene");
      expect(
        await stage.evaluate((e) => getComputedStyle(e).backgroundColor),
      ).toBe("rgb(0, 0, 0)");
      expect(
        await stage.evaluate((e) => getComputedStyle(e).backgroundImage),
      ).toBe("none");
      expect(
        await page
          .locator(".radial-header")
          .evaluate((e) => getComputedStyle(e).backgroundColor),
      ).toBe("rgb(0, 0, 0)");
      const colours = await wheel(page)
        .locator("path")
        .evaluateAll((paths) =>
          paths
            .map((p) => getComputedStyle(p).fill)
            .filter((c) => c !== "none"),
        );
      expect(
        colours.some((c) => {
          const rgb = c
            .match(/\d+(?:\.\d+)?/g)
            ?.slice(0, 3)
            .map(Number);
          return rgb && Math.min(...rgb) > 170;
        }),
      ).toBe(true);
      const count = await sectors(page).count();
      expect(count).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(8);
      const box = await wheel(page).boundingBox();
      expect(box!.width).toBeLessThanOrEqual(width);
      expect(box!.width).toBeGreaterThan(width < 600 ? 240 : 330);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath("wheel-dark.png"),
        fullPage: true,
      });
      const before = await persisted(page),
        requests: string[] = [];
      page.on("request", (r) => {
        if (r.method() === "POST") requests.push(r.url());
      });
      for (let i = 0; i < count; i++) {
        const sector = sectors(page).nth(i),
          id = await sector.getAttribute("data-domain-id");
        if (width > 600) await sector.hover();
        else await sector.focus();
        await expect(wheel(page)).toHaveAttribute("data-preview-domain", id!);
        await expect(page.locator(".react-flow__node")).toHaveCount(0);
        await expect(page.locator(".tree-inspector")).toHaveCount(0);
        expect(await persisted(page)).toBe(before);
        await sector.focus();
        await expect(wheel(page)).toHaveAttribute("data-preview-domain", id!);
        expect(await persisted(page)).toBe(before);
      }
      await page
        .getByRole("button", { name: "Explore & tools", exact: true })
        .focus();
      await page.mouse.move(1, 1);
      await expect(wheel(page)).toHaveAttribute("data-preview-domain", "");
      expect(requests).toEqual([]);
      await sectors(page).first().focus();
      await page.keyboard.press("Enter");
      await expect(branch(page)).toBeVisible();
      await toWheel(page);
      // Pointer/touch activates each sector directly; hover/focus is never a required first tap.
      for (let i = 0; i < count; i++) {
        await openSector(page, sectors(page).nth(i));
        await toWheel(page);
      }
      const after = await readState(page),
        original = JSON.parse(before!);
      expect(after.person).toEqual(original.person);
      expect(after.living!.progress).toEqual(original.living.progress);
      expect(after.living!.goals).toEqual(original.living.goals);
      await page
        .getByRole("button", { name: "Switch to light theme", exact: true })
        .click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      await expect(wheel(page)).toBeVisible();
      await page.screenshot({
        path: info.outputPath("wheel-light.png"),
        fullPage: true,
      });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openSector(page, sectors(page).first());
      await page.screenshot({
        path: info.outputPath("branch-reduced-motion.png"),
        fullPage: true,
      });
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(axe.violations).toEqual([]);
    });
    test(`Radial branch: bounded disclosure, explicit preparation, one panel, Close/Back/Wheel and unchanged evidence (${width}px fictional)`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 1000 });
      await seed(page);
      const before = await readState(page),
        domainId = await openSector(page, sectors(page).first());
      await expect(page.locator(".react-flow")).toHaveCount(1);
      const visible = Number(
        await branch(page).getAttribute("data-visible-node-count"),
      );
      expect(visible).toBeGreaterThan(0);
      expect(visible).toBeLessThanOrEqual(18);
      expect(
        Number(await branch(page).getAttribute("data-hidden-required-count")),
      ).toBeGreaterThanOrEqual(0);
      await expect(page.locator(".journey-dock")).toHaveCount(0); // Today remains a compact control, not a permanent competing panel.
      await expect(page.getByRole("button", { name: /^Today/ })).toBeVisible();
      expect(
        await page
          .locator(".radial-scene")
          .evaluate(
            (e) =>
              e
                .getAnimations({ subtree: true })
                .filter(
                  (a) => a.effect?.getComputedTiming().iterations === Infinity,
                ).length,
          ),
      ).toBe(0);
      await page.screenshot({
        path: info.outputPath("discipline.png"),
        fullPage: true,
      });
      const inspected = await openFirstNode(page);
      await expect(page.locator(".tree-inspector")).toHaveCount(1);
      await page.screenshot({
        path: info.outputPath("node-details.png"),
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Close tree inspector", exact: true })
        .click();
      await expect(branch(page)).toHaveAttribute("data-domain-id", domainId);
      await expect(page.locator(".tree-inspector")).toHaveCount(0);
      expect((await readState(page)).living!.navigation!.inspectorOpen).toBe(
        false,
      );
      await expect(
        branch(page).getByRole("button", { name: inspected!, exact: true }),
      )
        .toBeAttached()
        .catch(async (error) => {
          const debug = await page.evaluate(() => {
            const node = document.querySelector(".tree-canvas"),
              flow = document.querySelector(".react-flow"),
              root = document.querySelector(".radial-scene"),
              nav = JSON.parse(localStorage.getItem("syrka-roadmaps:v2")!)
                .living.navigation;
            const rect = (el: Element | null) =>
              el
                ? {
                    x: el.getBoundingClientRect().x,
                    y: el.getBoundingClientRect().y,
                    width: el.getBoundingClientRect().width,
                    height: el.getBoundingClientRect().height,
                    scrollLeft: el.scrollLeft,
                    scrollTop: el.scrollTop,
                  }
                : null;
            return {
              nav: {
                selected: nav.selected,
                domainId: nav.domainId,
                camera: nav.camera,
                inspectorOpen: nav.inspectorOpen,
              },
              viewport: document
                .querySelector(".react-flow__viewport")
                ?.getAttribute("style"),
              canvas: rect(node),
              flow: rect(flow),
              nodeDetails: [
                ...document.querySelectorAll(".react-flow__node"),
              ].map((node) => ({
                id: node.getAttribute("data-id"),
                style: node.getAttribute("style"),
                display: getComputedStyle(node).display,
                visibility: getComputedStyle(node).visibility,
                labels: [...node.querySelectorAll("button")].map((b) => ({
                  aria: b.getAttribute("aria-label"),
                  visibility: getComputedStyle(b).visibility,
                  display: getComputedStyle(b).display,
                })),
                ancestors: [
                  node.parentElement,
                  node.parentElement?.parentElement,
                  node.parentElement?.parentElement?.parentElement,
                ]
                  .filter(Boolean)
                  .map((el) => ({
                    class: el!.className,
                    inert: el!.getAttribute("inert"),
                    hidden: el!.getAttribute("aria-hidden"),
                    visibility: getComputedStyle(el!).visibility,
                  })),
              })),
              nodeDomCount:
                document.querySelectorAll(".react-flow__node").length,
              disclosed: root?.getAttribute("data-visible-node-count"),
            };
          });
          console.log("RADIAL_CLOSE_DIAG " + JSON.stringify(debug));
          await test.info().attach("close-camera-diagnostic", {
            body: JSON.stringify(debug, null, 2),
            contentType: "application/json",
          });
          throw error;
        });
      for (let repeat = 0; repeat < 3; repeat++) {
        await branch(page)
          .getByRole("button", { name: inspected!, exact: true })
          .click();
        await page
          .getByRole("button", { name: "Close tree inspector", exact: true })
          .click();
        expect((await readState(page)).living!.navigation!.inspectorOpen).toBe(
          false,
        );
        await expect
          .poll(() => page.locator(".react-flow__node").count())
          .toBeGreaterThan(0);
        expect(
          await page.locator(".react-flow__viewport").getAttribute("style"),
        ).not.toMatch(/NaN|Infinity/);
      }
      // Pick a node that has undisclosed preparation; the count is explicit and no data is silently dropped.
      const candidates = branch(page)
        .locator(
          '[data-hidden-preparation-count]:not([data-hidden-preparation-count="0"])',
        )
        .getByRole("button", { name: /^Inspect / });
      let expanded = false;
      for (let i = 0; i < Math.min(await candidates.count(), 18); i++) {
        await candidates.nth(i).click();
        const show = page
          .locator(".tree-inspector")
          .getByRole("button", { name: /^Show preparation/ });
        if ((await show.count()) && (await show.first().isEnabled())) {
          const priorIds = await branch(page)
            .locator("[data-canonical-id]")
            .evaluateAll((ns) =>
              ns.map((n) => n.getAttribute("data-canonical-id")),
            );
          await show.first().click();
          await expect
            .poll(async () =>
              JSON.stringify(
                await branch(page)
                  .locator("[data-canonical-id]")
                  .evaluateAll((ns) =>
                    ns.map((n) => n.getAttribute("data-canonical-id")),
                  ),
              ),
            )
            .not.toBe(JSON.stringify(priorIds));
          expect(
            Number(await branch(page).getAttribute("data-visible-node-count")),
          ).toBeLessThanOrEqual(18);
          expanded = true;
          break;
        }
        await page
          .getByRole("button", { name: "Close tree inspector", exact: true })
          .click();
      }
      expect(expanded).toBe(true);
      await page.screenshot({
        path: info.outputPath("preparation-expanded.png"),
        fullPage: true,
      });
      await page
        .getByRole("button", {
          name: "Back to previous tree context",
          exact: true,
        })
        .first()
        .click();
      await expect(branch(page)).toHaveAttribute("data-domain-id", domainId);
      await toWheel(page);
      const count = await sectors(page).count();
      if (count > 1) {
        const next = await openSector(page, sectors(page).nth(1));
        expect(next).not.toBe(domainId);
      }
      const after = await readState(page);
      expect(after.person).toEqual(before.person);
      expect(after.paths).toEqual(before.paths);
      expect(after.living!.progress).toEqual(before.living!.progress);
      expect(after.living!.journey!.actions).toEqual(
        before.living!.journey!.actions,
      );
    });
  });
}
test("Radial dense reviewed profile keeps 1,000 source records underneath bounded visible branches (synthetic, no private CV)", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { fixture, graph } = await seed(page, true);
  expect(fixture.person.claims.length).toBe(1000);
  expect(graph.nodes.length).toBeGreaterThan(1000);
  await expect(page.locator(".react-flow__node")).toHaveCount(0);
  expect(await sectors(page).count()).toBeLessThanOrEqual(8);
  const before = await readState(page);
  await openSector(page, sectors(page).first());
  expect(
    Number(await branch(page).getAttribute("data-visible-node-count")),
  ).toBeLessThanOrEqual(18);
  const ids = await branch(page)
    .locator("[data-canonical-id]")
    .evaluateAll((ns) => ns.map((n) => n.getAttribute("data-canonical-id")));
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.length).toBeLessThanOrEqual(18);
  const edgeEndpoints = await branch(page)
    .locator("[data-edge-from][data-edge-to]")
    .evaluateAll((es) =>
      es.map((e) => [
        e.getAttribute("data-edge-from"),
        e.getAttribute("data-edge-to"),
      ]),
    );
  if (ids.length > 1) expect(edgeEndpoints.length).toBeGreaterThan(0);
  for (const endpoints of edgeEndpoints)
    expect(endpoints.every((id) => ids.includes(id))).toBe(true);
  await page.screenshot({
    path: info.outputPath("dense-branch.png"),
    fullPage: true,
  });
  await toWheel(page);
  expect((await readState(page)).person).toEqual(before.person);
});

test("Clean-browser launch opens a black wheel with secondary surfaces closed and no graph renderer", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("[data-workspace-ready=true]")).toBeVisible();
  await expect(wheel(page)).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await page
      .locator(".radial-scene")
      .evaluate((e) => getComputedStyle(e).backgroundColor),
  ).toBe("rgb(0, 0, 0)");
  await expect(page.locator(".react-flow__node")).toHaveCount(0);
  await expect(page.locator(".tree-inspector")).toHaveCount(0);
  await expect(page.locator(".journey-dock")).toHaveCount(0);
});
