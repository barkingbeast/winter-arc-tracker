import pg from 'pg';

const connectionString = 'postgresql://postgres.baypegvjqjrgnecvecgx:Barkingbeast@12@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres';

const client = new pg.Client({ connectionString });

async function run() {
  await client.connect();
  
  const users = await client.query('SELECT id, email FROM auth.users');
  console.log('Users:', users.rows);
  
  const logs = await client.query('SELECT * FROM public.daily_logs');
  console.log('Logs:', logs.rows);
  
  const habits = await client.query('SELECT * FROM public.habits');
  console.log('Habits:', habits.rows);
  
  const comps = await client.query('SELECT * FROM public.daily_log_completions');
  console.log('Completions:', comps.rows);
  
  await client.end();
}

run();
