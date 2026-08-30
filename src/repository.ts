import type { DataPoint, GraphRow, Mode } from './types';

const DEFAULT_COLOR = '#00ccff';

export async function getGraph(
  db: D1Database,
  service: string,
  section: string,
  graph: string,
): Promise<GraphRow | null> {
  const row = await db
    .prepare(
      'SELECT * FROM graphs WHERE service = ?1 AND section = ?2 AND graph = ?3',
    )
    .bind(service, section, graph)
    .first<GraphRow>();
  return row ?? null;
}

export async function upsertGraph(
  db: D1Database,
  service: string,
  section: string,
  graph: string,
  options: { color?: string; description?: string },
  now: number,
): Promise<GraphRow> {
  const existing = await getGraph(db, service, section, graph);
  const color = options.color ?? existing?.color ?? DEFAULT_COLOR;
  const description = options.description ?? existing?.description ?? '';

  const row = await db
    .prepare(
      `INSERT INTO graphs (service, section, graph, color, description, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
       ON CONFLICT (service, section, graph) DO UPDATE SET
         color = ?4, description = ?5, updated_at = ?6
       RETURNING *`,
    )
    .bind(service, section, graph, color, description, now)
    .first<GraphRow>();

  if (!row) throw new Error('Failed to upsert graph');
  return row;
}

export async function recordValue(
  db: D1Database,
  graphId: number,
  ts: number,
  number: number,
  mode: Mode,
): Promise<number> {
  if (mode === 'gauge') return writeGauge(db, graphId, ts, number);
  if (mode === 'count') return writeCount(db, graphId, ts, number);
  return writeModified(db, graphId, ts, number);
}

async function writeGauge(
  db: D1Database,
  graphId: number,
  ts: number,
  value: number,
): Promise<number> {
  await db
    .prepare(
      `INSERT INTO data_points (graph_id, ts, value) VALUES (?1, ?2, ?3)
       ON CONFLICT (graph_id, ts) DO UPDATE SET value = excluded.value`,
    )
    .bind(graphId, ts, value)
    .run();
  return value;
}

async function writeCount(
  db: D1Database,
  graphId: number,
  ts: number,
  delta: number,
): Promise<number> {
  const row = await db
    .prepare(
      `INSERT INTO data_points (graph_id, ts, value)
       SELECT ?1, ?2,
              COALESCE((SELECT value FROM data_points
                        WHERE graph_id = ?1 AND ts < ?2
                        ORDER BY ts DESC LIMIT 1), 0) + ?3
       ON CONFLICT (graph_id, ts) DO UPDATE SET value = data_points.value + ?3
       RETURNING value`,
    )
    .bind(graphId, ts, delta)
    .first<{ value: number }>();
  if (!row) throw new Error('Failed to write count value');
  return row.value;
}

async function writeModified(
  db: D1Database,
  graphId: number,
  ts: number,
  value: number,
): Promise<number> {
  const previous = await db
    .prepare(
      'SELECT value FROM data_points WHERE graph_id = ?1 AND ts <= ?2 ORDER BY ts DESC LIMIT 1',
    )
    .bind(graphId, ts)
    .first<{ value: number }>();

  if (previous && previous.value === value) return value;
  return writeGauge(db, graphId, ts, value);
}

export async function getLatestValue(
  db: D1Database,
  graphId: number,
): Promise<number | null> {
  const row = await db
    .prepare(
      'SELECT value FROM data_points WHERE graph_id = ?1 ORDER BY ts DESC LIMIT 1',
    )
    .bind(graphId)
    .first<{ value: number }>();
  return row ? row.value : null;
}

export async function fetchSeries(
  db: D1Database,
  graphId: number,
  bucketSeconds: number,
  sinceTs: number,
  untilTs?: number,
): Promise<DataPoint[]> {
  // D1 always binds JS numbers as SQLite REAL, so a plain `(ts / ?2) * ?2` would
  // perform floating-point division instead of the intended integer bucketing.
  // CAST forces truncation to an integer bucket index regardless of the bound type.
  const untilClause = untilTs === undefined ? '' : 'AND ts < ?4';
  const stmt = db.prepare(
    `SELECT CAST(ts / ?2 AS INTEGER) * CAST(?2 AS INTEGER) AS ts, AVG(value) AS value
     FROM data_points
     WHERE graph_id = ?1 AND ts >= ?3 ${untilClause}
     GROUP BY CAST(ts / ?2 AS INTEGER)
     ORDER BY ts`,
  );
  const bound =
    untilTs === undefined
      ? stmt.bind(graphId, bucketSeconds, sinceTs)
      : stmt.bind(graphId, bucketSeconds, sinceTs, untilTs);
  const { results } = await bound.all<DataPoint>();
  return results;
}

export async function listServices(db: D1Database): Promise<string[]> {
  const { results } = await db
    .prepare('SELECT DISTINCT service FROM graphs ORDER BY service')
    .all<{
      service: string;
    }>();
  return results.map((row) => row.service);
}

export async function listSections(
  db: D1Database,
  service: string,
): Promise<string[]> {
  const { results } = await db
    .prepare(
      'SELECT DISTINCT section FROM graphs WHERE service = ?1 ORDER BY section',
    )
    .bind(service)
    .all<{ section: string }>();
  return results.map((row) => row.section);
}

export async function listGraphs(
  db: D1Database,
  service: string,
  section: string,
): Promise<GraphRow[]> {
  const { results } = await db
    .prepare(
      'SELECT * FROM graphs WHERE service = ?1 AND section = ?2 ORDER BY graph',
    )
    .bind(service, section)
    .all<GraphRow>();
  return results;
}
