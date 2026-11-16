CREATE TABLE IF NOT EXISTS push_sent (
  sub_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (sub_id, tag, at)
);
CREATE INDEX IF NOT EXISTS push_sent_at ON push_sent (at);
