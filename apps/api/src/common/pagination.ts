export function normalizePagination(page?: unknown, limit?: unknown, defaultLimit = 20) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || defaultLimit));
  const skip = (pageNum - 1) * limitNum;
  return { page: pageNum, limit: limitNum, skip };
}
