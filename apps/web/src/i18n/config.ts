/** Supported locales. Spanish (es-ES) is the default and, for now, the only one. */
export const locales = ['es'] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = 'es';
