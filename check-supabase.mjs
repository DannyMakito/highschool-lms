
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
const serviceRoleKey = getEnv('VITE_SUPABASE_SERVICE_ROLE');

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkRLS() {
    console.log("Checking RLS policies for 'subjects'...");
    try {
        const { data, error } = await supabase.from('subjects').select('*').limit(1);
        if (error) {
            console.error("Error selecting from subjects:", error);
        } else {
            console.log("Success selecting from subjects. Count:", data.length);
        }

        console.log("Checking Storage buckets...");
        const { data: buckets, error: bError } = await supabase.storage.listBuckets();
        if (bError) {
            console.error("Error listing buckets:", bError);
        } else {
            console.log("Buckets:", buckets.map(b => b.name));
            if (!buckets.find(b => b.name === 'subjects')) {
                console.log("⚠️ Bucket 'subjects' is MISSING!");
            }
        }
    } catch (e) {
        console.error("Caught error:", e);
    }
}

checkRLS();
