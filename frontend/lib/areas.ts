import { tokenColor } from "@/lib/utils/color";

/** The six life areas. Single source of truth for ids, names, routes and colours; ids match the backend (`app/core/areas.py`).
 *  Class names are written out in full so Tailwind can see them. Area colours as TEXT use `text` (the -fg variant). */
export type AreaKey = "health" | "mind" | "relationships" | "work" | "money" | "growth";

interface AreaDef {
  id: number;
  key: AreaKey;
  slug: AreaKey;
  name: string;
  icon: string;
  route: string;
  colorVar: string;
  dot: string;
  text: string;
  border: string;
  soft: string;
}

const AREA_DEFS: readonly AreaDef[] = [
  { id: 1, key: "health", slug: "health", name: "Health", icon: "heart", route: "/health", colorVar: "--area-health",
    dot: "bg-area-health", text: "text-area-health-fg", border: "border-area-health", soft: "bg-area-health/10" },
  { id: 2, key: "mind", slug: "mind", name: "Mind", icon: "brain", route: "/mind", colorVar: "--area-mind",
    dot: "bg-area-mind", text: "text-area-mind-fg", border: "border-area-mind", soft: "bg-area-mind/10" },
  { id: 3, key: "relationships", slug: "relationships", name: "Relationships", icon: "users", route: "/relationships", colorVar: "--area-relationships",
    dot: "bg-area-relationships", text: "text-area-relationships-fg", border: "border-area-relationships", soft: "bg-area-relationships/10" },
  { id: 4, key: "work", slug: "work", name: "Work", icon: "briefcase", route: "/work", colorVar: "--area-work",
    dot: "bg-area-work", text: "text-area-work-fg", border: "border-area-work", soft: "bg-area-work/10" },
  { id: 5, key: "money", slug: "money", name: "Money", icon: "wallet", route: "/money", colorVar: "--area-money",
    dot: "bg-area-money", text: "text-area-money-fg", border: "border-area-money", soft: "bg-area-money/10" },
  { id: 6, key: "growth", slug: "growth", name: "Growth", icon: "sprout", route: "/growth", colorVar: "--area-growth",
    dot: "bg-area-growth", text: "text-area-growth-fg", border: "border-area-growth", soft: "bg-area-growth/10" },
];

export const AREAS = AREA_DEFS.map((a) => ({ ...a, color: tokenColor(a.colorVar.slice(2)) }));

export type Area = (typeof AREAS)[number];

export const AREA_BY_ID: Record<number, Area> = Object.fromEntries(AREAS.map((a) => [a.id, a]));
export const AREA_BY_KEY: Record<string, Area> = Object.fromEntries(AREAS.map((a) => [a.key, a]));

export function getArea(idOrKey: number | string | null | undefined): Area | undefined {
  if (idOrKey == null) return undefined;
  return typeof idOrKey === "number" ? AREA_BY_ID[idOrKey] : AREA_BY_KEY[idOrKey];
}
