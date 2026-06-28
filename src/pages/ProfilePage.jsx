import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { getFlag, ROUND_LABELS } from '../utils/teams'
import LoadingSpinner from '../components/common/LoadingSpinner'

export default function ProfilePage() {
  const { userId } = useParams()
  const { fetchUserPredictionHistory } = useLeaderboard()
  const [profile, setProfile] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: p }, h] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        fetchUserPredictionHistory(userId),
      ])
      setProfile(p)
      setHistory(h)
      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) return <LoadingSpinner />
  if (!profile) return <p className="text-gray-500 text-center py-16">Player not found.</p>

  const byRound = {}
  history.forEach(pred => {
    const r = pred.matches?.round ?? 'Unknown'
    if (!byRound[r]) byRound[r] = []
    byRound[r].push(pred)
  })

  return (
    <div className="max-w-lg mx-auto">
      <Link to="/leaderboard" className="text-gray-500 text-sm hover:text-white flex items-center gap-1 mb-6">
        ← Back to Leaderboard
      </Link>

      {/* Profile header */}
      <div className="card p-6 mb-6 flex items-center gap-4">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-navy-700 flex items-center justify-center text-2xl font-black text-pitch-400">
            {profile.display_name?.[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-black text-white">{profile.display_name}</h1>
          <div className="flex gap-4 mt-1 text-sm text-gray-400">
            <span>🏆 <span className="text-gold-400 font-bold">{profile.total_points ?? 0}</span> pts</span>
            <span>✓ {profile.correct_predictions ?? 0}/{profile.total_predictions ?? 0} correct</span>
          </div>
        </div>
      </div>

      {/* Predictions by round */}
      {Object.entries(byRound).map(([round, preds]) => (
        <div key={round} className="mb-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            {ROUND_LABELS[round] ?? round}
          </h3>
          <div className="space-y-2">
            {preds.map(pred => {
              const match = pred.matches
              if (!match) return null
              const correct = pred.predicted_winner === match.winner
              const wrong = match.winner && !correct
              return (
                <div key={pred.id} className={`card p-3 flex items-center gap-3 text-sm ${
                  correct ? 'border-pitch-500/30' : wrong ? 'border-red-500/20' : ''
                }`}>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-300 truncate">
                      {getFlag(match.team_home)} {match.team_home} v {getFlag(match.team_away)} {match.team_away}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Pick: {getFlag(pred.predicted_winner)} {pred.predicted_winner}
                      {pred.predicted_home != null && ` · ${pred.predicted_home}–${pred.predicted_away}`}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {correct && <p className="text-pitch-400 font-bold">+{pred.points_earned}pts</p>}
                    {wrong && <p className="text-red-400 text-xs">✗ Wrong</p>}
                    {!match.winner && <p className="text-gray-600 text-xs">⏳</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {history.length === 0 && (
        <p className="text-center text-gray-600 py-10">No predictions yet.</p>
      )}
    </div>
  )
}
