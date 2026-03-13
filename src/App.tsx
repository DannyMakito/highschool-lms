
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import RoleLayout from "@/layouts/RoleLayout";
import StudentLayout from "@/layouts/StudentLayout";
import TeacherLayout from "@/layouts/TeacherLayout";
import PrincipalLayout from "@/layouts/PrincipalLayout";
import StudentDashboard from "@/pages/dashboard/student/StudentDashboard";
import StudentSubjects from "@/pages/dashboard/student/StudentSubjects";
import StudentSubjectOutline from "@/pages/dashboard/student/StudentSubjectOutline";
import LessonView from "@/pages/dashboard/student/LessonView";
import TeacherDashboard from "@/pages/dashboard/teacher/TeacherDashboard";
import PrincipalDashboard from "@/pages/dashboard/principal/PrincipalDashboard";
import SubjectManagement from "@/pages/dashboard/shared/SubjectManagement";
import SubjectDetail from "@/pages/dashboard/shared/SubjectDetail";
import CreateQuiz from "@/pages/dashboard/teacher/CreateQuiz";
import Quizzes from "@/pages/dashboard/teacher/Quizzes";
import QuizAnalytics from "@/pages/dashboard/teacher/QuizAnalytics";
import StudentQuizzes from "@/pages/dashboard/student/StudentQuizzes";
import StudentQuizDetail from "@/pages/dashboard/student/StudentQuizDetail";
import TakeQuiz from "@/pages/dashboard/student/TakeQuiz";
import LoginPage from "@/pages/LoginPage";
import Announcements from "@/pages/dashboard/principal/Announcements";
import StudentAnnouncements from "@/pages/dashboard/student/StudentAnnouncements";
import AssignmentManagement from "@/pages/dashboard/teacher/AssignmentManagement";
import SpeedGrader from "@/pages/dashboard/teacher/SpeedGrader";
import StudentAssignments from "@/pages/dashboard/student/StudentAssignments";
import AssignmentView from "@/pages/dashboard/student/AssignmentView";
import TeacherManagement from "@/pages/dashboard/principal/TeacherManagement";
import SchoolClassManagement from "@/pages/dashboard/teacher/ClassManagement";
import Discussions from "@/pages/dashboard/shared/discussions/Discussions";
import DiscussionForm from "@/pages/dashboard/shared/discussions/DiscussionForm";
import DiscussionView from "@/pages/dashboard/shared/discussions/DiscussionView";
import StudentRegistration from "@/pages/dashboard/principal/StudentRegistration";
import RegisterClassManagement from "@/pages/dashboard/principal/RegisterClassManagement";
import SubjectClassManagement from "@/pages/dashboard/principal/SubjectClassManagement";
import GradeManagement from "@/pages/dashboard/principal/GradeManagement";
import StudentDirectory from "@/pages/dashboard/principal/StudentDirectory";




import { Toaster } from "@/components/ui/sonner";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <Routes>

          <Route path="/login" element={<LoginPage />} />

          {/* Main Root Role Switcher */}
          <Route path="/" element={<RoleLayout />} />

          {/* Student Routes */}
          <Route path="/student" element={<StudentLayout />}>
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="subjects" element={<StudentSubjects />} />
            <Route path="subjects/:id/outline" element={<StudentSubjectOutline />} />
            <Route path="subjects/:id/lessons/:lessonId" element={<LessonView />} />
            <Route path="quizzes" element={<StudentQuizzes />} />
            <Route path="quizzes/:id" element={<StudentQuizDetail />} />
            <Route path="quizzes/:id/take" element={<TakeQuiz />} />
            <Route path="announcements" element={<StudentAnnouncements />} />
            <Route path="assignments" element={<StudentAssignments />} />
            <Route path="assignments/:id" element={<AssignmentView />} />
            <Route path="subjects/:id/discussions" element={<Discussions />} />
            <Route path="subjects/:id/discussions/view/:discussionId" element={<DiscussionView />} />
            <Route path="discussions" element={<Discussions />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Teacher Routes */}
          <Route path="/teacher" element={<TeacherLayout />}>
            <Route path="dashboard" element={<TeacherDashboard />} />
            <Route path="subjects" element={<SubjectManagement />} />
            <Route path="subjects/:id" element={<SubjectDetail />} />
            <Route path="subjects/:id/quizzes/create" element={<CreateQuiz />} />
            <Route path="subjects/:id/quizzes/:quizId" element={<CreateQuiz />} />
            <Route path="assignments/quizzes" element={<Quizzes />} />
            <Route path="assignments/quizzes/:id/analytics" element={<QuizAnalytics />} />
            <Route path="assignments/essays" element={<AssignmentManagement />} />
            <Route path="assignments/:id/grade" element={<SpeedGrader />} />
            <Route path="classes" element={<SchoolClassManagement />} />
            <Route path="subjects/:id/discussions" element={<Discussions />} />
            <Route path="subjects/:id/discussions/create" element={<DiscussionForm />} />
            <Route path="subjects/:id/discussions/edit/:discussionId" element={<DiscussionForm />} />
            <Route path="discussions" element={<Discussions />} />
            <Route path="subjects/:id/discussions/view/:discussionId" element={<DiscussionView />} />

            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Principal Routes */}
          <Route path="/principal" element={<PrincipalLayout />}>
            <Route path="dashboard" element={<PrincipalDashboard />} />
            <Route path="subjects" element={<SubjectManagement />} />
            <Route path="subjects/:id" element={<SubjectDetail />} />
            <Route path="subjects/:id/quizzes/create" element={<CreateQuiz />} />
            <Route path="subjects/:id/quizzes/:quizId" element={<CreateQuiz />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="teachers" element={<TeacherManagement />} />
            <Route path="students" element={<StudentRegistration />} />
            <Route path="register-classes" element={<RegisterClassManagement />} />
            <Route path="subject-classes" element={<SubjectClassManagement />} />
            <Route path="grades" element={<GradeManagement />} />
            <Route path="directory" element={<StudentDirectory />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
