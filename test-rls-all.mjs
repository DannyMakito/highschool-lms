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
const anonKey = getEnv('VITE_SUPABASE_KEY');
const adminKey = getEnv('ADMIN_SERVICE_ROLE');

const admin = createClient(supabaseUrl, adminKey);

async function runTest() {
    const { data: profiles } = await admin.from('profiles').select('*');
    const principal = profiles.find(p => p.role === 'principal');
    const teacher = profiles.find(p => p.role === 'teacher');
    const student = profiles.find(p => p.role === 'student');

    const roles = [
        { name: 'Principal', profile: principal },
        { name: 'Teacher', profile: teacher },
        { name: 'Student', profile: student }
    ];

    for (const role of roles) {
        console.log(`\n--- Testing Role: ${role.name} (${role.profile?.email}) ---`);
        if (!role.profile) { console.log("No profile found for this role!"); continue; }
        
        const supabase = createClient(supabaseUrl, anonKey);
        await supabase.auth.signInWithPassword({ email: role.profile.email, password: role.profile.pin });

        const queries = [
            { table: 'subjects', select: '*' },
            { table: 'subject_classes', select: '*' },
            { table: 'student_subject_classes', select: '*' },
            { table: 'student_subjects', select: '*' }
        ];

        for (const q of queries) {
            const { data, error } = await supabase.from(q.table).select(q.select);
            console.log(`Table '${q.table}': ${data?.length || 0} rows. Error: ${error?.message || 'None'}`);
        }
    }
}

runTest().catch(console.error);
