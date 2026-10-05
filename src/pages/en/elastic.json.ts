import type { APIRoute } from 'astro';
import { buildElasticBulk } from '../../lib/elastic';

export const GET: APIRoute = async () => {
  const body = await buildElasticBulk('en');
  return new Response(body, { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
