const API_KEY = import.meta.env.VITE_FOOTBALL_API_KEY
const BASE_URL = 'https://api.football-data.org/v4'

const STAGE_MAP = {
  LAST_32: 'R32',
  ROUND_OF_32: 'R32',
  LAST_16: 'R16',
  ROUND_OF_16: 'R16',
  QUARTER_FINALS: 'QF',
  SEMI_FINALS: 'SF',
  THIRD_PLACE: 'THIRD',
  FINAL: 'FINAL',
}

const STATUS_MAP = {
  SCHEDULED: 'upcoming',
  TIMED: 'upcoming',
  IN_PLAY: 'live',
  PAUSED: 'live',
  LIVE: 'live',
  FINISHED: 'ft',
  PENALTY_SHOOTOUT: 'pens',
  EXTRA_TIME: 'live',
}

async function apiFetch(path) {
  if (!API_KEY) throw new Error('Missing VITE_FOOTBALL_API_KEY')
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'X-Auth-Token': API_KEY },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`football-data.org ${res.status}: ${text}`)
  }
  return res.json()
}

function normalizeMatch(m) {
  const score = m.score?.fullTime ?? { home: null, away: null }
  const status = STATUS_MAP[m.status] ?? 'upcoming'
  const isPens = m.status === 'PENALTY_SHOOTOUT'

  let winner = null
  if (m.score?.winner === 'HOME_TEAM') winner = m.homeTeam?.name
  else if (m.score?.winner === 'AWAY_TEAM') winner = m.awayTeam?.name
  else if (m.score?.winner === 'DRAW' && isPens) {
    // penalty shootout: check penalties
    const penHome = m.score?.penalties?.home ?? 0
    const penAway = m.score?.penalties?.away ?? 0
    if (penHome > penAway) winner = m.homeTeam?.name
    else if (penAway > penHome) winner = m.awayTeam?.name
  }

  return {
    api_match_id: m.id,
    round: STAGE_MAP[m.stage] ?? m.stage,
    team_home: m.homeTeam?.name ?? 'TBD',
    team_away: m.awayTeam?.name ?? 'TBD',
    score_home: score.home,
    score_away: score.away,
    winner,
    kickoff_utc: m.utcDate,
    status: isPens ? 'pens' : status,
  }
}

export const footballApi = {
  async getKnockoutMatches() {
    const data = await apiFetch('/competitions/WC/matches?season=2026')
    const knockoutStages = ['LAST_32', 'ROUND_OF_32', 'LAST_16', 'ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL']
    return data.matches
      .filter(m => knockoutStages.includes(m.stage))
      .map(normalizeMatch)
  },

  async getLiveMatches() {
    const data = await apiFetch('/competitions/WC/matches?season=2026&status=LIVE')
    return data.matches.map(normalizeMatch)
  },

  async getInPlayMatches() {
    try {
      const [live, paused] = await Promise.all([
        apiFetch('/competitions/WC/matches?season=2026&status=IN_PLAY'),
        apiFetch('/competitions/WC/matches?season=2026&status=PAUSED'),
      ])
      return [...live.matches, ...paused.matches].map(normalizeMatch)
    } catch {
      return []
    }
  },

  async getMatchById(apiMatchId) {
    const data = await apiFetch(`/matches/${apiMatchId}`)
    return normalizeMatch(data)
  },
}
