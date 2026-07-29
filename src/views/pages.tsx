import type { FC } from 'hono/jsx';
import type { GraphRow } from '../types';

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

export const GraphListPage: FC<{
  service: string;
  section: string;
  graphs: GraphRow[];
}> = ({ service, section, graphs }) => (
  <div>
    <p class="hoshi-breadcrumb">
      <a href="/">Services</a> /{' '}
      <a href={`/${encodeURIComponent(service)}`}>{service}</a> / {section}
    </p>
    <h1>
      {service} / {section}
    </h1>
    {graphs.map((graph) => {
      const dataUrl = `/data/${encodeURIComponent(service)}/${encodeURIComponent(section)}/${encodeURIComponent(graph.graph)}?t=d`;
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

const TIME_RANGES: readonly { key: string; label: string }[] = [
  { key: 'h', label: 'Hour' },
  { key: 'd', label: 'Day' },
  { key: 'w', label: 'Week' },
  { key: 'm', label: 'Month' },
  { key: 'y', label: 'Year' },
];

export const GraphDetailPage: FC<{
  service: string;
  section: string;
  graph: GraphRow;
  t: string;
}> = ({ service, section, graph, t }) => {
  const graphPath = `/${encodeURIComponent(service)}/${encodeURIComponent(section)}/${encodeURIComponent(graph.graph)}`;
  const dataUrl = `/data/${encodeURIComponent(service)}/${encodeURIComponent(section)}/${encodeURIComponent(graph.graph)}?t=${t}`;

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
      <div class="hoshi-tabs">
        {TIME_RANGES.map((range) => (
          <a
            href={`${graphPath}?t=${range.key}`}
            class={range.key === t ? 'active' : undefined}
          >
            {range.label}
          </a>
        ))}
      </div>
      <div class="hoshi-chart-wrap hoshi-chart-wrap-detail">
        <canvas class="hoshi-chart" data-url={dataUrl} />
      </div>
    </div>
  );
};
