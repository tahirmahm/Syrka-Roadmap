/** Reproducible fictional review: run with `npx tsx scripts/record-radial.mjs`.
 * PLAYWRIGHT_BASE_URL selects an already-built local server; RADIAL_REVIEW_DIR selects artifacts.
 * No real account, external AI or private document is opened. Native Playwright video needs FFmpeg.
 */
import { chromium } from "@playwright/test";
import { mkdir, readFile, copyFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { livingDemo } from "../src/living/demos.ts";
import { ppeJourney } from "../src/journey/fixtures.ts";
const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
  out = process.env.RADIAL_REVIEW_DIR || "/tmp/radial-review",
  clock = "2026-11-03T08:00:00.000Z";
const catalogue = JSON.parse(
  await readFile(
    new URL("../src/data/catalogue.json", import.meta.url),
    "utf8",
  ),
);
const workspace = livingDemo(catalogue.skills, "ppe-consulting");
workspace.person.name = "Sam · fictional radial review";
workspace.living.journey = ppeJourney(workspace.person.id, clock);
await mkdir(out, { recursive: true });
await mkdir(join(out, "before"), { recursive: true });
for (const file of [
  "entry-desktop-dark.png",
  "entry-desktop-light.png",
  "entry-mobile-dark.png",
])
  await copyFile(
    join("/workspace/odyssey-review", file),
    join(out, "before", file),
  ).catch(() => {});
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
async function seed(context) {
  await context.addInitScript((value) => {
    if (!localStorage.getItem("syrka-roadmaps:v2"))
      localStorage.setItem("syrka-roadmaps:v2", JSON.stringify(value));
  }, workspace);
}
try {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    recordVideo: {
      dir: join(out, "video"),
      size: { width: 1600, height: 1000 },
    },
  });
  await seed(context);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await page.clock.setFixedTime(new Date(clock));
  const wheel = (p) =>
      p.getByRole("region", { name: "Discipline wheel", exact: true }),
    sectors = (p) => wheel(p).getByRole("button", { name: /^Open / }),
    branch = (p) => p.locator(".radial-branch");
  const pause = () => page.waitForTimeout(500),
    shot = async (name, p = page) => {
      await p.waitForTimeout(400);
      await p.screenshot({ path: join(out, name + ".png"), fullPage: true });
    };
  async function load(p) {
    await p.goto(base + "/tree");
    await p.locator("[data-workspace-ready=true]").waitFor();
    await wheel(p).waitFor();
    if (
      await p
        .getByRole("button", { name: "Dismiss message", exact: true })
        .isVisible()
    )
      await p
        .getByRole("button", { name: "Dismiss message", exact: true })
        .click();
  }
  async function returnWheel(p) {
    await p.getByRole("button", { name: "Wheel", exact: true }).click();
    await wheel(p).waitFor();
  }
  async function expandUseful(p) {
    const nodes = branch(p)
      .locator(
        '[data-hidden-preparation-count]:not([data-hidden-preparation-count="0"])',
      )
      .getByRole("button", { name: /^Inspect / });
    for (let i = 0; i < Math.min(18, await nodes.count()); i++) {
      await nodes.nth(i).click();
      const show = p
        .locator(".tree-inspector")
        .getByRole("button", { name: /^Show preparation/ })
        .first();
      if ((await show.count()) && (await show.isEnabled())) {
        await shot("node-details", p);
        await show.click();
        await shot("preparation-expanded", p);
        return true;
      }
      await p
        .getByRole("button", { name: "Close tree inspector", exact: true })
        .click();
    }
    return false;
  }
  try {
    await load(page);
    await shot("wheel-desktop-dark");
    await sectors(page).first().hover();
    await pause();
    await shot("wheel-hover");
    await sectors(page).first().click();
    await branch(page).waitFor();
    await shot("discipline-desktop-dark");
    let expanded = await expandUseful(page);
    if (!expanded) {
      await returnWheel(page);
      const count = await sectors(page).count();
      for (let i = 1; i < count && !expanded; i++) {
        await sectors(page).nth(i).click();
        await branch(page).waitFor();
        expanded = await expandUseful(page);
        if (!expanded) await returnWheel(page);
      }
    }
    if (!expanded)
      throw new Error(
        "No disclosed domain exposed further preparation; an expansion recording was not completed.",
      );
    await page
      .getByRole("button", {
        name: "Back to previous tree context",
        exact: true,
      })
      .first()
      .click();
    await pause();
    await shot("back-restored");
    await returnWheel(page);
    if ((await sectors(page).count()) > 1) {
      await sectors(page).nth(1).click();
      await branch(page).waitFor();
      await shot("another-discipline");
    }
    await returnWheel(page);
    await page.getByRole("button", { name: /^Today/ }).click();
    await shot("today-on-request");
    const close = page.getByRole("button", {
      name: "Close tree inspector",
      exact: true,
    });
    if (await close.isVisible()) await close.click();
    await page
      .getByRole("button", { name: "Switch to light theme", exact: true })
      .click();
    await shot("wheel-desktop-light");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await sectors(page).first().click();
    await shot("branch-desktop-reduced-motion");
  } finally {
    const video = page.video();
    await context.close();
    if (video) await video.saveAs(join(out, "radial-interaction.webm"));
  }
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  await seed(mobile);
  const m = await mobile.newPage();
  m.setDefaultTimeout(20000);
  await m.clock.setFixedTime(new Date(clock));
  try {
    await load(m);
    await shot("wheel-mobile-dark", m);
    await sectors(m).first().tap();
    await branch(m).waitFor();
    await shot("discipline-mobile-dark", m);
    await branch(m)
      .getByRole("button", { name: /^Inspect / })
      .first()
      .click();
    await shot("node-mobile-sheet", m);
    await returnWheel(m);
    await m
      .getByRole("button", { name: "Switch to light theme", exact: true })
      .click();
    await shot("wheel-mobile-light", m);
    await m.emulateMedia({ reducedMotion: "reduce" });
    await sectors(m).first().tap();
    await shot("branch-mobile-reduced-motion", m);
  } finally {
    await mobile.close();
  }
  const images = [
    "wheel-desktop-dark",
    "wheel-hover",
    "discipline-desktop-dark",
    "node-details",
    "preparation-expanded",
    "back-restored",
    "another-discipline",
    "today-on-request",
    "wheel-desktop-light",
    "wheel-mobile-dark",
    "discipline-mobile-dark",
    "node-mobile-sheet",
    "wheel-mobile-light",
    "branch-mobile-reduced-motion",
  ];
  await writeFile(
    join(out, "index.html"),
    '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Syrka radial wheel review</title><style>body{background:#000;color:#eee;font:16px system-ui;max-width:1500px;margin:30px auto;padding:20px}a{color:#d7d8ff}img,video{max-width:100%;border:1px solid #333;border-radius:10px}section{margin:40px 0}</style><h1>Radial skill wheel — local production-build review</h1><p>Fictional profile only. No live Qwen, hosted identity or Vercel Preview claim follows from these artifacts.</p><section><h2>Before</h2><img src="before/entry-desktop-dark.png" alt="Previous permanent constellation and dock"><img src="before/entry-mobile-dark.png" alt="Previous mobile constellation"></section><section><h2>Recorded interaction</h2><video controls src="radial-interaction.webm"></video></section>' +
      images
        .map(
          (n) =>
            `<section><h2>${n.replaceAll("-", " ")}</h2><a href="${n}.png"><img loading="lazy" src="${n}.png" alt="${n.replaceAll("-", " ")}"></a></section>`,
        )
        .join("") +
      "</html>",
  );
  console.log("Fictional radial review saved to " + out);
} finally {
  await browser.close();
}
