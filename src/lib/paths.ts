/** Czech month names (genitive) for date formatting — mirrors data/months.yml. */
export const CZECH_MONTHS = [
  'ledna', 'února', 'března', 'dubna', 'května', 'června',
  'července', 'srpna', 'září', 'října', 'listopadu', 'prosince',
];

export type Locale = 'cs' | 'en';

/** Format a date the Hugo way: "1. ledna 2024" (cs) / "January 1, 2024" (en). */
export function formatDate(d: Date | string | undefined, locale: Locale = 'cs'): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  if (locale === 'en') {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return `${date.getDate()}. ${CZECH_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Locale-aware URL prefix: cs at /, en at /en/. */
export function localePrefix(locale: Locale): string {
  return locale === 'en' ? '/en' : '';
}

/** Build a section/detail URL honoring trailingSlash:'always'. */
export function url(locale: Locale, ...parts: string[]): string {
  const path = parts.filter(Boolean).join('/').replace(/^\/+|\/+$/g, '');
  const prefix = localePrefix(locale);
  return `${prefix}/${path}${path ? '/' : ''}`.replace(/\/{2,}/g, '/');
}
