import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function Navbar() {
  const { profile, isAdmin, signOut } = useAuth()
  const location = useLocation()

  const navLinks = [
    { to: '/', label: '🏟️ Bracket' },
    { to: '/leaderboard', label: '🏅 Leaderboard' },
    ...(isAdmin ? [{ to: '/admin', label: '⚙️ Admin' }] : []),
  ]

  return (
    <header className="sticky top-0 z-40 bg-navy-900/95 backdrop-blur border-b border-navy-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-black text-white">
            <span className="text-xl">🏆</span>
            <span className="hidden sm:block text-sm font-bold text-pitch-400">WC2026</span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === to
                    ? 'bg-pitch-500/20 text-pitch-400'
                    : 'text-gray-400 hover:text-white hover:bg-navy-700'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* User menu */}
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-8 h-8 rounded-full border border-navy-600"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-sm font-bold text-pitch-400">
                {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <button
              onClick={signOut}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors hidden sm:block"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
