import type { FC } from 'hono/jsx';
import type { GraphRow, PageRange } from '../types';

export const ServiceListPage: FC<{ services: string[] }> = ({ services }) => (
  <div>
    <h1>Services</h1>
    {services.length === 0 ? (
      <p>No data has been posted yet.</p>
    ) : (
      <ul class="hoshi-list">
        {services.map((service) => (
          <li>
            <a href={`/${encodeURIComponent(service)}`}>{service}</a>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export const SectionListPage: FC<{ service: string; sections: string[] }> = ({
  service,
  sections,
}) => (
  <div>
    <p class="hoshi-breadcrumb">
      <a href="/">Services</a> / {service}
    </p>
    <h1>{service}</h1>
    <ul class="hoshi-list">
      {sections.map((section) => (
        <li>
          <a
            href={`/${encodeURIComponent(service)}/${encodeURIComponent(section)}`}
          >
            {section}
          </a>
        </li>
      ))}
    </ul>
  </div>
);

const TIME_RANGES: readonly { key: string; label: string }[] = [
  { key: 'h', label: 'Hour' },
  { key: 'd', label: 'Day' },
  { key: 'w', label: 'Week' },
  { key: 'm', label: 'Month' },
  { key: 'y', label: 'Year' },
];

/** Builds the `/data` query string for the currently selected range. */
function rangeQuery(range: PageRange): string {
  return range.mode === 'custom'
    ? `from=${range.from}&to=${range.to}`
    : `t=${range.t}`;
}

const TimeRangeControls: FC<{ basePath: string; range: PageRange }> = ({
  basePath,
  range,
}) => (
  <div>
    <div class="hoshi-tabs">
      {TIME_RANGES.map((r) => (
        <a
          href={`${basePath}?t=${r.key}`}
          class={
            range.mode === 'preset' && range.t === r.key ? 'active' : undefined
          }
        >
          {r.label}
        </a>
      ))}
    </div>
    <form class="hoshi-range-form" action={basePath} method="get">
      <input type="datetime-local" name="from" step="60" />
      <span>–</span>
      <input type="datetime-local" name="to" step="60" />
      <button type="submit">Apply</button>
    </form>
  </div>
);

export const GraphListPage: FC<{
  service: string;
  section: string;
  graphs: GraphRow[];
  range: PageRange;
}> = ({ service, section, graphs, range }) => {
  const sectionPath = `/${encodeURIComponent(service)}/${encodeURIComponent(section)}`;
  const query = rangeQuery(range);

  return (
    <div>
      <p class="hoshi-breadcrumb">
        <a href="/">Services</a> /{' '}
        <a href={`/${encodeURIComponent(service)}`}>{service}</a> / {section}
      </p>
      <h1>
        {service} / {section}
      </h1>
      <TimeRangeControls basePath={sectionPath} range={range} />
      {graphs.map((graph) => {
        const dataUrl = `/data/${encodeURIComponent(service)}/${encodeURIComponent(section)}/${encodeURIComponent(graph.graph)}?${query}`;
        return (
          <div class="hoshi-graph-card">
            <h3>
              <a
                href={`/${encodeURIComponent(service)}/${encodeURIComponent(section)}/${encodeURIComponent(graph.graph)}`}
              >
                {graph.graph}
              </a>
            </h3>
            <div class="hoshi-chart-wrap hoshi-chart-wrap-card">
              <canvas class="hoshi-chart" data-url={dataUrl} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const GraphDetailPage: FC<{
  service: string;
  section: string;
  graph: GraphRow;
  range: PageRange;
}> = ({ service, section, graph, range }) => {
  const graphPath = `/${encodeURIComponent(service)}/${encodeURIComponent(section)}/${encodeURIComponent(graph.graph)}`;
  const dataUrl = `/data/${encodeURIComponent(service)}/${encodeURIComponent(section)}/${encodeURIComponent(graph.graph)}?${rangeQuery(range)}`;

  return (
    <div>
      <p class="hoshi-breadcrumb">
        <a href="/">Services</a> /{' '}
        <a href={`/${encodeURIComponent(service)}`}>{service}</a> /{' '}
        <a
          href={`/${encodeURIComponent(service)}/${encodeURIComponent(section)}`}
        >
          {section}
        </a>{' '}
        / {graph.graph}
      </p>
      <h1>{graph.graph}</h1>
      {graph.description && <p>{graph.description}</p>}
      <TimeRangeControls basePath={graphPath} range={range} />
      <div class="hoshi-chart-wrap hoshi-chart-wrap-detail">
        <canvas class="hoshi-chart" data-url={dataUrl} />
      </div>
    </div>
  );
};
