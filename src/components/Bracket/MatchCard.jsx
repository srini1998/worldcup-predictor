import { format } from 'date-fns'
import { getFlag } from '../../utils/teams'
import CountdownTimer from '../common/CountdownTimer'

export default function MatchCard({ match, myPrediction, compact = false, onClick }) {
  if (!match) return <EmptySlot compact={compact} />

  const isUpcoming = match.status === 'upcoming'
  const isLive = match.status === 'live'
  const isFt = match.status === 'ft' || match.status === 'pens'
  const isLocked = !isUpcoming

  const homeTeam = match.team_home || 'TBD'
  const awayTeam = match.team_away || 'TBD'
  const homeTBD = homeTeam === 'TBD'
  const awayTBD = awayTeam === 'TBD'

  const predWinner = myPrediction?.predicted_winner
  const predCorrect = isFt && predWinner === match.winner
  const predWrong = isFt && predWinner && predWinner !== match.winner
  const pointsEarned = myPrediction?.points_earned

  function statusBadge() {
    if (isLive) return (
      <span className="live-badge">
        <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse-live" />
        LIVE
      </span>
    )
    if (match.status === 'pens') return <span className="text-xs font-bold text-gold-400">PENS</span>
    if (isFt) return <span className="text-xs font-bold text-gray-500">FT</span>
    if (match.kickoff_utc) {
      const kickoff = new Date(match.kickoff_utc)
      return (
        <span className="text-xs text-gray-500">
          {format(kickoff, 'MMM d, h:mm a')}
        </span>
      )
    }
    return null
  }

  if (compact) {
    // Bracket card — minimal version
    return (
      <div
        onClick={onClick}
        className={`match-card-bracket select-none ${
          isLive ? 'border-live/40 shadow-live/10 shadow-md' : ''
        } ${isUpcoming && onClick ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <TeamRow
          flag={getFlag(homeTeam)}
          name={homeTeam}
          score={isLocked ? match.score_home : null}
          isWinner={isFt && match.winner === homeTeam}
          predicted={predWinner === homeTeam}
          tbd={homeTBD}
          compact
        />
        <div className="my-1 border-t border-navy-700" />
        <TeamRow
          flag={getFlag(awayTeam)}
          name={awayTeam}
          score={isLocked ? match.score_away : null}
          isWinner={isFt && match.winner === awayTeam}
          predicted={predWinner === awayTeam}
          tbd={awayTBD}
          compact
        />
        <div className="mt-1.5 flex items-center justify-between">
          {statusBadge()}
          {isUpcoming && match.kickoff_utc && !homeTBD && !awayTBD && (
            <CountdownTimer kickoffUtc={match.kickoff_utc} />
          )}
          {predWinner && !isFt && (
            <span className="text-xs text-pitch-400">→ {getFlag(predWinner)} You</span>
          )}
        </div>
      </div>
    )
  }

  // Full card — used in mobile round list
  return (
    <div
      onClick={onClick}
      className={`match-card select-none ${
        isLive ? 'border-live/40 shadow-live/10 shadow-lg' : ''
      } ${isUpcoming && onClick && !homeTBD && !awayTBD ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {match.round_name}
        </span>
        <div className="flex items-center gap-2">
          {statusBadge()}
        </div>
      </div>

      {/* Teams */}
      <div className="space-y-2">
        <TeamRow
          flag={getFlag(homeTeam)}
          name={homeTeam}
          score={isLocked ? match.score_home : null}
          isWinner={isFt && match.winner === homeTeam}
          predicted={predWinner === homeTeam}
          tbd={homeTBD}
        />
        <TeamRow
          flag={getFlag(awayTeam)}
          name={awayTeam}
          score={isLocked ? match.score_away : null}
          isWinner={isFt && match.winner === awayTeam}
          predicted={predWinner === awayTeam}
          tbd={awayTBD}
        />
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-navy-700 flex items-center justify-between">
        {isUpcoming && match.kickoff_utc && !homeTBD && !awayTBD && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>⏱</span>
            <CountdownTimer kickoffUtc={match.kickoff_utc} />
          </div>
        )}

        {/* Prediction status */}
        {predWinner && (
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${
            predCorrect ? 'text-pitch-400' : predWrong ? 'text-red-400' : 'text-gray-400'
          }`}>
            {predCorrect && '✓'}
            {predWrong && '✗'}
            {getFlag(predWinner)} {predWinner}
            {predCorrect && pointsEarned != null && (
              <span className="text-gold-400 ml-1">+{pointsEarned}pts</span>
            )}
          </div>
        )}

        {isUpcoming && !predWinner && !homeTBD && !awayTBD && onClick && (
          <span className="text-xs text-pitch-500 font-medium">Tap to predict →</span>
        )}

        {myPrediction?.predicted_home != null && myPrediction?.predicted_away != null && (
          <span className="text-xs text-gray-500">
            Score: {myPrediction.predicted_home}–{myPrediction.predicted_away}
          </span>
        )}
      </div>
    </div>
  )
}

function TeamRow({ flag, name, score, isWinner, predicted, tbd, compact }) {
  return (
    <div className={`flex items-center justify-between gap-2 ${compact ? 'py-0.5' : 'py-1'}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className={compact ? 'text-base' : 'text-xl'}>{tbd ? '🏳️' : flag}</span>
        <span className={`font-semibold truncate ${
          compact ? 'text-xs' : 'text-sm'
        } ${tbd ? 'text-gray-600' : isWinner ? 'text-white' : 'text-gray-300'}`}>
          {name}
        </span>
        {predicted && !isWinner && score === null && (
          <span className="text-pitch-500 text-xs">←</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {score !== null && score !== undefined && (
          <span className={`font-black tabular-nums ${compact ? 'text-sm' : 'text-lg'} ${
            isWinner ? 'text-white' : 'text-gray-500'
          }`}>
            {score}
          </span>
        )}
        {isWinner && <span className="text-gold-500 text-xs">🏆</span>}
      </div>
    </div>
  )
}

function EmptySlot({ compact }) {
  return (
    <div className={`match-card-bracket border-dashed opacity-30 ${compact ? 'p-2' : 'p-3'}`}>
      <div className="text-center text-gray-600 text-xs">TBD</div>
    </div>
  )
}
