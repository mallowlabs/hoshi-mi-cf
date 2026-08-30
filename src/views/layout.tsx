import type { FC, PropsWithChildren } from 'hono/jsx';

const CSS = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  margin: 0;
  color: #1a1a1a;
  background: #fafafa;
}
header {
  padding: 1rem 2rem;
  background: #1a1a1a;
}
header a {
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  font-size: 1.1rem;
}
main {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem 2rem 3rem;
}
h1 { font-size: 1.4rem; margin: 0 0 1rem; }
h3 { font-size: 1rem; margin: 0 0 0.75rem; }
ul.hoshi-list { list-style: none; padding: 0; margin: 0; }
ul.hoshi-list li { border-bottom: 1px solid #e2e2e2; }
ul.hoshi-list a {
  display: block;
  padding: 0.75rem 0.25rem;
  color: #1a1a1a;
  text-decoration: none;
}
ul.hoshi-list a:hover { background: #f0f0f0; }
.hoshi-breadcrumb { color: #666; margin-bottom: 0.5rem; font-size: 0.9rem; }
.hoshi-breadcrumb a { color: #666; }
.hoshi-graph-card {
  border: 1px solid #e2e2e2;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  background: #fff;
}
.hoshi-graph-card h3 a { color: #1a1a1a; text-decoration: none; }
.hoshi-tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.hoshi-tabs a {
  padding: 0.3rem 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  text-decoration: none;
  color: #1a1a1a;
  font-size: 0.9rem;
}
.hoshi-tabs a.active { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
.hoshi-range-form { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
.hoshi-range-form input[type="datetime-local"] {
  padding: 0.3rem 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
}
.hoshi-range-form button {
  padding: 0.3rem 0.75rem;
  border: 1px solid #1a1a1a;
  border-radius: 4px;
  background: #1a1a1a;
  color: #fff;
  font-size: 0.9rem;
  cursor: pointer;
}
.hoshi-chart-wrap { position: relative; width: 100%; }
.hoshi-chart-wrap-card { height: 220px; }
.hoshi-chart-wrap-detail { height: 420px; }
canvas.hoshi-chart { width: 100% !important; height: 100% !important; }
`;

const CLIENT_SCRIPT = `
function hoshiToLocalInputValue(ts) {
  var d = new Date(ts * 1000);
  function pad(n) { return String(n).padStart(2, '0'); }
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function hoshiPrefillRangeForm(range) {
  var form = document.querySelector('.hoshi-range-form');
  if (!form || !range) return;
  var fromInput = form.querySelector('[name="from"]');
  var toInput = form.querySelector('[name="to"]');
  if (fromInput && !fromInput.value) fromInput.value = hoshiToLocalInputValue(range.from);
  if (toInput && !toInput.value) toInput.value = hoshiToLocalInputValue(range.to);
}
function hoshiRenderChart(canvas) {
  fetch(canvas.dataset.url)
    .then(function (res) { return res.json(); })
    .then(function (json) {
      hoshiPrefillRangeForm(json.range);
      new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
          datasets: [{
            label: json.graph.graph,
            data: json.points.map(function (p) { return { x: p.ts * 1000, y: p.value }; }),
            borderColor: json.graph.color,
            backgroundColor: json.graph.color,
            pointRadius: 0,
            borderWidth: 1.5,
            tension: 0.1,
          }],
        },
        options: {
          animation: false,
          responsive: true,
          maintainAspectRatio: false,
          scales: { x: { type: 'time' }, y: { beginAtZero: false } },
          plugins: { legend: { display: false } },
        },
      });
    });
}
function hoshiInitRangeForm(form) {
  var params = new URLSearchParams(window.location.search);
  var fromInput = form.querySelector('[name="from"]');
  var toInput = form.querySelector('[name="to"]');
  var from = params.get('from');
  var to = params.get('to');
  if (from) fromInput.value = hoshiToLocalInputValue(Number(from));
  if (to) toInput.value = hoshiToLocalInputValue(Number(to));
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!fromInput.value || !toInput.value) return;
    var fromTs = Math.floor(new Date(fromInput.value).getTime() / 1000);
    var toTs = Math.floor(new Date(toInput.value).getTime() / 1000);
    var url = new URL(form.getAttribute('action'), window.location.origin);
    url.searchParams.set('from', String(fromTs));
    url.searchParams.set('to', String(toTs));
    window.location.href = url.toString();
  });
}
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.hoshi-chart').forEach(hoshiRenderChart);
  document.querySelectorAll('.hoshi-range-form').forEach(hoshiInitRangeForm);
});
`;

export const Layout: FC<PropsWithChildren<{ title: string }>> = (props) => (
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{props.title} - hoshi-mi</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js@4" />
      <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3/dist/chartjs-adapter-date-fns.bundle.min.js" />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </head>
    <body>
      <header>
        <a href="/">hoshi-mi</a>
      </header>
      <main>{props.children}</main>
      <script dangerouslySetInnerHTML={{ __html: CLIENT_SCRIPT }} />
    </body>
  </html>
);
