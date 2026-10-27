// The CMS saves a news item's publication time without a time zone ("2026-10-27T14:30"),
// meaning Prague time. Older items carry a UTC timestamp ("…T08:00:00.000Z"). The build
// runs in UTC, so `new Date()` would read the CMS value as UTC and RSS readers would show
// it an hour or two early. Use this wherever the exact moment is published to machines
// (RSS pubDate, <time datetime>). The visible date keeps its own formatting.

const ZONE = 'Europe/Prague';
const WALL_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;

const partsFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** Prague's offset from UTC at the given moment, in milliseconds. */
function pragueOffset(utc: number): number {
  const p = Object.fromEntries(partsFormat.formatToParts(new Date(utc)).map(x => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(utc / 1000) * 1000;
}

/** The moment an item was published. Times without a zone are read as Prague time. */
export function publicationTime(value: Date | string | undefined | null): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  const m = value.trim().match(WALL_TIME);
  if (!m) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  const [, y, mo, d, h, mi, s] = m;
  const wall = Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s ?? 0));
  // The offset depends on the moment itself (summer time), so correct once more after the first guess.
  const first = wall - pragueOffset(wall);
  return new Date(wall - pragueOffset(first));
}
