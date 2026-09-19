import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://wkgwnkidgneebtctgaro.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZ3dua2lkZ25lZWJ0Y3RnYXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MDI0MTEsImV4cCI6MjA5OTE3ODQxMX0.lUIkjtAUQ9E2kuKZOy4ve2EqGXaMiiOyNJVfJpsqfFU');

async function run() {
  const q = 'patel';

  console.log("Test 1: select().or().order()");
  const res1 = await supabase.from('vehicles').select('plate').or(`plate.ilike.%${q}%`).order('plate');
  console.log('Error 1:', res1.error);

  console.log("Test 2: select().order().or()");
  const res2 = await supabase.from('vehicles').select('plate').order('plate').or(`plate.ilike.%${q}%`);
  console.log('Error 2:', res2.error);
}

run();
