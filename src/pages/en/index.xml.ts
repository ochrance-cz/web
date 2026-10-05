import type { APIContext } from 'astro';
import { buildHomeFeed } from '../../lib/feed';
export const GET = (ctx: APIContext) => buildHomeFeed('en', ctx.site);
