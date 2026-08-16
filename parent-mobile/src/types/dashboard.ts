export interface ChildAssignmentItem {
  id: string;
  title: string;
  dueDate: string | null;
  status: string | null;
  subjectId: string | null;
  availableFrom: string | null;
  submissionStatus?: string | null;
  submittedAt?: string | null;
  grade?: number | null;
  gradeReleased?: boolean;
}

export interface ChildQuizItem {
  id: string;
  title: string;
  subjectId: string | null;
  endDate?: string | null;
  submissionStatus?: string | null;
  score?: number | null;
  totalPoints?: number | null;
}

export interface ChildHomeworkItem {
  id: string;
  title: string;
  instructions: string;
  textbookReference: string | null;
  dueDate: string;
  assignedDate: string;
  subjectId: string;
}

export interface ChildGradeItem {
  id: string;
  subjectId: string;
  assignmentGroupId: string;
  score: number;
  hasScore?: boolean;
  feedback?: string | null;
}

export interface ChildLessonItem {
  id: string;
  subjectId: string;
  topicId: string;
  topicTitle: string;
  title: string;
  preview: string;
  order: number;
}

export interface ChildAlertItem {
  id: string;
  category: string;
  title: string;
  description: string;
  subjectName?: string | null;
  createdAt: string;
  readAt?: string | null;
}

export interface ChildProgressSummary {
  averageScore: number | null;
  scoreCount: number;
  attendanceRate: number | null;
  absenceCount: number;
  lateCount: number;
  overdueCount: number;
  dueSoonCount: number;
}

export interface ChildAttendanceItem {
  id: string;
  date: string;
  mark: "present" | "absent" | "late" | "excused" | string;
  note?: string | null;
  className?: string | null;
}

export interface ChildAnnouncementItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  authorName?: string | null;
  subjectName?: string | null;
}

export interface ChildConversationItem {
  id: string;
  subjectId: string | null;
  subjectName: string | null;
  title: string;
  preview: string;
  authorName: string | null;
  authorRole: string | null;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
}

export interface ChildTeacherRecipientItem {
  id: string;
  subjectClassId: string;
  subjectId: string | null;
  subjectName: string | null;
  teacherId: string | null;
  teacherName: string | null;
  teacherRole: string | null;
  discussionId: string | null;
  discussionTitle: string | null;
  preview: string | null;
  replyCount: number;
  updatedAt: string | null;
}

export interface ChildProfileItem {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  administrationNumber?: string | null;
  gradeLabel?: string | null;
  classLabel?: string | null;
  status?: string | null;
}

export interface ChildDashboardData {
  child: ChildProfileItem | null;
  subjects: { id: string; name: string; gradeTier?: string | null; category?: string | null }[];
  subjectTeachers: ChildTeacherRecipientItem[];
  assignments: ChildAssignmentItem[];
  quizzes: ChildQuizItem[];
  homework: ChildHomeworkItem[];
  lessons: ChildLessonItem[];
  grades: ChildGradeItem[];
  attendance: ChildAttendanceItem[];
  announcements: ChildAnnouncementItem[];
  conversations: ChildConversationItem[];
  alerts: ChildAlertItem[];
  progress: ChildProgressSummary;
}
