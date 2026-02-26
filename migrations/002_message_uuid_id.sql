-- Migrate chat_messages.id from INTEGER to TEXT (UUID7)
-- SQLite doesn't support ALTER COLUMN, so we recreate the table

-- Create new table with TEXT id
CREATE TABLE chat_messages_new (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  response_time_ms INTEGER,
  was_redirected INTEGER DEFAULT 0,
  vector_matches_count INTEGER,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
);

-- Copy data (convert integer IDs to text)
INSERT INTO chat_messages_new (id, session_id, role, content, created_at, response_time_ms, was_redirected, vector_matches_count)
SELECT CAST(id AS TEXT), session_id, role, content, created_at, response_time_ms, was_redirected, vector_matches_count
FROM chat_messages;

-- Drop old table
DROP TABLE chat_messages;

-- Rename new table
ALTER TABLE chat_messages_new RENAME TO chat_messages;

-- Recreate index
CREATE INDEX idx_messages_session_id ON chat_messages(session_id);
