import { expect, test, type Page } from "@playwright/test";
import { createUser, signIn, waitForEmail } from "./support/helpers";

const NEW_PASSWORD = "Brand9New1";

async function chooseNewPassword(page: Page, password: string) {
  await page.getByLabel("New password", { exact: true }).fill(password);
  await page.getByLabel("Confirm new password").fill(password);
  await page.getByRole("button", { name: "Update password" }).click();
}

test("a user resets a forgotten password from the emailed link", async ({ page }) => {
  const user = await createUser();

  await page.goto("/forgot-password");
  await page.getByPlaceholder("you@example.com").fill(user.email);
  await page.getByRole("button", { name: /send|reset/i }).click();
  await expect(page.getByText(/if an account exists/i)).toBeVisible();

  // The API "sent" an email to our mail sink, not to Resend
  const mail = await waitForEmail(user.email, /reset your selfstack password/i);
  const link = mail.html.match(/href="([^"]*\/reset-password\?token=[^"]+)"/)?.[1];
  expect(link, "the email contains a reset link").toBeTruthy();

  await page.goto(link!);
  await chooseNewPassword(page, NEW_PASSWORD);
  await expect(page).toHaveURL(/\/login/);

  // The old password no longer works, the new one does
  await signIn(page, user);
  await expect(page).toHaveURL(/\/login/);
  await signIn(page, user, NEW_PASSWORD);
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/);

  // The link is single-use
  await page.goto(link!);
  await chooseNewPassword(page, "Another9Pass1");
  await expect(page.getByText(/invalid or has expired/i)).toBeVisible();
});

test("asking about an address with no account looks the same, and sends nothing", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByPlaceholder("you@example.com").fill("nobody-here@example.com");
  await page.getByRole("button", { name: /send|reset/i }).click();
  await expect(page.getByText(/if an account exists/i)).toBeVisible();

  await page.waitForTimeout(1000);
  const res = await fetch(`http://localhost:${process.env.E2E_MAIL_PORT ?? 4010}/messages?to=nobody-here%40example.com`);
  expect(await res.json()).toEqual([]);
});
