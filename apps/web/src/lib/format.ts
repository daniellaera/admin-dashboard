import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(advancedFormat);
dayjs.extend(relativeTime);

/** `19th February 2023` — the feed/post format of the original app. */
export function longDate(iso: string): string {
  return dayjs(iso).format('Do MMMM YYYY');
}

/** `2/19/2023` — the CV table format of the original app. */
export function shortDate(iso: string): string {
  return dayjs(iso).format('M/D/YYYY');
}

/** `over 1 year ago`, `3 minutes ago` */
export function timeAgo(iso: string): string {
  return dayjs(iso).fromNow();
}

export function truncate(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/** Deterministic colour per value (post types, tags) — replaces the random colours of the original UI. */
const PALETTE = [
  'blue',
  'teal',
  'grape',
  'orange',
  'green',
  'pink',
  'cyan',
  'indigo',
  'lime',
  'violet',
];
export function colorFor(value: string): string {
  let hash = 0;
  for (const ch of value) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length] ?? 'blue';
}
