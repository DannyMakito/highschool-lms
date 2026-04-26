import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { NotificationItem } from "@/types/notifications";
import { useAuth } from "@/context/AuthContext";
import { useAssignments } from "@/hooks/useAssignments";
import { useMessaging } from "@/hooks/useMessaging";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useSubjects } from "@/hooks/useSubjects";
import { getRolePathPrefix } from "@/lib/role-path";

interface NotificationsContextType {
  notifications: NotificationItem[];
  popupNotifications: NotificationItem[];
  popupVisible: boolean;
  dismissPopup: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

function toIsoDate(value: unknown) {
  if (typeof value === "string" && value.trim()) return value;
  return new Date(0).toISOString();
}

function sortNewestFirst(items: NotificationItem[]) {
  return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();
  const { subjects, quizzes, submissions: quizSubmissions, getSubjectTopics, getTopicLessons } = useSubjects();
  const { assignments, submissions: assignmentSubmissions } = useAssignments();
  const { announcements, discussions, replies } = useMessaging();
  const { teachers } = useSchoolData();
  const { studentSubjects, studentSubjectClasses, subjectClasses } = useRegistrationData();
  const [popupVisible, setPopupVisible] = useState(false);

  const rolePrefix = getRolePathPrefix(role);
  const subjectNameById = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject.name])),
    [subjects]
  );

  const learnerSubjectIds = useMemo(() => {
    if (!user) return [];
    const directIds = studentSubjects.filter((item) => item.studentId === user.id).map((item) => item.subjectId);
    const classIds = studentSubjectClasses
      .filter((item) => item.studentId === user.id)
      .map((item) => subjectClasses.find((subjectClass) => subjectClass.id === item.subjectClassId)?.subjectId)
      .filter(Boolean) as string[];

    return Array.from(new Set([...directIds, ...classIds]));
  }, [studentSubjectClasses, studentSubjects, subjectClasses, user]);

  const teacherSubjectIds = useMemo(() => {
    if (!user) return [];
    return teachers.find((teacher) => teacher.id === user.id)?.subjects || [];
  }, [teachers, user]);

  const lessonNotifications = useMemo(() => {
    const items: NotificationItem[] = [];
    const pushLesson = (subjectId: string) => {
      const subjectTopics = getSubjectTopics(subjectId);
      subjectTopics.forEach((topic) => {
        getTopicLessons(topic.id).forEach((lesson) => {
          const eventDate = toIsoDate((lesson as { created_at?: string }).created_at);
          if (!lesson.resourceUrl && !lesson.videoUrl && !lesson.content) return;
          items.push({
            id: `lesson:${lesson.id}`,
            audience: "learner",
            category: "content",
            title: `New content in ${subjectNameById.get(subjectId) || "your class"}`,
            description: `${lesson.title} is ready to open.`,
            createdAt: eventDate,
            href: `/student/subjects/${subjectId}/lessons/${lesson.id}`,
            subjectName: subjectNameById.get(subjectId),
          });
        });
      });
    };

    learnerSubjectIds.forEach(pushLesson);
    return items;
  }, [getSubjectTopics, getTopicLessons, learnerSubjectIds, subjectNameById]);

  const notifications = useMemo(() => {
    if (!user || !rolePrefix || !role) return [];

    if (role === "learner") {
      const assessmentNotifications: NotificationItem[] = assignments
        .filter((assignment) => learnerSubjectIds.includes(assignment.subjectId) && assignment.status === "published")
        .map((assignment) => ({
          id: `assignment:${assignment.id}`,
          audience: "learner",
          category: "assessment",
          title: `New assessment in ${subjectNameById.get(assignment.subjectId) || "your class"}`,
          description: assignment.title,
          createdAt: assignment.availableFrom || assignment.createdAt || toIsoDate((assignment as { created_at?: string }).created_at),
          href: `${rolePrefix}/assignments/${assignment.id}`,
          subjectName: subjectNameById.get(assignment.subjectId),
        }));

      const quizNotifications: NotificationItem[] = quizzes
        .filter((quiz) => learnerSubjectIds.includes(quiz.subjectId) && quiz.status === "published")
        .map((quiz) => ({
          id: `quiz:${quiz.id}`,
          audience: "learner",
          category: "quiz",
          title: `New quiz in ${subjectNameById.get(quiz.subjectId) || "your class"}`,
          description: quiz.title,
          createdAt: quiz.createdAt || toIsoDate((quiz as { created_at?: string }).created_at),
          href: `${rolePrefix}/quizzes/${quiz.id}`,
          subjectName: subjectNameById.get(quiz.subjectId),
        }));

      const gradedAssignmentNotifications: NotificationItem[] = assignmentSubmissions
        .filter((submission) => submission.studentId === user.id && (submission.isReleased || submission.status === "graded"))
        .map((submission) => {
          const assignment = assignments.find((item) => item.id === submission.assignmentId);
          return {
            id: `assignment-grade:${submission.id}`,
            audience: "learner",
            category: "grading",
            title: "Assignment feedback released",
            description: assignment?.title || "One of your assignments has been graded.",
            createdAt: submission.submittedAt,
            href: `${rolePrefix}/assignments/${submission.assignmentId}`,
            subjectName: assignment ? subjectNameById.get(assignment.subjectId) : undefined,
          };
        });

      const gradedQuizNotifications: NotificationItem[] = quizSubmissions
        .filter((submission) => submission.studentId === user.id && submission.status === "completed")
        .map((submission) => ({
          id: `quiz-grade:${submission.id}`,
          audience: "learner",
          category: "grading",
          title: "Quiz result available",
          description: `${quizzes.find((quiz) => quiz.id === submission.quizId)?.title || "A quiz"} has a score ready for review.`,
          createdAt: submission.completedAt,
          href: `${rolePrefix}/quizzes/${submission.quizId}`,
          subjectName: subjectNameById.get(quizzes.find((quiz) => quiz.id === submission.quizId)?.subjectId || ""),
        }));

      return sortNewestFirst([
        ...assessmentNotifications,
        ...quizNotifications,
        ...lessonNotifications,
        ...gradedAssignmentNotifications,
        ...gradedQuizNotifications,
      ]);
    }

    if (role === "teacher") {
      const submissionNotifications: NotificationItem[] = assignmentSubmissions
        .filter((submission) => {
          const assignment = assignments.find((item) => item.id === submission.assignmentId);
          return assignment ? teacherSubjectIds.includes(assignment.subjectId) : false;
        })
        .map((submission) => {
          const assignment = assignments.find((item) => item.id === submission.assignmentId);
          return {
            id: `assignment-submission:${submission.id}`,
            audience: "teacher",
            category: "submission",
            title: "New assignment submission",
            description: `${submission.studentName} submitted ${assignment?.title || "an assignment"}.`,
            createdAt: submission.submittedAt,
            href: `${rolePrefix}/assignments/${submission.assignmentId}/grade`,
            subjectName: assignment ? subjectNameById.get(assignment.subjectId) : undefined,
          };
        });

      const quizSubmissionNotifications: NotificationItem[] = quizSubmissions
        .filter((submission) => {
          const quiz = quizzes.find((item) => item.id === submission.quizId);
          return quiz ? teacherSubjectIds.includes(quiz.subjectId) : false;
        })
        .map((submission) => {
          const quiz = quizzes.find((item) => item.id === submission.quizId);
          return {
            id: `quiz-submission:${submission.id}`,
            audience: "teacher",
            category: "submission",
            title: "New quiz attempt submitted",
            description: `${submission.studentName} completed ${quiz?.title || "a quiz"}.`,
            createdAt: submission.completedAt,
            href: `${rolePrefix}/assignments/quizzes/${submission.quizId}/analytics`,
            subjectName: quiz ? subjectNameById.get(quiz.subjectId) : undefined,
          };
        });

      const studentDiscussionNotifications: NotificationItem[] = discussions
        .filter((discussion) => teacherSubjectIds.includes(discussion.subjectId) && discussion.authorRole === "learner")
        .map((discussion) => ({
          id: `discussion:${discussion.id}`,
          audience: "teacher",
          category: "discussion",
          title: "Student started a class discussion",
          description: `${discussion.authorName} posted "${discussion.title}".`,
          createdAt: discussion.createdAt,
          href: `${rolePrefix}/subjects/${discussion.subjectId}/discussions/view/${discussion.id}`,
          subjectName: subjectNameById.get(discussion.subjectId),
        }));

      return sortNewestFirst([
        ...submissionNotifications,
        ...quizSubmissionNotifications,
        ...studentDiscussionNotifications,
      ]);
    }

    const principalNotifications: NotificationItem[] = [
      ...assignmentSubmissions
        .filter((submission) => submission.isReleased || submission.status === "graded")
        .map((submission) => {
          const assignment = assignments.find((item) => item.id === submission.assignmentId);
          return {
            id: `principal-grade:${submission.id}`,
            audience: "principal" as const,
            category: "grading" as const,
            title: "Class grade released",
            description: `${submission.studentName} received feedback for ${assignment?.title || "an assignment"}.`,
            createdAt: submission.submittedAt,
            href: `/principal/grades`,
            subjectName: assignment ? subjectNameById.get(assignment.subjectId) : undefined,
          };
        }),
      ...quizzes
        .filter((quiz) => quiz.status === "published")
        .map((quiz) => ({
          id: `principal-quiz:${quiz.id}`,
          audience: "principal" as const,
          category: "quiz" as const,
          title: "Assessment published",
          description: `${quiz.title} is now live for ${subjectNameById.get(quiz.subjectId) || "a class"}.`,
          createdAt: quiz.createdAt || toIsoDate((quiz as { created_at?: string }).created_at),
          href: `/principal/subjects/${quiz.subjectId}`,
          subjectName: subjectNameById.get(quiz.subjectId),
        })),
      ...announcements.map((announcement) => ({
        id: `principal-announcement:${announcement.id}`,
        audience: "principal" as const,
        category: "announcement" as const,
        title: "School announcement posted",
        description: announcement.title,
        createdAt: announcement.createdAt,
        href: "/principal/announcements",
      })),
      ...replies.map((reply) => {
        const discussion = discussions.find((item) => item.id === reply.discussionId);
        return {
          id: `principal-reply:${reply.id}`,
          audience: "principal" as const,
          category: "analytics" as const,
          title: "Discussion activity recorded",
          description: `${reply.authorName} replied in ${discussion?.title || "a class discussion"}.`,
          createdAt: reply.createdAt,
          href: discussion ? `/principal/subjects/${discussion.subjectId}` : "/principal/dashboard",
          subjectName: discussion ? subjectNameById.get(discussion.subjectId) : undefined,
        };
      }),
    ];

    return sortNewestFirst(principalNotifications);
  }, [
    announcements,
    assignmentSubmissions,
    assignments,
    discussions,
    learnerSubjectIds,
    lessonNotifications,
    quizzes,
    quizSubmissions,
    replies,
    role,
    rolePrefix,
    subjectNameById,
    teacherSubjectIds,
    user,
  ]);

  useEffect(() => {
    if (!user || notifications.length === 0) {
      setPopupVisible(false);
      return;
    }

    const storageKey = `lastSeenNotification_${user.id}`;
    const storedLastSeen = localStorage.getItem(storageKey);
    const newestId = notifications[0].id;
    
    // Only show popup if there's a new notification we haven't alerted the user about
    if (newestId !== storedLastSeen) {
      setPopupVisible(true);
      localStorage.setItem(storageKey, newestId);
      
      const timer = window.setTimeout(() => setPopupVisible(false), 10000);
      return () => window.clearTimeout(timer);
    }
  }, [notifications, user?.id]);

  const value: NotificationsContextType = {
    notifications,
    popupNotifications: notifications.slice(0, 3),
    popupVisible,
    dismissPopup: () => setPopupVisible(false),
  };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotificationsContext() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotificationsContext must be used within a NotificationsProvider");
  }
  return context;
}
