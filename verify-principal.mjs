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

async function testFunction() {
    const { data: profiles } = await admin.from('profiles').select('*').eq('role', 'principal').limit(1);
    const p = profiles[0];
    const supabase = createClient(supabaseUrl, anonKey);
    await supabase.auth.signInWithPassword({ email: p.email, password: p.pin });

    // Try a simple RPC call to a custom function if it exists, 
    // but here we just check if it returns data from a table we know has it using the policy
    console.log("Testing as Principal:", p.email);
    
    // We want to see if check_role('principal') works. 
    // We can test it by seeing if a query on subject_classes works if they run as principal.
    const { data: sc, error } = await supabase.from('subject_classes').select('*');
    console.log("Results for subject_classes:", sc?.length, "Error:", error?.message);
    
    // Check what the admin sees
    const { data: scAdmin } = await admin.from('subject_classes').select('*');
    console.log("Admin sees total subject_classes:", scAdmin?.length);
    if (scAdmin.length > 0) {
        console.log("Sample SC:", scAdmin[0]);
    }
}
testFunction();
