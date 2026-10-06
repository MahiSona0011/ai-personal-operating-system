import { expect, test } from "@playwright/test";
import { createUser, seed, signInAndLand } from "./support/helpers";

test("logging a habit can be undone", async ({ page }) => {
  const user = await createUser();
  await seed.habit(user, "Stretch");
  await signInAndLand(page, user);

  await page.goto("/habits");
  const log = page.getByRole("button", { name: "Log today" });
  await expect(log).toBeVisible();
  await expect(page.getByText("0/1 completed today")).toBeVisible();

  await log.click();
  await expect(page.getByText("1/1 completed today")).toBeVisible();
  await expect(page.getByText("1d streak")).toBeVisible();

  // The toast offers Undo; using it takes the log (and the streak) back
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("0/1 completed today")).toBeVisible();
  await expect(page.getByText("0d streak")).toBeVisible();
  await expect(page.getByRole("button", { name: "Log today" })).toBeVisible();

  // Undo reached the server: a reload still shows nothing logged
  await page.reload();
  await expect(page.getByText("0/1 completed today")).toBeVisible();
});

test("a logged habit stays logged after a reload", async ({ page }) => {
  const user = await createUser();
  await seed.habit(user, "Read");
  await signInAndLand(page, user);

  await page.goto("/habits");
  await page.getByRole("button", { name: "Log today" }).click();
  await expect(page.getByText("1/1 completed today")).toBeVisible();

  await page.reload();
  await expect(page.getByText("1/1 completed today")).toBeVisible();
});
