import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { isEarlyBird, checkPredictionLock } from '../utils/points'

export function usePredictions() {
  const { user } = useAuth()
  const [predictions, setPredictions] = useState([])
  const [allPredictions, setAllPredictions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMyPredictions = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', user.id)
    setPredictions(data ?? [])
    setLoading(false)
  }, [user])

  const fetchAllPredictions = useCallback(async () => {
    // Load all predictions after matches kick off (for showing friend predictions)
    const { data } = await supabase
      .from('predictions')
      .select('*, profiles(display_name, avatar_url, email)')
      .eq('is_locked', true)
    setAllPredictions(data ?? [])
  }, [])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    fetchMyPredictions()
    fetchAllPredictions()

    const channel = supabase
      .channel('predictions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'predictions', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setPredictions(prev => {
            if (payload.eventType === 'INSERT') return [...prev, payload.new]
            if (payload.eventType === 'UPDATE') return prev.map(p => p.id === payload.new.id ? payload.new : p)
            if (payload.eventType === 'DELETE') return prev.filter(p => p.id !== payload.old.id)
            return prev
          })
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user, fetchMyPredictions, fetchAllPredictions])

  async function savePrediction({ matchId, kickoffUtc, predictedWinner, predictedHome, predictedAway }) {
    if (!user) throw new Error('Not authenticated')
    if (checkPredictionLock(kickoffUtc)) throw new Error('Match has already kicked off')

    const earlyBird = isEarlyBird(kickoffUtc)

    const payload = {
      user_id: user.id,
      match_id: matchId,
      predicted_winner: predictedWinner,
      predicted_home: predictedHome ?? null,
      predicted_away: predictedAway ?? null,
      is_early_bird: earlyBird,
      is_locked: false,
    }

    const { data, error } = await supabase
      .from('predictions')
      .upsert(payload, { onConflict: 'user_id,match_id' })
      .select()
      .single()

    if (error) throw error
    return data
  }

  function getMyPrediction(matchId) {
    return predictions.find(p => p.match_id === matchId) ?? null
  }

  function getFriendPredictions(matchId) {
    return allPredictions.filter(p => p.match_id === matchId)
  }

  return { predictions, allPredictions, loading, savePrediction, getMyPrediction, getFriendPredictions, fetchAllPredictions }
}
