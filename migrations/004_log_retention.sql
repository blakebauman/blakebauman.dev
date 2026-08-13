-- Supports time-bounded deletion of chat logs.
--
-- chat_messages holds full prompt and response text and chat_sessions holds a
-- hashed IP and user agent. Neither had any retention policy, so the table only
-- ever grew and every conversation was kept indefinitely. The scheduled handler
-- in workers/app.ts prunes on this index.

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_activity ON chat_sessions(last_activity_at);
