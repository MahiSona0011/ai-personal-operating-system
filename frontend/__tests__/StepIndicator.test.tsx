import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StepIndicator from "@/components/onboarding/StepIndicator";

describe("StepIndicator", () => {
  it("renders correct number of step dots", () => {
    const { container } = render(<StepIndicator total={5} current={2} />);
    const dots = container.firstElementChild!.children;
    expect(dots).toHaveLength(5);
  });

  it("active step is wider than future steps", () => {
    const { container } = render(<StepIndicator total={3} current={1} />);
    const dots = Array.from(container.firstElementChild!.children);
    // step index 1 (current) should have w-8, future (index 2) should have w-2
    expect(dots[1].className).toContain("w-8");
    expect(dots[2].className).toContain("w-2");
  });
});
