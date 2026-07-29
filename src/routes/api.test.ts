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

describe('POST /api/:service/:section/:graph', () => {
  it('creates a graph on first write and returns the stored value', async () => {
    const res = await authedPost('/api/svc/web/requests', { number: '42' });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      error: 0,
      data: {
        service_name: 'svc',
        section_name: 'web',
        graph_name: 'requests',
        number: 42,
        mode: 'gauge',
        color: '#00ccff',
      },
    });
  });

  it('applies count mode as a running total', async () => {
    await authedPost('/api/svc/count-app/hits', { number: '5', mode: 'count' });
    const res = await authedPost('/api/svc/count-app/hits', {
      number: '3',
      mode: 'count',
    });
    const json = await res.json();
    expect(json.data.number).toBe(8);
  });

  it('rejects a non-numeric value', async () => {
    const res = await authedPost('/api/svc/web/bad-number', {
      number: 'not-a-number',
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ error: 1, messages: { number: 'invalid number' } });
  });

  it('rejects an unknown mode', async () => {
    const res = await authedPost('/api/svc/web/bad-mode', {
      number: '1',
      mode: 'bogus',
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ error: 1, messages: { mode: 'invalid mode' } });
  });

  it('rejects a request without a bearer token', async () => {
    const res = await request('/api/svc/web/no-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'number=1',
    });
    expect(res.status).toBe(401);
  });

  it('rejects a request with the wrong bearer token', async () => {
    const res = await request('/api/svc/web/wrong-auth', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer wrong-token',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'number=1',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/:service/:section/:graph', () => {
  it('returns 404 for an unknown graph', async () => {
    const res = await request('/api/svc/web/unknown-graph');
    expect(res.status).toBe(404);
  });

  it('returns the graph metadata after a write', async () => {
    await authedPost('/api/svc/web/read-back', {
      number: '7',
      color: '#ff0000',
      description: 'hits',
    });
    const res = await request('/api/svc/web/read-back');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      error: 0,
      data: { number: 7, color: '#ff0000', description: 'hits' },
    });
  });
});
