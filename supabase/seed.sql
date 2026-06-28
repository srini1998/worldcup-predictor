-- ============================================================
-- WC2026 Predictor — Seed Data (Round of 32 bracket)
-- Run AFTER schema.sql
-- Groups confirmed as of June 27, 2026
-- TBD slots will be filled in by API sync or admin panel
-- ============================================================

-- Bracket slot → next_match_slot mapping:
-- Slots 1+2 → 17, 3+4 → 18, 5+6 → 19, 7+8 → 20
-- Slots 9+10 → 21, 11+12 → 22, 13+14 → 23, 15+16 → 24
-- Slots 17+18 → 25, 19+20 → 26, 21+22 → 27, 23+24 → 28
-- Slots 25+26 → 29, 27+28 → 30
-- Slots 29+30 → 32 (Final), losers → 31 (Third Place)

-- ── Round of 32 ───────────────────────────────────────────────
INSERT INTO matches (slot, round, round_name, match_number, team_home, team_away, flag_home, flag_away, kickoff_utc, status, round_multiplier, next_match_slot, next_match_position)
VALUES
  -- Left half (slots 1-8)
  (1,  'R32', 'Round of 32', 1,  'Mexico',              'Canada',              '🇲🇽', '🇨🇦', '2026-06-28T18:00:00Z', 'upcoming', 1, 17, 'home'),
  (2,  'R32', 'Round of 32', 2,  'Switzerland',         'South Africa',        '🇨🇭', '🇿🇦', '2026-06-28T21:00:00Z', 'upcoming', 1, 17, 'away'),
  (3,  'R32', 'Round of 32', 3,  'Brazil',              'Bosnia & Herzegovina','🇧🇷', '🇧🇦', '2026-06-29T18:00:00Z', 'upcoming', 1, 18, 'home'),
  (4,  'R32', 'Round of 32', 4,  'USA',                 'Morocco',             '🇺🇸', '🇲🇦', '2026-06-29T21:00:00Z', 'upcoming', 1, 18, 'away'),
  (5,  'R32', 'Round of 32', 5,  'Germany',             'Norway',              '🇩🇪', '🇳🇴', '2026-06-30T18:00:00Z', 'upcoming', 1, 19, 'home'),
  (6,  'R32', 'Round of 32', 6,  'France',              'Ecuador',             '🇫🇷', '🇪🇨', '2026-06-30T21:00:00Z', 'upcoming', 1, 19, 'away'),
  (7,  'R32', 'Round of 32', 7,  'Belgium',             'TBD',                 '🇧🇪', '🏳️', '2026-07-01T18:00:00Z', 'upcoming', 1, 20, 'home'),
  (8,  'R32', 'Round of 32', 8,  'TBD',                 'Egypt',               '🏳️', '🇪🇬', '2026-07-01T21:00:00Z', 'upcoming', 1, 20, 'away'),

  -- Right half (slots 9-16)
  (9,  'R32', 'Round of 32', 9,  'Argentina',           'TBD',                 '🇦🇷', '🏳️', '2026-07-01T18:00:00Z', 'upcoming', 1, 21, 'home'),
  (10, 'R32', 'Round of 32', 10, 'Spain',               'TBD',                 '🇪🇸', '🏳️', '2026-07-01T21:00:00Z', 'upcoming', 1, 21, 'away'),
  (11, 'R32', 'Round of 32', 11, 'TBD',                 'Ghana',               '🏳️', '🇬🇭', '2026-07-02T18:00:00Z', 'upcoming', 1, 22, 'home'),
  (12, 'R32', 'Round of 32', 12, 'England',             'TBD',                 '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🏳️', '2026-07-02T21:00:00Z', 'upcoming', 1, 22, 'away'),
  (13, 'R32', 'Round of 32', 13, 'TBD',                 'TBD',                 '🏳️', '🏳️', '2026-07-02T18:00:00Z', 'upcoming', 1, 23, 'home'),
  (14, 'R32', 'Round of 32', 14, 'TBD',                 'TBD',                 '🏳️', '🏳️', '2026-07-02T21:00:00Z', 'upcoming', 1, 23, 'away'),
  (15, 'R32', 'Round of 32', 15, 'TBD',                 'TBD',                 '🏳️', '🏳️', '2026-07-03T18:00:00Z', 'upcoming', 1, 24, 'home'),
  (16, 'R32', 'Round of 32', 16, 'TBD',                 'TBD',                 '🏳️', '🏳️', '2026-07-03T21:00:00Z', 'upcoming', 1, 24, 'away');

-- ── Round of 16 ───────────────────────────────────────────────
INSERT INTO matches (slot, round, round_name, match_number, team_home, team_away, kickoff_utc, status, round_multiplier, next_match_slot, next_match_position)
VALUES
  (17, 'R16', 'Round of 16', 1, 'TBD', 'TBD', '2026-07-05T18:00:00Z', 'upcoming', 1.5, 25, 'home'),
  (18, 'R16', 'Round of 16', 2, 'TBD', 'TBD', '2026-07-05T21:00:00Z', 'upcoming', 1.5, 25, 'away'),
  (19, 'R16', 'Round of 16', 3, 'TBD', 'TBD', '2026-07-06T18:00:00Z', 'upcoming', 1.5, 26, 'home'),
  (20, 'R16', 'Round of 16', 4, 'TBD', 'TBD', '2026-07-06T21:00:00Z', 'upcoming', 1.5, 26, 'away'),
  (21, 'R16', 'Round of 16', 5, 'TBD', 'TBD', '2026-07-07T18:00:00Z', 'upcoming', 1.5, 27, 'home'),
  (22, 'R16', 'Round of 16', 6, 'TBD', 'TBD', '2026-07-07T21:00:00Z', 'upcoming', 1.5, 27, 'away'),
  (23, 'R16', 'Round of 16', 7, 'TBD', 'TBD', '2026-07-05T18:00:00Z', 'upcoming', 1.5, 28, 'home'),
  (24, 'R16', 'Round of 16', 8, 'TBD', 'TBD', '2026-07-05T21:00:00Z', 'upcoming', 1.5, 28, 'away');

-- ── Quarter-finals ────────────────────────────────────────────
INSERT INTO matches (slot, round, round_name, match_number, team_home, team_away, kickoff_utc, status, round_multiplier, next_match_slot, next_match_position)
VALUES
  (25, 'QF', 'Quarterfinal', 1, 'TBD', 'TBD', '2026-07-09T18:00:00Z', 'upcoming', 2, 29, 'home'),
  (26, 'QF', 'Quarterfinal', 2, 'TBD', 'TBD', '2026-07-09T21:00:00Z', 'upcoming', 2, 29, 'away'),
  (27, 'QF', 'Quarterfinal', 3, 'TBD', 'TBD', '2026-07-10T18:00:00Z', 'upcoming', 2, 30, 'home'),
  (28, 'QF', 'Quarterfinal', 4, 'TBD', 'TBD', '2026-07-10T21:00:00Z', 'upcoming', 2, 30, 'away');

-- ── Semi-finals ───────────────────────────────────────────────
INSERT INTO matches (slot, round, round_name, match_number, team_home, team_away, kickoff_utc, status, round_multiplier, next_match_slot, next_match_position)
VALUES
  (29, 'SF', 'Semifinal', 1, 'TBD', 'TBD', '2026-07-13T21:00:00Z', 'upcoming', 3, 32, 'home'),
  (30, 'SF', 'Semifinal', 2, 'TBD', 'TBD', '2026-07-14T21:00:00Z', 'upcoming', 3, 32, 'away');

-- ── Third Place ───────────────────────────────────────────────
INSERT INTO matches (slot, round, round_name, match_number, team_home, team_away, kickoff_utc, status, round_multiplier)
VALUES
  (31, 'THIRD', 'Third Place', 1, 'TBD', 'TBD', '2026-07-18T21:00:00Z', 'upcoming', 2);

-- ── Final ─────────────────────────────────────────────────────
INSERT INTO matches (slot, round, round_name, match_number, team_home, team_away, kickoff_utc, status, round_multiplier)
VALUES
  (32, 'FINAL', 'Final 🏆', 1, 'TBD', 'TBD', '2026-07-19T21:00:00Z', 'upcoming', 5);
