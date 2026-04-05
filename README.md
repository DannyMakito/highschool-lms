LMS Instruction Guide

# Log in as the principal by using its login credential. principal@school.com PIN is 123456. Once you log in, create a subject by clicking on the subject tab. Fill in the  fields required. Once the subject is created, it should pop up on the subject tab. 
- create a teacher by cliking on the Staff Management tab on the sidebar: create and assign a teacher a subject, and also the login credential. which is email and the pin. 							 After the teacher is created, the teacher will appear on the table and click on the eye icon to see teacher details
-  Go to the registration tab and click on  register class to  create a new register class that the teacher will have, and specify the details of this class. 
	After a register class is created, go to the subject classes tab on the sidebar and create a subject class.
- When both register class and  subject classes have been created you can now create a student by clicking on the  student registration tab and create the student by filling in the details. A PIN will be auto-generated for the learner ,select the available reg class and subject class if the learner is g10-g12 . The system will auto-select subjects for G10-12. learner will appear on the student directory . click on the eye icon to view the student's profile with log in details

Once log in as a teacher you'll see your dashboard overview .on the side bar . there a subject tab You see all the subjects that the teacher has, and in classes, you will see all the classes that the teacher has  both the roster class and the subject classes in the table . when you click On subject, you can create quiz discussions and add modules. 
on the assessment sidebar tab  you can create an essays  assessment or  view all created quizzes 


# when you log in as a learner you'll be able to see an overview of the dashboard:
- The total number of subjects that the learner has
- The last course that the learner was doing
You should also be able to see all your subjects, your assigned class

#Thing that need to be fixed :		
**Principle portal **

- when you create a subject and you select to upload an image, you will get a error that says "bucket not created". Subject creation only works when a url image is used
- ~~There is currently no way to add a learner to a subject class~~ ✅ Fixed: Subject Classes → click eye icon → Add learner dropdown + remove (X) button
- ~~When registering a learner the system automatically assigns all available subjects for grades 10 to 12. It does not give us the option to select or deselect a specific subject for learner~~ ✅ Fixed: G10-12 registration Step 3 now lets you select/deselect both core and elective subjects
- In the learner directory, the assigned subjects that were assigned to the learner  while doing registration does not show on the table.
- Teachers are not able to see learners in their register class and also subject class dont apear on the table

  **  Learner portal **
- when learner login there are not able to see their data, such as subjects, class and anything that is related to them.
- there is an issue with the login  . You need to login twice before you can access your respective dashboard 
- The logout button in the principal dashboard is not functioning correctly.
- The principal dashboard overview page does not render the actual number of teachers and students.
- Register classes need an eye icon in the table that opens a full register class details view with the enrolled students list.
- Register classes need full CRUD support for the principal, including viewing, editing, and deleting existing classes.
- The subject classes page needs to be upgraded into a full subject class details workflow with complete CRUD functionality.




----------------

🧠 Main README problems we addressed
1) Double login required
Problem: UI rendered before profile load completed → app thought user wasn’t logged in → forced second login.
Fix (code):
Updated AuthContext.tsx to await profile fetch during INITIAL_SESSION and SIGNED_IN.
Updated login() to eagerly fetch profile right after sign-in.
Result: role routing happens only after auth + profile data are fully resolved.
2) Students/Teachers “don’t see their data” / RLS problem
Problem: frontend was querying full tables (select('*')) and assuming data was complete; data access was inconsistent because RLS was now filtering results.
Fix (code):
Updated useRegistrationData to consume the new students_with_subjects view / get_students_with_subjects() RPC for student+subject mapping.
Updated StudentDirectory to use the subjects array returned by the view/RPC instead of joining student_subjects manually.
This makes the UI directly consume the data shape the DB already enforces.
3) Assigned subjects not showing in student directory
Problem: UI was joining students + student_subjects manually and failing when RLS filtered rows.
Fix (code):
Added subjects?: StudentAssignedSubject[] to Student type.
Made StudentDirectory render from student.subjects (provided by view/RPC).
This resolves the “missing assigned subjects” display issue.
🗄️ What was done in Supabase (DB side)
✅ RLS + helper functions (implemented earlier in SQL)
Enabled RLS on all key tables (students, subjects, classes, etc.)
Created helper functions:
get_user_role()
is_teacher_of_student(student_id)
plus access helpers (grade/subject matching)
Created policies that enforce:
Principal = full access
Teacher = only their own students/subjects
Student = only their own profile/assignments/subject data
✅ New view / RPC (done by you)
Created public.students_with_subjects view returning:
each student row
subjects JSON array (subject_id, subject_name, grade_tier)
Created public.get_students_with_subjects() RPC
Confirmed both are readable by authenticated role
✅ Missing Storage bucket (not in code)
Noted that the subjects storage bucket was missing and must be created in the Supabase Dashboard.
You should also add Storage RLS policies (if you want access restrictions on uploads/reads).
🔍 What you should verify next (to confirm everything is working)
1) Confirm RLS is behaving correctly per role
As each role (principal / teacher / student), run in Supabase SQL:

SELECT * FROM students LIMIT 5;
SELECT * FROM student_subjects LIMIT 5;
SELECT * FROM get_students_with_subjects() LIMIT 5;
✅ Teachers should only see their students; students should only see their own row & subjects.

2) Verify UI behavior
Login as student → confirm dashboard shows subjects/assignments.
Login as teacher → confirm class/student lists are scoped to teacher.
Login as principal → confirm full access.
If you want, I can now provide exact SQL snippets to validate the RLS policy behavior for each role (principal / teacher / student) and confirm the view/RPC returns what you expect.
