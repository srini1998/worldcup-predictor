import { useState } from 'react'
import { useLeaderboard } from '../../hooks/useLeaderboard'
import { useAuth } from '../../contexts/AuthContext'
import { getFlag, ROUND_LABELS } from '../../utils/teams'
import LoadingSpinner from '../common/LoadingSpinner'

export default function Leaderboard() {
  const { leaderboard, loading, fetchUserPredictionHistory } = useLeaderboard()
  const { user } = useAuth()
  const [expandedUser, setExpandedUser] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  async function handleRowClick(player) {
    if (expandedUser?.id === player.id) {
      setExpandedUser(null)
      setHistory([])
      return
    }
    setExpandedUser(player)
    setHistoryLoading(true)
    const data = await fetchUserPredictionHistory(player.id)
    setHistory(data)
    setHistoryLoading(false)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-white">🏅 Leaderboard</h2>
        <span className="text-xs text-gray-500">{leaderboard.length} players</span>
      </div>

      <div className="space-y-2">
        {leaderboard.map((player, i) => {
          const isMe = player.id === user?.id
          const isLeader = i === 0 && player.total_points > 0
          const isExpanded = expandedUser?.id === player.id
          const rankDiff = player.rankChange

          return (
            <div key={player.id}>
              <div
                onClick={() => handleRowClick(player)}
                className={`card p-4 cursor-pointer hover:border-navy-500 transition-all ${
                  isMe ? 'border-pitch-500/40 bg-pitch-500/5' : ''
                } ${isExpanded ? 'border-navy-500' : ''}`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="w-8 text-center flex-shrink-0">
                    {isLeader ? (
                      <span className="text-xl">🏆</span>
                    ) : (
                      <span className={`text-lg font-black ${i < 3 ? 'text-gold-500' : 'text-gray-500'}`}>
                        {player.rank}
                      </span>
                    )}
                  </div>

                  {/* Rank change */}
                  <div className="w-5 flex-shrink-0 text-center">
                    {rankDiff > 0 && <span className="text-pitch-400 text-xs font-bold">↑</span>}
                    {rankDiff < 0 && <span className="text-red-400 text-xs font-bold">↓</span>}
                  </div>

                  {/* Avatar */}
                  {player.avatar_url ? (
                    <img src={player.avatar_url} alt="" className="w-9 h-9 rounded-full flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-navy-700 flex items-center justify-center text-sm font-bold text-pitch-400 flex-shrink-0">
                      {player.display_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">
                      {player.display_name}
                      {isMe && <span className="text-pitch-400 text-xs ml-1">(you)</span>}
                    </p>
                    <p className="text-xs text-gray-500">
                      {player.correct_predictions ?? 0}/{player.total_predictions ?? 0} correct
                    </p>
                  </div>

                  {/* Points */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-black text-gold-400 tabular-nums">
                      {player.total_points ?? 0}
                    </p>
                    <p className="text-xs text-gray-600">pts</p>
                  </div>

                  {/* Expand chevron */}
                  <span className={`text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                </div>
              </div>

              {/* Expanded prediction history */}
              {isExpanded && (
                <div className="mt-1 mb-2 mx-2 card p-4 border-navy-600 animate-fade-in">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                    {player.display_name}'s Predictions
                  </p>
                  {historyLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : history.length === 0 ? (
                    <p className="text-gray-600 text-sm">No locked predictions yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {history.map(pred => (
                        <PredictionHistoryRow key={pred.id} pred={pred} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {leaderboard.length === 0 && (
          <div className="text-center py-16 text-gray-600">
            <p className="text-4xl mb-3">🏟️</p>
            <p>No one has made predictions yet. Be first!</p>
          </div>
        )}
      </div>
    </div>
  )
}

function PredictionHistoryRow({ pred }) {
  const match = pred.matches
  if (!match) return null

  const correct = pred.predicted_winner === match.winner
  const wrong = match.winner && pred.predicted_winner && !correct
  const pending = !match.winner

  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-lg text-sm ${
      correct ? 'bg-pitch-500/10' : wrong ? 'bg-red-500/5' : 'bg-navy-700/50'
    }`}>
      <span className="text-xs text-gray-500 w-6">{ROUND_LABELS[match.round]?.slice(0, 3) ?? match.round}</span>
      <span className="flex-1 text-gray-300 truncate">
        {getFlag(match.team_home)} {match.team_home}
        <span className="text-gray-600 mx-1">v</span>
        {getFlag(match.team_away)} {match.team_away}
      </span>
      <span className="text-xs text-gray-400">→ {getFlag(pred.predicted_winner)} {pred.predicted_winner}</span>
      {correct && <span className="text-pitch-400 font-bold text-xs">+{pred.points_earned}pts</span>}
      {wrong && <span className="text-red-500 text-xs">✗</span>}
      {pending && <span className="text-gray-600 text-xs">⏳</span>}
    </div>
  )
}
