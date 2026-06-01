-- Danni Terminal V1 Database Schema
-- Schema: dannifinance

CREATE SCHEMA IF NOT EXISTS dannifinance;

-- Research sessions
CREATE TABLE IF NOT EXISTS dannifinance.research_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Research',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Research messages
CREATE TABLE IF NOT EXISTS dannifinance.research_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES dannifinance.research_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_research_sessions_user
  ON dannifinance.research_sessions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_research_messages_session
  ON dannifinance.research_messages(session_id, created_at ASC);

-- Enable RLS
ALTER TABLE dannifinance.research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dannifinance.research_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own research
CREATE POLICY "Users own sessions"
  ON dannifinance.research_sessions
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users own messages"
  ON dannifinance.research_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM dannifinance.research_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );
