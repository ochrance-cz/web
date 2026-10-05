import type { APIContext } from 'astro';
import { buildHomeFeed } from '../lib/feed';
// Modern alias of the legacy /index.xml feed.
export const GET = (ctx: APIContext) => buildHomeFeed('cs', ctx.site);
