export type Bindings = {
  DB: D1Database;
  API_TOKEN: string;
};

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
