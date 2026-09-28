/** Shared, non-secret constants used across the API. */

/** httpOnly cookie names carrying the JWT pair (SPEC §4). */
export const ACCESS_TOKEN_COOKIE = 'fgd_access_token';
export const REFRESH_TOKEN_COOKIE = 'fgd_refresh_token';

/** Header echoed back on every response to correlate logs (SPEC §5). */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/** Default pagination bounds for list endpoints (SPEC §7). */
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
