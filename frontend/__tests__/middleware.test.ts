import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { config, middleware } from "../middleware";

const req = (path: string, cookies = "") =>
  new NextRequest(`http://localhost:3000${path}`, { headers: cookies ? { cookie: cookies } : {} });

describe("auth middleware", () => {
  it("sends signed-out visitors to login from every area page, including /health", () => {
    for (const path of ["/dashboard", "/health", "/mind", "/relationships", "/work", "/money", "/growth", "/learning"]) {
      const res = middleware(req(path));
      expect(res.status, path).toBe(307);
      expect(res.headers.get("location"), path).toContain("/login?redirect=" + encodeURIComponent(path));
    }
  });

  it("lets signed-in users through", () => {
    const res = middleware(req("/health", "refresh_token=x; onboarding_state=complete"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("does not exclude any app page from the matcher", () => {
    const pattern = new RegExp("^" + config.matcher[0] + "$");
    expect(pattern.test("/health")).toBe(true);
    expect(pattern.test("/api/auth")).toBe(false);
  });
});
