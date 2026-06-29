#!/usr/bin/env python3
"""
WC2026 Score Syncer
-------------------
Fetches knockout results from football-data.org and updates Supabase
via the sync_match_result SECURITY DEFINER RPC (callable with anon key).
"""

import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone

FOOTBALL_API_KEY = os.environ["FOOTBALL_API_KEY"]
SUPABASE_URL     = os.environ["SUPABASE_URL"]
SUPABASE_KEY     = os.environ["SUPABASE_ANON_KEY"]

FOOTBALL_BASE = "https://api.football-data.org/v4"
SUPABASE_REST = f"{SUPABASE_URL}/rest/v1"

STAGE_MAP = {
    "LAST_32": "R32", "ROUND_OF_32": "R32",
    "LAST_16": "R16", "ROUND_OF_16": "R16",
    "QUARTER_FINALS": "QF",
    "SEMI_FINALS": "SF",
    "THIRD_PLACE": "THIRD",
    "FINAL": "FINAL",
}

KNOCKOUT_STAGES = set(STAGE_MAP)

FLAG_MAP = {
    "South Africa": "🇿🇦", "Canada": "🇨🇦", "Brazil": "🇧🇷", "Japan": "🇯🇵",
    "Germany": "🇩🇪", "Paraguay": "🇵🇾", "Netherlands": "🇳🇱", "Morocco": "🇲🇦",
    "Ivory Coast": "🇨🇮", "Norway": "🇳🇴", "France": "🇫🇷", "Sweden": "🇸🇪",
    "Mexico": "🇲🇽", "Ecuador": "🇪🇨", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Congo DR": "🇨🇩",
    "Belgium": "🇧🇪", "Senegal": "🇸🇳", "United States": "🇺🇸",
    "Bosnia-Herzegovina": "🇧🇦", "Spain": "🇪🇸", "Austria": "🇦🇹",
    "Portugal": "🇵🇹", "Croatia": "🇭🇷", "Switzerland": "🇨🇭", "Algeria": "🇩🇿",
    "Australia": "🇦🇺", "Egypt": "🇪🇬", "Argentina": "🇦🇷",
    "Cape Verde Islands": "🇨🇻", "Colombia": "🇨🇴", "Ghana": "🇬🇭",
}


def football_get(path):
    req = urllib.request.Request(
        f"{FOOTBALL_BASE}{path}",
        headers={
            "X-Auth-Token": FOOTBALL_API_KEY,
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def supabase_get(table, params=""):
    req = urllib.request.Request(
        f"{SUPABASE_REST}/{table}?{params}",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def supabase_rpc(fn, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/rpc/{fn}",
        data=data,
        method="POST",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  RPC error {e.code}: {body}")
        return None


def normalize(m):
    score = m.get("score", {}).get("fullTime", {})
    sh, sa = score.get("home"), score.get("away")

    raw_status = m.get("status", "SCHEDULED")
    if raw_status in ("SCHEDULED", "TIMED"):
        status = "upcoming"
    elif raw_status in ("IN_PLAY", "PAUSED", "LIVE", "EXTRA_TIME"):
        status = "live"
    elif raw_status == "PENALTY_SHOOTOUT":
        status = "pens"
    elif raw_status == "FINISHED":
        status = "ft"
    else:
        status = "upcoming"

    winner_code = m.get("score", {}).get("winner")
    pens = m.get("score", {}).get("penalties", {})
    winner = None
    if winner_code == "HOME_TEAM":
        winner = m.get("homeTeam", {}).get("name")
    elif winner_code == "AWAY_TEAM":
        winner = m.get("awayTeam", {}).get("name")
    elif winner_code == "DRAW" and raw_status == "PENALTY_SHOOTOUT":
        ph, pa = pens.get("home", 0), pens.get("away", 0)
        if ph > pa:
            winner = m.get("homeTeam", {}).get("name")
        elif pa > ph:
            winner = m.get("awayTeam", {}).get("name")

    return {
        "api_match_id": m["id"],
        "team_home":    m.get("homeTeam", {}).get("name") or "TBD",
        "team_away":    m.get("awayTeam", {}).get("name") or "TBD",
        "score_home":   sh,
        "score_away":   sa,
        "winner":       winner,
        "status":       status,
        "kickoff_utc":  m.get("utcDate"),
        "round":        STAGE_MAP.get(m.get("stage", ""), ""),
    }


def main():
    print("── Fetching WC2026 knockout matches from football-data.org …")
    data = football_get("/competitions/WC/matches?season=2026")
    api_matches = [m for m in data.get("matches", []) if m.get("stage") in KNOCKOUT_STAGES]
    print(f"   Got {len(api_matches)} knockout matches")

    print("── Fetching current matches from Supabase …")
    db_matches = supabase_get(
        "matches",
        "select=id,slot,round,api_match_id,status,winner,team_home,team_away,next_match_slot,next_match_position"
    )
    by_api_id = {m["api_match_id"]: m for m in db_matches if m.get("api_match_id")}
    print(f"   Got {len(db_matches)} DB matches, {len(by_api_id)} with api_match_id")

    updated = 0

    for am in api_matches:
        n = normalize(am)
        db = by_api_id.get(n["api_match_id"])
        if not db:
            print(f"  ⚠ No DB match for api_match_id={n['api_match_id']} ({n['team_home']} vs {n['team_away']})")
            continue

        needs_update = (
            db.get("status") != n["status"]
            or db.get("score_home") != n["score_home"]
            or db.get("score_away") != n["score_away"]
            or db.get("winner") != n["winner"]
            or (n["team_home"] != "TBD" and db.get("team_home") != n["team_home"])
            or (n["team_away"] != "TBD" and db.get("team_away") != n["team_away"])
        )

        if not needs_update:
            continue

        result = supabase_rpc("sync_match_result", {
            "p_api_match_id": n["api_match_id"],
            "p_status":       n["status"],
            "p_score_home":   n["score_home"],
            "p_score_away":   n["score_away"],
            "p_winner":       n["winner"],
            "p_team_home":    n["team_home"],
            "p_team_away":    n["team_away"],
            "p_flag_home":    FLAG_MAP.get(n["team_home"], "") if n["team_home"] != "TBD" else None,
            "p_flag_away":    FLAG_MAP.get(n["team_away"], "") if n["team_away"] != "TBD" else None,
        })

        if result and result.get("ok"):
            updated += 1
            label = f"slot {db['slot']} ({n['team_home']} vs {n['team_away']})"
            print(f"  ✓ Updated {label}: {n['score_home']}-{n['score_away']} [{n['status']}] winner={n['winner']}")
        else:
            print(f"  ✗ Failed to sync api_match_id={n['api_match_id']}: {result}")

    print(f"\n── Done: {updated} matches updated")


if __name__ == "__main__":
    main()
