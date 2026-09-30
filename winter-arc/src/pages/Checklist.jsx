import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import toast, { Toaster } from 'react-hot-toast'
import { supabase } from '../lib/supabase'

export default function Checklist() {
  const [habits, setHabits] = useState([])
  const [logId, setLogId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("No authenticated user found. Auto-login might have failed.")
      }

      // 1. Get today's log
      let { data: log, error: logError } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .single()

      if (logError && logError.code !== 'PGRST116') {
        throw logError
      }

      if (!log) {
        const { data: newLog, error: createError } = await supabase
          .from('daily_logs')
          .upsert({ user_id: user.id, log_date: today }, { onConflict: 'user_id,log_date' })
          .select()
          .single()
        
        if (createError) throw createError
        log = newLog
      }
      setLogId(log.id)

      // 2. Get active habits
      const { data: activeHabits, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
      
      if (habitsError) throw habitsError

      // If no habits exist, seed the defaults
      if (activeHabits.length === 0) {
        const defaults = [
          { user_id: user.id, title: 'Having breakfast' },
          { user_id: user.id, title: 'Drinking 2ltr+ water' },
          { user_id: user.id, title: 'Taking protein shake and creatine' },
          { user_id: user.id, title: 'Listening to audiobook for 20mins daily' }
        ]
        const { data: seeded, error: seedError } = await supabase.from('habits').insert(defaults).select()
        if (seedError) throw seedError
        activeHabits.push(...seeded)
      }

      // 3. Get completions for today
      const { data: completions, error: compError } = await supabase
        .from('daily_log_completions')
        .select('*')
        .eq('log_id', log.id)
      
      if (compError) throw compError

      // Merge habits with completions
      const merged = activeHabits.map(h => {
        const comp = completions.find(c => c.habit_id === h.id)
        return {
          ...h,
          completion_id: comp?.id,
          is_completed: comp?.completed || false
        }
      })

      setHabits(merged)
    } catch (error) {
      setFetchError(error.message)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleHabit = async (habit) => {
    const newValue = !habit.is_completed
    // Optimistic update
    setHabits(current => current.map(h => h.id === habit.id ? { ...h, is_completed: newValue } : h))
    
    try {
      if (habit.completion_id) {
        // Update existing
        const { error } = await supabase
          .from('daily_log_completions')
          .update({ completed: newValue })
          .eq('id', habit.completion_id)
        if (error) throw error
      } else {
        // Create or update via upsert to prevent unique constraint races
        const { data, error } = await supabase
          .from('daily_log_completions')
          .upsert({
            log_id: logId,
            habit_id: habit.id,
            completed: newValue
          }, { onConflict: 'log_id,habit_id' })
          .select().single()
        
        if (error) throw error
        setHabits(current => current.map(h => h.id === habit.id ? { ...h, completion_id: data.id, is_completed: newValue } : h))
      }
    } catch (error) {
      toast.error('Failed to update: ' + error.message)
      // Revert
      setHabits(current => current.map(h => h.id === habit.id ? { ...h, is_completed: !newValue } : h))
    }
  }

  if (loading) return <div className="text-center py-10 text-arc-muted">Loading...</div>

  if (fetchError) {
    return (
      <div className="pb-10">
        <h2 className="text-2xl font-bold mb-6 text-arc-red">Error Loading Checklist</h2>
        <div className="bg-arc-panel p-4 rounded-xl border border-arc-red/30 text-arc-text">
          {fetchError}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-10">
      <Toaster position="top-center" toastOptions={{ style: { background: '#111', color: '#fff', border: '1px solid #333' } }} />
      <h2 className="text-2xl font-bold mb-6">Daily Checklist</h2>
      <p className="text-arc-muted mb-6">{format(new Date(), 'EEEE, MMMM do')}</p>
      
      <div className="space-y-4">
        {habits.map(habit => (
          <div 
            key={habit.id} 
            onClick={() => toggleHabit(habit)}
            className="flex items-center justify-between p-4 bg-arc-panel rounded-xl border border-arc-muted/20 cursor-pointer hover:bg-arc-panel/80 transition-colors"
          >
            <span className={`flex-1 pr-4 transition-colors select-none ${habit.is_completed ? 'text-arc-muted line-through' : 'text-arc-text'}`}>
              {habit.title}
            </span>
            <button
              className={`w-14 h-8 rounded-full transition-colors relative flex items-center p-1 pointer-events-none ${habit.is_completed ? 'bg-arc-green' : 'bg-black border border-arc-muted/50'}`}
            >
              <div 
                className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${habit.is_completed ? 'translate-x-6' : 'translate-x-0'}`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
