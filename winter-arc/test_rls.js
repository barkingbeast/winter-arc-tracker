import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://baypegvjqjrgnecvecgx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJheXBlZ3ZqcWpyZ25lY3ZlY2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3Nzk2MTAsImV4cCI6MjEwNjM1NTYxMH0.PO907AkQkRsOVlsZtQ682nlLIX19El8NsM8xHWJF_Kc'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testToggle() {
  const email = `test${Date.now()}@test.com`
  await supabase.auth.signUp({ email, password: 'password123' })
  const { data: { user } } = await supabase.auth.signInWithPassword({ email, password: 'password123' })
  
  console.log('User created:', user.id)

  const today = new Date().toISOString().split('T')[0]
  
  // 1. Create log
  const { data: log, error: logErr } = await supabase.from('daily_logs').insert({ user_id: user.id, log_date: today }).select().single()
  console.log('Log created', log.id)
  
  // 2. Create habit
  const { data: habit, error: habErr } = await supabase.from('habits').insert({ user_id: user.id, title: 'Test Habit' }).select().single()
  console.log('Habit created', habit.id)
  
  // 3. Create completion
  const { data: comp, error: compErr } = await supabase.from('daily_log_completions').insert({
    log_id: log.id,
    habit_id: habit.id,
    completed: true
  }).select().single()
  console.log('Completion created', comp.id)
  
  // 4. Update completion
  const { data: updated, error: updErr } = await supabase.from('daily_log_completions').update({ completed: false }).eq('id', comp.id).select()
  console.log('Update result:', updated, 'Error:', updErr)
}

testToggle()
