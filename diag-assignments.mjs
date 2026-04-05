import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=["']?(.*?)["']?(\r?\n|$)/)[1].trim();
const serviceRoleKey = envContent.match(/ADMIN_SERVICE_ROLE=["']?(.*?)["']?(\r?\n|$)/)[1].trim();

const admin = createClient(supabaseUrl, serviceRoleKey);

async function checkCols() {
    console.log("Fetching column names from information_schema...");
    const { data, error } = await admin.rpc('get_table_columns', { table_name: 'assignments' });
    if (error) {
        // RPC might not exist, try another way
        console.log("RPC failed, trying raw query...");
        const { data: cols, error: err2 } = await admin.from('assignments').select().limit(1);
        // If empty, this won't show anything.
        // Let's try to insert a dummy and see the error.
        console.log("Attempting dry-run insert to see error details...");
        const { error: err3 } = await admin.from('assignments').insert({
             title: 'test',
             description: 'test',
             subject_id: '00000000-0000-0000-0000-000000000000'
        });
        if (err3) {
            console.log("DRY RUN ERROR (This tells us what is missing):", JSON.stringify(err3, null, 2));
        }
    } else {
        console.log("Columns:", data);
    }
}

checkCols().catch(console.error);
