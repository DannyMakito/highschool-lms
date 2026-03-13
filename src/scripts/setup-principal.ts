
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Manual env loading for script environment
function getEnv(key: string): string {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const match = envContent.match(new RegExp(`${key}=(?:["']?)(.*?)(?:["']?)(?:\r?\n|$)`));
        return match ? match[1] : '';
    } catch (e) {
        return '';
    }
}

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const serviceRoleKey = getEnv('VITE_SUPABASE_SERVICE_ROLE');

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Error: VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE missing from .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function setupPrincipal() {
    const email = 'principal@school.com';
    const password = '123456';
    const fullName = 'Principal Skinner';

    console.log(`🚀 Starting setup for: ${email}...`);

    // 1. Check if user already exists
    const { data: users, error: checkError } = await supabase.auth.admin.listUsers();
    if (checkError) {
        console.error('❌ Error checking users:', checkError.message);
        if (checkError.message.includes('JWT')) {
            console.error('💡 Hint: Your SERVICE_ROLE key is likely invalid or is actually an ANON key.');
        }
        return;
    }

    const existing = users.users.find(u => u.email === email);
    let userId: string;

    if (existing) {
        console.log('ℹ️ User already exists in Auth. Ensuring profile exists...');
        userId = existing.id;
    } else {
        // 2. Create User in Auth
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        });

        if (authError) {
            console.error('❌ Error creating auth user:', authError.message);
            return;
        }
        userId = authUser.user.id;
        console.log(`✅ Auth user created with ID: ${userId}`);
    }

    // 3. Create/Update Profile
    const { error: profileError } = await supabase
        .from('profiles')
        .insert({
            id: userId,
            email: email,
            full_name: fullName,
            role: 'principal'
        })
        .select()
        .single();

    if (profileError && profileError.code !== '23505') { // Ignore unique constraint error
        console.error('❌ Error creating profile:', profileError.message);
    } else {
        console.log('🎉 Principal profile is ready! You can now log in.');
    }
}

setupPrincipal();
