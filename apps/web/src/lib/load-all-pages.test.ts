import { describe, expect, it } from 'vitest';
import { loadAllPages, MAX_LIST_PAGES } from './load-all-pages';

describe('loadAllPages', () => {
  it('walks every page and then stops', async () => {
    const seen: number[] = [];
    const result = await loadAllPages(async (page, limit) => {
      seen.push(page);
      const start = (page - 1) * limit;
      const data = Array.from({ length: Math.min(limit, 150 - start) }, (_, index) => start + index);
      return {
        data,
        pagination: { page, limit, total: 150, totalPages: 2 },
      };
    }, { pageSize: 100, maxPages: 5 });

    expect(seen).toEqual([1, 2]);
    expect(result.data).toHaveLength(150);
    expect(result.truncated).toBe(false);
  });

  it('stops at the page cap instead of looping', async () => {
    let calls = 0;
    const result = await loadAllPages(async (page, limit) => {
      calls += 1;
      return {
        data: [page],
        pagination: { page, limit, total: 10_000, totalPages: 100 },
      };
    }, { pageSize: 1, maxPages: MAX_LIST_PAGES });

    expect(calls).toBe(MAX_LIST_PAGES);
    expect(result.truncated).toBe(true);
    expect(result.data).toHaveLength(MAX_LIST_PAGES);
  });
});