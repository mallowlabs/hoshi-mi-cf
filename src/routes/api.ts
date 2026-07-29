import { Hono } from 'hono';
import { bearerAuth } from '../auth';
import {
  getGraph,
  getLatestValue,
  recordValue,
  upsertGraph,
} from '../repository';
import type { Bindings, Mode } from '../types';

const MODES: readonly Mode[] = ['gauge', 'count', 'modified'];
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function isMode(value: string): value is Mode {
  return (MODES as readonly string[]).includes(value);
}

const api = new Hono<{ Bindings: Bindings }>();

api.post('/:service/:section/:graph', bearerAuth, async (c) => {
  const { service, section, graph } = c.req.param();
  const body = await c.req.parseBody();

  const numberRaw = body.number;
  const modeRaw =
    typeof body.mode === 'string' && body.mode !== '' ? body.mode : 'gauge';
  const colorRaw = typeof body.color === 'string' ? body.color : undefined;
  const descriptionRaw =
    typeof body.description === 'string' ? body.description : undefined;

  const messages: Record<string, string> = {};

  if (
    typeof numberRaw !== 'string' ||
    numberRaw.trim() === '' ||
    Number.isNaN(Number(numberRaw))
  ) {
    messages.number = 'invalid number';
  }
  if (!isMode(modeRaw)) {
    messages.mode = 'invalid mode';
  }
  if (colorRaw !== undefined && !HEX_COLOR.test(colorRaw)) {
    messages.color = 'invalid color';
  }

  if (Object.keys(messages).length > 0) {
    return c.json({ error: 1, messages }, 400);
  }

  const number = Number(numberRaw);
  const mode = modeRaw as Mode;

  const now = Math.floor(Date.now() / 1000);
  const ts = Math.floor(now / 60) * 60;

  const graphRow = await upsertGraph(
    c.env.DB,
    service,
    section,
    graph,
    { color: colorRaw, description: descriptionRaw },
    now,
  );
  const value = await recordValue(c.env.DB, graphRow.id, ts, number, mode);

  return c.json({
    error: 0,
    data: {
      id: graphRow.id,
      service_name: graphRow.service,
      section_name: graphRow.section,
      graph_name: graphRow.graph,
      number: value,
      mode,
      color: graphRow.color,
      description: graphRow.description,
      created_at: graphRow.created_at,
      updated_at: graphRow.updated_at,
    },
  });
});

api.get('/:service/:section/:graph', async (c) => {
  const { service, section, graph } = c.req.param();
  const graphRow = await getGraph(c.env.DB, service, section, graph);
  if (!graphRow) {
    return c.json({ error: 1, messages: { graph: 'not found' } }, 404);
  }
  const latest = await getLatestValue(c.env.DB, graphRow.id);

  return c.json({
    error: 0,
    data: {
      id: graphRow.id,
      service_name: graphRow.service,
      section_name: graphRow.section,
      graph_name: graphRow.graph,
      number: latest ?? 0,
      color: graphRow.color,
      description: graphRow.description,
      created_at: graphRow.created_at,
      updated_at: graphRow.updated_at,
    },
  });
});

export default api;
