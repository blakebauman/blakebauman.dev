-- Migrate chat_messages.id from INTEGER AUTOINCREMENT to TEXT (UUID7)
-- Existing rows get uuid() (v4) for compatibility; new inserts use uuidv7 from application

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

INSERT INTO chat_messages_new (id, session_id, role, content, created_at, response_time_ms, was_redirected, vector_matches_count)
SELECT
  lower(
    hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' ||
    '4' || substr(hex(randomblob(2)), 2, 3) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 1, 3) || '-' ||
    hex(randomblob(6))
  ),
  session_id,
  role,
  content,
  created_at,
  response_time_ms,
  was_redirected,
  vector_matches_count
FROM chat_messages;

DROP TABLE chat_messages;
ALTER TABLE chat_messages_new RENAME TO chat_messages;
CREATE INDEX idx_messages_session_id ON chat_messages(session_id);
