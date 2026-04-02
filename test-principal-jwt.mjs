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
const anonKey = getEnv('VITE_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, anonKey);

// TEST: Principal login
async function testPrincipalRole() {
    console.log('Testing Principal Role Setup...\n');

    // Use the principal credentials from your README
    const { data: { user, session }, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'principal@school.com',
        password: '123456'
    });

    if (authErr) {
        console.error('❌ Login failed:', authErr.message);
        return;
    }

    console.log('✓ Logged in as:', user?.email);
    console.log('\n--- JWT Claims ---');
    
    if (session?.access_token) {
        // Decode JWT to see claims
        const parts = session.access_token.split('.');
        if (parts.length === 3) {
            try {
                const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                console.log(JSON.stringify(decoded, null, 2));
                
                console.log('\n--- Check: ---');
                console.log('✓ aud:', decoded.aud);
                console.log('✓ app_metadata:', decoded.app_metadata);
                console.log('✓ user_metadata:', decoded.user_metadata);
                
                if (decoded.app_metadata?.role === 'principal') {
                    console.log('\n✅ Principal role is SET in JWT!');
                } else {
                    console.log('\n❌ Principal role NOT in JWT app_metadata');
                    console.log('   You need to set app_metadata.role = "principal" for this user');
                }
            } catch (e) {
                console.error('Failed to decode JWT:', e.message);
            }
        }
    }

    // Check profiles table
    console.log('\n--- Checking Profiles Table ---');
    const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, role, full_name, email')
        .eq('id', user?.id)
        .single();

    if (profileErr) {
        console.error('❌ Profile query failed:', profileErr.message);
    } else {
        console.log('✓ Profile found:', profile);
    }
}

testPrincipalRole().catch(console.error);
