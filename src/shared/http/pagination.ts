/**
 * Reads `page` / `limit` from a query string with a hard ceiling, so
 * `?limit=999999` cannot pull a whole table into memory.
 */
export interface Page {
  page: number;
  limit: number;
  offset: number;
}

export function parsePagination(
  query: Record<string, unknown>,
  { defaultLimit = 20, maxLimit = 200 }: { defaultLimit?: number; maxLimit?: number } = {},
): Page {
  const rawPage = Number.parseInt(String(query.page ?? ''), 10);
  const rawLimit = Number.parseInt(String(query.limit ?? ''), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Math.min(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : defaultLimit, maxLimit);
  return { page, limit, offset: (page - 1) * limit };
}

/** `{ total, page, pages, limit }` — the pagination object every list endpoint returned. */
export function paginationMeta(total: number, { page, limit }: Page) {
  return { total, page, pages: Math.ceil(total / limit), limit };
}
