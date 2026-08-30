import type { TimeRangeKey } from './aggregate';

export type Bindings = {
  DB: D1Database;
  API_TOKEN: string;
};

// The time range a page is currently displaying, as selected via the tabs
// (preset) or the custom from/to form.
export type PageRange =
  | { mode: 'preset'; t: TimeRangeKey }
  | { mode: 'custom'; from: number; to: number };

export type Mode = 'gauge' | 'count' | 'modified';

export type GraphRow = {
  id: number;
  service: string;
  section: string;
  graph: string;
  color: string;
  description: string;
  created_at: number;
  updated_at: number;
};

export type DataPoint = {
  ts: number;
  value: number;
};
