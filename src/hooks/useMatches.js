import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useMatches() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchMatches = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('matches')
        .select('*')
        .order('slot', { ascending: true })
      if (err) throw err
      setMatches(data ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMatches()

    // Realtime subscription — listen for match score/status changes
    const channel = supabase
      .channel('matches-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        (payload) => {
          setMatches(prev => {
            if (payload.eventType === 'INSERT') {
              return [...prev, payload.new].sort((a, b) => a.slot - b.slot)
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map(m => m.id === payload.new.id ? payload.new : m)
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter(m => m.id !== payload.old.id)
            }
            return prev
          })
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchMatches])

  const getMatchBySlot = useCallback(
    (slot) => matches.find(m => m.slot === slot),
    [matches]
  )

  const getMatchesByRound = useCallback(
    (round) => matches.filter(m => m.round === round).sort((a, b) => a.slot - b.slot),
    [matches]
  )

  const liveMatches = matches.filter(m => m.status === 'live')
  const hasLiveMatches = liveMatches.length > 0

  return { matches, loading, error, fetchMatches, getMatchBySlot, getMatchesByRound, liveMatches, hasLiveMatches }
}
