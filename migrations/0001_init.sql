CREATE TABLE graphs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  service     TEXT NOT NULL,
  section     TEXT NOT NULL,
  graph       TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#00ccff',
  description TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  UNIQUE (service, section, graph)
);

CREATE TABLE data_points (
  graph_id INTEGER NOT NULL REFERENCES graphs(id) ON DELETE CASCADE,
  ts       INTEGER NOT NULL,
  value    REAL    NOT NULL,
  PRIMARY KEY (graph_id, ts)
);
