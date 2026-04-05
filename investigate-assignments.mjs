import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=["']?(.*?)["']?(\r?\n|$)/)[1].trim();
const serviceRoleKey = envContent.match(/ADMIN_SERVICE_ROLE=["']?(.*?)["']?(\r?\n|$)/)[1].trim();

const admin = createClient(supabaseUrl, serviceRoleKey);

async function checkAssignments() {
    console.log("Checking assignments table schema...");
    const { data: ass, error } = await admin.from('assignments').select('*').limit(1);
    if (!error) {
        console.log("Found record in 'assignments'. Columns:", Object.keys(ass[0] || {}));
    } else {
        console.error("Fetch Assignments Error:", error.message);
    }

    console.log("Checking rubrics table...");
    const { data: rub, error: rubErr } = await admin.from('rubrics').select('*').limit(1);
    if (!rubErr) {
        console.log("Found record in 'rubrics'. Columns:", Object.keys(rub[0] || {}));
    } else {
        console.log("Rubrics fetch failed (might not exist):", rubErr.message);
    }
}

checkAssignments().catch(console.error);
