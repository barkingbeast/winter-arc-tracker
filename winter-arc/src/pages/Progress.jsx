import { useState, useEffect, useRef } from 'react'
import { format, subDays, eachDayOfInterval, isSameDay } from 'date-fns'
import { Share2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast, { Toaster } from 'react-hot-toast'

export default function Progress() {
  const [logs, setLogs] = useState([])
  const [habitsCount, setHabitsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [photos, setPhotos] = useState([])
  const [currentStreak, setCurrentStreak] = useState(0)
  const shareRef = useRef(null)

  useEffect(() => {
    loadProgress()
  }, [])

  const loadProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get habits count (active only)
      const { count } = await supabase
        .from('habits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true)
      
      setHabitsCount(count || 1) // default 1 to avoid div by zero

      // Get all logs with completions
      const { data: logsData, error: logsError } = await supabase
        .from('daily_logs')
        .select('*, daily_log_completions(completed)')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false })
      
      if (logsError) throw logsError
      
      setLogs(logsData)
      
      // Calculate photos
      const logsWithPhotos = logsData
        .filter(l => l.photo_url)
        .map(l => ({
          date: l.log_date,
          url: supabase.storage.from('winter-arc-photos').getPublicUrl(l.photo_url).data.publicUrl
        }))
      setPhotos(logsWithPhotos)

      // Calculate streak
      let streak = 0
      const today = new Date()
      for (let i = 0; i < 365; i++) {
        const d = format(subDays(today, i), 'yyyy-MM-dd')
        const log = logsData.find(l => l.log_date === d)
        if (log) {
          const completedCount = log.daily_log_completions?.filter(c => c.completed).length || 0
          if (completedCount === count) {
            streak++
          } else if (i !== 0) { // If today is not 100%, we don't break streak yet if yesterday was
            break
          }
        } else if (i !== 0) {
          break
        }
      }
      setCurrentStreak(streak)

    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Generate the full Winter Arc timeline (Oct 1 to Dec 31)
  const currentYear = new Date().getFullYear()
  const days = eachDayOfInterval({
    start: new Date(currentYear, 9, 1), // Month is 0-indexed (9 = Oct)
    end: new Date(currentYear, 11, 31)  // (11 = Dec)
  })

  const getHeatmapColor = (date) => {
    const d = format(date, 'yyyy-MM-dd')
    const log = logs.find(l => l.log_date === d)
    if (!log) return 'bg-arc-panel border border-arc-muted/20' // No log
    
    const completedCount = log.daily_log_completions?.filter(c => c.completed).length || 0
    const pct = completedCount / habitsCount
    
    if (pct === 1) return 'bg-arc-green'
    if (pct > 0) return 'bg-arc-amber'
    return 'bg-arc-red'
  }

  const shareStreak = async () => {
    toast('Screenshot your summary card below to share!', { icon: '📸' })
  }

  if (loading) return <div className="text-center py-10">Loading...</div>

  return (
    <div className="pb-10">
      <Toaster position="top-center" toastOptions={{ style: { background: '#111', color: '#fff', border: '1px solid #333' } }} />
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Progress</h2>
        <button onClick={shareStreak} className="p-2 bg-arc-panel rounded-full hover:text-arc-green border border-arc-muted/30">
          <Share2 size={20} />
        </button>
      </div>
      
      {/* Share Card */}
      <div 
        ref={shareRef}
        className="bg-arc-panel p-6 rounded-xl border border-arc-muted/20 mb-8 relative overflow-hidden"
      >
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-arc-green/10 rounded-full blur-3xl"></div>
        <h3 className="text-sm font-bold uppercase tracking-widest text-arc-muted mb-2">Winter Arc</h3>
        <div className="flex items-end gap-4 mb-6">
          <span className="text-5xl font-black text-arc-text">{currentStreak}</span>
          <span className="text-arc-muted pb-1 uppercase tracking-wide font-semibold">Day Streak</span>
        </div>
        
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map(d => (
            <div 
              key={d.toISOString()} 
              className={`aspect-square rounded-sm ${getHeatmapColor(d)}`}
              title={format(d, 'MMM d')}
            />
          ))}
        </div>
      </div>

      <h3 className="text-xl font-bold mb-4">Gallery</h3>
      {photos.length === 0 ? (
        <p className="text-arc-muted text-center py-8">No photos yet. Add one in Journal.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map(p => (
            <div key={p.date} className="aspect-square bg-arc-panel rounded overflow-hidden">
              <img src={p.url} alt={p.date} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
