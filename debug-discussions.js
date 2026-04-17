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
const serviceRoleKey = getEnv('ADMIN_SERVICE_ROLE') || getEnv('VITE_SUPABASE_SERVICE_ROLE') || getEnv('VITE_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkDiscussions() {
    console.log("Checking discussions table columns...");
    const { data, error } = await supabase.from('discussions').select('*').limit(1);
    
    if (error) {
        console.error("Error accessing discussions:", error.message);
    } else {
        console.log("Success! Columns:", Object.keys(data[0] || {}));
    }

    console.log("Checking discussion_replies table columns...");
    const { data: rData, error: rError } = await supabase.from('discussion_replies').select('*').limit(1);
    
    if (rError) {
        console.error("Error accessing discussion_replies:", rError.message);
    } else {
        console.log("Success! Columns:", Object.keys(rData[0] || {}));
    }
}

checkDiscussions();
