import { getRequestConfig } from 'next-intl/server';
import { defaultLocale } from './config';
import messages from './messages/es.json';

/**
 * next-intl request configuration. Single-locale setup (es) with no locale
 * routing; messages are loaded statically from the `es` bundle. When more
 * locales are added, switch to a dynamic import keyed by the resolved locale.
 */
export default getRequestConfig(async () => ({
  locale: defaultLocale,
  messages,
}));
