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
}

export interface ChildDashboardData {
  assignments: ChildAssignmentItem[];
  grades: ChildGradeItem[];
  attendance: ChildAttendanceItem[];
  announcements: ChildAnnouncementItem[];
}
