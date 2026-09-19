import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://wkgwnkidgneebtctgaro.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZ3dua2lkZ25lZWJ0Y3RnYXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MDI0MTEsImV4cCI6MjA5OTE3ODQxMX0.lUIkjtAUQ9E2kuKZOy4ve2EqGXaMiiOyNJVfJpsqfFU');

async function run() {
  const res = await supabase.from('vehicles').select('plate');
  console.log('Error:', res.error);
  console.log('Data count:', res.data?.length);
}
run();
