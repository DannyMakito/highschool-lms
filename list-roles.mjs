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

async function listRoles() {
    const { data: profiles } = await admin.from('profiles').select('id, role, email, pin');
    console.log("Profiles:");
    profiles.forEach(p => console.log(`${p.email} - ${p.role} - pin: ${p.pin}`));
}
listRoles();
