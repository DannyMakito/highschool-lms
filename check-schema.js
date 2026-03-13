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

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkSchema() {
    console.log("Checking profiles schema...");
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*').limit(1);
    if (pError) {
        console.error("Profiles error:", pError);
    } else if (profiles && profiles.length > 0) {
        console.log("Profiles columns:", Object.keys(profiles[0]));
    } else {
        console.log("Profiles table is empty, cannot easily check columns.");
    }

    console.log("Checking students schema...");
    const { data: students, error: sError } = await supabase.from('students').select('*').limit(1);
    if (sError) {
        console.error("Students error:", sError);
    } else if (students && students.length > 0) {
        console.log("Students columns:", Object.keys(students[0]));
    } else {
        console.log("Students table is empty.");
    }
}

checkSchema();
