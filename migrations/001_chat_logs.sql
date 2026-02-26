-- Chat conversation logging schema

CREATE TABLE chat_sessions (
  id TEXT PRIMARY KEY,                    -- UUID7 from client
  created_at TEXT DEFAULT (datetime('now')),
  last_activity_at TEXT DEFAULT (datetime('now')),
  ip_hash TEXT,                           -- SHA-256 hash (privacy)
  user_agent TEXT,
  message_count INTEGER DEFAULT 0
);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,                    -- UUID7 from server
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  response_time_ms INTEGER,
  was_redirected INTEGER DEFAULT 0,       -- guardrail triggered
  vector_matches_count INTEGER,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
);

CREATE INDEX idx_sessions_created_at ON chat_sessions(created_at);
CREATE INDEX idx_messages_session_id ON chat_messages(session_id);
