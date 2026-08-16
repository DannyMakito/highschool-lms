import type { ChildAssignmentItem, ChildQuizItem } from "@/types/dashboard";

export const todayIso = () => new Date().toISOString().slice(0, 10);
export const isPastDue = (item: ChildAssignmentItem) => Boolean(item.dueDate && item.dueDate < todayIso() && !item.submissionStatus);
export const isDueSoon = (item: ChildAssignmentItem) => {
  if (!item.dueDate || item.submissionStatus) return false;
  const days = (new Date(`${item.dueDate}T12:00:00`).getTime() - Date.now()) / 86_400_000;
  return days >= 0 && days <= 3;
};
export const assignmentState = (item: ChildAssignmentItem) => {
  if (item.gradeReleased) return "Marked";
  if (item.submissionStatus === "submitted" || item.submissionStatus === "graded") return "Submitted";
  if (isPastDue(item)) return "Past due";
  if (isDueSoon(item)) return "Due soon";
  return "To do";
};
export const quizState = (item: ChildQuizItem) => {
  if (item.submissionStatus === "completed") return "Completed";
  if (item.submissionStatus === "in-progress") return "In progress";
  return item.endDate && item.endDate < todayIso() ? "Past due" : "Available";
};
