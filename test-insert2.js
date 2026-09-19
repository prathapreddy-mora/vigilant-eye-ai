import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wkgwnkidgneebtctgaro.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZ3dua2lkZ25lZWJ0Y3RnYXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MDI0MTEsImV4cCI6MjA5OTE3ODQxMX0.lUIkjtAUQ9E2kuKZOy4ve2EqGXaMiiOyNJVfJpsqfFU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase.from('vehicles').insert({
    plate: 'TEST9999',
    owner_name: 'Test Owner',
    brand: 'Test Brand',
    model: 'Test Model',
    color: 'Red',
    vehicle_type: 'Two Wheeler'
  }).select();
  
  console.log('Error:', error);
  console.log('Data:', data);
}

run();
