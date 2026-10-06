import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

vi.mock("sonner", () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { toast, Toaster: () => null };
});
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: () => null,
  Line: () => null,
  YAxis: () => null,
}));

import { toast } from "sonner";
import { StatTile } from "@/components/ui/stat-tile";
import { RangeTabs, type RangeDays } from "@/components/ui/range-tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { errorMessage, toastError, toastUndo } from "@/lib/toast";
import { deltaTone, deltaText } from "@/components/ui/delta";

describe("StatTile delta", () => {
  it("colours an improvement green with an up arrow and accessible text", () => {
    render(<StatTile label="Life Score" value="7.2" delta={0.6} />);
    const delta = screen.getByText("up 0.6").closest("[data-tone]")!;
    expect(delta).toHaveAttribute("data-tone", "positive");
    expect(delta.className).toContain("text-success-fg");
  });

  it("colours a decline red", () => {
    render(<StatTile label="Mood" value="5" delta={-1} />);
    const delta = screen.getByText("down 1").closest("[data-tone]")!;
    expect(delta).toHaveAttribute("data-tone", "negative");
    expect(delta.className).toContain("text-destructive-fg");
  });

  it("flips colours when lower is better", () => {
    render(<StatTile label="Stress" value="4" delta={-2} invertDelta />);
    expect(screen.getByText("down 2").closest("[data-tone]")).toHaveAttribute("data-tone", "positive");
  });

  it("is neutral for no change or no data", () => {
    expect(deltaTone(0)).toBe("neutral");
    expect(deltaTone(null)).toBe("neutral");
    expect(deltaText(0)).toBe("unchanged");
  });
});

function Harness() {
  const [range, setRange] = useState<RangeDays>(30);
  return (
    <>
      <RangeTabs value={range} onChange={setRange} />
      <output data-testid="range">{range}</output>
    </>
  );
}

describe("RangeTabs", () => {
  it("is a radiogroup with one tab stop on the selected range", () => {
    render(<Harness />);
    expect(screen.getByRole("radiogroup", { name: "Time range" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "30D" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "7D" })).toHaveAttribute("tabindex", "-1");
  });

  it("moves and selects with the arrow keys, wrapping at the ends", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    screen.getByRole("radio", { name: "30D" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByTestId("range")).toHaveTextContent("90");
    expect(screen.getByRole("radio", { name: "90D" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByTestId("range")).toHaveTextContent("365");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByTestId("range")).toHaveTextContent("7");
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByTestId("range")).toHaveTextContent("365");
  });
});

describe("ConfirmDialog", () => {
  it("calls onConfirm when confirmed", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmDialog open onOpenChange={() => {}} title="Delete habit?" confirmLabel="Delete" destructive onConfirm={onConfirm} />);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("does not confirm on cancel", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(<ConfirmDialog open onOpenChange={onOpenChange} title="Delete?" onConfirm={onConfirm} />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps confirm disabled until the required text is typed", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog open onOpenChange={() => {}} title="Delete account?" confirmLabel="Delete account" destructive typeToConfirm="DELETE" onConfirm={onConfirm} />
    );
    const confirm = screen.getByRole("button", { name: "Delete account" });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByRole("textbox"), "delete");
    expect(confirm).toBeDisabled();
    await user.clear(screen.getByRole("textbox"));
    await user.type(screen.getByRole("textbox"), "DELETE");
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalled();
  });
});

describe("toast helpers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("extracts a FastAPI string detail", () => {
    expect(errorMessage({ response: { status: 400, data: { detail: "Email already registered" } } })).toBe("Email already registered");
  });

  it("extracts the first validation error with its field", () => {
    const err = { response: { status: 422, data: { detail: [{ loc: ["body", "title"], msg: "Field required" }] } } };
    expect(errorMessage(err)).toBe("title: Field required");
  });

  it("handles network failures, rate limits and server errors", () => {
    expect(errorMessage({ request: {}, message: "Network Error" })).toMatch(/can't reach the server/i);
    expect(errorMessage({ response: { status: 429, data: {} } })).toMatch(/too many requests/i);
    expect(errorMessage({ response: { status: 503, data: {} } })).toMatch(/server/i);
  });

  it("falls back to a generic message", () => {
    expect(errorMessage(undefined)).toMatch(/something went wrong/i);
    expect(errorMessage({ response: { status: 400, data: {} } })).toMatch(/something went wrong/i);
  });

  it("toastError shows the extracted message", () => {
    toastError({ response: { status: 400, data: { detail: "Nope" } } });
    expect(toast.error).toHaveBeenCalledWith("Nope");
  });

  it("toastUndo wires the Undo action", () => {
    const onUndo = vi.fn();
    toastUndo("Habit logged", onUndo);
    const opts = (toast as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(opts.action.label).toBe("Undo");
    opts.action.onClick();
    expect(onUndo).toHaveBeenCalled();
  });
});
