import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function getEnv(key) {
    const envPath = path.resolve(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(new RegExp(`${key}=(?:["']?)(.*?)(?:["']?)(?:\r?\n|$)`));
    return match ? match[1] : '';
}

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const serviceRoleKey = getEnv('ADMIN_SERVICE_ROLE') || getEnv('VITE_SUPABASE_SERVICE_ROLE');

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runSQL() {
    const sqlPath = path.resolve(process.cwd(), 'fix-teacher-subjects-rls.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log("Executing SQL...");
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
        console.error("Error executing SQL:", error);
    } else {
        console.log("Success! Data:", data);
    }
}

runSQL();
