import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getEnv(key) {
    const envPath = path.resolve(__dirname, '.env');
    if (!fs.existsSync(envPath)) return '';
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(new RegExp(`${key}=(?:["']?)(.*?)(?:["']?)(?:\r?\n|$)`));
    return match ? match[1] : '';
}

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const serviceRoleKey = getEnv('ADMIN_SERVICE_ROLE') || getEnv('VITE_SUPABASE_SERVICE_ROLE');

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkTeacherSubjects() {
  console.log("Checking if teacher_subjects table exists...");
  const { data, error } = await supabase.from('teacher_subjects').select('*').limit(0);
  
  if (error) {
    console.error("Error accessing teacher_subjects:", error.message);
  } else {
    console.log("Success! Table exists.");
  }
}

checkTeacherSubjects();
