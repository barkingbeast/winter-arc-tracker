import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://baypegvjqjrgnecvecgx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJheXBlZ3ZqcWpyZ25lY3ZlY2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3Nzk2MTAsImV4cCI6MjEwNjM1NTYxMH0.PO907AkQkRsOVlsZtQ682nlLIX19El8NsM8xHWJF_Kc'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testToggle() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@winterarc.com',
    password: 'winterarc2026!'
  })
  
  if (authError) {
    console.error('Login error:', authError)
    
    // try to sign up if login fails
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: 'admin@winterarc.com',
      password: 'winterarc2026!'
    })
    if (signUpError) {
      console.error('Signup error:', signUpError)
      return
    }
    console.log('Signed up!')
  } else {
    console.log('Logged in!')
  }
  
  const user = (await supabase.auth.getUser()).data.user
  
  const today = new Date().toISOString().split('T')[0]
  let { data: log } = await supabase.from('daily_logs').select('*').eq('user_id', user.id).eq('log_date', today).single()
  
  if (!log) {
    console.log('Log not found, assuming empty')
    return;
  }

  const { data: completions } = await supabase.from('daily_log_completions').select('*').eq('log_id', log.id)
  console.log('Completions:', completions)
  
  if (completions && completions.length > 0) {
    const comp = completions[0]
    console.log('Toggling completion', comp.id)
    
    const { data: updated, error: updateError } = await supabase
      .from('daily_log_completions')
      .update({ completed: !comp.completed })
      .eq('id', comp.id)
      .select()
      
    if (updateError) {
      console.error('Update error:', updateError)
    } else {
      console.log('Update success!', updated)
    }
  } else {
    console.log('No completions found to toggle.')
  }
}

testToggle()
