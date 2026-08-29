import { Hono } from 'hono';
import { getAggregateConfig, resolveTimeRangeKey } from '../aggregate';
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

  const t = resolveTimeRangeKey(c.req.query('t'));
  const { rangeSeconds, bucketSeconds, cacheSeconds } = getAggregateConfig(t);
  const now = Math.floor(Date.now() / 1000);
  const sinceTs = now - rangeSeconds;

  const points = await fetchSeries(
    c.env.DB,
    graphRow.id,
    bucketSeconds,
    sinceTs,
  );

  const response = c.json({
    graph: {
      service: graphRow.service,
      section: graphRow.section,
      graph: graphRow.graph,
      color: graphRow.color,
    },
    t,
    range: { from: sinceTs, to: now },
    points,
  });
  response.headers.set('Cache-Control', `public, max-age=${cacheSeconds}`);

  c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));

  return response;
});

export default data;
