import { expect, type Page } from "@playwright/test";
import { API_URL, MAIL_URL } from "./env";

export interface TestUser {
  email: string;
  password: string;
  fullName: string;
  accessToken: string;
}

let counter = 0;

/** A fresh address per call, so tests never collide with each other or with an earlier run. */
export function uniqueEmail(label = "user"): string {
  counter += 1;
  return `e2e-${label}-${Date.now()}-${counter}@example.com`;
}

export const PASSWORD = "Sturdy1234";

async function api(path: string, init: RequestInit & { token?: string } = {}) {
  const { token, ...rest } = init;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...rest.headers },
  });
  if (!res.ok) throw new Error(`${rest.method ?? "GET"} ${path} -> ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

/** Creates an account through the API (setup, not under test). Optionally finishes onboarding. */
export async function createUser(opts: { onboarded?: boolean; fullName?: string } = {}): Promise<TestUser> {
  const { onboarded = true, fullName = "Grace Hopper" } = opts;
  const email = uniqueEmail();
  const tokens = await api("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password: PASSWORD, full_name: fullName }),
  });
  if (onboarded) await api("/auth/me/onboarding", { method: "PATCH", token: tokens.access_token });
  return { email, password: PASSWORD, fullName, accessToken: tokens.access_token };
}

export const seed = {
  habit: (user: TestUser, title: string, areaId = 1) =>
    api("/habits", { method: "POST", token: user.accessToken, body: JSON.stringify({ life_area_id: areaId, title }) }),
  goal: (user: TestUser, title: string, areaId = 4) =>
    api("/goals", { method: "POST", token: user.accessToken, body: JSON.stringify({ life_area_id: areaId, title }) }),
};

export async function signIn(page: Page, user: Pick<TestUser, "email" | "password">, password = user.password) {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(user.email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

/** Signs in and waits for the dashboard. */
export async function signInAndLand(page: Page, user: TestUser) {
  await signIn(page, user);
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /life score trend/i })).toBeVisible();
}

export interface SentEmail {
  to: string[];
  subject: string;
  html: string;
}

/** The mail sink the API delivers to. Polls because the API sends after it has answered. */
export async function waitForEmail(to: string, subject: RegExp): Promise<SentEmail> {
  let found: SentEmail | undefined;
  await expect
    .poll(
      async () => {
        const res = await fetch(`${MAIL_URL}/messages?to=${encodeURIComponent(to)}`);
        const messages: SentEmail[] = await res.json();
        found = messages.reverse().find((m) => subject.test(m.subject));
        return Boolean(found);
      },
      { message: `an email to ${to} matching ${subject}`, timeout: 15_000 }
    )
    .toBe(true);
  return found!;
}
