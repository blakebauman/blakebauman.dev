-- Records which chunk ids the last populate wrote to the Vectorize index.
--
-- Vectorize has no API to list the ids it holds. Without this table, renaming a
-- project or deleting an ai-context entry leaves its vector in the index
-- permanently: still matchable, still retrieved into prompts, and invisible to
-- every subsequent populate. The manifest lets populate diff what it just wrote
-- against what it wrote last time and delete the difference.

CREATE TABLE IF NOT EXISTS vector_manifest (
  id TEXT PRIMARY KEY,
  chunk_type TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vector_manifest_type ON vector_manifest(chunk_type);
