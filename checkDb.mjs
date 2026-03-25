import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://scancngsocwuyirydbko.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjYW5jbmdzb2N3dXlpcnlkYmtvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA2NDQxNCwiZXhwIjoyMDg4NjQwNDE0fQ.YAjgmR6ThSL_SE-atvu_2KKlHY_CVpjTT9xk1D9xlis';

const admin = createClient(supabaseUrl, serviceRoleKey);

async function check() {
    const { data: students, error: err1 } = await admin.from('students').select('*');
    console.log("Students:", students?.length);

    const { data: profiles, error: err2 } = await admin.from('profiles').select('*').eq('role', 'student');
    console.log("Profiles (students):", profiles?.length);
    if(profiles?.length > 0) {
        console.log("Example profile:", profiles[0]);
    }

    const { data: ss, error: err3 } = await admin.from('student_subjects').select('*');
    console.log("student_subjects:", ss?.length);
    if(ss?.length > 0) {
        console.log("Example ss:", ss[0]);
    }
}

check().catch(console.error);
