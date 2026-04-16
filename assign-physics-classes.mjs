import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.ADMIN_SERVICE_ROLE || ''
);

function normalize(value) {
  return (value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

async function extractLinesFromPdf(pdfPath) {
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

function parsePhysicsRoster(lines) {
  let grade = null;
  let group = null;
  let subject = null;
  const parsed = [];

  for (const line of lines) {
    const text = line.trim();
    if (!text) continue;

    const gradeMatch = text.match(/GRADE:\s*(\d+)/i);
    if (gradeMatch) grade = gradeMatch[1];

    const groupMatch = text.match(/GROUP:\s*(\d+\s*[A-Z])/i);
    if (groupMatch) group = groupMatch[1].replace(/\s+/g, ' ').trim();

    if (text.includes('PHYSICAL SCIENCES') || text.includes('PHYSICAL SCIENCE')) {
      subject = 'PHYSICAL SCIENCE';
    } else if (text.includes('BUSINESS STUDIES')) {
      subject = 'BUSINESS STUDIES';
    }

    if (subject !== 'PHYSICAL SCIENCE') continue;

    const rowMatch = text.match(/^\d+\s+\S+\s+([^,]+),\s+[^()]*\(([^)]+)\)/);
    if (!rowMatch || !grade || !group) continue;

    const surname = rowMatch[1].trim();
    const preferred = rowMatch[2].trim();
    const fullName = `${surname} ${preferred}`.replace(/\s+/g, ' ').trim();

    parsed.push({
      grade,
      group,
      surname,
      preferred,
      fullName,
      key: normalize(fullName),
      surnameKey: normalize(surname),
      preferredKey: normalize(preferred)
    });
  }

  // unique by grade+group+name
  const dedup = new Map();
  for (const row of parsed) {
    const k = `${row.grade}|${row.group}|${row.key}`;
    if (!dedup.has(k)) dedup.set(k, row);
  }
  return [...dedup.values()];
}

async function run() {
  const lines = await extractLinesFromPdf('c:/Users/ndlal/Downloads/BSTD & PHSC (1).pdf');
  const physicsRows = parsePhysicsRoster(lines);

  const [profilesRes, subjectsRes, subjectClassesRes, ssRes, sscRes] = await Promise.all([
    supabase.from('profiles').select('id,full_name').eq('role', 'student'),
    supabase.from('subjects').select('id,name,grade_tier'),
    supabase.from('subject_classes').select('id,name,subject_id'),
    supabase.from('student_subjects').select('student_id,subject_id'),
    supabase.from('student_subject_classes').select('student_id,subject_class_id')
  ]);

  if (profilesRes.error || subjectsRes.error || subjectClassesRes.error || ssRes.error || sscRes.error) {
    throw profilesRes.error || subjectsRes.error || subjectClassesRes.error || ssRes.error || sscRes.error;
  }

  const profileByName = new Map((profilesRes.data || []).map((p) => [normalize(p.full_name), p.id]));
  const allProfiles = profilesRes.data || [];
  const subjects = subjectsRes.data || [];
  const classes = subjectClassesRes.data || [];
  const existingSS = new Set((ssRes.data || []).map((r) => `${r.student_id}|${r.subject_id}`));
  const existingSSC = new Set((sscRes.data || []).map((r) => `${r.student_id}|${r.subject_class_id}`));

  const physicsSubjectByGrade = new Map();
  for (const subject of subjects) {
    const n = (subject.name || '').toUpperCase();
    if (n.includes('PHYSICAL')) {
      physicsSubjectByGrade.set(`${subject.grade_tier}`, subject.id);
    }
  }

  const classByGradeGroup = new Map();
  for (const c of classes) {
    const s = subjects.find((x) => x.id === c.subject_id);
    if (!s) continue;
    if (!(s.name || '').toUpperCase().includes('PHYSICAL')) continue;
    const g = normalize(c.name).replace(/^(\d+)([A-Z])$/, '$1 $2');
    classByGradeGroup.set(`${s.grade_tier}|${g}`, c.id);
  }

  const ssToInsert = [];
  const sscToInsert = [];
  // Reset existing PHSC class placements first (idempotent and avoids stale wrong links)
  const phscClassIds = classes
    .filter((c) => {
      const s = subjects.find((x) => x.id === c.subject_id);
      return !!s && (s.name || '').toUpperCase().includes('PHYSICAL');
    })
    .map((c) => c.id);
  if (phscClassIds.length > 0) {
    const del = await supabase.from('student_subject_classes').delete().in('subject_class_id', phscClassIds);
    if (del.error) throw del.error;
  }

  const missingUsers = [];
  const missingClass = [];
  const fuzzyMatched = [];

  for (const row of physicsRows) {
    let userId = profileByName.get(row.key);
    if (!userId) {
      // Conservative fuzzy fallback: require surname containment + close edit distance.
      const candidates = allProfiles
        .map((p) => {
          const key = normalize(p.full_name);
          return { id: p.id, full_name: p.full_name, key, score: levenshtein(row.key, key) };
        })
        .filter((c) => c.key.includes(row.surnameKey) && c.score <= 4)
        .sort((a, b) => a.score - b.score);

      if (candidates.length > 0) {
        userId = candidates[0].id;
        fuzzyMatched.push({
          roster: row.fullName,
          matched: candidates[0].full_name,
          score: candidates[0].score
        });
      }
    }

    if (!userId) {
      missingUsers.push(row);
      continue;
    }

    const subjectId = physicsSubjectByGrade.get(row.grade);
    const groupKey = normalize(row.group).replace(/^(\d+)([A-Z])$/, '$1 $2');
    const subjectClassId = classByGradeGroup.get(`${row.grade}|${groupKey}`);

    if (!subjectId || !subjectClassId) {
      missingClass.push(row);
      continue;
    }

    const ssKey = `${userId}|${subjectId}`;
    if (!existingSS.has(ssKey)) {
      ssToInsert.push({ student_id: userId, subject_id: subjectId });
      existingSS.add(ssKey);
    }

    // PHSC class links are fully reset at the start, so always insert exact rebuilt links.
    sscToInsert.push({ student_id: userId, subject_class_id: subjectClassId });
  }

  for (let i = 0; i < ssToInsert.length; i += 200) {
    const chunk = ssToInsert.slice(i, i + 200);
    if (chunk.length === 0) continue;
    const ins = await supabase.from('student_subjects').insert(chunk);
    if (ins.error) throw ins.error;
  }

  for (let i = 0; i < sscToInsert.length; i += 200) {
    const chunk = sscToInsert.slice(i, i + 200);
    if (chunk.length === 0) continue;
    const ins = await supabase.from('student_subject_classes').insert(chunk);
    if (ins.error) throw ins.error;
  }

  const countRes = await supabase
    .from('student_subject_classes')
    .select('id', { count: 'exact', head: true });
  if (countRes.error) throw countRes.error;

  console.log('physics_rows_parsed', physicsRows.length);
  console.log('physics_student_subjects_inserted', ssToInsert.length);
  console.log('physics_student_subject_classes_inserted', sscToInsert.length);
  console.log('missing_users', missingUsers.length);
  console.log('missing_class', missingClass.length);
  console.log('fuzzy_matches_used', fuzzyMatched.length);
  console.log('final_ssc_total', countRes.count);
  if (fuzzyMatched.length) console.log('fuzzy_match_sample', fuzzyMatched.slice(0, 20));
  if (missingUsers.length) console.log('missing_users_sample', missingUsers.slice(0, 20));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
