import { useEffect, useState } from 'react'

export default function CountdownTimer({ kickoffUtc, onKickoff }) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(kickoffUtc))

  useEffect(() => {
    const tick = () => {
      const tl = getTimeLeft(kickoffUtc)
      setTimeLeft(tl)
      if (tl.total <= 0) onKickoff?.()
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [kickoffUtc, onKickoff])

  if (timeLeft.total <= 0) return null

  const { hours, minutes, seconds } = timeLeft
  const isUrgent = timeLeft.total < 30 * 60 // under 30 min

  return (
    <span className={`text-xs font-mono tabular-nums ${isUrgent ? 'text-gold-400' : 'text-gray-400'}`}>
      {hours > 0 ? `${hours}h ${pad(minutes)}m` : `${pad(minutes)}:${pad(seconds)}`}
    </span>
  )
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function getTimeLeft(kickoffUtc) {
  const diff = Math.max(0, new Date(kickoffUtc) - Date.now())
  return {
    total: diff,
    hours: Math.floor(diff / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
  }
}
