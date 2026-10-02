import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://baypegvjqjrgnecvecgx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJheXBlZ3ZqcWpyZ25lY3ZlY2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3Nzk2MTAsImV4cCI6MjEwNjM1NTYxMH0.PO907AkQkRsOVlsZtQ682nlLIX19El8NsM8xHWJF_Kc'
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log("Signing in as Anish...")
  const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'anish@winterarc.com',
    password: 'winterarc2026!'
  })

  if (signInError) {
    console.error("Sign in failed:", signInError)
    return
  }

  console.log("Signed in successfully as:", user.id)

  // Fetch the most recent daily_log that has either a journal or photo
  const { data: logs, error: fetchError } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('log_date', { ascending: false })
    .limit(1)

  if (fetchError) {
    console.error("Fetch error:", fetchError)
    return
  }

  if (logs.length === 0) {
    console.log("No daily logs found for Anish.")
    return
  }

  const log = logs[0]
  console.log("Found recent log for date:", log.log_date)

  // Set journal_text and photo_url to null
  const { error: updateError } = await supabase
    .from('daily_logs')
    .update({ journal_text: null, photo_url: null })
    .eq('id', log.id)

  if (updateError) {
    console.error("Update error:", updateError)
    return
  }

  console.log("Successfully cleared journal text and photo url for the recent log.")
}

run()
