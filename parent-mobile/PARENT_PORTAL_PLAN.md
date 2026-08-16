# Parent Portal Auth And Feature Plan

## Access-Key Auth Flow

1. School staff roles `principal`, `admin`, and `register-teacher` generate a one-time parent access key for a selected learner from the parent-access page.
2. The generated key is stored in Supabase with the target learner, creator, expiry, usage status, and claim audit fields.
3. Staff share the access key or PIN with the learner's parent or guardian outside the app.
4. The parent opens the mobile app and lands on an access-key screen.
5. The parent enters the key, and the app fetches a limited learner preview.
6. The app asks the parent to confirm: "Is this your child?"
7. If confirmed, the parent creates a profile with name, surname, cellphone number, optional email, and password or PIN.
8. Supabase creates a parent auth user, profile row, and parent-student link, then marks the access key as claimed.
9. The parent lands on a lightweight dashboard focused on learner progress and urgent school updates.

## Parent Portal Feature Scope

The parent mobile app should prioritize clarity for low-tech users: large tap targets, simple language, visible next actions, and no dense school-admin terminology.

Initial parent dashboard:
- Learner overview with grade, class, attendance summary, recent scores, and upcoming homework.
- Bottom navigation for Home, Learners, Subjects, Messages, and Profile.
- Quick alerts for overdue homework, upcoming tests/exams, school announcements, and attendance issues.

Learner detail pages:
- Grades and feedback by subject, test, quiz, assignment, and exam.
- Homework and assignments with due dates, status, score, and teacher feedback.
- Timetables for school day, homework, tests, and exams.
- Attendance summary with absences, late arrivals, and notes.

Subject pages:
- Each assigned subject opens into performance, homework, quizzes, tests, exams, feedback, and teacher contact.
- One-on-one chat with the teacher for that learner's specific subject class.

Admin/staff parent-access page:
- Generate access keys for selected learners.
- Show key status: active, expired, claimed, revoked.
- Allow regeneration/revocation by authorized staff only.
- Keep an audit trail of who generated and who claimed each key.
