import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { getFlag, getFifaRank } from '../../utils/teams'
import { isEarlyBird, ROUND_MULTIPLIERS } from '../../utils/points'
import CountdownTimer from '../common/CountdownTimer'

export default function PredictionModal({ match, existingPrediction, onSave, onClose }) {
  const [winner, setWinner] = useState(existingPrediction?.predicted_winner ?? '')
  const [homeScore, setHomeScore] = useState(existingPrediction?.predicted_home ?? '')
  const [awayScore, setAwayScore] = useState(existingPrediction?.predicted_away ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const earlyBird = isEarlyBird(match.kickoff_utc)
  const multiplier = ROUND_MULTIPLIERS[match.round] ?? 1

  // Sync scores if winner changes and scores imply a draw (force pick)
  useEffect(() => {
    if (homeScore !== '' && awayScore !== '' && winner) {
      const h = Number(homeScore)
      const a = Number(awayScore)
      if (h === a) {
        // draw not allowed in knockout; clear scores
        setHomeScore('')
        setAwayScore('')
      }
    }
  }, [winner])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!winner) { setError('Please pick a winner'); return }

    // Validate score consistency with winner
    if (homeScore !== '' && awayScore !== '') {
      const h = Number(homeScore)
      const a = Number(awayScore)
      if (h === a) { setError('Knockout matches can\'t end in a draw'); return }
      if (winner === match.team_home && h <= a) { setError('Score doesn\'t match your winner pick'); return }
      if (winner === match.team_away && a <= h) { setError('Score doesn\'t match your winner pick'); return }
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        matchId: match.id,
        kickoffUtc: match.kickoff_utc,
        predictedWinner: winner,
        predictedHome: homeScore !== '' ? Number(homeScore) : null,
        predictedAway: awayScore !== '' ? Number(awayScore) : null,
      })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md card p-5 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{match.round_name}</p>
            <p className="text-sm text-gray-400">
              {match.kickoff_utc && format(new Date(match.kickoff_utc), 'EEE, MMM d · h:mm a')}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Countdown + early bird */}
        <div className="flex items-center gap-2 mb-5">
          <CountdownTimer kickoffUtc={match.kickoff_utc} />
          {earlyBird && (
            <span className="text-xs font-semibold text-gold-400 bg-gold-500/10 border border-gold-500/30 px-2 py-0.5 rounded-full">
              ⚡ Early bird +50pts
            </span>
          )}
          {multiplier > 1 && (
            <span className="text-xs font-semibold text-pitch-400 bg-pitch-500/10 border border-pitch-500/30 px-2 py-0.5 rounded-full">
              ×{multiplier} round
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Pick winner */}
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Who wins?</p>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {[match.team_home, match.team_away].map(team => (
              <button
                key={team}
                type="button"
                onClick={() => setWinner(team)}
                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all ${
                  winner === team
                    ? 'border-pitch-500 bg-pitch-500/10 text-white'
                    : 'border-navy-600 bg-navy-700/50 text-gray-400 hover:border-navy-500'
                }`}
              >
                <span className="text-3xl">{getFlag(team)}</span>
                <span className="text-sm font-semibold text-center leading-tight">{team}</span>
              </button>
            ))}
          </div>

          {/* Optional scoreline */}
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Exact score? <span className="text-gold-500 normal-case font-semibold">+300pts if correct</span>
          </p>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-lg">{getFlag(match.team_home)}</span>
              <input
                type="number"
                min="0"
                max="20"
                value={homeScore}
                onChange={e => setHomeScore(e.target.value)}
                placeholder="0"
                className="input-field w-full text-center text-lg font-bold"
              />
            </div>
            <span className="text-gray-600 font-bold">–</span>
            <div className="flex items-center gap-2 flex-1">
              <input
                type="number"
                min="0"
                max="20"
                value={awayScore}
                onChange={e => setAwayScore(e.target.value)}
                placeholder="0"
                className="input-field w-full text-center text-lg font-bold"
              />
              <span className="text-lg">{getFlag(match.team_away)}</span>
            </div>
          </div>

          {/* Points preview */}
          <PointsPreview
            winner={winner}
            match={match}
            homeScore={homeScore}
            awayScore={awayScore}
            earlyBird={earlyBird}
            multiplier={multiplier}
          />

          {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

          <button
            type="submit"
            disabled={!winner || saving}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : existingPrediction ? 'Update Prediction' : 'Lock In Prediction'}
          </button>
        </form>
      </div>
    </div>
  )
}

function PointsPreview({ winner, match, homeScore, awayScore, earlyBird, multiplier }) {
  if (!winner) return null

  const loser = winner === match.team_home ? match.team_away : match.team_home
  const underdogBonus = getFifaRank(winner) > getFifaRank(loser) ? 200 : 0

  const hasScore = homeScore !== '' && awayScore !== ''
  const base = hasScore ? 300 : 100
  const earlyBonus = earlyBird ? 50 : 0
  const total = Math.round((base + underdogBonus + earlyBonus) * multiplier)

  return (
    <div className="bg-navy-700/50 rounded-lg p-3 mb-4 text-xs">
      <p className="text-gray-400 mb-1">Points if correct:</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <span className="text-white font-bold">{base} base</span>
        {underdogBonus > 0 && <span className="text-gold-400">+{underdogBonus} underdog</span>}
        {earlyBonus > 0 && <span className="text-pitch-400">+{earlyBonus} early bird</span>}
        {multiplier > 1 && <span className="text-pitch-300">×{multiplier}</span>}
        <span className="font-black text-gold-400 ml-auto">= {total} pts</span>
      </div>
    </div>
  )
}
