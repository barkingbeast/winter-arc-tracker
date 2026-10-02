import { useState, useEffect, useRef } from 'react'
import { format, subDays, eachDayOfInterval, isSameDay } from 'date-fns'
import { Share2, X, Image as ImageIcon, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast, { Toaster } from 'react-hot-toast'

export default function Progress() {
  const [logs, setLogs] = useState([])
  const [habitsCount, setHabitsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [galleryItems, setGalleryItems] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [isTopdownViewOpen, setIsTopdownViewOpen] = useState(false)
  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
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
      
      // Calculate gallery items
      const logsWithGallery = logsData
        .filter(l => l.photo_url || l.journal_text)
        .map(l => ({
          date: l.log_date,
          url: l.photo_url ? supabase.storage.from('winter-arc-photos').getPublicUrl(l.photo_url).data.publicUrl : null,
          journal_text: l.journal_text
        }))
      setGalleryItems(logsWithGallery)

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

      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-xl font-bold">Gallery & Journal</h3>
        <button 
          onClick={() => {
            setIsPasswordPromptOpen(true)
            setPasswordInput('')
          }}
          className="p-1 rounded-full hover:bg-white/10 text-arc-muted transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {galleryItems.length === 0 ? (
        <p className="text-arc-muted text-center py-8">No entries yet. Add one in Journal.</p>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {galleryItems.map(item => (
            <button 
              key={item.date} 
              className="aspect-square bg-arc-panel rounded-md overflow-hidden relative cursor-pointer group text-left border-none w-full p-0"
              onClick={() => setSelectedItem(item)}
            >
              {item.url ? (
                <img src={item.url} alt={item.date} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-arc-panel border border-arc-muted/10">
                  <ImageIcon size={20} className="opacity-30 mb-2" />
                  <p className="text-[10px] text-arc-muted text-center line-clamp-3">{item.journal_text}</p>
                </div>
              )}
              {/* Sleek Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-2 opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="text-xs font-semibold text-white tracking-wide shadow-black drop-shadow-md">
                  {format(new Date(item.date), 'MMM d')}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Password Prompt Modal */}
      {isPasswordPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-arc-panel p-6 rounded-2xl w-full max-w-sm border border-white/10 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Enter Password</h3>
            <input 
              type="password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  const { data: { user } } = await supabase.auth.getUser()
                  if (!user) return
                  
                  let isValid = false
                  if (user.email === 'arya@winterarc.com' && passwordInput === import.meta.env.VITE_ARYA_PASSWORD) isValid = true
                  if (user.email === 'anish@winterarc.com' && passwordInput === import.meta.env.VITE_ANISH_PASSWORD) isValid = true

                  if (isValid) {
                    setIsPasswordPromptOpen(false)
                    setPasswordInput('')
                    setIsTopdownViewOpen(true)
                  } else {
                    toast.error("Incorrect password")
                  }
                }
              }}
              placeholder="Password..."
              className="w-full bg-black/50 border border-white/10 rounded-xl p-3 mb-6 focus:outline-none focus:border-arc-green text-white"
              autoFocus
            />
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setIsPasswordPromptOpen(false)
                  setPasswordInput('')
                }}
                className="flex-1 py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser()
                  if (!user) return
                  
                  let isValid = false
                  if (user.email === 'arya@winterarc.com' && passwordInput === import.meta.env.VITE_ARYA_PASSWORD) isValid = true
                  if (user.email === 'anish@winterarc.com' && passwordInput === import.meta.env.VITE_ANISH_PASSWORD) isValid = true

                  if (isValid) {
                    setIsPasswordPromptOpen(false)
                    setPasswordInput('')
                    setIsTopdownViewOpen(true)
                  } else {
                    toast.error("Incorrect password")
                  }
                }}
                className="flex-1 py-3 rounded-xl font-bold bg-arc-text text-black hover:bg-arc-green transition-colors"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Topdown View Modal */}
      {isTopdownViewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a] animate-in fade-in duration-200">
          <div className="flex justify-between items-center p-4 pt-6 border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-10">
            <span className="text-lg font-bold text-white tracking-widest uppercase">Journal Feed</span>
            <button 
              onClick={() => setIsTopdownViewOpen(false)}
              className="p-2 text-white/70 hover:text-white bg-white/5 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-12">
            {galleryItems.map((item, idx) => (
              <div key={idx} className="bg-arc-panel rounded-xl overflow-hidden border border-white/5">
                <div className="p-4 border-b border-white/5 bg-black/20">
                  <h4 className="font-bold text-arc-text">{format(new Date(item.date), 'MMMM d, yyyy')}</h4>
                </div>
                {item.url && (
                  <div className="w-full bg-black/40 flex justify-center border-b border-white/5">
                    <img src={item.url} alt={item.date} className="max-h-[50vh] object-contain" />
                  </div>
                )}
                {item.journal_text && (
                  <div className="p-4">
                    <details className="group">
                      <summary className="text-sm font-semibold text-arc-green cursor-pointer select-none list-none flex items-center justify-between">
                        <span>Read Journal</span>
                        <span className="text-arc-muted group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="mt-3 text-white/90 text-sm whitespace-pre-wrap leading-relaxed">
                        {item.journal_text}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal View */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex justify-between items-center p-4 pt-6 border-b border-white/10">
            <span className="text-lg font-bold text-white">{format(new Date(selectedItem.date), 'MMMM d, yyyy')}</span>
            <button 
              onClick={() => setSelectedItem(null)}
              className="p-2 text-white/70 hover:text-white bg-white/5 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
            {selectedItem.url ? (
                 <img 
                   src={selectedItem.url} 
                   alt={selectedItem.date} 
                   className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
                 />
            ) : (
              <div className="p-6 max-w-md w-full overflow-y-auto max-h-full">
                {selectedItem.journal_text && (
                  <p className="text-white/90 text-lg leading-relaxed whitespace-pre-wrap font-medium text-center">
                    {selectedItem.journal_text}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
