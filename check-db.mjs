import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].replace(/["']/g, '').trim();

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  console.log("Checking DB...");
  const { data: grades, error: e1 } = await supabase.from('grades').select('*');
  console.log('Grades error:', e1);
  console.log('Grades count ANON:', grades?.length, grades);

  const { data: registers, error: e2 } = await supabase.from('register_classes').select('*');
  console.log('Register Classes ANON:', registers?.length);
  
  const { data: subjects, error: e3 } = await supabase.from('subjects').select('*');
  console.log('Subjects ANON:', subjects?.length);
}

check();
