import { Hono } from 'hono';
import { resolveRange } from '../aggregate';
import { fetchSeries, getGraph } from '../repository';
import type { Bindings } from '../types';

const data = new Hono<{ Bindings: Bindings }>();

data.get('/:service/:section/:graph', async (c) => {
  const cache = caches.default;
  const cacheKey = new Request(c.req.url, c.req.raw);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const { service, section, graph } = c.req.param();
  const graphRow = await getGraph(c.env.DB, service, section, graph);
  if (!graphRow) {
    return c.json({ error: 1, messages: { graph: 'not found' } }, 404);
  }

  const now = Math.floor(Date.now() / 1000);
  const range = resolveRange(
    {
      t: c.req.query('t'),
      from: c.req.query('from'),
      to: c.req.query('to'),
    },
    now,
  );

  const points = await fetchSeries(
    c.env.DB,
    graphRow.id,
    range.bucketSeconds,
    range.sinceTs,
    range.untilTs,
  );

  const response = c.json({
    graph: {
      service: graphRow.service,
      section: graphRow.section,
      graph: graphRow.graph,
      color: graphRow.color,
    },
    t: range.mode === 'preset' ? range.t : null,
    range: { from: range.sinceTs, to: range.untilTs },
    points,
  });
  response.headers.set(
    'Cache-Control',
    `public, max-age=${range.cacheSeconds}`,
  );

  c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));

  return response;
});

export default data;
