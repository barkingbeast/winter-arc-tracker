import { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import Checklist from './pages/Checklist'
import ManageHabits from './pages/ManageHabits'
import Journal from './pages/Journal'
import Progress from './pages/Progress'

const PROFILES = [
  { name: 'ARYA', email: 'arya@winterarc.com' },
  { name: 'ANISH', email: 'anish@winterarc.com' }
]
const AUTO_PASS = 'winterarc2026!'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession()
        if (existingSession) {
          setSession(existingSession)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async (email) => {
    setIsLoggingIn(true)
    setAuthError(null)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: AUTO_PASS
      })

      if (error) {
        // Try signup if login fails
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: AUTO_PASS
        })
        
        if (signUpError) throw signUpError
        
        if (!signUpData.session) {
          throw new Error("Signup succeeded, but session is null. Disable 'Confirm Email' in Supabase.")
        }
        // Session will be updated via onAuthStateChange
      }
    } catch (err) {
      setAuthError(err.message)
    } finally {
      setIsLoggingIn(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-arc-bg flex items-center justify-center text-arc-muted text-sm">Loading...</div>
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-arc-bg flex flex-col items-center justify-center p-6 space-y-8">
        <h1 className="text-3xl font-bold uppercase tracking-wider text-arc-text mb-4">Who is tracking?</h1>
        
        {authError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg w-full max-w-sm text-center text-sm">
            {authError}
          </div>
        )}

        <div className="flex flex-col space-y-4 w-full max-w-sm">
          {PROFILES.map(profile => (
            <button
              key={profile.name}
              disabled={isLoggingIn}
              onClick={() => handleLogin(profile.email)}
              className="bg-arc-panel border border-arc-muted/20 hover:border-arc-green hover:shadow-[0_0_15px_rgba(34,197,94,0.2)] transition-all duration-300 rounded-xl py-8 text-2xl font-bold tracking-widest text-arc-text disabled:opacity-50 active:scale-95"
            >
              {profile.name}
            </button>
          ))}
        </div>
        
        {isLoggingIn && <p className="text-arc-muted text-sm animate-pulse">Switching profile...</p>}
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/checklist" replace />} />
          <Route path="/checklist" element={<Checklist />} />
          <Route path="/habits" element={<ManageHabits />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/progress" element={<Progress />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
