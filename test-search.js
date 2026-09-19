import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wkgwnkidgneebtctgaro.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZ3dua2lkZ25lZWJ0Y3RnYXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MDI0MTEsImV4cCI6MjA5OTE3ODQxMX0.lUIkjtAUQ9E2kuKZOy4ve2EqGXaMiiOyNJVfJpsqfFU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com', // wait, I don't know their password, I'll use the user from earlier
    password: 'password123' // default password from seed.sql?
  });
  
  if (authError) {
    console.log('Auth Error:', authError.message);
    // continue anyway, maybe RLS doesn't block SELECT for anon? Wait, it does.
  }

  const q = 'Patel';
  
  // Test 1: %
  const res1 = await supabase.from('vehicles').select('plate, owner_name').or(`plate.ilike.%${q}%,owner_name.ilike.%${q}%`);
  console.log('Percent %:', res1.data?.length, res1.error);

  // Test 2: *
  const res2 = await supabase.from('vehicles').select('plate, owner_name').or(`plate.ilike.*${q}*,owner_name.ilike.*${q}*`);
  console.log('Asterisk *:', res2.data?.length, res2.error);
}

run();
