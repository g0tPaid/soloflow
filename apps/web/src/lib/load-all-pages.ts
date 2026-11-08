import type { PaginatedResult } from '@/lib/api';

/** Hard stop so a picker cannot request forever if a page count is wrong. */
export const MAX_LIST_PAGES = 20;
export const LIST_PAGE_SIZE = 100;

/**
 * Follow page links until the API reports every row, or until MAX_LIST_PAGES.
 * Callers can tell the user when `truncated` is set.
 */
export async function loadAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<PaginatedResult<T>>,
  options?: { pageSize?: number; maxPages?: number },
): Promise<PaginatedResult<T> & { truncated: boolean }> {
  const pageSize = options?.pageSize ?? LIST_PAGE_SIZE;
  const maxPages = options?.maxPages ?? MAX_LIST_PAGES;
  const rows: T[] = [];
  let total = 0;
  let page = 1;

  while (page <= maxPages) {
    const result = await fetchPage(page, pageSize);
    total = result.pagination.total;
    rows.push(...result.data);
    const shortPage = result.data.length < pageSize;
    if (shortPage || rows.length >= total || result.data.length === 0) break;
    page += 1;
  }

  return {
    data: rows,
    truncated: rows.length < total,
    pagination: {
      page: 1,
      limit: Math.max(rows.length, 1),
      total,
      totalPages: 1,
    },
  };
}
