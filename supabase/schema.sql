-- ============================================================
-- WC2026 Predictor — Supabase Schema
-- Run this in the Supabase SQL editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Profiles ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email               TEXT NOT NULL,
  display_name        TEXT,
  avatar_url          TEXT,
  total_points        INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  total_predictions   INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── Matches ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slot                INTEGER UNIQUE NOT NULL,   -- 1-32 bracket position
  round               TEXT NOT NULL,             -- R32 | R16 | QF | SF | THIRD | FINAL
  round_name          TEXT NOT NULL,
  match_number        INTEGER NOT NULL,          -- within round
  team_home           TEXT DEFAULT 'TBD',
  team_away           TEXT DEFAULT 'TBD',
  flag_home           TEXT,
  flag_away           TEXT,
  score_home          INTEGER,
  score_away          INTEGER,
  winner              TEXT,
  kickoff_utc         TIMESTAMPTZ,
  status              TEXT DEFAULT 'upcoming',   -- upcoming | live | ft | pens
  api_match_id        INTEGER,
  round_multiplier    NUMERIC DEFAULT 1,
  next_match_slot     INTEGER,                   -- where winner goes
  next_match_position TEXT,                      -- 'home' | 'away'
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── Predictions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id             UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  match_id            UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  predicted_winner    TEXT NOT NULL,
  predicted_home      INTEGER,
  predicted_away      INTEGER,
  points_earned       INTEGER DEFAULT 0,
  is_locked           BOOLEAN DEFAULT FALSE,
  is_early_bird       BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  locked_at           TIMESTAMPTZ,
  UNIQUE (user_id, match_id)
);

-- ── Point Log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS point_log (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id             UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  match_id            UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  base_points         INTEGER DEFAULT 0,
  bonus_underdog      INTEGER DEFAULT 0,
  bonus_early_bird    INTEGER DEFAULT 0,
  bonus_perfect_round INTEGER DEFAULT 0,
  multiplier          NUMERIC DEFAULT 1,
  total_points        INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, match_id)
);

-- ── Row Level Security ────────────────────────────────────────

ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_log   ENABLE ROW LEVEL SECURITY;

-- Profiles: viewable by all authenticated, editable by self
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Matches: viewable by all, updatable by any authenticated user
-- (score syncing is done client-side; admin panel has richer controls)
CREATE POLICY "matches_select" ON matches FOR SELECT USING (true);
CREATE POLICY "matches_insert" ON matches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "matches_update" ON matches FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "matches_delete" ON matches FOR DELETE USING (
  (SELECT email FROM profiles WHERE id = auth.uid()) = current_setting('app.admin_email', true)
);

-- Predictions: authenticated users can see all locked predictions; can insert/update own
CREATE POLICY "predictions_select"  ON predictions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "predictions_insert"  ON predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "predictions_update"  ON predictions FOR UPDATE USING (auth.uid() = user_id);

-- Point log: visible to all authenticated
CREATE POLICY "point_log_select" ON point_log FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "point_log_insert" ON point_log FOR INSERT WITH CHECK (true);
CREATE POLICY "point_log_update" ON point_log FOR UPDATE USING (true);

-- ── Realtime ──────────────────────────────────────────────────
-- Enable realtime for live score + leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE predictions;

-- ── Auto-create profile on Google sign-in ─────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Lock predictions at kickoff ───────────────────────────────
-- This function is called when a match goes live
CREATE OR REPLACE FUNCTION public.lock_predictions_for_match(p_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE predictions
  SET is_locked = TRUE, locked_at = NOW()
  WHERE match_id = p_match_id AND is_locked = FALSE;
END;
$$;
