import { useState } from 'react'
import MatchCard from './MatchCard'
import { ROUND_LABELS, ROUND_ORDER } from '../../utils/teams'

// Bracket slot layout:
// R32: slots 1-16 (1-8 left half, 9-16 right half)
// R16: slots 17-24 (17-20 left, 21-24 right)
// QF:  slots 25-28 (25-26 left, 27-28 right)
// SF:  slots 29-30 (29 left, 30 right)
// 3rd: slot 31
// Final: slot 32

const CARD_H = 96   // px — height of each bracket card
const UNIT = 108    // px — vertical unit (card + gap)
const CARD_W = 176  // px — width of bracket card

function getTop(roundIndex, matchIndex) {
  // roundIndex 0=R32,1=R16,2=QF,3=SF
  const spread = Math.pow(2, roundIndex)
  const centerSlot = matchIndex * spread + (spread - 1) / 2
  return centerSlot * UNIT + UNIT / 2 - CARD_H / 2
}

const HALF_H = 8 * UNIT // 864px

function BracketColumn({ title, matches, roundIndex, colWidth, predictions, onMatchClick, reversed = false }) {
  const numMatches = matches.length

  return (
    <div className="flex flex-col items-center gap-0 flex-shrink-0" style={{ width: colWidth }}>
      <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 text-center whitespace-nowrap">
        {title}
      </div>
      <div className="relative" style={{ height: HALF_H, width: CARD_W }}>
        {matches.map((match, i) => {
          const top = getTop(roundIndex, i)
          return (
            <div
              key={match?.id ?? `empty-${i}`}
              className="absolute"
              style={{ top, left: 0, width: CARD_W }}
            >
              <MatchCard
                match={match}
                myPrediction={match ? predictions.find(p => p.match_id === match.id) : null}
                compact
                onClick={
                  match?.status === 'upcoming' && match?.team_home !== 'TBD' && match?.team_away !== 'TBD'
                    ? () => onMatchClick(match)
                    : undefined
                }
              />
              {/* Right connector line (not for reversed columns) */}
              {!reversed && roundIndex < 3 && (
                <ConnectorRight matchIndex={i} roundIndex={roundIndex} />
              )}
              {/* Left connector line (for reversed columns) */}
              {reversed && roundIndex < 3 && (
                <ConnectorLeft matchIndex={i} roundIndex={roundIndex} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ConnectorRight({ matchIndex, roundIndex }) {
  const spread = Math.pow(2, roundIndex)
  // Draw a line from card right to midpoint, with bracket joining the pair
  const isPairTop = matchIndex % 2 === 0
  const pairCenter = isPairTop
    ? getTop(roundIndex, matchIndex) + CARD_H / 2 + UNIT * spread / 2
    : getTop(roundIndex, matchIndex) + CARD_H / 2 - UNIT * spread / 2

  const lineH = Math.abs(pairCenter - (getTop(roundIndex, matchIndex) + CARD_H / 2))

  return (
    <svg
      className="absolute pointer-events-none"
      style={{ left: CARD_W, top: 0, width: 28, height: HALF_H, overflow: 'visible' }}
    >
      {/* Horizontal line from card */}
      <line
        x1={0} y1={getTop(roundIndex, matchIndex) + CARD_H / 2}
        x2={14} y2={getTop(roundIndex, matchIndex) + CARD_H / 2}
        stroke="#1e2a45" strokeWidth={2}
      />
      {/* Vertical bracket line */}
      {isPairTop && (
        <line
          x1={14} y1={getTop(roundIndex, matchIndex) + CARD_H / 2}
          x2={14} y2={getTop(roundIndex, matchIndex + 1) + CARD_H / 2}
          stroke="#1e2a45" strokeWidth={2}
        />
      )}
      {/* Horizontal line to next column */}
      {isPairTop && (
        <line
          x1={14} y1={(getTop(roundIndex, matchIndex) + getTop(roundIndex, matchIndex + 1)) / 2 + CARD_H / 2}
          x2={28} y2={(getTop(roundIndex, matchIndex) + getTop(roundIndex, matchIndex + 1)) / 2 + CARD_H / 2}
          stroke="#1e2a45" strokeWidth={2}
        />
      )}
    </svg>
  )
}

function ConnectorLeft({ matchIndex, roundIndex }) {
  const isPairTop = matchIndex % 2 === 0
  return (
    <svg
      className="absolute pointer-events-none"
      style={{ right: CARD_W, top: 0, width: 28, height: HALF_H, overflow: 'visible', left: -28 }}
    >
      <line
        x1={28} y1={getTop(roundIndex, matchIndex) + CARD_H / 2}
        x2={14} y2={getTop(roundIndex, matchIndex) + CARD_H / 2}
        stroke="#1e2a45" strokeWidth={2}
      />
      {isPairTop && (
        <line
          x1={14} y1={getTop(roundIndex, matchIndex) + CARD_H / 2}
          x2={14} y2={getTop(roundIndex, matchIndex + 1) + CARD_H / 2}
          stroke="#1e2a45" strokeWidth={2}
        />
      )}
      {isPairTop && (
        <line
          x1={0} y1={(getTop(roundIndex, matchIndex) + getTop(roundIndex, matchIndex + 1)) / 2 + CARD_H / 2}
          x2={14} y2={(getTop(roundIndex, matchIndex) + getTop(roundIndex, matchIndex + 1)) / 2 + CARD_H / 2}
          stroke="#1e2a45" strokeWidth={2}
        />
      )}
    </svg>
  )
}

// Mobile: show one round at a time with tabs
function MobileView({ matchesByRound, predictions, onMatchClick, activeRound, setActiveRound }) {
  const rounds = ROUND_ORDER.filter(r => (matchesByRound[r] ?? []).length > 0)

  return (
    <div>
      {/* Round tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {rounds.map(round => (
          <button
            key={round}
            onClick={() => setActiveRound(round)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeRound === round
                ? 'bg-pitch-500 text-white'
                : 'bg-navy-800 text-gray-400 border border-navy-600'
            }`}
          >
            {ROUND_LABELS[round]}
          </button>
        ))}
      </div>

      {/* Matches for active round */}
      <div className="space-y-3">
        {(matchesByRound[activeRound] ?? []).map(match => (
          <MatchCard
            key={match.id}
            match={match}
            myPrediction={predictions.find(p => p.match_id === match.id)}
            onClick={
              match.status === 'upcoming' && match.team_home !== 'TBD' && match.team_away !== 'TBD'
                ? () => onMatchClick(match)
                : undefined
            }
          />
        ))}
        {!(matchesByRound[activeRound] ?? []).length && (
          <p className="text-center text-gray-600 py-10">No matches yet for this round.</p>
        )}
      </div>
    </div>
  )
}

export default function BracketView({ matches, predictions, onMatchClick }) {
  const [activeRound, setActiveRound] = useState('R32')

  // Organize into rounds
  const byRound = {}
  ROUND_ORDER.forEach(r => { byRound[r] = [] })
  matches.forEach(m => { if (byRound[m.round]) byRound[m.round].push(m) })
  ROUND_ORDER.forEach(r => byRound[r].sort((a, b) => a.slot - b.slot))

  const r32Left  = byRound.R32.slice(0, 8)
  const r32Right = byRound.R32.slice(8, 16)
  const r16Left  = byRound.R16.slice(0, 4)
  const r16Right = byRound.R16.slice(4, 8)
  const qfLeft   = byRound.QF.slice(0, 2)
  const qfRight  = byRound.QF.slice(2, 4)
  const sfLeft   = byRound.SF.slice(0, 1)
  const sfRight  = byRound.SF.slice(1, 2)
  const finalMatch = byRound.FINAL[0] ?? null
  const thirdMatch = byRound.THIRD[0] ?? null

  // Pad arrays to expected length with null
  function pad(arr, len) {
    return [...arr, ...Array(Math.max(0, len - arr.length)).fill(null)]
  }

  const COL_W = CARD_W + 32 // card + connector space

  return (
    <>
      {/* Desktop bracket */}
      <div className="hidden lg:block">
        <div className="overflow-x-auto pb-4">
          <div className="flex items-start gap-0 min-w-max">
            <BracketColumn title="Round of 32" matches={pad(r32Left, 8)}  roundIndex={0} colWidth={COL_W} predictions={predictions} onMatchClick={onMatchClick} />
            <BracketColumn title="Round of 16" matches={pad(r16Left, 4)}  roundIndex={1} colWidth={COL_W} predictions={predictions} onMatchClick={onMatchClick} />
            <BracketColumn title="Quarterfinals" matches={pad(qfLeft, 2)} roundIndex={2} colWidth={COL_W} predictions={predictions} onMatchClick={onMatchClick} />
            <BracketColumn title="Semifinals" matches={pad(sfLeft, 1)}    roundIndex={3} colWidth={COL_W} predictions={predictions} onMatchClick={onMatchClick} />

            {/* Final column - centered */}
            <div className="flex flex-col items-center flex-shrink-0" style={{ width: COL_W }}>
              <div className="text-xs font-bold text-gold-500 uppercase tracking-widest mb-3">⭐ Final</div>
              <div className="relative" style={{ height: HALF_H }}>
                <div className="absolute" style={{ top: getTop(3, 0), width: CARD_W }}>
                  <MatchCard
                    match={finalMatch}
                    myPrediction={finalMatch ? predictions.find(p => p.match_id === finalMatch.id) : null}
                    compact
                    onClick={
                      finalMatch?.status === 'upcoming' && finalMatch?.team_home !== 'TBD'
                        ? () => onMatchClick(finalMatch)
                        : undefined
                    }
                  />
                </div>
              </div>
            </div>

            <BracketColumn title="Semifinals" matches={pad(sfRight, 1)}    roundIndex={3} colWidth={COL_W} predictions={predictions} onMatchClick={onMatchClick} reversed />
            <BracketColumn title="Quarterfinals" matches={pad(qfRight, 2)} roundIndex={2} colWidth={COL_W} predictions={predictions} onMatchClick={onMatchClick} reversed />
            <BracketColumn title="Round of 16" matches={pad(r16Right, 4)}  roundIndex={1} colWidth={COL_W} predictions={predictions} onMatchClick={onMatchClick} reversed />
            <BracketColumn title="Round of 32" matches={pad(r32Right, 8)}  roundIndex={0} colWidth={COL_W} predictions={predictions} onMatchClick={onMatchClick} reversed />
          </div>
        </div>

        {/* Third place */}
        {thirdMatch && (
          <div className="mt-8 flex flex-col items-center">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">🥉 Third Place</h3>
            <div style={{ width: CARD_W }}>
              <MatchCard
                match={thirdMatch}
                myPrediction={predictions.find(p => p.match_id === thirdMatch.id)}
                compact
                onClick={
                  thirdMatch.status === 'upcoming' && thirdMatch.team_home !== 'TBD'
                    ? () => onMatchClick(thirdMatch)
                    : undefined
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile view */}
      <div className="lg:hidden">
        <MobileView
          matchesByRound={byRound}
          predictions={predictions}
          onMatchClick={onMatchClick}
          activeRound={activeRound}
          setActiveRound={setActiveRound}
        />
      </div>
    </>
  )
}
