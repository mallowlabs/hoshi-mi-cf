import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from 'cloudflare:test';
import { exports } from 'cloudflare:workers';

async function request(path: string, init?: RequestInit): Promise<Response> {
  const ctx = createExecutionContext();
  const response = await exports.default.fetch(
    new Request(`https://example.com${path}`, init),
    env,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return response;
}

function authedPost(
  path: string,
  body: Record<string, string>,
): Promise<Response> {
  return request(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.API_TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  });
}

describe('GET /data/:service/:section/:graph', () => {
  it('returns 404 for an unknown graph', async () => {
    const res = await request('/data/svc/web/unknown-graph');
    expect(res.status).toBe(404);
  });

  it('returns the graph metadata and points, defaulting t to "d"', async () => {
    await authedPost('/api/svc/web/series', { number: '10' });
    const res = await request('/data/svc/web/series');
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=300');
    const json = await res.json();
    expect(json.t).toBe('d');
    expect(json.graph).toMatchObject({
      service: 'svc',
      section: 'web',
      graph: 'series',
      color: '#00ccff',
    });
    expect(json.points).toHaveLength(1);
    expect(json.points[0].value).toBe(10);
    expect(json.range.to).toBeGreaterThan(json.range.from);
    expect(json.range.to - json.range.from).toBe(24 * 60 * 60);
  });

  it('falls back to "d" for an invalid t value', async () => {
    await authedPost('/api/svc/web/series-invalid-t', { number: '1' });
    const res = await request('/data/svc/web/series-invalid-t?t=bogus');
    const json = await res.json();
    expect(json.t).toBe('d');
  });

  it('applies the cache-control max-age for each time range', async () => {
    await authedPost('/api/svc/web/series-hour', { number: '1' });
    const res = await request('/data/svc/web/series-hour?t=h');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60');
  });

  it('uses a custom from/to range when both are given', async () => {
    await authedPost('/api/svc/web/series-custom', { number: '1' });
    const now = Math.floor(Date.now() / 1000);
    const from = now - 7200;
    const to = now - 3600;
    const res = await request(
      `/data/svc/web/series-custom?from=${from}&to=${to}`,
    );
    const json = await res.json();
    expect(json.t).toBeNull();
    expect(json.range).toEqual({ from, to });
  });

  it('falls back to the preset range when from/to are invalid', async () => {
    await authedPost('/api/svc/web/series-bad-range', { number: '1' });
    const res = await request(
      '/data/svc/web/series-bad-range?t=h&from=200&to=100',
    );
    const json = await res.json();
    expect(json.t).toBe('h');
  });
});
