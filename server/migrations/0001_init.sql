CREATE TABLE vaults (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  blob TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE pairings (
  lookup TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX pairings_expires ON pairings (expires_at);
