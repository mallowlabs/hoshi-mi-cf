# hoshi-mi-cf

A [GrowthForecast](https://github.com/kazeburo/GrowthForecast)-like metrics service that runs entirely
within the Cloudflare free tier. Push numbers with a plain `curl` POST, and the service renders time
series graphs with [Chart.js](https://www.chartjs.org/). No RRDtool, no server to maintain.

- Storage: Cloudflare D1 (SQLite)
- Rendering: server-side Hono JSX, Chart.js loaded from a CDN
- Auth: a single bearer token protects writes; reads are public
- Retention: nothing is ever deleted or rolled up

## Usage

### Write a value

```
POST /api/:service/:section/:graph
Authorization: Bearer $API_TOKEN
Content-Type: application/x-www-form-urlencoded

number=42&mode=gauge&color=%2300cc00&description=requests+per+minute
```

```console
$ curl -X POST -H 'Authorization: Bearer dev-token' \
    -d 'number=42' -d 'mode=gauge' \
    https://hoshi-mi-cf.example.workers.dev/api/myapp/web/requests
{"error":0,"data":{"id":1,"service_name":"myapp","section_name":"web","graph_name":"requests","number":42,"mode":"gauge","color":"#00ccff","description":"","created_at":1753000000,"updated_at":1753000000}}
```

Fields:

| Field | Required | Description |
|---|---|---|
| `number` | yes | The value to record. Must be numeric. |
| `mode` | no | `gauge` (default), `count`, or `modified`. See below. |
| `color` | no | `#RRGGBB` line color. Updates the graph's stored color when present. |
| `description` | no | Free text. Updates the graph's stored description when present. |

The graph is created automatically on its first write, keyed by the `(service, section, graph)` triple
in the URL. A missing or incorrect bearer token returns `401`. An invalid `number`, `mode`, or `color`
returns `400` with `{"error":1,"messages":{...}}`.

#### Modes

- **`gauge`** — store `number` as-is for the current minute. Use this for point-in-time readings
  (queue depth, memory usage, temperature, ...).
- **`count`** — add `number` to the running total. Use this for incrementing counters (requests served,
  errors seen, ...); post the delta, not the total.
- **`modified`** — like `gauge`, but skips writing a new row when `number` is unchanged from the most
  recent value. Useful for values that change rarely, to avoid a flat line of identical points.

Repeated writes within the same minute update the same row instead of appending a new one, so posting
frequently doesn't inflate storage.

### Read a graph's metadata

```console
$ curl https://hoshi-mi-cf.example.workers.dev/api/myapp/web/requests
{"error":0,"data":{"id":1,"service_name":"myapp","section_name":"web","graph_name":"requests","number":42,"color":"#00ccff","description":"","created_at":1753000000,"updated_at":1753000000}}
```

Returns `404` for an unknown `service`/`section`/`graph`.

### Read a time series

```console
$ curl 'https://hoshi-mi-cf.example.workers.dev/data/myapp/web/requests?t=d'
{"graph":{"service":"myapp","section":"web","graph":"requests","color":"#00ccff"},"t":"d","points":[{"ts":1753000000,"value":42}]}
```

`t` selects the time range and is one of `h` (hour), `d` (day, default), `w` (week), `m` (month), or
`y` (year). Each range aggregates raw points into fixed-size buckets and is cached at the edge, so
repeated requests for the same range don't re-scan the full table — see [Free tier notes](#free-tier-notes).

### Browse the UI

```
/                          list of services
/:service                  list of sections
/:service/:section         list of graphs, each with a chart
/:service/:section/:graph  single graph with h/d/w/m/y tabs
```

Reads (including the UI) are public; only writes require the bearer token.

### Reserved service names

`/api/*` and `/data/*` are registered ahead of the UI routes, so **`api` and `data` cannot be used as
service names** — a graph posted to `/api/api/...` or `/api/data/...` would be unreachable.

## Setup

Requires Node.js (see `.node-version`) and a Cloudflare account.

```console
$ npm install
$ npx wrangler login
$ npx wrangler d1 create hoshi-mi
```

Paste the resulting `database_id` into `wrangler.jsonc`, then apply the schema locally:

```console
$ npx wrangler d1 migrations apply hoshi-mi --local
```

Set a local API token for `wrangler dev` (this file is gitignored):

```console
$ echo 'API_TOKEN = "dev-token"' > .dev.vars
$ npm run dev
```

```console
$ curl -X POST -H 'Authorization: Bearer dev-token' \
    -d 'number=42' -d 'mode=gauge' \
    http://localhost:8787/api/myapp/web/requests
```

## Deployment

```console
$ npx wrangler d1 migrations apply hoshi-mi --remote
$ npx wrangler secret put API_TOKEN
$ npm run deploy
```

CI (`.github/workflows/ci.yml`) runs lint and tests on every push. Deployment
(`.github/workflows/deploy.yml`) is a manual `workflow_dispatch` that uses
`cloudflare/wrangler-action` with a `CF_API_TOKEN` repository secret — it does not run automatically.

## Free tier notes

| Resource | Free tier | Expected usage |
|---|---|---|
| Workers requests | 100k/day | 10 graphs posted every minute ≈ 14k/day |
| D1 rows written | 100k/day | ≈ 14k/day with the same assumption |
| D1 rows read | 5M/day | Fine with the `/data` cache layer; an uncached `t=y` query can scan up to ~525,600 rows |
| D1 storage | 5 GB | 1-minute resolution ≈ 525k rows/graph/year ≈ tens of MB/year |

Because data is never deleted or rolled up, `/data` responses are cached at the edge (Cloudflare's
Cache API) with a `Cache-Control` max-age that scales with the time range — from 60 seconds for `t=h`
up to 6 hours for `t=y`. If read volume ever becomes a problem despite caching, the fix is a Cron
Trigger plus roll-up tables; the schema supports adding those later without migrating existing data.

## Development

```console
$ npm run dev       # start a local dev server (wrangler dev)
$ npm test           # run the test suite (vitest + @cloudflare/vitest-pool-workers)
$ npm run lint        # check formatting and lint rules (biome)
$ npm run lint:fix    # auto-fix formatting and lint issues
```

## License

MIT. See [LICENSE](./LICENSE).
