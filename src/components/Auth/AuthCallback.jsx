import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import LoadingSpinner from '../common/LoadingSpinner'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // detectSessionInUrl:true in the Supabase client auto-exchanges the ?code= param.
    // We just need to react to the resulting SIGNED_IN event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/', { replace: true })
      } else if (event === 'SIGNED_OUT') {
        navigate('/login', { replace: true })
      }
    })

    // In case the exchange already completed before this component mounted
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
