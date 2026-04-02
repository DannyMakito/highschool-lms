import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function getEnv(key) {
    const envPath = path.resolve(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(new RegExp(`${key}=(?:["']?)(.*?)(?:["']?)(?:\\r?\\n|$)`));
    return match ? match[1] : '';
}

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const serviceRoleKey = getEnv('ADMIN_SERVICE_ROLE');

const admin = createClient(supabaseUrl, serviceRoleKey);

async function check() {
    console.log("Checking user_lesson_progress table...");
    const { data, error } = await admin.from('user_lesson_progress').select('*').limit(5);
    if (error) {
        console.error("Error fetching user_lesson_progress:", error);
    } else {
        console.log("Success! Data:", data);
    }
}
check();
