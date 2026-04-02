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
const serviceRoleKey = getEnv('ADMIN_SERVICE_ROLE');
const anonKey = getEnv('VITE_SUPABASE_KEY');

const admin = createClient(supabaseUrl, serviceRoleKey);
const supabase = createClient(supabaseUrl, anonKey);

async function check() {
    console.log("Checking data with Admin...");
    const { data: ssc } = await admin.from('student_subject_classes').select('*');
    console.log("Total student_subject_classes in DB:", ssc?.length || 0);

    const { data: teachers } = await admin.from('profiles').select('*').eq('role', 'teacher');
    if (!teachers || teachers.length === 0) {
        console.log("No teachers!");
        return;
    }
    const t = teachers[0];
    console.log(`Logging in as Teacher: ${t.email}`);
    
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: t.email,
        password: t.pin
    });
    
    if (authErr) {
        console.log("Auth err:", authErr);
        return;
    } 
    
    console.log("Teacher logged in. Fetching data...");
    
    // Simulate what the teacher does
    const { data: q1, error: e1 } = await supabase.from('student_subject_classes').select('*');
    console.log("Teacher sees SSCs:", q1?.length || 0, "Error:", e1?.message);
    
    const { data: q2, error: e2 } = await supabase.from('students').select('*, profiles(*)');
    console.log("Teacher sees students:", q2?.length || 0, "Error:", e2?.message);
}
check().catch(console.log);
