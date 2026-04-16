import { createClient } from '@supabase/supabase-js';
import { randomInt } from 'crypto';
import fs from 'fs';
import path from 'path';

function getEnv(key) {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return process.env[key] || '';
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(new RegExp(`${key}=(?:["']?)(.*?)(?:["']?)(?:\r?\n|$)`));
  return match ? match[1] : process.env[key] || '';
}

function escapeCsv(value) {
  return `"${`${value || ''}`.replace(/"/g, '""')}"`;
}

function generateUniquePin(usedPins) {
  let pin = '';
  do {
    pin = randomInt(100000, 1000000).toString();
  } while (usedPins.has(pin));
  usedPins.add(pin);
  return pin;
}

function deriveStudentNumber(studentRow, profile) {
  const fromAdminNumber = `${studentRow?.administration_number || ''}`.replace(/\D/g, '');
  if (fromAdminNumber) return fromAdminNumber;

  const email = profile?.email || '';
  const match = email.match(/^(?:student-)?(\d+)@glenbrack\.edu$/i);
  return match ? match[1] : '';
}

async function listAllAuthUsers(supabase) {
  const users = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const batch = data?.users || [];
    users.push(...batch);

    if (batch.length < perPage) break;
    page += 1;
  }

  return users;
}

async function main() {
  const supabaseUrl = getEnv('VITE_SUPABASE_URL');
  const serviceRoleKey = getEnv('ADMIN_SERVICE_ROLE') || getEnv('VITE_SUPABASE_SERVICE_ROLE');
  const dryRun = (process.env.DRY_RUN ?? 'true').toLowerCase() !== 'false';
  const outPath = path.resolve(process.cwd(), `student-auth-reset-${new Date().toISOString().slice(0, 10)}.csv`);

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables. Set VITE_SUPABASE_URL and ADMIN_SERVICE_ROLE.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const [profilesRes, studentsRes, authUsers] = await Promise.all([
    supabase.from('profiles').select('id,email,full_name,role,pin').eq('role', 'student'),
    supabase.from('students').select('id,administration_number'),
    listAllAuthUsers(supabase)
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (studentsRes.error) throw studentsRes.error;

  const profiles = profilesRes.data || [];
  const students = studentsRes.data || [];
  const studentById = new Map(students.map((row) => [row.id, row]));
  const authById = new Map(authUsers.map((user) => [user.id, user]));
  const usedPins = new Set();
  const csvLines = ['user_id,full_name,old_email,new_email,new_pin,status'];
  const failures = [];
  let updated = 0;
  let skipped = 0;

  for (const profile of profiles) {
    const studentRow = studentById.get(profile.id);
    const studentNumber = deriveStudentNumber(studentRow, profile);
    const authUser = authById.get(profile.id);
    const fullName = profile.full_name || '';
    const oldEmail = profile.email || authUser?.email || '';

    if (!studentNumber) {
      failures.push(`Missing student number for ${fullName || profile.id}`);
      csvLines.push([profile.id, escapeCsv(fullName), escapeCsv(oldEmail), '""', '""', 'missing-student-number'].join(','));
      continue;
    }

    if (!authUser) {
      failures.push(`Missing auth user for ${fullName || profile.id}`);
      csvLines.push([profile.id, escapeCsv(fullName), escapeCsv(oldEmail), escapeCsv(`${studentNumber}@glenbrack.edu`), '""', 'missing-auth-user'].join(','));
      continue;
    }

    const newEmail = `${studentNumber}@glenbrack.edu`;
    const newPin = generateUniquePin(usedPins);

    if (!dryRun) {
      const { error: authError } = await supabase.auth.admin.updateUserById(profile.id, {
        email: newEmail,
        password: newPin,
        email_confirm: true,
        user_metadata: {
          ...(authUser.user_metadata || {}),
          full_name: fullName,
          role: 'student'
        }
      });
      if (authError) {
        failures.push(`Auth update failed for ${oldEmail}: ${authError.message}`);
        csvLines.push([profile.id, escapeCsv(fullName), escapeCsv(oldEmail), escapeCsv(newEmail), escapeCsv(newPin), 'auth-update-failed'].join(','));
        continue;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ email: newEmail, pin: newPin })
        .eq('id', profile.id);
      if (profileError) {
        failures.push(`Profile update failed for ${oldEmail}: ${profileError.message}`);
        csvLines.push([profile.id, escapeCsv(fullName), escapeCsv(oldEmail), escapeCsv(newEmail), escapeCsv(newPin), 'profile-update-failed'].join(','));
        continue;
      }
    }

    updated += 1;
    csvLines.push([profile.id, escapeCsv(fullName), escapeCsv(oldEmail), escapeCsv(newEmail), escapeCsv(newPin), dryRun ? 'dry-run' : 'updated'].join(','));
  }

  fs.writeFileSync(outPath, `${csvLines.join('\n')}\n`, 'utf-8');

  console.log(JSON.stringify({
    dryRun,
    totalProfiles: profiles.length,
    updated,
    skipped,
    failures: failures.length,
    report: outPath
  }, null, 2));

  if (failures.length > 0) {
    console.log('Failure details:');
    for (const failure of failures) {
      console.log(`- ${failure}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
