/**
 * Tandoor's meal-plan API returns entries that OVERLAP the requested window,
 * not only the ones that start inside it. When a window is requested we keep
 * only entries whose `from_date` falls within [fromDate, toDate] — that is what
 * callers actually mean by "the plan for this week".
 */
export function filterMealPlansByDateWindow<T extends { from_date?: string }>(
  entries: T[],
  fromDate?: string,
  toDate?: string,
): T[] {
  if (!fromDate && !toDate) {
    return entries;
  }

  const start = fromDate ? fromDate.slice(0, 10) : null;
  const end = toDate ? toDate.slice(0, 10) : null;

  return entries.filter((entry) => {
    const entryDate = entry.from_date?.slice(0, 10) ?? null;
    if (!entryDate) {
      return false;
    }
    if (start && entryDate < start) {
      return false;
    }
    if (end && entryDate > end) {
      return false;
    }
    return true;
  });
}

/**
 * Format a date value as `YYYY-MM-DD`. Returns '' when the value is empty or
 * invalid.
 *
 * n8n date pickers emit ISO strings with an offset (e.g.
 * `2026-11-15T00:00:00.000+01:00`). Reading the leading date directly avoids
 * the off-by-one-day shifts that a UTC conversion would introduce.
 */
export function toDateOnly(value: unknown): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  if (typeof value === 'string') {
    const match = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) {
      return match[0];
    }
  }

  const date = new Date(value as string | number);
  if (isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
