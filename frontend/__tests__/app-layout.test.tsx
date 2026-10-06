import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/api/client", () => ({
  default: {
    get: vi.fn((url: string) =>
      Promise.resolve({ data: url === "/dashboard" ? { life_score: 7.24, life_score_delta: 0.6 } : [] })
    ),
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/metrics",
  useSearchParams: () => new URLSearchParams(),
}));

import AppLayout from "@/app/(dashboard)/layout";

describe("(dashboard) layout", () => {
  it("gives every page the sidebar, top bar and a main landmark", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AppLayout>
          <h1>Metrics</h1>
        </AppLayout>
      </QueryClientProvider>
    );
    expect(screen.getByRole("main")).toContainElement(screen.getByRole("heading", { name: "Metrics" }));
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    for (const name of ["Dashboard", "Health", "Mind", "Relationships", "Work", "Money", "Growth", "Metrics", "Journal"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Open command palette" })).toBeInTheDocument();
    expect(await screen.findByText("7.2")).toBeInTheDocument();
  });
});
