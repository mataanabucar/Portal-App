import type { DashboardCardItem, UrgencyLevel } from "./types";

const URGENCY_RANK: Record<UrgencyLevel, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

// Parse a due date into a sortable number; missing/unparseable sorts last.
function dueSortValue(date: string): number {
  if (!date) return Number.POSITIVE_INFINITY;
  const normalized = date.replace(/^due:\s*/i, "").replace(/^[A-Za-z]{3},\s*/, "");

  const iso = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return Date.UTC(+iso[1], +iso[2] - 1, +iso[3]);

  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const m = normalized.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (m) {
    const monthIdx = months[m[2].toLowerCase()];
    if (monthIdx !== undefined) {
      const year = +m[3] < 100 ? 2000 + +m[3] : +m[3];
      return Date.UTC(year, monthIdx, +m[1]);
    }
  }

  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

// Order by urgency (critical → low), tie-broken by soonest due date.
export function orderByPriority(
  items: DashboardCardItem[]
): DashboardCardItem[] {
  return [...items].sort((a, b) => {
    const rank = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    if (rank !== 0) return rank;
    return dueSortValue(a.due.date) - dueSortValue(b.due.date);
  });
}

export function topByPriority(
  items: DashboardCardItem[],
  count = 5
): DashboardCardItem[] {
  return orderByPriority(items).slice(0, count);
}
