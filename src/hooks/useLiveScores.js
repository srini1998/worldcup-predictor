import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { footballApi } from '../lib/footballApi'
import { getFlag } from '../utils/teams'

const LIVE_POLL_MS = 60_000      // 1 min while a match is live
const SOON_POLL_MS = 3 * 60_000  // 3 min when a match is starting within 2 hours
const STAGGER_WINDOW = 20_000

function shouldStartPolling(matches) {
  const now = Date.now()
  return matches.some(m => {
    if (m.status === 'live') return true
    if (m.status !== 'upcoming' || !m.kickoff_utc) return false
    const diffMin = (new Date(m.kickoff_utc) - now) / 60_000
    return diffMin >= -30 && diffMin <= 120  // from 30 min past kickoff to 2 hours ahead
  })
}

// Match API result to DB row — try api_match_id first, fall back to kickoff time
function findDbMatch(matches, apiMatch) {
  if (apiMatch.api_match_id) {
    const byId = matches.find(m => m.api_match_id === apiMatch.api_match_id)
    if (byId) return byId
  }
  if (apiMatch.kickoff_utc) {
    const apiTime = new Date(apiMatch.kickoff_utc).getTime()
    return matches.find(m => {
      if (!m.kickoff_utc) return false
      return Math.abs(new Date(m.kickoff_utc).getTime() - apiTime) < 5 * 60_000
    })
  }
  return null
}

export function useLiveScores({ matches, onUpdate }) {
  const timerRef = useRef(null)
  const isPollingRef = useRef(false)
  const hasLive = matches.some(m => m.status === 'live')
  const active = shouldStartPolling(matches)
  const pollMs = hasLive ? LIVE_POLL_MS : SOON_POLL_MS

  const syncScores = useCallback(async () => {
    if (isPollingRef.current) return
    isPollingRef.current = true
    try {
      const apiMatches = await footballApi.getKnockoutMatches()
      if (!apiMatches.length) return

      for (const apiMatch of apiMatches) {
        const dbMatch = findDbMatch(matches, apiMatch)
        if (!dbMatch) continue

        const wasFinished = dbMatch.status === 'ft' || dbMatch.status === 'pens'
        const nowFinished = apiMatch.status === 'ft' || apiMatch.status === 'pens'

        const changed =
          dbMatch.api_match_id !== apiMatch.api_match_id ||
          dbMatch.team_home !== apiMatch.team_home ||
          dbMatch.team_away !== apiMatch.team_away ||
          dbMatch.score_home !== apiMatch.score_home ||
          dbMatch.score_away !== apiMatch.score_away ||
          dbMatch.status !== apiMatch.status ||
          dbMatch.winner !== apiMatch.winner

        if (changed) {
          await supabase.from('matches').update({
            api_match_id: apiMatch.api_match_id,
            team_home: apiMatch.team_home,
            team_away: apiMatch.team_away,
            flag_home: getFlag(apiMatch.team_home),
            flag_away: getFlag(apiMatch.team_away),
            score_home: apiMatch.score_home,
            score_away: apiMatch.score_away,
            status: apiMatch.status,
            winner: apiMatch.winner,
          }).eq('id', dbMatch.id)

          // When a match just finished, auto-calculate points for all users
          if (!wasFinished && nowFinished && apiMatch.winner) {
            await supabase.rpc('calculate_match_points', { p_match_id: dbMatch.id })
          }
        }
      }
      onUpdate?.()
    } catch (err) {
      console.warn('Score sync failed:', err.message)
    } finally {
      isPollingRef.current = false
    }
  }, [matches, onUpdate])

  useEffect(() => {
    if (!active) {
      clearTimeout(timerRef.current)
      clearInterval(timerRef.current)
      return
    }

    const stagger = Math.random() * STAGGER_WINDOW
    let intervalId

    const staggerTimer = setTimeout(() => {
      syncScores()
      intervalId = setInterval(syncScores, pollMs)
      timerRef.current = intervalId
    }, stagger)

    return () => {
      clearTimeout(staggerTimer)
      clearInterval(intervalId)
    }
  }, [active, pollMs, syncScores])

  return { syncScores }
}
