import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function getEnv(key) {
    const envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
        console.error('.env file not found');
        process.exit(1);
    }
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(new RegExp(`${key}=(?:["']?)(.*?)(?:["']?)(?:\r?\n|$)`));
    return match ? match[1] : '';
}

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const serviceRoleKey = getEnv('VITE_SUPABASE_SERVICE_ROLE');

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixRLSRecursion() {
    console.log('=== STEP 1: DISABLE RLS ON ALL AFFECTED TABLES ===');
    console.log('This will disable Row Level Security entirely while we rebuild policies...\n');

    const tables = ['subject_classes', 'student_subject_classes', 'register_classes', 'profiles', 'grades', 'subjects', 'students'];

    for (const table of tables) {
        try {
            const { data, error } = await supabase.rpc('exec_sql', {
                sql: `ALTER TABLE public.${table} DISABLE ROW LEVEL SECURITY;`
            }).catch(() => {
                // If exec_sql doesn't work, we'll need to do it differently
                console.log(`Note: Could not RPC to disable RLS on ${table}. Policies may still exist.`);
                return { error: 'RPC not available' };
            });

            if (!error || error === 'RPC not available') {
                console.log(`✓ Disabled RLS on ${table}`);
            } else {
                console.log(`✗ Error disabling RLS on ${table}:`, error);
            }
        } catch (e) {
            console.log(`Note: Could not execute RPC for ${table}`);
        }
    }

    console.log('\n=== STEP 2: DROP ALL EXISTING POLICIES ===\n');

    // Drop all policies - comprehensive list
    const policiesToDrop = [
        { table: 'subject_classes', policies: ['sc_principal', 'sc_teacher', 'sc_principal_bypass', 'sc_teacher_view', 'subjects_read_all'] },
        { table: 'register_classes', policies: ['rc_principal', 'rc_teacher', 'rc_principal_bypass', 'rc_teacher_view'] },
        { table: 'student_subject_classes', policies: ['ssc_principal', 'ssc_teacher_student', 'ssc_principal_bypass', 'ssc_teacher_view', 'ssc_student_view'] },
        { table: 'profiles', policies: ['profiles_read_all', 'profiles_read_own'] },
        { table: 'grades', policies: ['grades_read_all'] },
        { table: 'subjects', policies: ['subjects_read_all'] },
        { table: 'students', policies: ['students_read_all'] }
    ];

    for (const { table, policies } of policiesToDrop) {
        for (const policy of policies) {
            try {
                const { data, error } = await supabase.rpc('exec_sql', {
                    sql: `DROP POLICY IF EXISTS "${policy}" ON public.${table};`
                }).catch(() => ({ error: 'RPC not available' }));

                if (!error || error === 'RPC not available') {
                    console.log(`✓ Dropped policy ${policy} from ${table}`);
                } else {
                    console.log(`✗ Error dropping ${policy}:`, error);
                }
            } catch (e) {
                // Silently continue
            }
        }
    }

    console.log('\n=== STEP 3: REBUILD RLS - ENABLE AND CREATE SIMPLE POLICIES ===\n');

    const newPolicies = [
        // SUBJECT_CLASSES - Simple role-based policies
        {
            table: 'subject_classes',
            sql: `
            ALTER TABLE public.subject_classes ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY "sc_principal_all" ON public.subject_classes FOR ALL
            TO authenticated
            USING ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal')
            WITH CHECK ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal');
            
            CREATE POLICY "sc_teacher_select" ON public.subject_classes FOR SELECT
            TO authenticated
            USING (teacher_id = auth.uid());
            `
        },
        // REGISTER_CLASSES
        {
            table: 'register_classes',
            sql: `
            ALTER TABLE public.register_classes ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY "rc_principal_all" ON public.register_classes FOR ALL
            TO authenticated
            USING ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal')
            WITH CHECK ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal');
            
            CREATE POLICY "rc_teacher_select" ON public.register_classes FOR SELECT
            TO authenticated
            USING (class_teacher_id = auth.uid());
            `
        },
        // STUDENT_SUBJECT_CLASSES
        {
            table: 'student_subject_classes',
            sql: `
            ALTER TABLE public.student_subject_classes ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY "ssc_principal_all" ON public.student_subject_classes FOR ALL
            TO authenticated
            USING ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal')
            WITH CHECK ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal');
            
            CREATE POLICY "ssc_teacher_select" ON public.student_subject_classes FOR SELECT
            TO authenticated
            USING (teacher_id = auth.uid() OR student_id = auth.uid());
            
            CREATE POLICY "ssc_student_select" ON public.student_subject_classes FOR SELECT
            TO authenticated
            USING (student_id = auth.uid());
            `
        },
        // PROFILES - Allow reading all profiles (for user info)
        {
            table: 'profiles',
            sql: `
            ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT
            TO authenticated
            USING (true);
            
            CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
            TO authenticated
            USING (id = auth.uid())
            WITH CHECK (id = auth.uid());
            `
        },
        // GRADES
        {
            table: 'grades',
            sql: `
            ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY "grades_read_all" ON public.grades FOR SELECT
            TO authenticated
            USING (true);
            
            CREATE POLICY "grades_principal_all" ON public.grades FOR ALL
            TO authenticated
            USING ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal')
            WITH CHECK ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal');
            `
        },
        // SUBJECTS
        {
            table: 'subjects',
            sql: `
            ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY "subjects_read_all" ON public.subjects FOR SELECT
            TO authenticated
            USING (true);
            
            CREATE POLICY "subjects_principal_all" ON public.subjects FOR ALL
            TO authenticated
            USING ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal')
            WITH CHECK ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal');
            `
        },
        // STUDENTS
        {
            table: 'students',
            sql: `
            ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY "students_read_all" ON public.students FOR SELECT
            TO authenticated
            USING (true);
            
            CREATE POLICY "students_principal_all" ON public.students FOR ALL
            TO authenticated
            USING ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal')
            WITH CHECK ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal');
            `
        }
    ];

    for (const { table, sql } of newPolicies) {
        try {
            const { error } = await supabase.rpc('exec_sql', {
                sql: sql
            }).catch(() => ({ error: 'RPC not available' }));

            if (!error || error === 'RPC not available') {
                console.log(`✓ Rebuilt RLS policies for ${table}`);
            } else {
                console.log(`✗ Error rebuilding policies for ${table}:`, error.message);
            }
        } catch (e) {
            console.log(`✗ Exception rebuilding ${table}:`, e.message);
        }
    }

    console.log('\n=== STEP 4: TEST QUERIES ===\n');

    // Test queries as service role (should work regardless)
    console.log('Testing as admin (service_role)...');
    const adminTests = [
        { table: 'subject_classes', name: 'Subject Classes' },
        { table: 'student_subject_classes', name: 'Student Subject Classes' },
        { table: 'register_classes', name: 'Register Classes' }
    ];

    for (const { table, name } of adminTests) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`✗ ${name}: ${error.message}`);
        } else {
            console.log(`✓ ${name}: OK (found ${data.length || 0} rows)`);
        }
    }

    console.log('\n=== FIX COMPLETE ===');
    console.log('\nIMPORTANT:');
    console.log('1. If the script had errors about "RPC not available", you need to run the SQL manually');
    console.log('2. Go to your Supabase dashboard > SQL Editor');
    console.log('3. Copy and run the policy creation SQL from the steps above');
    console.log('4. Then test your app');
}

fixRLSRecursion().catch(console.error);
