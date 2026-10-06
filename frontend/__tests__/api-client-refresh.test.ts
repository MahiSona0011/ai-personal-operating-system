import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/store/authStore";

type Seen = { url: string; auth: string | undefined };

/** A fake server behind apiClient: it only accepts the fresh access token. */
function fakeServer(opts: { alwaysReject?: boolean } = {}) {
  const seen: Seen[] = [];
  apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const auth = (config.headers as Record<string, string>).Authorization;
    seen.push({ url: config.url ?? "", auth });
    if (opts.alwaysReject || auth !== "Bearer fresh-access") {
      throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, null, {
        status: 401, statusText: "Unauthorized", data: {}, headers: {}, config,
      });
    }
    return { data: { ok: config.url }, status: 200, statusText: "OK", headers: {}, config };
  };
  return seen;
}

function mockRefresh(result: () => Promise<unknown>) {
  return vi.spyOn(axios, "post").mockImplementation((async (url: string) => {
    expect(url).toMatch(/\/auth\/refresh$/);
    return { data: await result() };
  }) as never);
}

const delayed = <T>(value: T, ms = 15) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

let location: { href: string };
const realLocation = window.location;

beforeEach(() => {
  sessionStorage.clear();
  document.cookie = "refresh_token=old-refresh; path=/";
  sessionStorage.setItem("access_token", "stale-access");
  useAuthStore.setState({ accessToken: "stale-access", refreshToken: "old-refresh" });
  location = { href: "/dashboard" };
  Object.defineProperty(window, "location", { value: location, writable: true, configurable: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(window, "location", { value: realLocation, writable: true, configurable: true });
});

describe("axios refresh queue", () => {
  it("sends the stored access token", async () => {
    sessionStorage.setItem("access_token", "fresh-access");
    const seen = fakeServer();
    await apiClient.get("/anything");
    expect(seen).toEqual([{ url: "/anything", auth: "Bearer fresh-access" }]);
  });

  it("two concurrent 401s trigger one refresh and both requests are retried", async () => {
    const seen = fakeServer();
    const refresh = mockRefresh(() => delayed({ access_token: "fresh-access", refresh_token: "new-refresh" }));

    const [a, b] = await Promise.all([apiClient.get("/a"), apiClient.get("/b")]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh.mock.calls[0][1]).toEqual({ refresh_token: "old-refresh" });
    expect(a.data).toEqual({ ok: "/a" });
    expect(b.data).toEqual({ ok: "/b" });
    // each request went out twice: once stale, once with the new token
    expect(seen.filter((s) => s.auth === "Bearer fresh-access").map((s) => s.url).sort()).toEqual(["/a", "/b"]);
    expect(seen.filter((s) => s.auth === "Bearer stale-access")).toHaveLength(2);
  });

  it("three concurrent 401s still make one refresh", async () => {
    fakeServer();
    const refresh = mockRefresh(() => delayed({ access_token: "fresh-access", refresh_token: "r2" }));
    await Promise.all([apiClient.get("/a"), apiClient.get("/b"), apiClient.get("/c")]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("keeps the rotated refresh token, so the next refresh doesn't present a retired one", async () => {
    fakeServer();
    mockRefresh(async () => ({ access_token: "fresh-access", refresh_token: "new-refresh" }));
    await apiClient.get("/a");

    expect(useAuthStore.getState().refreshToken).toBe("new-refresh");
    expect(useAuthStore.getState().accessToken).toBe("fresh-access");
    expect(sessionStorage.getItem("access_token")).toBe("fresh-access");
    expect(document.cookie).toContain("refresh_token=new-refresh");
  });

  it("a later 401 refreshes again, using the newer token", async () => {
    fakeServer();
    const refresh = mockRefresh(async () => ({ access_token: "fresh-access", refresh_token: "second" }));
    await apiClient.get("/a");

    sessionStorage.setItem("access_token", "expired-again"); // the new access token also expires
    await apiClient.get("/b");
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(refresh.mock.calls[1][1]).toEqual({ refresh_token: "second" });
  });

  it("gives up after one retry instead of looping when the server keeps saying 401", async () => {
    const seen = fakeServer({ alwaysReject: true });
    const refresh = mockRefresh(async () => ({ access_token: "fresh-access", refresh_token: "r2" }));

    await expect(apiClient.get("/forbidden")).rejects.toMatchObject({ response: { status: 401 } });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(seen).toHaveLength(2);
  });

  it("queued requests don't loop either", async () => {
    const seen = fakeServer({ alwaysReject: true });
    const refresh = mockRefresh(() => delayed({ access_token: "fresh-access", refresh_token: "r2" }));

    const results = await Promise.allSettled([apiClient.get("/a"), apiClient.get("/b")]);
    expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(seen).toHaveLength(4); // two stale attempts, two retries, nothing more
  });

  it("signs out cleanly when the refresh fails: both requests fail, state and cookie are cleared, we go to login", async () => {
    fakeServer();
    mockRefresh(() => new Promise((_, reject) => setTimeout(() => reject(new Error("refresh token revoked")), 15)));

    const results = await Promise.allSettled([apiClient.get("/a"), apiClient.get("/b")]);
    expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);

    expect(useAuthStore.getState().refreshToken).toBeNull();
    expect(sessionStorage.getItem("access_token")).toBeNull();
    expect(document.cookie).not.toContain("refresh_token=old-refresh");
    expect(location.href).toBe("/login");
  });

  it("does not try to refresh for errors other than 401", async () => {
    apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError("Boom", "ERR_BAD_RESPONSE", config, null, {
        status: 500, statusText: "Server Error", data: {}, headers: {}, config,
      });
    };
    const refresh = mockRefresh(async () => ({ access_token: "x", refresh_token: "y" }));
    await expect(apiClient.get("/a")).rejects.toMatchObject({ response: { status: 500 } });
    expect(refresh).not.toHaveBeenCalled();
  });
});
