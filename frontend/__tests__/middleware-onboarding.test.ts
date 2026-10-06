import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

const req = (path: string, cookies = "") =>
  new NextRequest(`http://localhost:3000${path}`, { headers: cookies ? { cookie: cookies } : {} });

const PENDING = "refresh_token=x; onboarding_state=pending";
const COMPLETE = "refresh_token=x; onboarding_state=complete";

const redirectsTo = (res: Response) => {
  const location = res.headers.get("location");
  return location ? new URL(location).pathname + new URL(location).search : null;
};

describe("middleware: signed out", () => {
  it.each(["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"])("lets visitors see %s", (path) => {
    expect(redirectsTo(middleware(req(path)))).toBeNull();
  });

  it("remembers where the visitor was going", () => {
    expect(redirectsTo(middleware(req("/goals")))).toBe("/login?redirect=%2Fgoals");
  });
});

describe("middleware: onboarding pending", () => {
  it.each(["/dashboard", "/checkin", "/goals", "/health", "/journal"])("sends %s to onboarding", (path) => {
    expect(redirectsTo(middleware(req(path, PENDING)))).toBe("/onboarding");
  });

  it("lets them onboard", () => {
    expect(redirectsTo(middleware(req("/onboarding", PENDING)))).toBeNull();
  });

  it("does not trap them away from the public pages", () => {
    expect(redirectsTo(middleware(req("/register", PENDING)))).toBeNull();
    expect(redirectsTo(middleware(req("/verify-email", PENDING)))).toBeNull();
  });
});

describe("middleware: onboarding complete", () => {
  it("sends them from onboarding to the dashboard", () => {
    expect(redirectsTo(middleware(req("/onboarding", COMPLETE)))).toBe("/dashboard");
  });

  it.each(["/dashboard", "/checkin", "/goals"])("lets them into %s", (path) => {
    expect(redirectsTo(middleware(req(path, COMPLETE)))).toBeNull();
  });

  it("takes a signed-in visitor off the login page", () => {
    expect(redirectsTo(middleware(req("/login", COMPLETE)))).toBe("/dashboard");
    expect(redirectsTo(middleware(req("/login", PENDING)))).toBe("/dashboard");
  });
});

describe("middleware: missing onboarding cookie", () => {
  it("does not block a signed-in user whose cookie hasn't been set yet", () => {
    expect(redirectsTo(middleware(req("/dashboard", "refresh_token=x")))).toBeNull();
  });
});
