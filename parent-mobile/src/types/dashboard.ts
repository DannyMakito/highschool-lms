export interface ChildAssignmentItem {
  id: string;
  title: string;
  dueDate: string | null;
  status: string | null;
  subjectId: string | null;
  availableFrom: string | null;
}

export interface ChildGradeItem {
  id: string;
  subjectId: string;
  assignmentGroupId: string;
  score: number;
  feedback?: string | null;
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
  assignments: ChildAssignmentItem[];
  grades: ChildGradeItem[];
  attendance: ChildAttendanceItem[];
  announcements: ChildAnnouncementItem[];
  conversations: ChildConversationItem[];
}
