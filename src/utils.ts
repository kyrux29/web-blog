/**
 * Shared utility functions for the Kyrux blog.
 * Centralized here to keep pages/components DRY.
 */

/** Build an absolute path respecting Astro's BASE_URL. */
export function withBase(p: string): string {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/?$/, "/");
  return `${base}${p.replace(/^\//, "")}`;
}

/** Map a CTF difficulty string to its chip style class. */
export function difficultyChipClass(difficulty?: string): string {
  const key = (difficulty ?? "").trim().toLowerCase();
  if (key === "easy") return "chip--easy";
  if (key === "medium") return "chip--medium";
  if (key === "hard") return "chip--hard";
  if (key === "insane") return "chip--insane";
  return "chip--unknown";
}

/** Truncate a string to maxLen characters, appending "…" if truncated. */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen).trimEnd() + "…";
}

/** Format a Date as "en-CA" (YYYY-MM-DD). */
export function formatDateCA(d: Date): string {
  return d.toLocaleDateString("en-CA");
}
