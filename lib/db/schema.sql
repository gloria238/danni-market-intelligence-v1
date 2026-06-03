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

-- RLS policies (idempotent: skip if already exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users own sessions' AND tablename = 'research_sessions' AND schemaname = 'dannifinance') THEN
    CREATE POLICY "Users own sessions" ON dannifinance.research_sessions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users own messages' AND tablename = 'research_messages' AND schemaname = 'dannifinance') THEN
    CREATE POLICY "Users own messages" ON dannifinance.research_messages FOR ALL USING (
      EXISTS (SELECT 1 FROM dannifinance.research_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
    );
  END IF;
END $$;

-- V3: Signal history — daily snapshots for pattern matching
CREATE TABLE IF NOT EXISTS dannifinance.signal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id TEXT NOT NULL,
  value NUMERIC NOT NULL,
  delta NUMERIC,
  source TEXT NOT NULL,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(signal_id, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_signal_history_id_date
  ON dannifinance.signal_history(signal_id, recorded_at DESC);

-- RLS: public market data — anyone can read, only service_role can write
ALTER TABLE dannifinance.signal_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read signal history' AND tablename = 'signal_history' AND schemaname = 'dannifinance') THEN
    CREATE POLICY "Public read signal history" ON dannifinance.signal_history FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role insert signal history' AND tablename = 'signal_history' AND schemaname = 'dannifinance') THEN
    CREATE POLICY "Service role insert signal history" ON dannifinance.signal_history FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- V1.7: Divergence observations — persistent history
CREATE TABLE IF NOT EXISTS dannifinance.divergence_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_pair_id TEXT NOT NULL,
  observed_date DATE NOT NULL,
  severity_score NUMERIC(4,2) NOT NULL,
  divergence_type TEXT NOT NULL CHECK (divergence_type IN ('confirmed', 'divergence')),
  signal_a_id TEXT NOT NULL,
  signal_a_value NUMERIC,
  signal_a_delta NUMERIC,
  signal_b_id TEXT NOT NULL,
  signal_b_value NUMERIC,
  signal_b_delta NUMERIC,
  resolution_date DATE,
  resolution_direction TEXT CHECK (resolution_direction IN ('realigned_bullish', 'realigned_bearish', 'persisted', 'reversed', 'faded')),
  resolution_note TEXT,
  unexplained_move_score NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_div_observations_date
  ON dannifinance.divergence_observations(observed_date DESC);
CREATE INDEX IF NOT EXISTS idx_div_observations_pair
  ON dannifinance.divergence_observations(signal_pair_id);
CREATE INDEX IF NOT EXISTS idx_div_observations_user
  ON dannifinance.divergence_observations(user_id, observed_date DESC);

ALTER TABLE dannifinance.divergence_observations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users own divergence data' AND tablename = 'divergence_observations' AND schemaname = 'dannifinance') THEN
    CREATE POLICY "Users own divergence data" ON dannifinance.divergence_observations FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
