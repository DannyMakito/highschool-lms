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

async function testProfiles() {
    const email = 'principal@school.com'; // We'll test with the principal
    const pin = '123456'; 
    await supabase.auth.signInWithPassword({ email, password: pin });
    
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    console.log("As Principal, visible profiles:", profiles?.length, "Error:", error?.message);
}
testProfiles();
