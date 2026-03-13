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
  const tables = ['profiles', 'students', 'teacher_subjects'];
  
  for (const table of tables) {
    console.log(`\n--- ${table.toUpperCase()} COLUMNS ---`);
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: table });
    
    if (error) {
       // If no RPC, try information_schema via a trick (selecting from a view)
       // Or just try to select 1 row and check keys
       const { data: cols, error: cErr } = await supabase
         .from(table)
         .select()
         .limit(1);
         
       if (cErr) {
         console.error(`Error with ${table}:`, cErr.message);
       } else if (cols && cols.length > 0) {
         console.log(Object.keys(cols[0]));
       } else {
         // Table is empty, try to get column names via an empty select?
         // This doesn't usually work in PostgREST unless you use ?select=*
         console.log("Empty table, cannot get columns via select.");
       }
    } else {
      console.log(data);
    }
  }
}

debug();
