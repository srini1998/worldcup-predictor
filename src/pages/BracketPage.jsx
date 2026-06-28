import { useState } from 'react'
import ReactConfetti from 'react-confetti'
import BracketView from '../components/Bracket/BracketView'
import PredictionModal from '../components/Predictions/PredictionModal'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useMatches } from '../hooks/useMatches'
import { usePredictions } from '../hooks/usePredictions'
import { useLiveScores } from '../hooks/useLiveScores'

export default function BracketPage() {
  const { matches, loading, hasLiveMatches, fetchMatches } = useMatches()
  const { predictions, savePrediction, getMyPrediction } = usePredictions()
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)

  useLiveScores({ hasLiveMatches, matches, onUpdate: fetchMatches })

  async function handleSavePrediction(data) {
    await savePrediction(data)
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 3500)
  }

  if (loading) return <LoadingSpinner />

  const liveCount = matches.filter(m => m.status === 'live').length

  return (
    <>
      {showConfetti && (
        <ReactConfetti
          recycle={false}
          numberOfPieces={200}
          colors={['#10b981', '#f59e0b', '#ffffff', '#34d399']}
          style={{ position: 'fixed', zIndex: 100 }}
        />
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">
              🏆 World Cup 2026
            </h1>
            <p className="text-gray-500 text-sm">Knockout Stage · Tap any upcoming match to predict</p>
          </div>
          {liveCount > 0 && (
            <div className="flex items-center gap-2 bg-live/10 border border-live/30 px-3 py-1.5 rounded-full">
              <span className="h-2 w-2 rounded-full bg-live animate-pulse-live" />
              <span className="text-live text-sm font-bold">{liveCount} LIVE</span>
            </div>
          )}
        </div>

        {/* Points legend */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { label: 'Correct winner', value: '100pts', color: 'text-pitch-400' },
            { label: 'Exact score', value: '300pts', color: 'text-gold-400' },
            { label: 'Underdog', value: '+200pts', color: 'text-gold-300' },
            { label: 'Early bird', value: '+50pts', color: 'text-pitch-300' },
            { label: 'Final', value: '×5', color: 'text-white' },
          ].map(({ label, value, color }) => (
            <span key={label} className="bg-navy-800 border border-navy-600 text-xs px-2 py-1 rounded-full">
              <span className="text-gray-500">{label}: </span>
              <span className={`font-bold ${color}`}>{value}</span>
            </span>
          ))}
        </div>
      </div>

      <BracketView
        matches={matches}
        predictions={predictions}
        onMatchClick={setSelectedMatch}
      />

      {selectedMatch && (
        <PredictionModal
          match={selectedMatch}
          existingPrediction={getMyPrediction(selectedMatch.id)}
          onSave={handleSavePrediction}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </>
  )
}
