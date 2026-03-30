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

  // Seed canonical subjects if empty
  console.log("Checking subjects...");
  const { data: subjects } = await supabase.from('subjects').select('*');
  if (!subjects || subjects.length === 0) {
    console.log("No subjects found. Seeding canonical subjects...");
    const canonicalSubjects = [
      { name: "Mathematics", description: "Core mathematics curriculum", grade_tier: "8", category: "core", access_type: "Free", thumbnail: "" },
      { name: "Mathematics", description: "Core mathematics curriculum", grade_tier: "9", category: "core", access_type: "Free", thumbnail: "" },
      { name: "Mathematics", description: "Core mathematics curriculum", grade_tier: "10", category: "core", access_type: "Free", thumbnail: "" },
      { name: "Mathematics", description: "Core mathematics curriculum", grade_tier: "11", category: "core", access_type: "Free", thumbnail: "" },
      { name: "Mathematics", description: "Core mathematics curriculum", grade_tier: "12", category: "core", access_type: "Free", thumbnail: "" },
      { name: "English", description: "Language and literature", grade_tier: "8", category: "core", access_type: "Free", thumbnail: "" },
      { name: "English", description: "Language and literature", grade_tier: "9", category: "core", access_type: "Free", thumbnail: "" },
      { name: "English", description: "Language and literature", grade_tier: "10", category: "core", access_type: "Free", thumbnail: "" },
      { name: "English", description: "Language and literature", grade_tier: "11", category: "core", access_type: "Free", thumbnail: "" },
      { name: "English", description: "Language and literature", grade_tier: "12", category: "core", access_type: "Free", thumbnail: "" },
      { name: "Physical Sciences", description: "Physics and Chemistry", grade_tier: "10", category: "core", access_type: "Free", thumbnail: "" },
      { name: "Physical Sciences", description: "Physics and Chemistry", grade_tier: "11", category: "core", access_type: "Free", thumbnail: "" },
      { name: "Physical Sciences", description: "Physics and Chemistry", grade_tier: "12", category: "core", access_type: "Free", thumbnail: "" },
      { name: "Life Sciences", description: "Biology", grade_tier: "10", category: "core", access_type: "Free", thumbnail: "" },
      { name: "Life Sciences", description: "Biology", grade_tier: "11", category: "core", access_type: "Free", thumbnail: "" },
      { name: "Life Sciences", description: "Biology", grade_tier: "12", category: "core", access_type: "Free", thumbnail: "" },
    ];
    const { error: subErr } = await supabase.from('subjects').insert(canonicalSubjects);
    if (subErr) {
      console.error("Failed to seed subjects:", subErr);
    } else {
      console.log(`Successfully seeded ${canonicalSubjects.length} subjects!`);
    }
  } else {
    console.log(`Found ${subjects.length} subjects. No seeding needed.`);
  }
}

seed();
