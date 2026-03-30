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
const admin = createClient(supabaseUrl, serviceRoleKey);

async function checkSsc() {
    const { data: ssc } = await admin.from('student_subject_classes').select('*');
    console.log("student_subject_classes:", ssc?.length || 0);
    const { data: sc } = await admin.from('subject_classes').select('*');
    console.log("subject_classes:", sc?.length || 0);
    if (ssc?.length > 0) {
        console.log(ssc[0]);
    }
}
checkSsc();
