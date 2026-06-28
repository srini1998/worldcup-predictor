import { isUnderdog } from './teams'

export const ROUND_MULTIPLIERS = {
  R32: 1,
  R16: 1.5,
  QF: 2,
  SF: 3,
  THIRD: 2,
  FINAL: 5,
}

const BASE_CORRECT_WINNER = 100
const BASE_CORRECT_SCORE = 300
const BONUS_UNDERDOG = 200
const BONUS_EARLY_BIRD = 50
const BONUS_PERFECT_ROUND = 500

export function calculateMatchPoints({ prediction, match }) {
  if (!match?.winner || !prediction?.predicted_winner) {
    return { basePoints: 0, bonusUnderdog: 0, bonusEarlyBird: 0, multiplier: 1, total: 0 }
  }

  const multiplier = ROUND_MULTIPLIERS[match.round] ?? 1
  const correctWinner = prediction.predicted_winner === match.winner

  if (!correctWinner) {
    return { basePoints: 0, bonusUnderdog: 0, bonusEarlyBird: 0, multiplier, total: 0 }
  }

  const correctScore =
    prediction.predicted_home !== null &&
    prediction.predicted_away !== null &&
    Number(prediction.predicted_home) === Number(match.score_home) &&
    Number(prediction.predicted_away) === Number(match.score_away)

  const basePoints = correctScore ? BASE_CORRECT_SCORE : BASE_CORRECT_WINNER

  // Determine loser (the team that didn't win)
  const loserName = match.winner === match.team_home ? match.team_away : match.team_home
  const bonusUnderdog = isUnderdog(match.winner, loserName) ? BONUS_UNDERDOG : 0
  const bonusEarlyBird = prediction.is_early_bird ? BONUS_EARLY_BIRD : 0

  const total = Math.round((basePoints + bonusUnderdog + bonusEarlyBird) * multiplier)

  return { basePoints, bonusUnderdog, bonusEarlyBird, multiplier, total }
}

export function isEarlyBird(kickoffUtc) {
  const kickoff = new Date(kickoffUtc)
  const thirtyMinBefore = new Date(kickoff.getTime() - 30 * 60 * 1000)
  return new Date() < thirtyMinBefore
}

export function checkPredictionLock(kickoffUtc) {
  return new Date() >= new Date(kickoffUtc)
}

export function getPointBreakdownLabel({ basePoints, bonusUnderdog, bonusEarlyBird, multiplier, total }) {
  const parts = []
  if (basePoints === BASE_CORRECT_SCORE) parts.push('Exact score ✓')
  else if (basePoints === BASE_CORRECT_WINNER) parts.push('Correct winner ✓')
  if (bonusUnderdog) parts.push(`+${BONUS_UNDERDOG} underdog bonus`)
  if (bonusEarlyBird) parts.push(`+${BONUS_EARLY_BIRD} early bird`)
  if (multiplier !== 1) parts.push(`×${multiplier} round multiplier`)
  return { parts, total }
}

export { BONUS_PERFECT_ROUND, BASE_CORRECT_WINNER, BASE_CORRECT_SCORE, BONUS_UNDERDOG, BONUS_EARLY_BIRD }
