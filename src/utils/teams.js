export const TEAM_FLAGS = {
  // Group A
  'Mexico': '🇲🇽',
  'South Africa': '🇿🇦',
  // Group B
  'Switzerland': '🇨🇭',
  'Canada': '🇨🇦',
  // Group C
  'Brazil': '🇧🇷',
  'Morocco': '🇲🇦',
  // Group D
  'United States': '🇺🇸',
  'USA': '🇺🇸',
  'Bosnia & Herzegovina': '🇧🇦',
  'Bosnia and Herzegovina': '🇧🇦',
  'Bosnia-Herzegovina': '🇧🇦',
  // Group E
  'Germany': '🇩🇪',
  'Ecuador': '🇪🇨',
  // Group F
  'France': '🇫🇷',
  'Norway': '🇳🇴',
  // Group G
  'Belgium': '🇧🇪',
  'Egypt': '🇪🇬',
  // Group H (TBD)
  'Saudi Arabia': '🇸🇦',
  'Japan': '🇯🇵',
  'Australia': '🇦🇺',
  'Bahrain': '🇧🇭',
  'Iraq': '🇮🇶',
  // Group I
  'Argentina': '🇦🇷',
  'Algeria': '🇩🇿',
  'Austria': '🇦🇹',
  // Group J
  'Spain': '🇪🇸',
  'Croatia': '🇭🇷',
  'Netherlands': '🇳🇱',
  'Denmark': '🇩🇰',
  // Group K
  'Colombia': '🇨🇴',
  'Portugal': '🇵🇹',
  'Senegal': '🇸🇳',
  // Group L
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Ghana': '🇬🇭',
  // Others that may qualify as 3rd place
  'Uruguay': '🇺🇾',
  'Chile': '🇺🇾',
  'Peru': '🇵🇪',
  'Venezuela': '🇻🇪',
  'Paraguay': '🇵🇾',
  'Bolivia': '🇧🇴',
  'Iran': '🇮🇷',
  'South Korea': '🇰🇷',
  'New Zealand': '🇳🇿',
  'Nigeria': '🇳🇬',
  'Cameroon': '🇨🇲',
  "Ivory Coast": '🇨🇮',
  "Côte d'Ivoire": '🇨🇮',
  'Tunisia': '🇹🇳',
  'Poland': '🇵🇱',
  'Serbia': '🇷🇸',
  'Ukraine': '🇺🇦',
  'Slovakia': '🇸🇰',
  'Czechia': '🇨🇿',
  'Czech Republic': '🇨🇿',
  'Hungary': '🇭🇺',
  'Romania': '🇷🇴',
  'Turkey': '🇹🇷',
  'Türkiye': '🇹🇷',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Panama': '🇵🇦',
  'Costa Rica': '🇨🇷',
  'Honduras': '🇭🇳',
  'El Salvador': '🇸🇻',
  'Jamaica': '🇯🇲',
  'Trinidad and Tobago': '🇹🇹',
  'Qatar': '🇶🇦',
  'United Arab Emirates': '🇦🇪',
  'UAE': '🇦🇪',
  'Indonesia': '🇮🇩',
  'Thailand': '🇹🇭',
  'China PR': '🇨🇳',
  'China': '🇨🇳',
  'Sweden': '🇸🇪',
  'DR Congo': '🇨🇩',
  'Congo DR': '🇨🇩',
  'Cabo Verde': '🇨🇻',
  'Cape Verde Islands': '🇨🇻',
  'Morocco': '🇲🇦',
  'TBD': '🏳️',
}

// FIFA World Rankings (approximate, for underdog detection)
export const FIFA_RANKINGS = {
  'France': 2,
  'Brazil': 3,
  'England': 4,
  'Belgium': 5,
  'Portugal': 6,
  'Netherlands': 7,
  'Spain': 8,
  'Argentina': 9,
  'Mexico': 11,
  'USA': 13,
  'United States': 13,
  'Germany': 14,
  'Morocco': 12,
  'Switzerland': 19,
  'Austria': 25,
  'Colombia': 27,
  'Norway': 31,
  'Algeria': 35,
  'Ecuador': 42,
  'Canada': 41,
  'South Africa': 57,
  'Bosnia & Herzegovina': 63,
  'Bosnia and Herzegovina': 63,
  'Egypt': 33,
  'Ghana': 64,
  'Croatia': 10,
  'Denmark': 21,
  'Uruguay': 20,
  'Senegal': 18,
  'South Korea': 23,
  'Japan': 17,
  'Australia': 22,
  'Iran': 24,
  'Poland': 26,
  'Serbia': 30,
  'Ukraine': 28,
  'Turkey': 29,
  'Türkiye': 29,
  'Nigeria': 37,
  'Cameroon': 43,
  'Tunisia': 34,
  'Sweden': 25,
  'DR Congo': 55,
  'Congo DR': 55,
  'Cabo Verde': 80,
  'Cape Verde Islands': 80,
  'Bosnia-Herzegovina': 63,
  'Paraguay': 68,
  "Ivory Coast": 56,
  'TBD': 999,
}

export function getFlag(teamName) {
  if (!teamName || teamName === 'TBD') return '🏳️'
  return TEAM_FLAGS[teamName] ?? '🏳️'
}

export function getFifaRank(teamName) {
  if (!teamName || teamName === 'TBD') return 999
  return FIFA_RANKINGS[teamName] ?? 100
}

export function isUnderdog(winnerName, loserName) {
  return getFifaRank(winnerName) > getFifaRank(loserName)
}

export const ROUND_LABELS = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  THIRD: 'Third Place',
  FINAL: 'Final',
}

export const ROUND_ORDER = ['R32', 'R16', 'QF', 'SF', 'FINAL', 'THIRD']
