import { describe, expect, it } from "vitest";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import config from "../tailwind.config";

async function generate(classes: string): Promise<string> {
  const result = await postcss([
    tailwindcss({ ...config, content: [{ raw: classes }] }),
  ]).process("@tailwind utilities;", { from: undefined });
  return result.css;
}

describe("tailwind token mapping", () => {
  it("generates the semantic colour utilities that used to be missing", async () => {
    const css = await generate(
      "text-success text-success-fg bg-success/10 text-warning-fg border-border-strong text-fg-muted bg-accent-solid text-accent-fg"
    );
    expect(css).toContain(".text-success");
    expect(css).toContain(".text-success-fg");
    expect(css).toContain(".bg-success\\/10");
    expect(css).toContain(".border-border-strong");
    expect(css).toContain(".bg-accent-solid");
    // alpha modifiers resolve through the <alpha-value> form
    expect(css).toMatch(/\.bg-success\\\/10\s*\{[^}]*hsl\(var\(--success\) \/ 0\.1\)/);
  });

  it("maps every area fill and text variant", async () => {
    const areas = ["health", "mind", "relationships", "work", "money", "growth"];
    const css = await generate(areas.map((a) => `bg-area-${a} text-area-${a}-fg`).join(" "));
    for (const a of areas) {
      expect(css).toContain(`.bg-area-${a}`);
      expect(css).toContain(`.text-area-${a}-fg`);
    }
  });

  it("applies Inter through font-sans", async () => {
    const css = await generate("font-sans");
    expect(css).toMatch(/\.font-sans\s*\{[^}]*var\(--font-inter\)/);
  });

  it("maps chart tokens", async () => {
    const css = await generate("text-chart-axis stroke-chart-grid");
    expect(css).toContain(".text-chart-axis");
    expect(css).toContain(".stroke-chart-grid");
  });
});
