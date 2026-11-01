/** Fictional, reproducible local browser demonstration. No real account/profile is loaded. */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { assignmentExtension } from "../src/journey/fixtures.ts";
const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const out = process.env.ODYSSEY_REVIEW_DIR || "/tmp/odyssey-review";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : { executablePath: "/usr/bin/chromium" }),
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  recordVideo: { dir: join(out, "video"), size: { width: 1600, height: 1000 } },
});
const page = await context.newPage();
const clock = "2026-11-03T08:00:00.000Z";
await page.clock.setFixedTime(new Date(clock));
page.setDefaultTimeout(20000);
const pause = () => page.waitForTimeout(450);
const shot = async (name) => {
  await pause();
  await page.screenshot({ path: join(out, name + ".png") });
};
async function close() {
  await page
    .getByRole("button", { name: "Close tree inspector", exact: true })
    .click();
}
async function inspect(label) {
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
  await pause();
}
try {
  await page.goto(base + "/tree");
  await page.locator("[data-workspace-ready=true]").waitFor();
  await page.locator(".tree-universe-search summary").click();
  await page
    .getByRole("button", { name: "PPE → Consulting → MBA", exact: true })
    .click();
  await page
    .locator(".tree-footnote")
    .filter({ hasText: "Fictional personal records" })
    .waitFor({ state: "attached" });
  await page.locator(".tree-notice").waitFor({ state: "hidden" });
  if (
    await page
      .getByRole("button", { name: "Dismiss message", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Dismiss message", exact: true })
      .click();
  await shot("entry-desktop-dark");
  await page
    .getByRole("button", { name: "Continue essay", exact: true })
    .click();
  await shot("action-desktop");
  await page
    .getByLabel("Action work notes", { exact: true })
    .fill(
      "Fictional demonstration draft: compare policy arguments, analyse public data, cite evidence and distinguish assumptions.",
    );
  await close();
  await inspect("McKinsey · Business Analyst");
  await shot("route-expanded");
  await page
    .getByRole("button", { name: "Collapse branch", exact: true })
    .click();
  await shot("route-collapsed");
  await close();
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await shot("compare");
  await close();
  await page
    .getByRole("button", { name: "Open integration inbox", exact: true })
    .click();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("syrka-roadmaps:v2")),
  );
  const payload = assignmentExtension(state.living.journey, clock);
  await page
    .getByLabel("Action import text", { exact: true })
    .fill(JSON.stringify(payload));
  await page
    .getByRole("checkbox", {
      name: /I am authorised to use this source export/,
    })
    .check();
  await page
    .getByRole("button", { name: "Review imported actions", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Accept reviewed import", exact: true })
    .last()
    .click();
  await shot("source-update");
  await close();
  await page
    .getByRole("button", { name: "Switch to light theme", exact: true })
    .click();
  await shot("entry-desktop-light");
  await page
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.locator(".tree-notice").waitFor({ state: "hidden" });
  await shot("entry-mobile-dark");
  await page
    .getByRole("button", { name: "Continue essay", exact: true })
    .click()
    .catch(async () => page.locator(".journey-next-action .primary").click());
  await shot("action-mobile");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await close();
  await shot("mobile-reduced-motion");
} finally {
  const video = page.video();
  await context.close();
  if (video) await video.saveAs(join(out, "journey-demonstration.webm"));
  await browser.close();
}
