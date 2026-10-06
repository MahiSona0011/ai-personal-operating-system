import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LifeScoreRing } from "@/components/dashboard/LifeScoreRing";

// Recharts uses ResizeObserver — mock it for jsdom
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe("LifeScoreRing", () => {
  it("renders score value", () => {
    render(<LifeScoreRing score={7.5} />);
    expect(screen.getByText("7.5")).toBeInTheDocument();
    expect(screen.getByText("Life Score")).toBeInTheDocument();
  });

  it("renders em dash when score is null", () => {
    render(<LifeScoreRing score={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders skeleton when loading", () => {
    const { container } = render(<LifeScoreRing score={null} loading />);
    // Skeleton replaces the chart — no score text
    expect(screen.queryByText("Life Score")).not.toBeInTheDocument();
    expect(container.querySelector("[class*=skeleton]") ?? container.querySelector("[class*=animate]")).toBeTruthy();
  });
});
