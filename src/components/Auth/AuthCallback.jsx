import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import LoadingSpinner from '../common/LoadingSpinner'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')

    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) {
            console.error('OAuth code exchange failed:', error.message)
            navigate('/login?error=auth_failed', { replace: true })
          } else {
            navigate('/', { replace: true })
          }
        })
      return
    }

    // No code param — check for an existing session (implicit flow fallback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/', { replace: true })
      } else if (event === 'SIGNED_OUT') {
        navigate('/login', { replace: true })
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/', { replace: true })
    })

    const timeout = setTimeout(() => {
      navigate('/login?error=timeout', { replace: true })
    }, 10_000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [navigate])

  return <LoadingSpinner fullScreen />
}
