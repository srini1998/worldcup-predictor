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

-- ── Auto-calculate points when a match finishes ──────────────────
-- SECURITY DEFINER lets any authenticated client call this via RPC
-- and update predictions/profiles for ALL users (bypasses RLS).
CREATE OR REPLACE FUNCTION public.calculate_match_points(p_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match   matches%ROWTYPE;
  pred      predictions%ROWTYPE;
  loser     TEXT;
  base_pts  INTEGER;
  und_bonus INTEGER;
  eb_bonus  INTEGER;
  total_pts INTEGER;
  w_rank    INTEGER;
  l_rank    INTEGER;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  IF NOT FOUND OR v_match.winner IS NULL OR v_match.status NOT IN ('ft','pens') THEN RETURN; END IF;

  loser := CASE WHEN v_match.winner = v_match.team_home THEN v_match.team_away ELSE v_match.team_home END;

  FOR pred IN SELECT * FROM predictions WHERE match_id = p_match_id LOOP
    base_pts := 0; und_bonus := 0; eb_bonus := 0;

    IF pred.predicted_winner = v_match.winner THEN
      IF pred.predicted_home IS NOT NULL AND pred.predicted_away IS NOT NULL
         AND pred.predicted_home = v_match.score_home AND pred.predicted_away = v_match.score_away
      THEN base_pts := 300;
      ELSE base_pts := 100;
      END IF;

      -- Underdog bonus: winner has worse FIFA ranking than loser
      WITH ranks(name, r) AS (VALUES
        ('France',2),('Brazil',3),('England',4),('Belgium',5),('Portugal',6),
        ('Netherlands',7),('Spain',8),('Argentina',9),('Croatia',10),('Mexico',11),
        ('Morocco',12),('USA',13),('United States',13),('Germany',14),('Japan',17),
        ('Senegal',18),('Switzerland',19),('Uruguay',20),('Denmark',21),('Australia',22),
        ('South Korea',23),('Iran',24),('Austria',25),('Poland',26),('Colombia',27),
        ('Ukraine',28),('Turkey',29),('Türkiye',29),('Serbia',30),('Norway',31),
        ('Egypt',33),('Tunisia',34),('Algeria',35),('Canada',41),('Ecuador',42),
        ('Cameroon',43),('South Africa',57),('Bosnia & Herzegovina',63),
        ('Bosnia and Herzegovina',63),('Ghana',64),('Ivory Coast',65),
        ('Cabo Verde',80),('Paraguay',68),('Ivory Coast',65)
      )
      SELECT COALESCE(MAX(r),100) INTO w_rank FROM ranks WHERE name = v_match.winner;

      WITH ranks(name, r) AS (VALUES
        ('France',2),('Brazil',3),('England',4),('Belgium',5),('Portugal',6),
        ('Netherlands',7),('Spain',8),('Argentina',9),('Croatia',10),('Mexico',11),
        ('Morocco',12),('USA',13),('United States',13),('Germany',14),('Japan',17),
        ('Senegal',18),('Switzerland',19),('Uruguay',20),('Denmark',21),('Australia',22),
        ('South Korea',23),('Iran',24),('Austria',25),('Poland',26),('Colombia',27),
        ('Ukraine',28),('Turkey',29),('Türkiye',29),('Serbia',30),('Norway',31),
        ('Egypt',33),('Tunisia',34),('Algeria',35),('Canada',41),('Ecuador',42),
        ('Cameroon',43),('South Africa',57),('Bosnia & Herzegovina',63),
        ('Bosnia and Herzegovina',63),('Ghana',64),('Ivory Coast',65),
        ('Cabo Verde',80),('Paraguay',68),('Ivory Coast',65)
      )
      SELECT COALESCE(MAX(r),100) INTO l_rank FROM ranks WHERE name = loser;

      IF w_rank > l_rank THEN und_bonus := 200; END IF;
      IF pred.is_early_bird THEN eb_bonus := 50; END IF;
    END IF;

    total_pts := ROUND((base_pts + und_bonus + eb_bonus) * v_match.round_multiplier);

    UPDATE predictions SET points_earned = total_pts, is_locked = TRUE WHERE id = pred.id;

    INSERT INTO point_log (user_id, match_id, base_points, bonus_underdog, bonus_early_bird, bonus_perfect_round, multiplier, total_points)
    VALUES (pred.user_id, p_match_id, base_pts, und_bonus, eb_bonus, 0, v_match.round_multiplier, total_pts)
    ON CONFLICT (user_id, match_id) DO UPDATE
      SET base_points = EXCLUDED.base_points, bonus_underdog = EXCLUDED.bonus_underdog,
          bonus_early_bird = EXCLUDED.bonus_early_bird, multiplier = EXCLUDED.multiplier,
          total_points = EXCLUDED.total_points;

    UPDATE profiles SET
      total_points        = GREATEST(0, total_points - COALESCE(pred.points_earned,0) + total_pts),
      correct_predictions = correct_predictions + CASE WHEN base_pts > 0 AND COALESCE(pred.points_earned,0) = 0 THEN 1 ELSE 0 END,
      total_predictions   = total_predictions   + CASE WHEN COALESCE(pred.points_earned,0) = 0 THEN 1 ELSE 0 END
    WHERE id = pred.user_id;
  END LOOP;
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
