import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.ADMIN_SERVICE_ROLE || ''
);

function sanitize(value) {
  return (value || '').replace(/\D/g, '');
}

async function extractRawData() {
  const pdfPath = 'c:/Users/ndlal/Downloads/BSTD & PHSC (1).pdf';
  const pdfBuffer = fs.readFileSync(pdfPath);
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
  const pdf = await loadingTask.promise;

  const lines = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageLines = new Map();

    for (const item of textContent.items) {
      // OCR PDFs still keep y-position; group by row and then join tokens.
      const y = Math.round(item.transform[5]);
      if (!pageLines.has(y)) pageLines.set(y, []);
      pageLines.get(y).push({ x: item.transform[4], text: item.str });
    }

    const orderedRows = [...pageLines.entries()]
      .sort((a, b) => b[0] - a[0]) // PDF coordinate origin is bottom-left
      .map(([, tokens]) => tokens.sort((a, b) => a.x - b.x).map((t) => t.text).join(' ').trim())
      .filter(Boolean);

    lines.push(...orderedRows, '');
  }

  return lines.join('\n');
}

function parseRosterRows(rawData) {
  const lines = rawData.split('\n');
  let grade = null;
  let group = null;
  let subject = null;
  const rows = [];

  for (const line of lines) {
    const t = line.trim();
    const gradeMatch = t.match(/GRADE:\s*(\d+)/i);
    if (gradeMatch) grade = gradeMatch[1].trim();

    const groupMatch = t.match(/GROUP:\s*(\d+\s*[A-Z])/i);
    if (groupMatch) group = groupMatch[1].replace(/\s+/g, ' ').trim();

    if (t.includes('BUSINESS STUDIES')) {
      subject = 'BUSINESS STUDIES';
    }
    if (t.includes('PHYSICAL SCIENCES') || t.includes('PHYSICAL SCIENCE')) {
      subject = 'PHYSICAL SCIENCE';
    }

    if (!/^\d+\s+\d+[^\s]*\s+[A-Za-z]/.test(t)) continue;

    const parts = t.split(/\s+/);
    const admnr = sanitize(parts[1]);
    const lurits = sanitize(parts[7] || '');
    const studentId = lurits && lurits.length >= 8 ? lurits : admnr;
    const gender = (parts[5] || '').toUpperCase();
    if (!studentId || !grade || !group || !subject) continue;
    if (!['M', 'F'].includes(gender)) continue;

    rows.push({ studentId, grade, group, subject });
  }

  const dedup = new Map();
  for (const row of rows) {
    const key = `${row.studentId}|${row.grade}|${row.subject}`;
    if (!dedup.has(key)) dedup.set(key, row);
  }
  return [...dedup.values()];
}

function normalizeClass(value) {
  return (value || '').toUpperCase().replace(/\s+/g, '').replace(/-/g, '');
}

function getSubjectKey(subjectName, gradeTier) {
  const upper = (subjectName || '').toUpperCase();
  if (upper.includes('BUSINESS')) return `BUSINESS STUDIES|${gradeTier}`;
  if (upper.includes('PHYSICAL')) return `PHYSICAL SCIENCE|${gradeTier}`;
  return null;
}

async function assignSubjectClasses() {
  const rawData = await extractRawData();
  const parsedRows = parseRosterRows(rawData);

  const [profilesRes, subjectsRes, subjectClassesRes, studentSubjectsRes] = await Promise.all([
    supabase.from('profiles').select('id,email').eq('role', 'student'),
    supabase.from('subjects').select('id,name,grade_tier'),
    supabase.from('subject_classes').select('id,name,subject_id'),
    supabase.from('student_subjects').select('id,student_id,subject_id')
  ]);

  if (profilesRes.error || subjectsRes.error || subjectClassesRes.error || studentSubjectsRes.error) {
    throw profilesRes.error || subjectsRes.error || subjectClassesRes.error || studentSubjectsRes.error;
  }

  const profiles = profilesRes.data || [];
  const subjects = subjectsRes.data || [];
  const subjectClasses = subjectClassesRes.data || [];
  const existingStudentSubjects = new Set((studentSubjectsRes.data || []).map((x) => `${x.student_id}|${x.subject_id}`));

  const emailToUserId = new Map(profiles.map((p) => [p.email, p.id]));

  const subjectByKey = new Map();
  for (const subject of subjects) {
    const key = getSubjectKey(subject.name, subject.grade_tier);
    if (key) subjectByKey.set(key, subject.id);
  }

  const classByKey = new Map();
  for (const subjectClass of subjectClasses) {
    const subject = subjects.find((s) => s.id === subjectClass.subject_id);
    if (!subject) continue;
    const base = getSubjectKey(subject.name, subject.grade_tier);
    if (!base) continue;
    const key = `${base}|${normalizeClass(subjectClass.name)}`;
    classByKey.set(key, subjectClass.id);
  }

  const targetUserIds = [];
  const studentSubjectsToInsert = [];
  const studentSubjectClassesToInsert = [];
  const missing = [];

  for (const row of parsedRows) {
    const userId = emailToUserId.get(`${row.studentId}@glenbrack.edu`);
    const subjectId = subjectByKey.get(`${row.subject}|${row.grade}`);
    const subjectClassId = classByKey.get(`${row.subject}|${row.grade}|${normalizeClass(row.group)}`);

    if (!userId || !subjectId || !subjectClassId) {
      missing.push({ ...row, hasUser: !!userId, hasSubject: !!subjectId, hasClass: !!subjectClassId });
      continue;
    }

    targetUserIds.push(userId);

    const ssKey = `${userId}|${subjectId}`;
    if (!existingStudentSubjects.has(ssKey)) {
      studentSubjectsToInsert.push({ student_id: userId, subject_id: subjectId });
      existingStudentSubjects.add(ssKey);
    }

    studentSubjectClassesToInsert.push({ student_id: userId, subject_class_id: subjectClassId });
  }

  const uniqueTargetUserIds = [...new Set(targetUserIds)];
  if (uniqueTargetUserIds.length > 0) {
    const delRes = await supabase.from('student_subject_classes').delete().in('student_id', uniqueTargetUserIds);
    if (delRes.error) throw delRes.error;
  }

  for (let i = 0; i < studentSubjectsToInsert.length; i += 200) {
    const chunk = studentSubjectsToInsert.slice(i, i + 200);
    if (chunk.length === 0) continue;
    const insRes = await supabase.from('student_subjects').insert(chunk);
    if (insRes.error) throw insRes.error;
  }

  for (let i = 0; i < studentSubjectClassesToInsert.length; i += 200) {
    const chunk = studentSubjectClassesToInsert.slice(i, i + 200);
    if (chunk.length === 0) continue;
    const insRes = await supabase.from('student_subject_classes').insert(chunk);
    if (insRes.error) throw insRes.error;
  }

  const finalCountRes = await supabase.from('student_subject_classes').select('id', { count: 'exact', head: true });
  if (finalCountRes.error) throw finalCountRes.error;

  console.log('parsed_rows', parsedRows.length);
  console.log('target_students', uniqueTargetUserIds.length);
  console.log('inserted_student_subjects', studentSubjectsToInsert.length);
  console.log('inserted_student_subject_classes', studentSubjectClassesToInsert.length);
  console.log('missing_mappings', missing.length);
  console.log('final_student_subject_classes_count', finalCountRes.count);
  if (missing.length > 0) {
    console.log('missing_sample', missing.slice(0, 15));
  }
}

assignSubjectClasses().catch((error) => {
  console.error(error);
  process.exit(1);
});
