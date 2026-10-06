/** A CSS colour from a design token, e.g. tokenColor("accent", 0.4) -> "hsl(var(--accent) / 0.4)".
 *  For places that need a colour string (SVG props, chart libraries, inline styles). Prefer Tailwind classes elsewhere. */
export function tokenColor(token: string, alpha?: number): string {
  return alpha === undefined ? `hsl(var(--${token}))` : `hsl(var(--${token}) / ${alpha})`;
}
