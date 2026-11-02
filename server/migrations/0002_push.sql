CREATE TABLE push_subs (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE push_jobs (
  sub_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  at INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  PRIMARY KEY (sub_id, tag)
);
CREATE INDEX push_jobs_at ON push_jobs (at);
