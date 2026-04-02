import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://scancngsocwuyirydbko.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjYW5jbmdzb2N3dXlpcnlkYmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjQ0MTQsImV4cCI6MjA4ODY0MDQxNH0.hoEnOEx5o4vqFHwIhU93FsQ88gN24sV6PXJICESfuIA';
const adminKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjYW5jbmdzb2N3dXlpcnlkYmtvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA2NDQxNCwiZXhwIjoyMDg4NjQwNDE0fQ.YAjgmR6ThSL_SE-atvu_2KKlHY_CVpjTT9xk1D9xlis';

const admin = createClient(supabaseUrl, adminKey);
const supabase = createClient(supabaseUrl, anonKey);

async function check() {
    // 1. Find a student who has subjects assigned
    const { data: ssData } = await admin.from('student_subjects').select('student_id').limit(1);
    if (!ssData || ssData.length === 0) {
        console.log("No student_subjects found!");
        return;
    }
    const studentId = ssData[0].student_id;
    console.log("Testing with student id:", studentId);

    // 2. Get their profile to get email/pin
    const { data: profile } = await admin.from('profiles').select('*').eq('id', studentId).single();
    if (!profile) {
        console.log("Profile not found for student!");
        return;
    }
    console.log(`Email: ${profile.email}, PIN: ${profile.pin}`);

    // 3. Login
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: profile.pin
    });
    if (authErr) {
        console.error("Login failed:", authErr);
        return;
    }
    console.log("Logged in successfully. Attempting to fetch data just like useRegistrationData...");

    // 4. Fetch all the data useRegistrationData fetches
    const gradesRes = await supabase.from('grades').select('*');
    const rcRes = await supabase.from('register_classes').select('*');
    const scRes = await supabase.from('subject_classes').select('*');
    const studentsRes = await supabase.from('students').select('*, profiles(*)');
    const ssRes = await supabase.from('student_subjects').select('*');
    const sscRes = await supabase.from('student_subject_classes').select('*');

    console.log("Grades:", gradesRes.data?.length, gradesRes.error?.message || "OK");
    console.log("RCs:", rcRes.data?.length, rcRes.error?.message || "OK");
    console.log("SCs:", scRes.data?.length, scRes.error?.message || "OK");
    console.log("Students:", studentsRes.data?.length, studentsRes.error?.message || "OK");
    console.log("StudentSubjects:", ssRes.data?.length, ssRes.error?.message || "OK");
    console.log("StudentSubjectClasses:", sscRes.data?.length, sscRes.error?.message || "OK");

    // Also check useSubjects fetch
    const subjectsRes = await supabase.from('subjects').select('*');
    console.log("Subjects:", subjectsRes.data?.length, subjectsRes.error?.message || "OK");

    const topicsRes = await supabase.from('topics').select('*');
    console.log("Topics:", topicsRes.data?.length, topicsRes.error?.message || "OK");

    const lessonsRes = await supabase.from('lessons').select('*');
    console.log("Lessons:", lessonsRes.data?.length, lessonsRes.error?.message || "OK");

}

check().catch(console.error);
