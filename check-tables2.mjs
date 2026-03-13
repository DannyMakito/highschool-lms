import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const serviceRoleKey = envContent.match(/VITE_SUPABASE_SERVICE_ROLE=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function check() {
  const { data: grades } = await supabase.from('grades').select('*');
  console.log('Grades count:', grades?.length);
  const { data: subjects } = await supabase.from('subjects').select('*');
  console.log('Subjects count:', subjects?.length);
}
check();
