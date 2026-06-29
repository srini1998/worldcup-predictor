-- ============================================================
-- WC2026 Sync Function — Run ONCE in Supabase SQL Editor
-- Creates a SECURITY DEFINER RPC that the GitHub Actions
-- sync script can call using just the anon key (no service_role needed).
-- ============================================================

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

  -- Re-fetch so we have the updated flags for winner advancement
  SELECT * INTO v_match FROM matches WHERE api_match_id = p_api_match_id;

  -- Advance winner to next round only on first finish
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

-- Allow the anon key (GitHub Actions) to call this function
GRANT EXECUTE ON FUNCTION public.sync_match_result TO anon;
