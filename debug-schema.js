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

async function debug() {
  const { data: tables, error } = await supabase.rpc('get_tables'); // Won't work without RPC
  // Instead just try to select from likely names
  const testTables = ['profiles', 'students', 'teachers', 'teacher_subjects', 'subjects'];
  
  for (const table of testTables) {
    console.log(`\n--- ${table.toUpperCase()} SCHEMA ---`);
    const { data, error } = await supabase.from(table).select().limit(1);
    if (error) console.error(`${table} error:`, error.message);
    else if (data && data.length > 0) console.log("Columns:", Object.keys(data[0]));
    else console.log(`${table} table empty.`);
  }
}

debug();
