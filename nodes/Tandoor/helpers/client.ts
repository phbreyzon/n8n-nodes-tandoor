import { IAllExecuteFunctions, IDataObject, IHttpRequestOptions } from 'n8n-workflow';

import { Paginated, TandoorCredentials } from '../interfaces/types';

export type TandoorHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface TandoorRequestOptions {
  method?: TandoorHttpMethod;
  /** Path relative to the base URL, e.g. `/api/recipe/`. */
  endpoint: string;
  /** Query string parameters. Array values are sent as repeated parameters. */
  qs?: IDataObject;
  body?: IDataObject | IDataObject[] | null;
}

/** Safety cap so a misbehaving `next` link can never loop forever. */
const MAX_PAGES = 100;

/** Tandoor accepts (and returns) large pages; keep requests reasonably sized. */
const PAGE_SIZE = 250;

/**
 * Tandoor URLs are stored without a trailing slash and may omit the protocol.
 * Normalise both so `${baseUrl}${endpoint}` always produces a valid URL.
 */
export function normalizeBaseUrl(url: string): string {
  let normalized = (url || '').trim();
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  return normalized.replace(/\/+$/, '');
}

/**
 * Perform a single authenticated request against the Tandoor API.
 *
 * Authentication (the `Authorization: Bearer <token>` header) is injected by
 * the `tandoorApi` credential, so callers only deal with paths and payloads.
 *
 * The context is passed explicitly (rather than via `this`) so the helper can
 * be called from `execute`, `loadOptions` and `listSearch` contexts alike.
 */
export async function tandoorApiRequest<T = IDataObject>(
  ctx: IAllExecuteFunctions,
  options: TandoorRequestOptions,
): Promise<T> {
  const credentials = (await ctx.getCredentials('tandoorApi')) as unknown as TandoorCredentials;
  const baseUrl = normalizeBaseUrl(credentials.baseUrl);

  const requestOptions: IHttpRequestOptions = {
    method: options.method ?? 'GET',
    url: `${baseUrl}${options.endpoint}`,
    json: true,
    // Tandoor (Django REST Framework) expects repeated params for list
    // filters, e.g. `?meal_type=1&meal_type=2`, not `meal_type[]=`.
    arrayFormat: 'repeat',
    headers: {
      Accept: 'application/json',
    },
  };

  if (options.qs) {
    requestOptions.qs = options.qs;
  }

  if (options.body !== undefined && options.body !== null) {
    requestOptions.body = options.body;
  }

  const response = await ctx.helpers.httpRequestWithAuthentication.call(ctx, 'tandoorApi', requestOptions);

  return response as T;
}

/**
 * Fetch a paginated Tandoor endpoint.
 *
 * Tandoor defaults to 25 items per page and silently truncates larger
 * collections, so we keep requesting pages until `next` is null. When `limit`
 * is greater than 0 at most that many items are returned.
 */
export async function tandoorApiRequestAllItems<T = IDataObject>(
  ctx: IAllExecuteFunctions,
  endpoint: string,
  qs: IDataObject = {},
  limit = 0,
): Promise<T[]> {
  const results: T[] = [];
  const pageSize = limit > 0 ? Math.min(limit, PAGE_SIZE) : PAGE_SIZE;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const response = await tandoorApiRequest<Paginated<T>>(ctx, {
      endpoint,
      qs: { ...qs, page, page_size: pageSize },
    });

    const batch = response?.results ?? [];
    results.push(...batch);

    if (limit > 0 && results.length >= limit) {
      return results.slice(0, limit);
    }

    if (!response?.next || batch.length === 0) {
      break;
    }
  }

  return results;
}
