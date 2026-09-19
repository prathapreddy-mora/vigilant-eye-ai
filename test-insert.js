import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY);

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
