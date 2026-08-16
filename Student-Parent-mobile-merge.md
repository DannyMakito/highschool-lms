# Student and Parent Mobile Integration

## What was merged

`parent-portal` was merged into `main` after first synchronising it with the
current `main` history. The one application conflict was reviewed manually:
both the Student Homework route from the parent work and the Student Tutor
route from the student work were retained.

The repository now contains:

- `mobile/` — the unified Expo mobile shell and student portal.
- `parent-mobile/` — the parent portal source, hosted by the unified shell for
  parent accounts.

The `mobile` root screen is a role selector. A user chooses **Student portal**
or **Parent portal** before signing in. After sign-in, role-based routing keeps
learners in the student dashboard and parents in the parent dashboard.

## Parent academic data fix

The parent dashboard now derives subjects from both direct enrolment
(`student_subjects`) and subject-class enrolment
(`student_subject_classes -> subject_classes`), matching the student portal.
It also loads topics and lesson content so parent views can show teacher
published content, work, results, and feedback.

Apply these Supabase migrations before testing parent functionality:

1. `supabase/migrations/021_parent_absence_reports_and_notification_reads.sql`
2. `supabase/migrations/022_parent_class_enrolment_and_lesson_access.sql`

Migration 022 is required for parents to read subjects and lesson content when
their child is enrolled through a subject class.

## Local setup

From the repository root:

```cmd
cd mobile
npm install
```

Create `mobile/.env`. It must contain the public Supabase project values:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

`EXPO_PUBLIC_OPENROUTER_API_KEY` is optional. The app starts without it; the
AI tutor should be configured through a secure backend rather than a privileged
client key.

Never add service-role keys, database passwords, or private AI keys to an Expo
`EXPO_PUBLIC_*` variable or commit them to Git.

## Run on Android

Use the unified `mobile` directory, not `parent-mobile`:

```cmd
cd C:\Users\ndlal\highschool-lms\mobile
set EXPO_NO_DOCTOR=1 && npx expo start --clear
```

Press `a` in the Expo terminal to open the app on a connected Android device.

`EXPO_NO_DOCTOR=1` is currently used because the local Expo CLI dependency
check can fail while reading its remote compatibility response. It does not
disable Metro bundling.

## Test checklist

1. Open the app and confirm the Student/Parent choice screen appears.
2. Select **Student portal**, sign in with a learner, and confirm student tabs
   and learning data load.
3. Sign out, select **Parent portal**, and sign in with a linked parent.
4. Confirm the parent sees the linked child, subjects, published assignments,
   lesson content, released results, attendance, and teacher messages.
5. Submit a parent absence report and verify it is stored and visible to the
   appropriate school staff after the migrations are applied.

## Current integration boundary

The unified shell reuses the parent portal source through Metro workspace
configuration (`mobile/metro.config.js`) and resolves dependencies from the
unified `mobile` project. This keeps one installed mobile application while
preserving the existing parent feature set. A future cleanup can move the
parent source fully under `mobile/src/parent/` once the two projects are on the
same Expo SDK and dependency versions.
