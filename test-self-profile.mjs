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

const supabase = createClient(supabaseUrl, anonKey);

async function testSelfProfile() {
    const email = 'sarah@school.com';
    const pin = '123456'; 
    await supabase.auth.signInWithPassword({ email, password: pin });
    
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('email', email).single();
    console.log("Self profile:", profile?.email, "Role:", profile?.role, "Error:", error?.message);
}
testSelfProfile();
