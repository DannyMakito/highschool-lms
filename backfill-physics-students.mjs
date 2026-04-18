import fs from 'fs';
import { randomInt } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.ADMIN_SERVICE_ROLE || ''
);

function generateStudentPin() {
  return randomInt(100000, 1000000).toString();
}

function digits(value) {
  return (value || '').replace(/\D/g, '');
}

function normalize(value) {
  return (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function extractLines(pdfPath) {
  const buffer = fs.readFileSync(pdfPath);
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  const lines = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const text = await page.getTextContent();
    const rows = new Map();

    for (const item of text.items) {
      const y = Math.round(item.transform[5]);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push({ x: item.transform[4], str: item.str });
    }

    const ordered = [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, tokens]) => tokens.sort((a, b) => a.x - b.x).map((t) => t.str).join(' ').trim())
      .filter(Boolean);

    lines.push(...ordered, '');
  }
  return lines;
}

function parsePhysicsStudents(lines) {
  let grade = null;
  let group = null;
  let subject = null;
  const rows = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    const gradeMatch = t.match(/GRADE:\s*(\d+)/i);
    if (gradeMatch) grade = gradeMatch[1];

    const groupMatch = t.match(/GROUP:\s*(\d+\s*[A-Z])/i);
    if (groupMatch) group = groupMatch[1].replace(/\s+/g, ' ').trim();

    if (t.includes('PHYSICAL SCIENCES') || t.includes('PHYSICAL SCIENCE')) subject = 'PHYSICAL';
    else if (t.includes('BUSINESS STUDIES')) subject = 'BUSINESS';

    if (subject !== 'PHYSICAL') continue;

    if (!/^\d+\s+\S+\s+/.test(t)) continue;
    const parts = t.split(/\s+/);
    if (parts.length < 8) continue;

    const admnr = digits(parts[1]);
    const lurits = digits(parts[7] || '');
    const studentId = lurits && lurits.length >= 8 ? lurits : admnr;
    const gender = (parts[5] || '').toUpperCase();
    if (!studentId || !['M', 'F'].includes(gender) || !grade || !group) continue;

    const nameMatch = t.match(/^\d+\s+\S+\s+([^,]+),\s+[^()]*\(([^)]+)\)/);
    if (!nameMatch) continue;
    const surname = nameMatch[1].trim();
    const preferred = nameMatch[2].trim();
    const fullName = `${surname} ${preferred}`.replace(/\s+/g, ' ').trim();

    rows.push({
      studentId,
      admnr,
      grade,
      group,
      gender,
      fullName,
      nameKey: normalize(fullName)
    });
  }

  const dedup = new Map();
  for (const row of rows) {
    if (!dedup.has(row.studentId)) dedup.set(row.studentId, row);
  }
  return [...dedup.values()];
}

async function listAllUsersByEmail() {
  const map = new Map();
  const perPage = 1000;
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    for (const user of users) {
      if (user.email) map.set(user.email, user.id);
    }
    if (users.length < perPage) break;
    page += 1;
  }
  return map;
}

async function run() {
  const lines = await extractLines('c:/Users/ndlal/Downloads/BSTD & PHSC (1).pdf');
  const physics = parsePhysicsStudents(lines);

  const [gradesRes, rcRes, profilesRes] = await Promise.all([
    supabase.from('grades').select('id,level'),
    supabase.from('register_classes').select('id,name,grade_id'),
    supabase.from('profiles').select('id,email').eq('role', 'student')
  ]);
  if (gradesRes.error || rcRes.error || profilesRes.error) {
    throw gradesRes.error || rcRes.error || profilesRes.error;
  }

  const gradeByLevel = new Map((gradesRes.data || []).map((g) => [`${g.level}`, g.id]));
  const registerMap = new Map((rcRes.data || []).map((r) => [`${r.grade_id}|${r.name.toUpperCase()}`, r.id]));
  const profileByEmail = new Map((profilesRes.data || []).map((p) => [p.email, p.id]));
  const authByEmail = await listAllUsersByEmail();

  let createdRegister = 0;
  let createdAuth = 0;
  let createdProfiles = 0;
  let createdStudents = 0;

  for (const row of physics) {
    const gradeId = gradeByLevel.get(row.grade);
    if (!gradeId) continue;

    const rcName = row.group.toUpperCase();
    const rcKey = `${gradeId}|${rcName}`;
    let registerId = registerMap.get(rcKey);
    if (!registerId) {
      const rcInsert = await supabase
        .from('register_classes')
        .insert({ name: rcName, grade_id: gradeId, class_teacher_id: null, max_students: 50 })
        .select('id')
        .single();
      if (rcInsert.error) throw rcInsert.error;
      registerId = rcInsert.data.id;
      registerMap.set(rcKey, registerId);
      createdRegister += 1;
    }

    const email = `${row.studentId}@glenbrack.edu`;
    const pin = generateStudentPin();
    let userId = authByEmail.get(email) || profileByEmail.get(email);

    if (!userId) {
      const created = await supabase.auth.admin.createUser({
        email,
        password: pin,
        email_confirm: true,
        user_metadata: { full_name: row.fullName, role: 'student' }
      });
      if (created.error) {
        // skip impossible duplicates safely
        continue;
      }
      userId = created.data.user.id;
      authByEmail.set(email, userId);
      createdAuth += 1;
    }

    const existingProfile = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (existingProfile.error) throw existingProfile.error;
    if (!existingProfile.data) {
      const p = await supabase.from('profiles').insert({
        id: userId,
        email,
        full_name: row.fullName,
        role: 'student',
        pin
      });
      if (p.error) throw p.error;
      createdProfiles += 1;
    }

    const existingStudent = await supabase.from('students').select('id').eq('id', userId).maybeSingle();
    if (existingStudent.error) throw existingStudent.error;
    if (!existingStudent.data) {
      const administrationNumber = row.studentId;
      const s = await supabase.from('students').insert({
        id: userId,
        administration_number: administrationNumber,
        gender: row.gender,
        admission_year: '2026',
        grade_id: gradeId,
        register_class_id: registerId,
        status: 'active'
      });
      if (s.error) throw s.error;
      createdStudents += 1;
    }
  }

  console.log('physics_rows_unique', physics.length);
  console.log('created_register_classes', createdRegister);
  console.log('created_auth_users', createdAuth);
  console.log('created_profiles', createdProfiles);
  console.log('created_students', createdStudents);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
