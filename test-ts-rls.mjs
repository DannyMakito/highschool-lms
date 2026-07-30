import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL="(.*?)"/)[1];
const SUPABASE_ANON_KEY = env.match(/VITE_SUPABASE_KEY="(.*?)"/)[1];

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    // Principal login
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'principal@glenbrackhigh.co.za',
        password: 'password123'
    });

    if (authErr) {
        console.error("Login failed:", authErr.message);
        return;
    }
    console.log("Logged in as principal:", authData.user.id);

    // Try SELECT
    const { data: selData, error: selErr } = await supabase.from('teacher_subjects').select('*');
    console.log("SELECT returned:", selData?.length, "rows. Error:", selErr);

    // Try INSERT
    // Let's find a teacher and subject
    const teacherId = 'a1bbcd3b-3d60-498b-967f-85942475e589'; // Example UUID format, will likely fail FK but we just want to see RLS
    // Wait, let's get a real teacher
    const { data: teachers } = await supabase.from('profiles').select('id').eq('role', 'teacher').limit(1);
    const { data: subjects } = await supabase.from('subjects').select('id').limit(1);
    
    if (teachers?.length && subjects?.length) {
        const tId = teachers[0].id;
        const sId = subjects[0].id;
        
        console.log("Testing INSERT with", tId, sId);
        const { error: insErr } = await supabase.from('teacher_subjects').insert({ teacher_id: tId, subject_id: sId });
        console.log("INSERT Error:", insErr);

        console.log("Testing DELETE");
        const { error: delErr } = await supabase.from('teacher_subjects').delete().eq('teacher_id', tId).eq('subject_id', sId);
        console.log("DELETE Error:", delErr);
    }
}

main();
