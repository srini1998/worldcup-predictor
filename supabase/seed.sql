-- ============================================================
-- WC2026 Predictor — Seed Data (Round of 32 bracket)
-- Run AFTER schema.sql
-- Real bracket confirmed via football-data.org API — June 28, 2026
-- ============================================================

-- Bracket slot → next_match_slot mapping:
-- Slots 1+2 → 17, 3+4 → 18, 5+6 → 19, 7+8 → 20
-- Slots 9+10 → 21, 11+12 → 22, 13+14 → 23, 15+16 → 24
-- Slots 17+18 → 25, 19+20 → 26, 21+22 → 27, 23+24 → 28
-- Slots 25+26 → 29, 27+28 → 30
-- Slots 29+30 → 32 (Final), losers → 31 (Third Place)

-- ── Round of 32 ───────────────────────────────────────────────
INSERT INTO matches (slot, round, round_name, match_number, team_home, team_away, flag_home, flag_away, kickoff_utc, status, round_multiplier, next_match_slot, next_match_position, api_match_id)
VALUES
  -- Left half (slots 1-8)
  (1,  'R32', 'Round of 32', 1,  'South Africa',        'Canada',              '🇿🇦', '🇨🇦', '2026-06-28T19:00:00Z', 'upcoming', 1, 17, 'home', 537417),
  (2,  'R32', 'Round of 32', 2,  'Brazil',              'Japan',               '🇧🇷', '🇯🇵', '2026-06-29T17:00:00Z', 'upcoming', 1, 17, 'away', 537423),
  (3,  'R32', 'Round of 32', 3,  'Germany',             'Paraguay',            '🇩🇪', '🇵🇾', '2026-06-29T20:30:00Z', 'upcoming', 1, 18, 'home', 537415),
  (4,  'R32', 'Round of 32', 4,  'Netherlands',         'Morocco',             '🇳🇱', '🇲🇦', '2026-06-30T01:00:00Z', 'upcoming', 1, 18, 'away', 537418),
  (5,  'R32', 'Round of 32', 5,  'Ivory Coast',         'Norway',              '🇨🇮', '🇳🇴', '2026-06-30T17:00:00Z', 'upcoming', 1, 19, 'home', 537424),
  (6,  'R32', 'Round of 32', 6,  'France',              'Sweden',              '🇫🇷', '🇸🇪', '2026-06-30T21:00:00Z', 'upcoming', 1, 19, 'away', 537416),
  (7,  'R32', 'Round of 32', 7,  'Mexico',              'Ecuador',             '🇲🇽', '🇪🇨', '2026-07-01T01:00:00Z', 'upcoming', 1, 20, 'home', 537425),
  (8,  'R32', 'Round of 32', 8,  'England',             'Congo DR',            '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇨🇩', '2026-07-01T16:00:00Z', 'upcoming', 1, 20, 'away', 537426),

  -- Right half (slots 9-16)
  (9,  'R32', 'Round of 32', 9,  'Belgium',             'Senegal',             '🇧🇪', '🇸🇳', '2026-07-01T20:00:00Z', 'upcoming', 1, 21, 'home', 537422),
  (10, 'R32', 'Round of 32', 10, 'United States',       'Bosnia-Herzegovina',  '🇺🇸', '🇧🇦', '2026-07-02T00:00:00Z', 'upcoming', 1, 21, 'away', 537421),
  (11, 'R32', 'Round of 32', 11, 'Spain',               'Austria',             '🇪🇸', '🇦🇹', '2026-07-02T19:00:00Z', 'upcoming', 1, 22, 'home', 537420),
  (12, 'R32', 'Round of 32', 12, 'Portugal',            'Croatia',             '🇵🇹', '🇭🇷', '2026-07-02T23:00:00Z', 'upcoming', 1, 22, 'away', 537419),
  (13, 'R32', 'Round of 32', 13, 'Switzerland',         'Algeria',             '🇨🇭', '🇩🇿', '2026-07-03T03:00:00Z', 'upcoming', 1, 23, 'home', 537429),
  (14, 'R32', 'Round of 32', 14, 'Australia',           'Egypt',               '🇦🇺', '🇪🇬', '2026-07-03T18:00:00Z', 'upcoming', 1, 23, 'away', 537428),
  (15, 'R32', 'Round of 32', 15, 'Argentina',           'Cape Verde Islands',  '🇦🇷', '🇨🇻', '2026-07-03T22:00:00Z', 'upcoming', 1, 24, 'home', 537427),
  (16, 'R32', 'Round of 32', 16, 'Colombia',            'Ghana',               '🇨🇴', '🇬🇭', '2026-07-04T01:30:00Z', 'upcoming', 1, 24, 'away', 537430);

-- ── Round of 16 ───────────────────────────────────────────────
INSERT INTO matches (slot, round, round_name, match_number, team_home, team_away, kickoff_utc, status, round_multiplier, next_match_slot, next_match_position, api_match_id)
VALUES
  (17, 'R16', 'Round of 16', 1, 'TBD', 'TBD', '2026-07-04T17:00:00Z', 'upcoming', 1.5, 25, 'home', 537376),
  (18, 'R16', 'Round of 16', 2, 'TBD', 'TBD', '2026-07-04T21:00:00Z', 'upcoming', 1.5, 25, 'away', 537375),
  (19, 'R16', 'Round of 16', 3, 'TBD', 'TBD', '2026-07-05T20:00:00Z', 'upcoming', 1.5, 26, 'home', 537377),
  (20, 'R16', 'Round of 16', 4, 'TBD', 'TBD', '2026-07-06T00:00:00Z', 'upcoming', 1.5, 26, 'away', 537378),
  (21, 'R16', 'Round of 16', 5, 'TBD', 'TBD', '2026-07-06T19:00:00Z', 'upcoming', 1.5, 27, 'home', 537379),
  (22, 'R16', 'Round of 16', 6, 'TBD', 'TBD', '2026-07-07T00:00:00Z', 'upcoming', 1.5, 27, 'away', 537380),
  (23, 'R16', 'Round of 16', 7, 'TBD', 'TBD', '2026-07-07T16:00:00Z', 'upcoming', 1.5, 28, 'home', 537381),
  (24, 'R16', 'Round of 16', 8, 'TBD', 'TBD', '2026-07-07T20:00:00Z', 'upcoming', 1.5, 28, 'away', 537382);

-- ── Quarter-finals ────────────────────────────────────────────
INSERT INTO matches (slot, round, round_name, match_number, team_home, team_away, kickoff_utc, status, round_multiplier, next_match_slot, next_match_position, api_match_id)
VALUES
  (25, 'QF', 'Quarterfinal', 1, 'TBD', 'TBD', '2026-07-09T20:00:00Z', 'upcoming', 2, 29, 'home', 537383),
  (26, 'QF', 'Quarterfinal', 2, 'TBD', 'TBD', '2026-07-10T19:00:00Z', 'upcoming', 2, 29, 'away', 537384),
  (27, 'QF', 'Quarterfinal', 3, 'TBD', 'TBD', '2026-07-11T21:00:00Z', 'upcoming', 2, 30, 'home', 537385),
  (28, 'QF', 'Quarterfinal', 4, 'TBD', 'TBD', '2026-07-12T01:00:00Z', 'upcoming', 2, 30, 'away', 537386);

-- ── Semi-finals ───────────────────────────────────────────────
INSERT INTO matches (slot, round, round_name, match_number, team_home, team_away, kickoff_utc, status, round_multiplier, next_match_slot, next_match_position, api_match_id)
VALUES
  (29, 'SF', 'Semifinal', 1, 'TBD', 'TBD', '2026-07-14T19:00:00Z', 'upcoming', 3, 32, 'home', 537387),
  (30, 'SF', 'Semifinal', 2, 'TBD', 'TBD', '2026-07-15T19:00:00Z', 'upcoming', 3, 32, 'away', 537388);

-- ── Third Place ───────────────────────────────────────────────
INSERT INTO matches (slot, round, round_name, match_number, team_home, team_away, kickoff_utc, status, round_multiplier, api_match_id)
VALUES
  (31, 'THIRD', 'Third Place', 1, 'TBD', 'TBD', '2026-07-18T21:00:00Z', 'upcoming', 2, 537389);

-- ── Final ─────────────────────────────────────────────────────
INSERT INTO matches (slot, round, round_name, match_number, team_home, team_away, kickoff_utc, status, round_multiplier, api_match_id)
VALUES
  (32, 'FINAL', 'Final 🏆', 1, 'TBD', 'TBD', '2026-07-19T19:00:00Z', 'upcoming', 5, 537390);
