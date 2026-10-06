import { expect, test } from "@playwright/test";
import { createUser, seed, signInAndLand } from "./support/helpers";

test("deleting a goal asks first, and Cancel keeps it", async ({ page }) => {
  const user = await createUser();
  await seed.goal(user, "Ship the e2e suite");
  await seed.goal(user, "Learn to sail", 6);
  await signInAndLand(page, user);

  await page.goto("/goals");
  await expect(page.getByText("0 of 2 completed")).toBeVisible();

  // Cancel: nothing happens
  await page.getByRole("button", { name: "Delete goal: Ship the e2e suite" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Ship the e2e suite");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Ship the e2e suite")).toBeVisible();

  // Confirm: only that goal goes
  await page.getByRole("button", { name: "Delete goal: Ship the e2e suite" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: /delete/i }).click();
  await expect(page.getByText("Ship the e2e suite")).toBeHidden();
  await expect(page.getByText("Learn to sail")).toBeVisible();

  // It is gone on the server too
  await page.reload();
  await expect(page.getByText("Ship the e2e suite")).toBeHidden();
  await expect(page.getByText("Learn to sail")).toBeVisible();
});
