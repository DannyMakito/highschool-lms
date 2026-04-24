# High School LMS User Manual (Hardcopy Edition)
Version: 1.0  
Date: 2026-04-24  
Audience: Principal, Teacher, Learner

## 1. Purpose
This manual explains how to use the current LMS features with focus on:
- Teacher class operations
- Register attendance and timetable administration
- Gradebook category linking for quizzes and assignments
- Help and in-page guidance
- Optional register-class assignment workflow

---

## 2. Register-Class Assignment Rule (Important)
- Register class assignment for learners is **optional**.
- A learner can be created and remain active even when no register class is assigned.
- A register class can exist without a class teacher.
- Teacher register tools only activate when that teacher is assigned as a class teacher for at least one register class.
- Student register page shows safe fallback messages when class or teacher assignment is pending.

---

## 3. Teacher Portal Manual

### 3.1 My Classes
Path: `/teacher/classes`

Teachers can operate on learners per subject class:
- `Eye` icon: View learner profile details (login PIN is hidden).
- `Grades` icon: View learner grade snapshot for the subject class.

Recommended workflow:
1. Open **My Classes**.
2. Select the class card.
3. Use the `Eye` icon to confirm learner details.
4. Use the `Grades` icon to review performance and category scores.

### 3.2 Register & Timetable
Path: `/teacher/register-admin`

Use this page only when assigned as register-class teacher.

Functions:
- Select register class and date.
- Mark each learner as: `present`, `absent`, `late`, or `excused`.
- Add optional note per learner.
- Use **Mark All Present** for fast capture.
- Use **Close Register** to lock the day.
- Create weekly timetable slots (day, period, time, activity, location, notes).

If not assigned:
- The page displays a guidance card.
- No destructive or invalid action is shown.
- It activates automatically once assignment is made by principal.

### 3.3 Quizzes/Assignments Linked to Gradebook Categories
Paths:
- Quiz creation/edit: `/teacher/subjects/:id/quizzes/create`
- Assignment management: `/teacher/assignments/essays`

When gradebook setup exists for a subject:
1. Create or edit quiz/assignment.
2. In settings, choose **Gradebook Category**.
3. Select one category from your setup (for example: Quizzes & Assignments, Tests & Exams, Extra Curricular Activities).
4. Save/publish.

Result:
- Assessment stores category link.
- Assessment appears under learner records with category context.
- Category weight and year-mark impact are trackable in reports.

---

## 4. Learner Portal Manual

### 4.1 Register Class Page
Path: `/student/register`

This page provides:
- Assigned register class details
- Assigned class teacher (or pending state)
- Personal attendance history per day
- Weekly timetable slots for register class

Fallback behavior:
- If learner has no register class: page shows pending-assignment message.
- If register class exists but no class teacher: page still loads and warns that marking may be delayed.
- If no attendance sessions exist yet: history table remains empty with explanation.

### 4.2 Profile Register Field
Path: `/student/profile`

Register class displays:
- Assigned class name, or
- `Not assigned yet`

---

## 5. Principal Portal Manual

### 5.1 Student Registration (Optional Register Class)
Path: `/principal/students`

Updated workflow:
1. Complete learner personal details.
2. Select grade.
3. Optionally choose a register class.
4. Continue even if register class is unassigned.
5. Complete subject and class placement.

Notes:
- Capacity checks only run when a register class is selected.
- Learner record can be updated later to add or change register class.

### 5.2 Student Directory Editing
Path: `/principal/directory`

Directory now supports:
- Viewing `Unassigned` register class learners.
- Filtering by `Unassigned` in class filters.
- Updating a learner to `Unassigned` or assigning a class later.

### 5.3 Register Class Management
Path: `/principal/register-classes`

Principal can:
- Create register classes with or without class teacher assignment.
- Add class teacher later without re-creating class.

---

## 6. Help System Manual

### 6.1 Sidebar Help Page
Paths:
- Learner: `/student/help`
- Teacher: `/teacher/help`
- Principal: `/principal/help`

Purpose:
- Role-specific portal manual
- Section-by-section usage guidance
- One-click open for each linked page

### 6.2 Header Help Button
- Every page has a top-right `Help` button.
- It opens page-specific short guidance.
- From the dialog, select **Open Full Manual** for full reference.

---

## 7. Troubleshooting

### 7.1 Teacher cannot open register tools
Check:
1. Teacher is assigned as `class_teacher_id` on at least one register class.
2. Teacher account role is `teacher`.

### 7.2 Learner sees no register data
Possible reasons:
1. Learner has no register class assignment.
2. Register class has no attendance sessions yet.
3. Register class teacher not assigned yet.

### 7.3 Attendance/timetable page shows schema warning
Cause:
- Database register tables are missing.

Action:
- Run migration/script for:
  - `register_attendance_sessions`
  - `register_attendance_entries`
  - `register_timetable_slots`

---

## 8. Quick Role Checklists

### Teacher Daily
1. Open `/teacher/register-admin`
2. Select class and date
3. Mark learners
4. Save and close register

### Learner Daily
1. Open `/student/register`
2. Review mark status
3. Check timetable for next periods

### Principal Weekly
1. Audit unassigned learners in `/principal/directory`
2. Assign class teachers in `/principal/register-classes`
3. Confirm teacher access to register tools

