import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StepScores, type AreaScores } from "@/components/checkin/StepScores";
import { LIFE_AREAS } from "@/types";

const scores: AreaScores = {
  score_health: 5, score_mind: 5, score_relationships: 5,
  score_work: 5, score_money: 5, score_growth: 5,
};

describe("StepScores", () => {
  it("shows one slider row for each of the 6 life areas, and no retired area", () => {
    render(<StepScores scores={scores} onChange={vi.fn()} />);
    expect(LIFE_AREAS).toHaveLength(6);
    for (const name of ["Health", "Mind", "Relationships", "Work", "Money", "Growth"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    for (const retired of ["Discipline", "Focus", "Learning", "Career", "Mental", "Social", "Financial"]) {
      expect(screen.queryByText(retired)).not.toBeInTheDocument();
    }
    expect(screen.getAllByText("Struggling")).toHaveLength(6);
  });
});
