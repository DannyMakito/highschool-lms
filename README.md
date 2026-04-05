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
- ~~In the learner directory, the assigned subjects that were assigned to the learner  while doing registration does not show on the table.~~
- ~~ Teachers are not able to see learners in their register class and also subject class dont apear on the table~~

  **  Learner portal **
  ~~ when learner login there are not able to see their data, such as subjects, class and anything that is related to them.~~
-~~ there is an issue with the login  . You need to login twice before you can access your respective dashboard ~~~
~~ The logout button in the principal dashboard is not functioning correctly.~~
-~~ The principal dashboard overview page does not render the actual number of teachers and students.~~
- ~~~ Register classes need an eye icon in the table that opens a full register class details view with the enrolled students list.~~
-~~ Register classes need full CRUD support for the principal, including viewing, editing, and deleting existing classes.~~~
-~~ The subject classes page needs to be upgraded into a full subject class details workflow with complete CRUD functionality.~~
 leaner  need to be able to view video lessons. the front end already exist

 **  Teacher  portal **
 - teacher need to be able to add video lessons
 - Create a subjects grading for each subjects where teachers will choose how total grade for the leaner subject will be conducted for example, the learner will have 3 quize each weighing 20% and 1 assignment weighing 40% which will make a total of 100%



