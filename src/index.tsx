import { Hono } from 'hono';
import { parseCustomRange, resolveTimeRangeKey } from './aggregate';
import { getGraph, listGraphs, listSections, listServices } from './repository';
import api from './routes/api';
import data from './routes/data';
import type { Bindings, PageRange } from './types';
import { Layout } from './views/layout';
import {
  GraphDetailPage,
  GraphListPage,
  SectionListPage,
  ServiceListPage,
} from './views/pages';

function resolvePageRange(c: {
  req: { query: (key: string) => string | undefined };
}): PageRange {
  const custom = parseCustomRange(c.req.query('from'), c.req.query('to'));
  return custom
    ? { mode: 'custom', from: custom.from, to: custom.to }
    : { mode: 'preset', t: resolveTimeRangeKey(c.req.query('t')) };
}

const app = new Hono<{ Bindings: Bindings }>();

app.route('/api', api);
app.route('/data', data);

app.get('/', async (c) => {
  const services = await listServices(c.env.DB);
  return c.html(
    <Layout title="Services">
      <ServiceListPage services={services} />
    </Layout>,
  );
});

app.get('/:service', async (c) => {
  const { service } = c.req.param();
  const sections = await listSections(c.env.DB, service);
  if (sections.length === 0) return c.notFound();
  return c.html(
    <Layout title={service}>
      <SectionListPage service={service} sections={sections} />
    </Layout>,
  );
});

app.get('/:service/:section', async (c) => {
  const { service, section } = c.req.param();
  const graphs = await listGraphs(c.env.DB, service, section);
  if (graphs.length === 0) return c.notFound();
  return c.html(
    <Layout title={`${service}/${section}`}>
      <GraphListPage
        service={service}
        section={section}
        graphs={graphs}
        range={resolvePageRange(c)}
      />
    </Layout>,
  );
});

app.get('/:service/:section/:graph', async (c) => {
  const { service, section, graph } = c.req.param();
  const graphRow = await getGraph(c.env.DB, service, section, graph);
  if (!graphRow) return c.notFound();
  return c.html(
    <Layout title={graph}>
      <GraphDetailPage
        service={service}
        section={section}
        graph={graphRow}
        range={resolvePageRange(c)}
      />
    </Layout>,
  );
});

app.notFound((c) => c.text('Not Found', 404));

export default app;
