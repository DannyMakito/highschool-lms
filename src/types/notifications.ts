export type NotificationAudience = "learner" | "teacher" | "principal";

export type NotificationCategory =
  | "assessment"
  | "quiz"
  | "content"
  | "grading"
  | "submission"
  | "discussion"
  | "announcement"
  | "analytics";

export interface NotificationItem {
  id: string;
  inboxId?: string;
  audience: NotificationAudience;
  category: NotificationCategory;
  title: string;
  description: string;
  createdAt: string;
  href: string;
  subjectName?: string;
}
