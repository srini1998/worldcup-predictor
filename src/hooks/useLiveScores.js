import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { footballApi } from '../lib/footballApi'

const POLL_INTERVAL = 60_000 // 60 seconds
const STAGGER_WINDOW = 20_000 // 0-20s random stagger to avoid thundering herd

export function useLiveScores({ hasLiveMatches, matches, onUpdate }) {
  const timerRef = useRef(null)
  const isPollingRef = useRef(false)

  const syncScores = useCallback(async () => {
    if (isPollingRef.current) return
    isPollingRef.current = true

    try {
      const liveFromApi = await footballApi.getInPlayMatches()
      if (!liveFromApi.length) {
        isPollingRef.current = false
        return
      }

      for (const apiMatch of liveFromApi) {
        const dbMatch = matches.find(m => m.api_match_id === apiMatch.api_match_id)
        if (!dbMatch) continue

        const changed =
          dbMatch.score_home !== apiMatch.score_home ||
          dbMatch.score_away !== apiMatch.score_away ||
          dbMatch.status !== apiMatch.status ||
          dbMatch.winner !== apiMatch.winner

        if (changed) {
          await supabase
            .from('matches')
            .update({
              score_home: apiMatch.score_home,
              score_away: apiMatch.score_away,
              status: apiMatch.status,
              winner: apiMatch.winner,
            })
            .eq('id', dbMatch.id)
        }
      }

      // Also check if any "upcoming" API matches have just gone live
      await checkAndMarkLive(matches)

      onUpdate?.()
    } catch (err) {
      console.warn('Live score sync failed:', err.message)
    } finally {
      isPollingRef.current = false
    }
  }, [matches, onUpdate])

  async function checkAndMarkLive(currentMatches) {
    const now = new Date()
    const shouldBeLive = currentMatches.filter(m => {
      if (m.status !== 'upcoming') return false
      const kickoff = new Date(m.kickoff_utc)
      return now >= kickoff && now < new Date(kickoff.getTime() + 120 * 60 * 1000)
    })

    for (const m of shouldBeLive) {
      if (m.api_match_id) {
        try {
          const updated = await footballApi.getMatchById(m.api_match_id)
          if (updated.status !== 'upcoming') {
            await supabase
              .from('matches')
              .update({ status: updated.status, score_home: updated.score_home ?? 0, score_away: updated.score_away ?? 0 })
              .eq('id', m.id)
          }
        } catch { /* ignore per-match failures */ }
      }
    }
  }

  useEffect(() => {
    if (!hasLiveMatches) {
      clearTimeout(timerRef.current)
      return
    }

    // Stagger start to avoid all clients polling simultaneously
    const stagger = Math.random() * STAGGER_WINDOW

    const startPolling = () => {
      syncScores()
      timerRef.current = setInterval(syncScores, POLL_INTERVAL)
    }

    const staggerTimer = setTimeout(startPolling, stagger)

    return () => {
      clearTimeout(staggerTimer)
      clearInterval(timerRef.current)
    }
  }, [hasLiveMatches, syncScores])

  return { syncScores }
}
