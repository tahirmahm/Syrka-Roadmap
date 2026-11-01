import { test, expect } from "@playwright/test";
import type { Workspace } from "../../src/odyssey/types";
const KEY = "syrka-roadmaps:v2";
test("closing a pending Passport file import prevents its deferred result replacing the current fictional workspace", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-11-03T08:00:00.000Z"));
  await page.goto("/tree");
  await expect(page.locator("[data-workspace-ready=true]")).toBeVisible();
  await page.locator(".tree-universe-search summary").click();
  await page
    .getByRole("button", { name: "PPE → Consulting → MBA", exact: true })
    .click();
  await expect(page.locator(".tree-player")).toContainText("fictional");
  await page.goto("/profile");
  await expect(page.locator("[data-workspace-ready=true]")).toBeVisible();
  const original = (await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    KEY,
  )) as Workspace;
  const late = {
    ...original,
    person: {
      ...original.person,
      name: "Fictional deferred import that must not apply",
    },
    living: { ...original.living!, goals: [] },
  };
  await page
    .getByRole("button", { name: "Import Passport / backup", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Connect Career Passport",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("checkbox", {
      name: "I am authorized to use these records and consent to local processing.",
      exact: true,
    })
    .check();
  // Delay only this fictional file's text result. No authentication, API or private record is mocked.
  await page.evaluate(() => {
    type DeferredWindow = Window & {
      passportReadStarted?: boolean;
      resolveLatePassport?: () => void;
    };
    const target = window as DeferredWindow,
      originalText = File.prototype.text;
    File.prototype.text = function (this: File) {
      if (this.name !== "deferred-fictional-passport.json")
        return originalText.call(this);
      target.passportReadStarted = true;
      const result = originalText.call(this);
      return new Promise<string>((resolve) => {
        target.resolveLatePassport = () => {
          void result.then(resolve);
        };
      });
    };
  });
  await dialog
    .getByLabel("Choose authorized JSON", { exact: true })
    .setInputFiles({
      name: "deferred-fictional-passport.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(late)),
    });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { passportReadStarted?: boolean })
            .passportReadStarted,
      ),
    )
    .toBe(true);
  await dialog
    .getByRole("button", { name: "Close Passport import", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await page.evaluate(() => {
    (
      window as Window & { resolveLatePassport?: () => void }
    ).resolveLatePassport?.();
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const after = (await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    KEY,
  )) as Workspace;
  expect(after.person).toEqual(original.person);
  expect(after.living!.goals).toEqual(original.living!.goals);
  expect(after.paths).toEqual(original.paths);
  await expect(
    page.getByRole("dialog", { name: "Connect Career Passport", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(
    "Fictional deferred import that must not apply",
  );
});
