-- ============================================================
-- WC2026 Sync Functions — Run in Supabase SQL Editor
-- Creates calculate_match_points + sync_match_result RPCs.
-- ============================================================

-- ── 1. Point calculation (called when a match finishes) ───────
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

      WITH ranks(name, r) AS (VALUES
        ('France',2),('Brazil',3),('England',4),('Belgium',5),('Portugal',6),
        ('Netherlands',7),('Spain',8),('Argentina',9),('Croatia',10),('Mexico',11),
        ('Morocco',12),('United States',13),('Germany',14),('Japan',17),
        ('Senegal',18),('Switzerland',19),('Denmark',21),('Australia',22),
        ('Austria',25),('Colombia',27),('Norway',31),('Egypt',33),('Algeria',35),
        ('Canada',41),('Ecuador',42),('South Africa',57),('Bosnia-Herzegovina',63),
        ('Ghana',64),('Ivory Coast',56),('Cape Verde Islands',80),('Paraguay',68),
        ('Congo DR',55),('Sweden',35)
      )
      SELECT COALESCE(MAX(r),100) INTO w_rank FROM ranks WHERE name = v_match.winner;

      WITH ranks(name, r) AS (VALUES
        ('France',2),('Brazil',3),('England',4),('Belgium',5),('Portugal',6),
        ('Netherlands',7),('Spain',8),('Argentina',9),('Croatia',10),('Mexico',11),
        ('Morocco',12),('United States',13),('Germany',14),('Japan',17),
        ('Senegal',18),('Switzerland',19),('Denmark',21),('Australia',22),
        ('Austria',25),('Colombia',27),('Norway',31),('Egypt',33),('Algeria',35),
        ('Canada',41),('Ecuador',42),('South Africa',57),('Bosnia-Herzegovina',63),
        ('Ghana',64),('Ivory Coast',56),('Cape Verde Islands',80),('Paraguay',68),
        ('Congo DR',55),('Sweden',35)
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

-- ── 2. Main sync RPC (called by GitHub Actions with anon key) ─
CREATE OR REPLACE FUNCTION public.sync_match_result(
  p_api_match_id   INTEGER,
  p_status         TEXT,
  p_score_home     INTEGER,
  p_score_away     INTEGER,
  p_winner         TEXT,
  p_team_home      TEXT DEFAULT NULL,
  p_team_away      TEXT DEFAULT NULL,
  p_flag_home      TEXT DEFAULT NULL,
  p_flag_away      TEXT DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match       matches%ROWTYPE;
  v_prev_done   BOOLEAN;
  v_now_done    BOOLEAN;
  v_winner_flag TEXT;
BEGIN
  SELECT * INTO v_match FROM matches WHERE api_match_id = p_api_match_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'match_not_found');
  END IF;

  v_prev_done := v_match.status IN ('ft', 'pens');
  v_now_done  := p_status IN ('ft', 'pens');

  UPDATE matches SET
    status     = p_status,
    score_home = p_score_home,
    score_away = p_score_away,
    winner     = p_winner,
    team_home  = CASE WHEN p_team_home IS NOT NULL AND p_team_home <> 'TBD' THEN p_team_home ELSE team_home END,
    team_away  = CASE WHEN p_team_away IS NOT NULL AND p_team_away <> 'TBD' THEN p_team_away ELSE team_away END,
    flag_home  = CASE WHEN p_flag_home IS NOT NULL AND p_flag_home <> '' THEN p_flag_home ELSE flag_home END,
    flag_away  = CASE WHEN p_flag_away IS NOT NULL AND p_flag_away <> '' THEN p_flag_away ELSE flag_away END
  WHERE api_match_id = p_api_match_id;

  SELECT * INTO v_match FROM matches WHERE api_match_id = p_api_match_id;

  IF v_now_done AND NOT v_prev_done AND p_winner IS NOT NULL
     AND v_match.next_match_slot IS NOT NULL THEN

    v_winner_flag := CASE
      WHEN p_winner = v_match.team_home THEN v_match.flag_home
      ELSE v_match.flag_away
    END;

    IF v_match.next_match_position = 'home' THEN
      UPDATE matches SET team_home = p_winner, flag_home = v_winner_flag
      WHERE slot = v_match.next_match_slot;
    ELSE
      UPDATE matches SET team_away = p_winner, flag_away = v_winner_flag
      WHERE slot = v_match.next_match_slot;
    END IF;

    PERFORM calculate_match_points(v_match.id);
  END IF;

  RETURN jsonb_build_object('ok', true, 'match_id', v_match.id, 'slot', v_match.slot);
END;
$$;

-- Allow the anon key (GitHub Actions) to call both functions
GRANT EXECUTE ON FUNCTION public.calculate_match_points TO anon;
GRANT EXECUTE ON FUNCTION public.sync_match_result TO anon;
