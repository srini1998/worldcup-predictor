#!/usr/bin/env python3
"""
WC2026 Score Syncer
-------------------
Fetches knockout results from football-data.org and updates Supabase.
Uses the service_role key so it bypasses RLS — safe for CI use only.
"""

import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone

FOOTBALL_API_KEY    = os.environ["FOOTBALL_API_KEY"]
SUPABASE_URL        = os.environ["SUPABASE_URL"]
SUPABASE_KEY        = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

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


def supabase_patch(table, match_filter, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{SUPABASE_REST}/{table}?{match_filter}",
        data=data,
        method="PATCH",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
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
            return r.read()
    except urllib.error.HTTPError as e:
        print(f"  RPC error {e.code}: {e.read().decode()}")


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


def main():
    print("── Fetching WC2026 knockout matches from football-data.org …")
    data = football_get("/competitions/WC/matches?season=2026")
    api_matches = [m for m in data.get("matches", []) if m.get("stage") in KNOCKOUT_STAGES]
    print(f"   Got {len(api_matches)} knockout matches")

    print("── Fetching current matches from Supabase …")
    db_matches = supabase_get("matches", "select=id,slot,round,api_match_id,status,winner,team_home,team_away,next_match_slot,next_match_position")
    by_api_id = {m["api_match_id"]: m for m in db_matches if m.get("api_match_id")}
    print(f"   Got {len(db_matches)} DB matches, {len(by_api_id)} with api_match_id")

    updated = 0
    points_calculated = []

    for am in api_matches:
        n = normalize(am)
        db = by_api_id.get(n["api_match_id"])
        if not db:
            print(f"  ⚠ No DB match for api_match_id={n['api_match_id']} ({n['team_home']} vs {n['team_away']})")
            continue

        # Only update if something changed
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

        patch = {
            "status":     n["status"],
            "score_home": n["score_home"],
            "score_away": n["score_away"],
            "winner":     n["winner"],
        }
        if n["team_home"] != "TBD":
            patch["team_home"] = n["team_home"]
            patch["flag_home"] = FLAG_MAP.get(n["team_home"], "🏳️")
        if n["team_away"] != "TBD":
            patch["team_away"] = n["team_away"]
            patch["flag_away"] = FLAG_MAP.get(n["team_away"], "🏳️")

        result = supabase_patch("matches", f"api_match_id=eq.{n['api_match_id']}", patch)
        updated += 1
        label = f"slot {db['slot']} ({n['team_home']} vs {n['team_away']})"
        print(f"  ✓ Updated {label}: {n['score_home']}-{n['score_away']} [{n['status']}] winner={n['winner']}")

        # If match just finished, advance winner to next round and calculate points
        prev_done = db.get("status") in ("ft", "pens")
        now_done  = n["status"] in ("ft", "pens")

        if now_done and n["winner"] and not prev_done:
            # Advance winner to next round
            next_slot = db.get("next_match_slot")
            next_pos  = db.get("next_match_position")
            if next_slot and next_pos:
                field = "team_home" if next_pos == "home" else "team_away"
                flag_field = "flag_home" if next_pos == "home" else "flag_away"
                supabase_patch("matches", f"slot=eq.{next_slot}", {
                    field: n["winner"],
                    flag_field: FLAG_MAP.get(n["winner"], "🏳️"),
                })
                print(f"    → Advanced {n['winner']} to slot {next_slot} as {next_pos}")

            # Trigger point calculation via Supabase RPC
            if result and isinstance(result, list) and result:
                match_id = result[0].get("id")
                if match_id:
                    supabase_rpc("calculate_match_points", {"p_match_id": match_id})
                    print(f"    → Points calculated for match {match_id}")
                    points_calculated.append(match_id)

    print(f"\n── Done: {updated} matches updated, {len(points_calculated)} point calculations triggered")


if __name__ == "__main__":
    main()
