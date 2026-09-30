import { useState, useEffect } from 'react'
import { Plus, Trash2, Power } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { supabase } from '../lib/supabase'

export default function ManageHabits() {
  const [habits, setHabits] = useState([])
  const [newHabit, setNewHabit] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHabits()
  }, [])

  const loadHabits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      setHabits(data || [])
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const addHabit = async (e) => {
    e.preventDefault()
    if (!newHabit.trim()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('habits')
        .insert({ user_id: user.id, title: newHabit.trim() })
        .select()
        .single()

      if (error) throw error
      setHabits([...habits, data])
      setNewHabit('')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const toggleActive = async (habit) => {
    try {
      const { error } = await supabase
        .from('habits')
        .update({ is_active: !habit.is_active })
        .eq('id', habit.id)
      
      if (error) throw error
      setHabits(habits.map(h => h.id === habit.id ? { ...h, is_active: !habit.is_active } : h))
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="pb-10">
      <Toaster position="top-center" toastOptions={{ style: { background: '#111', color: '#fff', border: '1px solid #333' } }} />
      <h2 className="text-2xl font-bold mb-6">Manage Habits</h2>
      
      <form onSubmit={addHabit} className="mb-8 flex gap-2">
        <input
          type="text"
          value={newHabit}
          onChange={(e) => setNewHabit(e.target.value)}
          placeholder="New habit name..."
          className="flex-1 px-4 py-3 bg-black border border-arc-muted/30 rounded-lg focus:outline-none focus:border-arc-green text-arc-text"
        />
        <button
          type="submit"
          className="p-3 bg-arc-text text-black rounded-lg hover:bg-arc-green transition-colors"
        >
          <Plus size={24} />
        </button>
      </form>

      <div className="space-y-3">
        {habits.map(habit => (
          <div 
            key={habit.id} 
            className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${habit.is_active ? 'bg-arc-panel border-arc-muted/20' : 'bg-black border-arc-red/20 opacity-50'}`}
          >
            <span className="flex-1 pr-4">{habit.title}</span>
            <button
              onClick={() => toggleActive(habit)}
              className={`p-2 rounded transition-colors ${habit.is_active ? 'text-arc-green hover:bg-arc-green/10' : 'text-arc-red hover:bg-arc-red/10'}`}
              title={habit.is_active ? 'Disable' : 'Enable'}
            >
              <Power size={20} />
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-arc-muted mt-6 text-center">
        Note: We disable habits instead of deleting them to preserve your streak history.
      </p>
    </div>
  )
}
