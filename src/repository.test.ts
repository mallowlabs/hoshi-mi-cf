import { env } from 'cloudflare:workers';
import {
  fetchSeries,
  getGraph,
  getLatestValue,
  recordValue,
  upsertGraph,
} from './repository';

describe('upsertGraph / getGraph', () => {
  it('creates a graph with defaults on first write', async () => {
    const graph = await upsertGraph(env.DB, 'svc', 'sec', 'defaults', {}, 1000);
    expect(graph.color).toBe('#00ccff');
    expect(graph.description).toBe('');
    expect(graph.created_at).toBe(1000);
    expect(graph.updated_at).toBe(1000);
  });

  it('updates color and description while keeping created_at', async () => {
    await upsertGraph(
      env.DB,
      'svc',
      'sec',
      'updatable',
      { color: '#111111' },
      1000,
    );
    const updated = await upsertGraph(
      env.DB,
      'svc',
      'sec',
      'updatable',
      { color: '#222222', description: 'new description' },
      2000,
    );
    expect(updated.color).toBe('#222222');
    expect(updated.description).toBe('new description');
    expect(updated.created_at).toBe(1000);
    expect(updated.updated_at).toBe(2000);
  });

  it('returns null for an unknown graph', async () => {
    expect(await getGraph(env.DB, 'nope', 'nope', 'nope')).toBeNull();
  });
});

describe('recordValue gauge mode', () => {
  it('stores the given value at the current minute', async () => {
    const graph = await upsertGraph(
      env.DB,
      'svc',
      'sec',
      'gauge-basic',
      {},
      1000,
    );
    const value = await recordValue(env.DB, graph.id, 60, 42, 'gauge');
    expect(value).toBe(42);
    expect(await getLatestValue(env.DB, graph.id)).toBe(42);
  });

  it('collapses repeated writes within the same minute into one row', async () => {
    const graph = await upsertGraph(
      env.DB,
      'svc',
      'sec',
      'gauge-collapse',
      {},
      1000,
    );
    await recordValue(env.DB, graph.id, 60, 1, 'gauge');
    await recordValue(env.DB, graph.id, 60, 2, 'gauge');
    const series = await fetchSeries(env.DB, graph.id, 60, 0);
    expect(series).toHaveLength(1);
    expect(series[0].value).toBe(2);
  });
});

describe('recordValue count mode', () => {
  it('accumulates onto the most recent value', async () => {
    const graph = await upsertGraph(
      env.DB,
      'svc',
      'sec',
      'count-basic',
      {},
      1000,
    );
    const first = await recordValue(env.DB, graph.id, 60, 5, 'count');
    expect(first).toBe(5);
    const second = await recordValue(env.DB, graph.id, 120, 3, 'count');
    expect(second).toBe(8);
  });

  it('accumulates further writes within the same minute', async () => {
    const graph = await upsertGraph(
      env.DB,
      'svc',
      'sec',
      'count-same-minute',
      {},
      1000,
    );
    await recordValue(env.DB, graph.id, 60, 5, 'count');
    const second = await recordValue(env.DB, graph.id, 60, 3, 'count');
    expect(second).toBe(8);
    const series = await fetchSeries(env.DB, graph.id, 60, 0);
    expect(series).toHaveLength(1);
  });
});

describe('recordValue modified mode', () => {
  it('writes a new row when the value differs', async () => {
    const graph = await upsertGraph(
      env.DB,
      'svc',
      'sec',
      'modified-changed',
      {},
      1000,
    );
    await recordValue(env.DB, graph.id, 60, 10, 'modified');
    await recordValue(env.DB, graph.id, 120, 20, 'modified');
    const series = await fetchSeries(env.DB, graph.id, 60, 0);
    expect(series).toHaveLength(2);
  });

  it('skips the write and still reports success when the value is unchanged', async () => {
    const graph = await upsertGraph(
      env.DB,
      'svc',
      'sec',
      'modified-unchanged',
      {},
      1000,
    );
    await recordValue(env.DB, graph.id, 60, 10, 'modified');
    const second = await recordValue(env.DB, graph.id, 120, 10, 'modified');
    expect(second).toBe(10);
    const series = await fetchSeries(env.DB, graph.id, 60, 0);
    expect(series).toHaveLength(1);
    expect(series[0].ts).toBe(60);
  });
});

describe('fetchSeries', () => {
  it('averages values into buckets and filters by the start timestamp', async () => {
    const graph = await upsertGraph(
      env.DB,
      'svc',
      'sec',
      'series-buckets',
      {},
      0,
    );
    await recordValue(env.DB, graph.id, 0, 10, 'gauge');
    await recordValue(env.DB, graph.id, 60, 20, 'gauge');
    await recordValue(env.DB, graph.id, 120, 40, 'gauge');
    await recordValue(env.DB, graph.id, 180, 60, 'gauge');

    const series = await fetchSeries(env.DB, graph.id, 120, 60);
    expect(series).toEqual([
      { ts: 0, value: 20 },
      { ts: 120, value: 50 },
    ]);
  });

  it('excludes points at or after untilTs when given', async () => {
    const graph = await upsertGraph(
      env.DB,
      'svc',
      'sec',
      'series-until',
      {},
      0,
    );
    await recordValue(env.DB, graph.id, 0, 10, 'gauge');
    await recordValue(env.DB, graph.id, 120, 40, 'gauge');
    await recordValue(env.DB, graph.id, 180, 60, 'gauge');

    const series = await fetchSeries(env.DB, graph.id, 120, 0, 180);
    expect(series).toEqual([
      { ts: 0, value: 10 },
      { ts: 120, value: 40 },
    ]);
  });
});
