import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Camera, Upload, Save, Image as ImageIcon } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { supabase } from '../lib/supabase'

export default function Journal() {
  const [log, setLog] = useState(null)
  const [journalText, setJournalText] = useState('')
  const [photoUrl, setPhotoUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    loadLog()
  }, [])

  const loadLog = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      if (!data) {
        // Create if missing using upsert to avoid race conditions with Checklist
        const { data: newLog, error: createError } = await supabase
          .from('daily_logs')
          .upsert({ user_id: user.id, log_date: today }, { onConflict: 'user_id,log_date' })
          .select()
          .single()
        if (createError) throw createError
        data = newLog
      }

      setLog(data)
      setJournalText(data.journal_text || '')
      if (data.photo_url) {
        const { data: urlData } = supabase.storage.from('winter-arc-photos').getPublicUrl(data.photo_url)
        setPhotoUrl(urlData.publicUrl)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const uploadPhoto = async (event) => {
    try {
      setUploading(true)
      const file = event.target.files[0]
      if (!file) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${log.id}-${Math.random()}.${fileExt}`
      const filePath = `${log.user_id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('winter-arc-photos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { error: updateError } = await supabase
        .from('daily_logs')
        .update({ photo_url: filePath })
        .eq('id', log.id)

      if (updateError) throw updateError

      const { data: urlData } = supabase.storage.from('winter-arc-photos').getPublicUrl(filePath)
      setPhotoUrl(urlData.publicUrl)
      toast.success('Photo uploaded')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setUploading(false)
    }
  }

  const saveJournal = async () => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('daily_logs')
        .update({ journal_text: journalText })
        .eq('id', log.id)
      
      if (error) throw error
      toast.success('Journal saved')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-10">Loading...</div>

  return (
    <div className="pb-10 flex flex-col h-full">
      <Toaster position="top-center" toastOptions={{ style: { background: '#111', color: '#fff', border: '1px solid #333' } }} />
      <h2 className="text-2xl font-bold mb-6">Daily Journal</h2>
      
      <div className="flex-1 space-y-6">
        {/* Photo Upload Zone */}
        <div className="bg-arc-panel rounded-xl overflow-hidden border border-arc-muted/20 relative aspect-[3/4] flex items-center justify-center">
          {photoUrl ? (
            <img src={photoUrl} alt="Daily progress" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center text-arc-muted p-6 text-center">
              <ImageIcon size={48} className="mb-4 opacity-50" />
              <p>No progress photo uploaded yet</p>
            </div>
          )}
          
          <label className="absolute bottom-4 right-4 bg-black/80 backdrop-blur text-arc-text p-3 rounded-full shadow-lg border border-white/10 cursor-pointer hover:bg-black transition-colors z-10">
            {uploading ? <span className="animate-spin inline-block">...</span> : <Camera size={24} />}
            <input 
              type="file" 
              accept="image/*"
              capture="environment"
              className="hidden" 
              onChange={uploadPhoto} 
              disabled={uploading}
            />
          </label>
        </div>

        {/* Text Area */}
        <div className="flex flex-col flex-1">
          <textarea
            value={journalText}
            onChange={(e) => setJournalText(e.target.value)}
            placeholder="How did today go? Write your recap..."
            className="w-full h-40 p-4 bg-arc-panel border border-arc-muted/30 rounded-xl focus:outline-none focus:border-arc-green text-arc-text resize-none"
          />
          <button
            onClick={saveJournal}
            disabled={saving}
            className="mt-4 w-full py-3 bg-arc-text text-black font-semibold rounded-xl hover:bg-arc-green transition-colors flex items-center justify-center gap-2"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save Journal'}
          </button>
        </div>
      </div>
    </div>
  )
}
