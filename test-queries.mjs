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

const supabase = createClient(supabaseUrl, anonKey);
const admin = createClient(supabaseUrl, adminKey);

async function testQuery() {
    // Get the single SSC record
    const { data: sscAdmin } = await admin.from('student_subject_classes').select('*').limit(1);
    if (sscAdmin.length === 0) { console.log("No SSC records"); return; }
    
    const ssc = sscAdmin[0];
    const { data: scAdmin } = await admin.from('subject_classes').select('*').eq('id', ssc.subject_class_id).single();
    
    if (!scAdmin) { console.log("No SC found for SSC record"); return; }
    const teacherId = scAdmin.teacher_id;
    
    const { data: teacherProfile } = await admin.from('profiles').select('*').eq('id', teacherId).single();
    console.log("Teacher for this SSC is:", teacherProfile.email, "Pin:", teacherProfile.pin);
    
    await supabase.auth.signInWithPassword({ email: teacherProfile.email, password: teacherProfile.pin });
    
    const scRes = await supabase.from('subject_classes').select('*');
    console.log("Teacher sees Subject Classes:", scRes.data?.length || 0, "Error:", scRes.error?.message);

    const sscRes = await supabase.from('student_subject_classes').select('*');
    console.log("Teacher sees SSCs (Enrollments):", sscRes.data?.length || 0, "Error:", sscRes.error?.message);

    const joinedRes = await supabase.from('student_subject_classes').select('*, subject_classes!inner(*)').eq('subject_classes.teacher_id', teacherId);
    console.log("Teacher sees Joined SSCs:", joinedRes.data?.length || 0, "Error:", joinedRes.error?.message);

    const ssRes = await supabase.from('student_subjects').select('*');
    console.log("Teacher sees Student Subjects:", ssRes.data?.length || 0, "Error:", ssRes.error?.message);

    if (scRes.data && scRes.data.length > 0) {
        const firstScId = scRes.data[0].id;
        const filteredSscRes = await supabase.from('student_subject_classes').select('*').eq('subject_class_id', firstScId);
        console.log(`Teacher sees SSCs for THEIR class (${firstScId}):`, filteredSscRes.data?.length || 0, "Error:", filteredSscRes.error?.message);

        const studentsInClassRes = await supabase.from('students').select('*, student_subject_classes!inner(*)').eq('student_subject_classes.subject_class_id', firstScId);
        console.log(`Teacher sees Students in THEIR class (${firstScId}) via Join:`, studentsInClassRes.data?.length || 0, "Error:", studentsInClassRes.error?.message);

        const scWithSscRes = await supabase.from('subject_classes').select('*, student_subject_classes(*)').eq('id', firstScId);
        console.log(`Teacher sees Subject Class with enrollments (${firstScId}):`, scWithSscRes.data?.[0]?.student_subject_classes?.length || 0, "Error:", scWithSscRes.error?.message);
    }
    const studentsRes = await supabase.from('students').select('*, profiles(*)');
    console.log("Teacher sees Student Count:", studentsRes.data?.length || 0);
    if (studentsRes.data) {
        studentsRes.data.forEach(s => console.log(` - Student: ${s.profiles?.full_name} (${s.id}) Grade: ${s.grade_id}`));
    }

    console.log("\n--- Checking as Principal ---");
    const { data: principals } = await admin.from('profiles').select('*').eq('role', 'principal').limit(1);
    if (!principals || principals.length === 0) { console.log("No principals!"); return; }
    const p = principals[0];
    await supabase.auth.signInWithPassword({ email: p.email, password: p.pin });
    const pSscRes = await supabase.from('student_subject_classes').select('*');
    console.log("Principal sees SSC Count:", pSscRes.data?.length || 0);
}
testQuery();
