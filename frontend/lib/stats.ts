/** Trailing mean over `window` points, skipping gaps (null). Null only when the whole window is empty. */
export function movingAverage(values: (number | null)[], window = 7): (number | null)[] {
  return values.map((_, i) => {
    const chunk = values.slice(Math.max(0, i - window + 1), i + 1).filter((v): v is number => v != null);
    return chunk.length ? Number((chunk.reduce((a, b) => a + b, 0) / chunk.length).toFixed(2)) : null;
  });
}
