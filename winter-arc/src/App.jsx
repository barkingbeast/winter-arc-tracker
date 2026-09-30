import { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import Checklist from './pages/Checklist'
import ManageHabits from './pages/ManageHabits'
import Journal from './pages/Journal'
import Progress from './pages/Progress'

const AUTO_EMAIL = 'admin@winterarc.com'
const AUTO_PASS = 'winterarc2026!'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession()
        
        if (existingSession) {
          setSession(existingSession)
          setLoading(false)
          return
        }

        // Try login
        const { data, error } = await supabase.auth.signInWithPassword({
          email: AUTO_EMAIL,
          password: AUTO_PASS
        })

        if (error) {
          // Try signup if login fails
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: AUTO_EMAIL,
            password: AUTO_PASS
          })
          
          if (signUpError) throw signUpError
          
          if (!signUpData.session) {
            throw new Error("Signup succeeded, but session is null. This usually means 'Confirm Email' is still enabled in your Supabase Dashboard -> Authentication -> Providers -> Email. Please disable it, or you won't be able to auto-login.")
          }
          setSession(signUpData.session)
        } else {
          setSession(data.session)
        }
      } catch (err) {
        setAuthError(err.message)
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

  if (loading) {
    return <div className="min-h-screen bg-arc-bg flex items-center justify-center text-arc-muted text-sm">Authenticating...</div>
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-arc-bg flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-arc-red font-bold text-xl mb-4">Authentication Error</h1>
        <p className="text-arc-text mb-2">{authError}</p>
        <p className="text-arc-muted text-sm mt-4">Please fix this in Supabase and refresh the page.</p>
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
