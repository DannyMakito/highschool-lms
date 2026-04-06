LMS Instruction Guide

# Core Login Flow

Principal login:
- Email: `principal@school.com`
- PIN: `123456`

Teacher and learner accounts are created inside the system and use the saved email + PIN credentials.

# Main Setup Flow

## Principal Portal

Use the principal portal to set up the school structure in this order:

1. Create subjects from the `Subjects` area.
2. Create teachers from `Staff Management` and assign subjects to them.
3. Create register classes from `Register Classes`.
4. Create subject classes from `Subject Classes`.
5. Register learners from `Student Registration`.

Notes:
- Learner PINs are auto-generated.
- Grade 10 to 12 learners can be assigned subjects during registration.
- Learners appear in the learner directory after registration.

## Teacher Portal

Teachers can currently:
- View their dashboard and subject list
- Open subjects and create modules and lessons
- Add lesson notes and video lessons
- Create quizzes
- Create assessments under `Assessments > Essays & Research`
- Edit assessment setup, including rubric criteria and weighting
- Open the grading queue under `Assessments > Grading Queue`
- Grade PDF/text assignment submissions with rubric scoring

## Learner Portal

Learners can currently:
- View their dashboard
- Open their subjects and lessons
- Watch lesson videos when attached to lessons
- View assessments grouped by subject
- See upcoming assessments before release
- Open assessments only once they are available
- Submit text or PDF work
- View released grades and feedback

# What Was Implemented

## Video Lessons

Implemented:
- Teachers can add lesson videos inside the lesson editor
- Teachers can use either:
  - external video URLs
  - uploaded video files stored in Supabase storage
- Learners can view lesson videos in the lesson page
- Learner subject outline now shows whether a lesson has video or notes only

Related app files:
- [src/pages/dashboard/shared/SubjectDetail.tsx](C:\Users\ndlal\highschool-lms\src\pages\dashboard\shared\SubjectDetail.tsx)
- [src/pages/dashboard/student/LessonView.tsx](C:\Users\ndlal\highschool-lms\src\pages\dashboard\student\LessonView.tsx)
- [src/pages/dashboard/student/StudentSubjectOutline.tsx](C:\Users\ndlal\highschool-lms\src\pages\dashboard\student\StudentSubjectOutline.tsx)
- [src/context/SubjectsContext.tsx](C:\Users\ndlal\highschool-lms\src\context\SubjectsContext.tsx)

Supabase support:
- `lesson-videos` storage bucket
- lesson video metadata columns on `public.lessons`
- SQL file: [supabase/lesson_videos_support.sql](C:\Users\ndlal\highschool-lms\supabase\lesson_videos_support.sql)

## Rubric Grading Improvements

Implemented:
- Teachers grade by rubric scale, not raw final marks
- Example:
  - assignment total = `100`
  - 4 criteria
  - each criterion = `/4`
  - each criterion contributes up to `25` marks
- Speed grader now shows:
  - rubric score entry
  - converted assignment marks per criterion
  - final total mark

Related app files:
- [src/pages/dashboard/teacher/SpeedGrader.tsx](C:\Users\ndlal\highschool-lms\src\pages\dashboard\teacher\SpeedGrader.tsx)
- [src/context/AssignmentsContext.tsx](C:\Users\ndlal\highschool-lms\src\context\AssignmentsContext.tsx)

## Editable Assessment Rubrics

Implemented:
- Teachers can create custom rubrics with any number of criteria
- Teachers can edit an existing assessment and update the linked rubric
- Rubric criteria now persist an explicit display/order value

Related app files:
- [src/pages/dashboard/teacher/AssignmentManagement.tsx](C:\Users\ndlal\highschool-lms\src\pages\dashboard\teacher\AssignmentManagement.tsx)
- [src/context/AssignmentsContext.tsx](C:\Users\ndlal\highschool-lms\src\context\AssignmentsContext.tsx)

## Assessment Weighting And Release Windows

Implemented:
- Teachers can configure:
  - assessment type
  - reporting period (`term` or `year`)
  - contribution weight percentage
  - release/open date
  - due date
- Learners can see future assessments before they open
- Learners cannot start or submit an assessment before its release date
- Learners can see assessments grouped by subject

Related app files:
- [src/pages/dashboard/teacher/AssignmentManagement.tsx](C:\Users\ndlal\highschool-lms\src\pages\dashboard\teacher\AssignmentManagement.tsx)
- [src/pages/dashboard/student/StudentAssignments.tsx](C:\Users\ndlal\highschool-lms\src\pages\dashboard\student\StudentAssignments.tsx)
- [src/pages/dashboard/student/AssignmentView.tsx](C:\Users\ndlal\highschool-lms\src\pages\dashboard\student\AssignmentView.tsx)

Supabase support:
- assessment metadata columns on `public.assignments`
- rubric criterion order column on `public.rubric_criteria`
- SQL file: [supabase/assessment_support.sql](C:\Users\ndlal\highschool-lms\supabase\assessment_support.sql)

## Grading Queue

Implemented:
- New teacher grading queue page
- Queue is grouped by:
  - subject
  - subject class within subject
- Shows:
  - pending assessment grading count
  - historical grading count
  - quick links into assessment grading

Related app files:
- [src/pages/dashboard/teacher/GradingQueue.tsx](C:\Users\ndlal\highschool-lms\src\pages\dashboard\teacher\GradingQueue.tsx)
- [src/App.tsx](C:\Users\ndlal\highschool-lms\src\App.tsx)
- [src/components/app-sidebar.tsx](C:\Users\ndlal\highschool-lms\src\components\app-sidebar.tsx)

# Supabase Changes Applied

Already applied or prepared:
- Lesson video support SQL
- Assessment support SQL

Expected schema additions:
- `public.lessons.video_type`
- `public.lessons.video_file_path`
- `public.lessons.video_file_name`
- `public.lessons.video_mime_type`
- `public.assignments.available_from`
- `public.assignments.assessment_category`
- `public.assignments.assessment_period`
- `public.assignments.contribution_weight`
- `public.rubric_criteria.order`

# What To Test

## Principal Setup

Test:
1. Create a subject
2. Create a teacher and assign a subject
3. Create a register class
4. Create a subject class
5. Register a learner and assign subjects/classes

Expected:
- teacher sees assigned subject
- learner sees assigned subject and class-linked data

## Video Lesson Flow

Test:
1. Log in as teacher
2. Open a subject
3. Add a module
4. Add a lesson with lesson notes only
5. Edit the lesson and attach an external video URL
6. Create another lesson and upload a video file
7. Log in as learner and open both lessons

Expected:
- lesson saves successfully
- uploaded video gets a playable URL
- learner sees playable lesson video
- learner outline distinguishes video lessons from note-only lessons

## Assessment Creation

Test:
1. Log in as teacher
2. Go to `Assessments > Essays & Research`
3. Create an assessment with:
   - subject
   - total marks
   - release date
   - due date
   - category
   - term/year period
   - contribution weight
4. Create a custom rubric with multiple criteria
5. Save and reopen the same assessment for editing

Expected:
- assessment appears in the list
- rubric criteria persist
- weight and release settings persist
- editing the assessment updates the saved configuration

## Learner Assessment Visibility

Test:
1. Create one assessment with a future `available_from`
2. Create another assessment with `available_from = today`
3. Log in as learner
4. Open `Assessments`

Expected:
- assessments are grouped by subject
- future assessment is visible but locked
- current assessment is open
- learner cannot submit before release date

## Assignment Submission And Feedback

Test:
1. Learner opens an available assessment
2. Submit text work or PDF
3. Teacher opens grading
4. Grade using rubric
5. Release the grade
6. Learner opens the same assessment again

Expected:
- submission saves successfully
- rubric marks convert correctly to final score
- released grade and feedback appear for learner

## Rubric Conversion Logic

Test example:
1. Create an assessment out of `100`
2. Create `4` rubric criteria
3. Set each criterion max to `4`
4. In grading, enter `4/4` for one criterion

Expected:
- that criterion contributes `25` marks
- total score is the sum of converted criterion marks

## Grading Queue

Test:
1. Make submissions from learners in different subject classes
2. Log in as teacher
3. Open `Assessments > Grading Queue`

Expected:
- queue groups work by subject
- each subject groups work by subject class
- pending counts appear correctly
- teacher can jump from queue into grading flow

# Current Validation Note

The code was updated for the features above, but a full local frontend build was not run in this workspace because `node_modules` is not installed here, so `vite` was unavailable for compile verification.
