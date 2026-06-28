-- ============================================================
-- WC2026 Predictor — Live DB Bracket Update
-- Run this in the Supabase SQL editor to fix all match data.
-- Source: football-data.org API, confirmed June 28, 2026
-- ============================================================

-- ── Round of 32: correct teams, kickoffs, and api_match_ids ──
UPDATE matches SET team_home='South Africa',       flag_home='🇿🇦', team_away='Canada',             flag_away='🇨🇦', kickoff_utc='2026-06-28T19:00:00Z', api_match_id=537417, status='upcoming' WHERE slot=1;
UPDATE matches SET team_home='Brazil',             flag_home='🇧🇷', team_away='Japan',              flag_away='🇯🇵', kickoff_utc='2026-06-29T17:00:00Z', api_match_id=537423, status='upcoming' WHERE slot=2;
UPDATE matches SET team_home='Germany',            flag_home='🇩🇪', team_away='Paraguay',           flag_away='🇵🇾', kickoff_utc='2026-06-29T20:30:00Z', api_match_id=537415, status='upcoming' WHERE slot=3;
UPDATE matches SET team_home='Netherlands',        flag_home='🇳🇱', team_away='Morocco',            flag_away='🇲🇦', kickoff_utc='2026-06-30T01:00:00Z', api_match_id=537418, status='upcoming' WHERE slot=4;
UPDATE matches SET team_home='Ivory Coast',        flag_home='🇨🇮', team_away='Norway',             flag_away='🇳🇴', kickoff_utc='2026-06-30T17:00:00Z', api_match_id=537424, status='upcoming' WHERE slot=5;
UPDATE matches SET team_home='France',             flag_home='🇫🇷', team_away='Sweden',             flag_away='🇸🇪', kickoff_utc='2026-06-30T21:00:00Z', api_match_id=537416, status='upcoming' WHERE slot=6;
UPDATE matches SET team_home='Mexico',             flag_home='🇲🇽', team_away='Ecuador',            flag_away='🇪🇨', kickoff_utc='2026-07-01T01:00:00Z', api_match_id=537425, status='upcoming' WHERE slot=7;
UPDATE matches SET team_home='England',            flag_home='🏴󠁧󠁢󠁥󠁮󠁧󠁿', team_away='Congo DR',          flag_away='🇨🇩', kickoff_utc='2026-07-01T16:00:00Z', api_match_id=537426, status='upcoming' WHERE slot=8;
UPDATE matches SET team_home='Belgium',            flag_home='🇧🇪', team_away='Senegal',            flag_away='🇸🇳', kickoff_utc='2026-07-01T20:00:00Z', api_match_id=537422, status='upcoming' WHERE slot=9;
UPDATE matches SET team_home='United States',      flag_home='🇺🇸', team_away='Bosnia-Herzegovina', flag_away='🇧🇦', kickoff_utc='2026-07-02T00:00:00Z', api_match_id=537421, status='upcoming' WHERE slot=10;
UPDATE matches SET team_home='Spain',              flag_home='🇪🇸', team_away='Austria',            flag_away='🇦🇹', kickoff_utc='2026-07-02T19:00:00Z', api_match_id=537420, status='upcoming' WHERE slot=11;
UPDATE matches SET team_home='Portugal',           flag_home='🇵🇹', team_away='Croatia',            flag_away='🇭🇷', kickoff_utc='2026-07-02T23:00:00Z', api_match_id=537419, status='upcoming' WHERE slot=12;
UPDATE matches SET team_home='Switzerland',        flag_home='🇨🇭', team_away='Algeria',            flag_away='🇩🇿', kickoff_utc='2026-07-03T03:00:00Z', api_match_id=537429, status='upcoming' WHERE slot=13;
UPDATE matches SET team_home='Australia',          flag_home='🇦🇺', team_away='Egypt',              flag_away='🇪🇬', kickoff_utc='2026-07-03T18:00:00Z', api_match_id=537428, status='upcoming' WHERE slot=14;
UPDATE matches SET team_home='Argentina',          flag_home='🇦🇷', team_away='Cape Verde Islands', flag_away='🇨🇻', kickoff_utc='2026-07-03T22:00:00Z', api_match_id=537427, status='upcoming' WHERE slot=15;
UPDATE matches SET team_home='Colombia',           flag_home='🇨🇴', team_away='Ghana',              flag_away='🇬🇭', kickoff_utc='2026-07-04T01:30:00Z', api_match_id=537430, status='upcoming' WHERE slot=16;

-- ── Round of 16: correct kickoffs and api_match_ids ───────────
UPDATE matches SET kickoff_utc='2026-07-04T17:00:00Z', api_match_id=537376 WHERE slot=17;
UPDATE matches SET kickoff_utc='2026-07-04T21:00:00Z', api_match_id=537375 WHERE slot=18;
UPDATE matches SET kickoff_utc='2026-07-05T20:00:00Z', api_match_id=537377 WHERE slot=19;
UPDATE matches SET kickoff_utc='2026-07-06T00:00:00Z', api_match_id=537378 WHERE slot=20;
UPDATE matches SET kickoff_utc='2026-07-06T19:00:00Z', api_match_id=537379 WHERE slot=21;
UPDATE matches SET kickoff_utc='2026-07-07T00:00:00Z', api_match_id=537380 WHERE slot=22;
UPDATE matches SET kickoff_utc='2026-07-07T16:00:00Z', api_match_id=537381 WHERE slot=23;
UPDATE matches SET kickoff_utc='2026-07-07T20:00:00Z', api_match_id=537382 WHERE slot=24;

-- ── Quarter-finals ────────────────────────────────────────────
UPDATE matches SET kickoff_utc='2026-07-09T20:00:00Z', api_match_id=537383 WHERE slot=25;
UPDATE matches SET kickoff_utc='2026-07-10T19:00:00Z', api_match_id=537384 WHERE slot=26;
UPDATE matches SET kickoff_utc='2026-07-11T21:00:00Z', api_match_id=537385 WHERE slot=27;
UPDATE matches SET kickoff_utc='2026-07-12T01:00:00Z', api_match_id=537386 WHERE slot=28;

-- ── Semi-finals ───────────────────────────────────────────────
UPDATE matches SET kickoff_utc='2026-07-14T19:00:00Z', api_match_id=537387 WHERE slot=29;
UPDATE matches SET kickoff_utc='2026-07-15T19:00:00Z', api_match_id=537388 WHERE slot=30;

-- ── Third Place & Final ───────────────────────────────────────
UPDATE matches SET kickoff_utc='2026-07-18T21:00:00Z', api_match_id=537389 WHERE slot=31;
UPDATE matches SET kickoff_utc='2026-07-19T19:00:00Z', api_match_id=537390 WHERE slot=32;

-- Verify
SELECT slot, round, team_home, team_away, kickoff_utc, api_match_id
FROM matches ORDER BY slot;
