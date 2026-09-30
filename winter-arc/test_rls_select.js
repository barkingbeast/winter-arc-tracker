import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://baypegvjqjrgnecvecgx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJheXBlZ3ZqcWpyZ25lY3ZlY2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3Nzk2MTAsImV4cCI6MjEwNjM1NTYxMH0.PO907AkQkRsOVlsZtQ682nlLIX19El8NsM8xHWJF_Kc'
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'admin@winterarc.com',
    password: 'winterarc2026!'
  })
  
  if (!authData.user) return console.log('not logged in');
  
  const user = authData.user;
  
  let { data: logs } = await supabase.from('daily_logs').select('*').eq('user_id', user.id)
  console.log('Logs:', logs)
  if (logs.length > 0) {
    const { data: completions, error } = await supabase.from('daily_log_completions').select('*').eq('log_id', logs[0].id)
    console.log('Completions:', completions)
    console.log('Error:', error)
  }
}

run();
