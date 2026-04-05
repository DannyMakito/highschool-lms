import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=["']?(.*?)["']?(\r?\n|$)/)[1].trim();
const serviceRoleKey = envContent.match(/ADMIN_SERVICE_ROLE=["']?(.*?)["']?(\r?\n|$)/)[1].trim();

const admin = createClient(supabaseUrl, serviceRoleKey);

async function checkQuizzes() {
    console.log("Checking quizzes table...");
    const { data, error } = await admin.from('quizzes').select('*').limit(1);
    
    if (error) {
        console.error("Error fetching quizzes:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("No quizzes found in the database.");
    } else {
        console.log("Quiz record keys:", Object.keys(data[0]));
        console.log("Full quiz record:", JSON.stringify(data[0], null, 2));
    }
}

checkQuizzes().catch(console.error);
