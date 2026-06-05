const HU_MONTHS = ["jan", "feb", "már", "ápr", "máj", "jún", "júl", "aug", "sze", "okt", "nov", "dec"];

/** Groups an array of dates by month and returns last N months including zeros. */
export function groupByMonth(dates: Date[], months = 6): { month: string; count: number }[] {
  const now     = new Date();
  const result: { month: string; count: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    result.push({ month: HU_MONTHS[d.getMonth()], count: 0, _key: key } as { month: string; count: number; _key?: string });
  }

  for (const date of dates) {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const slot = (result as (typeof result[0] & { _key?: string })[]).find(r => r._key === key);
    if (slot) slot.count++;
  }

  // Remove internal _key before returning
  return result.map(({ month, count }) => ({ month, count }));
}
