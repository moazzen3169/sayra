/**
 * Blog Platform API Response Normalizer
 *
 * Handles and normalizes the two primary response structures documented in Blog-Platform-API.yaml:
 * 1. Standard envelope: `{ data, messagesList, pagination? }`
 * 2. DRF standard paginated response: `{ count, next, previous, results }`
 * 3. Embedded `{ data }` inside results items (e.g. `PaginatedStdArticleList...` where results item has `{ data: ArticleList }`)
 * 4. 204 No Content responses (undefined or empty object)
 * 5. Direct plain arrays or single resource objects
 */

import type {
  BlogPaginatedResult,
  DrfPaginatedDto,
  StdEnvelopeDto,
} from "@/types/blogApi";

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null;
}

function isDrfPaginated<T>(raw: unknown): raw is DrfPaginatedDto<T> {
  return (
    isObject(raw) &&
    typeof raw.count === "number" &&
    Array.isArray(raw.results) &&
    ("next" in raw || "previous" in raw)
  );
}

function isStdEnvelope<T>(raw: unknown): raw is StdEnvelopeDto<T> {
  return isObject(raw) && "data" in raw;
}

/**
 * Extracts a single resource payload from potentially wrapped `{ data }` envelope.
 */
export function unwrapData<T>(item: unknown): T {
  if (isObject(item) && "data" in item && item.data !== undefined) {
    return item.data as T;
  }
  return item as T;
}

/**
 * Normalizes a single resource response (e.g. GET /articles/{slug}/, POST /articles/).
 * Gracefully handles 204 No Content returning undefined.
 */
export function normalizeSingleResponse<T>(
  raw: unknown
): { data: T; messages?: string[] } {
  if (raw === undefined || raw === null) {
    return { data: undefined as unknown as T };
  }

  if (isStdEnvelope<T>(raw)) {
    const unwrapInner = unwrapData<T>(raw.data);
    return {
      data: unwrapInner,
      messages: Array.isArray(raw.messagesList) ? raw.messagesList : undefined,
    };
  }

  return { data: raw as T };
}

/**
 * Normalizes a collection response with complete pagination metadata.
 * Supports:
 * - DRF `{ count, next, previous, results: [ { data } | item ] }`
 * - StdEnvelope `{ data: Item[], messagesList?, pagination? }`
 * - Plain Array `Item[]`
 */
export function normalizeListResponse<T>(
  raw: unknown,
  fallbackPage: number = 1,
  fallbackPageSize: number = 10
): BlogPaginatedResult<T> {
  // Empty or undefined (e.g. 204 No Content)
  if (raw === undefined || raw === null) {
    return {
      items: [],
      pagination: {
        page: fallbackPage,
        pageSize: fallbackPageSize,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
    };
  }

  // Case 1: DRF Paginated Response `{ count, next, previous, results }`
  if (isDrfPaginated<unknown>(raw)) {
    const items: T[] = raw.results.map((r) => unwrapData<T>(r));
    const total = raw.count;
    const pageSize = fallbackPageSize > 0 ? fallbackPageSize : items.length || 10;
    const totalPages = Math.ceil(total / pageSize) || (items.length ? 1 : 0);

    return {
      items,
      pagination: {
        page: fallbackPage,
        pageSize,
        total,
        totalPages,
        hasNext: Boolean(raw.next),
        hasPrevious: Boolean(raw.previous),
        nextUrl: raw.next,
        previousUrl: raw.previous,
      },
    };
  }

  // Case 2: Standard envelope `{ data, messagesList, pagination? }`
  if (isStdEnvelope<unknown>(raw)) {
    const rawData = raw.data;
    const messages = Array.isArray(raw.messagesList) ? raw.messagesList : undefined;

    if (Array.isArray(rawData)) {
      const items: T[] = rawData.map((r) => unwrapData<T>(r));
      const pageInfo = raw.pagination;
      const total =
        typeof pageInfo?.totalCount === "number"
          ? pageInfo.totalCount
          : items.length;
      const page =
        typeof pageInfo?.pageNo === "number" ? pageInfo.pageNo : fallbackPage;
      const pageSize =
        typeof pageInfo?.pageSize === "number"
          ? pageInfo.pageSize
          : fallbackPageSize;
      const totalPages =
        typeof pageInfo?.totalPage === "number"
          ? pageInfo.totalPage
          : Math.ceil(total / (pageSize || 1)) || 1;

      return {
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
        messages,
      };
    }

    // Single item wrapped inside data
    if (rawData !== undefined && rawData !== null) {
      return {
        items: [unwrapData<T>(rawData)],
        pagination: {
          page: 1,
          pageSize: 1,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
        messages,
      };
    }

    return {
      items: [],
      pagination: {
        page: fallbackPage,
        pageSize: fallbackPageSize,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
      messages,
    };
  }

  // Case 3: Plain Array
  if (Array.isArray(raw)) {
    const items: T[] = raw.map((r) => unwrapData<T>(r));
    const total = items.length;
    const pageSize = fallbackPageSize > 0 ? fallbackPageSize : total || 10;
    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      items,
      pagination: {
        page: fallbackPage,
        pageSize,
        total,
        totalPages,
        hasNext: fallbackPage < totalPages,
        hasPrevious: fallbackPage > 1,
      },
    };
  }

  // Fallback: Unknown non-array single object
  return {
    items: [unwrapData<T>(raw)],
    pagination: {
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    },
  };
}
