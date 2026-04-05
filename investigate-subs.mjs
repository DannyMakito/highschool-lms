import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=["']?(.*?)["']?(\r?\n|$)/)[1].trim();
const serviceRoleKey = envContent.match(/ADMIN_SERVICE_ROLE=["']?(.*?)["']?(\r?\n|$)/)[1].trim();

const admin = createClient(supabaseUrl, serviceRoleKey);

async function checkSubmissions() {
    console.log("Checking quiz_submissions table...");
    const { data: qsubs, error: err1 } = await admin.from('quiz_submissions').select('*').limit(1);
    if (!err1 && qsubs && qsubs[0]) {
        console.log("quiz_submissionsrecord keys:", Object.keys(qsubs[0]));
        console.log("Full record:", JSON.stringify(qsubs[0], null, 2));
    } else {
        console.error("quiz_submissions fetch error (might not exist):", err1?.message);
        const { data: subs, error: err2 } = await admin.from('submissions').select('*').limit(1);
        if (!err2 && subs && subs[0]) {
             console.log("found in 'submissions' table instead. Keys:", Object.keys(subs[0]));
             console.log("Full record:", JSON.stringify(subs[0], null, 2));
        } else {
             console.error("submissions table fetch error:", err2?.message);
        }
    }
}

checkSubmissions().catch(console.error);
