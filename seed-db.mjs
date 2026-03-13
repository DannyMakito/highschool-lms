import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=["']?(.*?)["']?(?:\r?\n|$)/)[1].trim();
const serviceRoleKey = envContent.match(/ADMIN_SERVICE_ROLE=["']?(.*?)["']?(?:\r?\n|$)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seed() {
  console.log("Checking grades...");
  const { data: grades } = await supabase.from('grades').select('*');
  
  if (!grades || grades.length === 0) {
    console.log("No grades found. Seeding Grades 8-12...");
    const defaultGrades = [
      { name: 'Grade 8', level: 8 },
      { name: 'Grade 9', level: 9 },
      { name: 'Grade 10', level: 10 },
      { name: 'Grade 11', level: 11 },
      { name: 'Grade 12', level: 12 },
    ];
    
    const { error } = await supabase.from('grades').insert(defaultGrades);
    if (error) {
      console.error("Failed to seed grades:", error);
    } else {
      console.log("Successfully seeded grades!");
    }
  } else {
    console.log(`Found ${grades.length} grades. No seeding needed.`);
  }

  // Same for subjects if empty?
  console.log("Checking subjects...");
  const { data: subjects } = await supabase.from('subjects').select('*');
  if (!subjects || subjects.length === 0) {
     console.log("Subjects list is empty! They will need to create some first.");
  } else {
     console.log(`Found ${subjects.length} subjects.`);
  }
}

seed();
