import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [prevRanks, setPrevRanks] = useState({})

  const fetchLeaderboard = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, email, total_points, correct_predictions, total_predictions')
      .order('total_points', { ascending: false })

    if (data) {
      setPrevRanks(prev => {
        const newRanks = {}
        data.forEach((p, i) => { newRanks[p.id] = i + 1 })
        return { ...prev, ...newRanks }
      })
      setLeaderboard(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchLeaderboard()

    const channel = supabase
      .channel('leaderboard-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        () => fetchLeaderboard()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchLeaderboard])

  async function fetchUserPredictionHistory(userId) {
    const { data } = await supabase
      .from('predictions')
      .select('*, matches(round, round_name, team_home, team_away, flag_home, flag_away, winner, score_home, score_away, status, kickoff_utc)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    return data ?? []
  }

  const rankedLeaderboard = leaderboard.map((player, i) => ({
    ...player,
    rank: i + 1,
    prevRank: prevRanks[player.id] ?? i + 1,
    rankChange: (prevRanks[player.id] ?? i + 1) - (i + 1),
  }))

  return { leaderboard: rankedLeaderboard, loading, fetchLeaderboard, fetchUserPredictionHistory }
}
