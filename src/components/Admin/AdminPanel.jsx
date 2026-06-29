import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useMatches } from '../../hooks/useMatches'
import { calculateMatchPoints } from '../../utils/points'
import { ROUND_LABELS, getFlag } from '../../utils/teams'
import LoadingSpinner from '../common/LoadingSpinner'

export default function AdminPanel() {
  const { matches, loading, fetchMatches } = useMatches()
  const [editingMatch, setEditingMatch] = useState(null)
  const [savingScore, setSavingScore] = useState(false)

  const rounds = ['R32', 'R16', 'QF', 'SF', 'THIRD', 'FINAL']

  async function handleSaveScore(match, scoreHome, scoreAway, status, winner) {
    setSavingScore(true)
    try {
      await supabase.from('matches').update({
        score_home: Number(scoreHome),
        score_away: Number(scoreAway),
        status,
        winner: winner || null,
      }).eq('id', match.id)

      // If match is finished, calculate points for all predictions
      if (status === 'ft' || status === 'pens') {
        await recalculatePoints(match.id, { ...match, score_home: Number(scoreHome), score_away: Number(scoreAway), status, winner })
      }

      setEditingMatch(null)
      fetchMatches()
    } catch (err) {
      alert('Error saving: ' + err.message)
    } finally {
      setSavingScore(false)
    }
  }

  async function recalculatePoints(matchId, updatedMatch) {
    const { data: preds } = await supabase
      .from('predictions')
      .select('*')
      .eq('match_id', matchId)

    if (!preds?.length) return

    for (const pred of preds) {
      const loserName = updatedMatch.winner === updatedMatch.team_home
        ? updatedMatch.team_away
        : updatedMatch.team_home

      const { total, basePoints, bonusUnderdog, bonusEarlyBird } = calculateMatchPoints({
        prediction: pred,
        match: updatedMatch,
      })

      await supabase.from('predictions').update({
        points_earned: total,
        is_locked: true,
      }).eq('id', pred.id)

      // Upsert point_log
      await supabase.from('point_log').upsert({
        user_id: pred.user_id,
        match_id: matchId,
        base_points: basePoints,
        bonus_underdog: bonusUnderdog,
        bonus_early_bird: bonusEarlyBird,
        bonus_perfect_round: 0,
        multiplier: updatedMatch.round_multiplier ?? 1,
        total_points: total,
      }, { onConflict: 'user_id,match_id' })

      // Update profile totals
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_points, correct_predictions, total_predictions')
        .eq('id', pred.user_id)
        .single()

      if (profile) {
        const wasCorrect = pred.predicted_winner === updatedMatch.winner
        const prevPoints = pred.points_earned ?? 0

        await supabase.from('profiles').update({
          total_points: Math.max(0, (profile.total_points ?? 0) - prevPoints + total),
          correct_predictions: wasCorrect
            ? (profile.correct_predictions ?? 0) + (prevPoints === 0 ? 1 : 0)
            : (profile.correct_predictions ?? 0),
          total_predictions: prevPoints === 0
            ? (profile.total_predictions ?? 0) + 1
            : (profile.total_predictions ?? 0),
        }).eq('id', pred.user_id)
      }
    }
  }

  async function handleAddMatch() {
    const slot = prompt('Slot number (1-32):')
    if (!slot) return
    const round = prompt('Round (R32/R16/QF/SF/THIRD/FINAL):')
    if (!round) return
    const roundName = ROUND_LABELS[round] ?? round
    const multipliers = { R32: 1, R16: 1.5, QF: 2, SF: 3, THIRD: 2, FINAL: 5 }

    await supabase.from('matches').insert({
      slot: Number(slot),
      round,
      round_name: roundName,
      match_number: Number(slot),
      team_home: 'TBD',
      team_away: 'TBD',
      status: 'upcoming',
      round_multiplier: multipliers[round] ?? 1,
    })
    fetchMatches()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-white">⚙️ Admin Panel</h2>
        <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">Admin only</span>
      </div>

      {/* API Sync */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-white">Score Sync</h3>
          <span className="flex items-center gap-1.5 text-xs text-pitch-400 bg-pitch-400/10 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-pitch-400 animate-pulse inline-block" />
            Auto-sync active
          </span>
        </div>
        <p className="text-gray-500 text-xs mb-3">
          GitHub Actions fetches live scores from football-data.org every 15 minutes and updates Supabase automatically.
        </p>
        <button onClick={handleAddMatch} className="btn-secondary flex-shrink-0">
          ➕ Add Match
        </button>
      </div>

      {/* Match list by round */}
      {rounds.map(round => {
        const roundMatches = matches.filter(m => m.round === round).sort((a, b) => a.slot - b.slot)
        if (!roundMatches.length) return null
        return (
          <div key={round} className="mb-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-2">
              {ROUND_LABELS[round]} — ×{matches.find(m => m.round === round)?.round_multiplier ?? 1}
            </h3>
            <div className="space-y-2">
              {roundMatches.map(match => (
                <AdminMatchRow
                  key={match.id}
                  match={match}
                  editing={editingMatch?.id === match.id}
                  onEdit={() => setEditingMatch(match)}
                  onCancel={() => setEditingMatch(null)}
                  onSave={handleSaveScore}
                  saving={savingScore}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AdminMatchRow({ match, editing, onEdit, onCancel, onSave, saving }) {
  const [scoreHome, setScoreHome] = useState(String(match.score_home ?? ''))
  const [scoreAway, setScoreAway] = useState(match.score_away ?? '')
  const [status, setStatus] = useState(match.status)
  const [winner, setWinner] = useState(match.winner ?? '')

  return (
    <div className="card p-3">
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-600 w-6 text-center">{match.slot}</span>
        <div className="flex-1 text-sm text-gray-300">
          <span>{match.flag_home ?? ''} {match.team_home || 'TBD'}</span>
          <span className="text-gray-600 mx-2">
            {match.score_home ?? '?'} – {match.score_away ?? '?'}
          </span>
          <span>{match.flag_away ?? ''} {match.team_away || 'TBD'}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded font-bold ${
          match.status === 'live' ? 'bg-live/20 text-live' :
          match.status === 'ft' || match.status === 'pens' ? 'bg-navy-700 text-gray-500' :
          'bg-navy-700 text-gray-400'
        }`}>
          {match.status}
        </span>
        <button onClick={onEdit} className="text-xs text-pitch-400 hover:text-pitch-300">
          Edit
        </button>
      </div>

      {editing && (
        <div className="mt-3 pt-3 border-t border-navy-700 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Home score</label>
            <input type="number" value={scoreHome} onChange={e => setScoreHome(e.target.value)}
              className="input-field w-full text-sm" placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Away score</label>
            <input type="number" value={scoreAway} onChange={e => setScoreAway(e.target.value)}
              className="input-field w-full text-sm" placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="input-field w-full text-sm">
              <option value="upcoming">upcoming</option>
              <option value="live">live</option>
              <option value="ft">ft</option>
              <option value="pens">pens</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Winner</label>
            <select value={winner} onChange={e => setWinner(e.target.value)}
              className="input-field w-full text-sm">
              <option value="">— none —</option>
              {match.team_home !== 'TBD' && <option value={match.team_home}>{match.team_home}</option>}
              {match.team_away !== 'TBD' && <option value={match.team_away}>{match.team_away}</option>}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-4 flex gap-2">
            <button
              onClick={() => onSave(match, scoreHome, scoreAway, status, winner)}
              disabled={saving}
              className="btn-primary text-sm"
            >
              {saving ? 'Saving…' : 'Save & Calculate Points'}
            </button>
            <button onClick={onCancel} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
