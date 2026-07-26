import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useChildDashboard } from "../children/useChildDashboard";
import type { ChildAnnouncementItem, ChildAssignmentItem, ChildConversationItem, ChildGradeItem } from "../../types/dashboard";

export type SubjectRecord = {
  id: string;
  name: string;
  description: string | null;
  gradeTier: string | null;
  category: string | null;
};

export type SubjectTopic = {
  id: string;
  title: string;
  order: number;
  lessonCount: number;
};

export type SubjectLesson = {
  id: string;
  topicId: string;
  topicTitle: string;
  title: string;
  preview: string;
  order: number;
};

export type SubjectQuiz = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  questionsCount: number;
  pointsPossible: number | null;
  createdAt: string | null;
};

export type SubjectHubData = {
  subject: SubjectRecord | null;
  topics: SubjectTopic[];
  lessons: SubjectLesson[];
  quizzes: SubjectQuiz[];
  assignments: ChildAssignmentItem[];
  grades: ChildGradeItem[];
  conversations: ChildConversationItem[];
  announcements: ChildAnnouncementItem[];
};

export type SubjectHubResult = {
  data: SubjectHubData;
  loading: boolean;
  errorMessage: string | null;
};

const emptyData: SubjectHubData = {
  subject: null,
  topics: [],
  lessons: [],
  quizzes: [],
  assignments: [],
  grades: [],
  conversations: [],
  announcements: [],
};

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function previewText(value: string | null | undefined, maxLength: number) {
  if (!value) return "";
  const normalized = stripHtml(value);
  if (!normalized) return "";
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized;
}

export function useSubjectHub(childId?: string | null, subjectId?: string | null): SubjectHubResult {
  const { data: dashboard, loading: dashboardLoading, errorMessage: dashboardError } = useChildDashboard(childId);
  const [data, setData] = useState<SubjectHubData>(emptyData);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const subjectFromDashboard = useMemo(() => {
    if (!subjectId) return null;
    return dashboard.subjects.find((subject) => subject.id === subjectId) || null;
  }, [dashboard.subjects, subjectId]);

  useEffect(() => {
    let cancelled = false;

    const loadSubjectHub = async () => {
      if (!subjectId) {
        setData(emptyData);
        setErrorMessage(null);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const [subjectRes, topicsRes, quizzesRes] = await Promise.all([
          supabase
            .from("subjects")
            .select("id, name, description, grade_tier, category")
            .eq("id", subjectId)
            .maybeSingle(),
          supabase.from("topics").select("id, title, order, subject_id").eq("subject_id", subjectId).order("order", { ascending: true }),
          supabase
            .from("quizzes")
            .select("id, title, description, status, questions, points_possible, created_at")
            .eq("subject_id", subjectId)
            .eq("status", "published")
            .order("created_at", { ascending: false }),
        ]);

        if (subjectRes.error) throw subjectRes.error;
        if (topicsRes.error) throw topicsRes.error;
        if (quizzesRes.error) throw quizzesRes.error;

        const topics = (topicsRes.data || []) as Array<{ id: string; title: string; order: number; subject_id: string }>;
        const topicIds = topics.map((topic) => topic.id);

        const [lessonsRes, announcementsRes] = await Promise.all([
          topicIds.length > 0
            ? supabase.from("lessons").select("id, topic_id, title, content, order").in("topic_id", topicIds).order("order", { ascending: true })
            : Promise.resolve({ data: [], error: null } as const),
          supabase
            .from("announcements")
            .select("id, title, content, created_at, target_grades, profiles!author_id(full_name)")
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

        if (lessonsRes.error) throw lessonsRes.error;
        if (announcementsRes.error) throw announcementsRes.error;

        const lessons = (lessonsRes.data || []) as Array<{ id: string; topic_id: string; title: string; content: string | null; order: number }>;
        const lessonCounts = new Map<string, number>();
        lessons.forEach((lesson) => {
          lessonCounts.set(lesson.topic_id, (lessonCounts.get(lesson.topic_id) || 0) + 1);
        });

        const topicById = new Map(topics.map((topic) => [topic.id, topic.title]));
        const subjectLessons = lessons.map((lesson) => ({
          id: lesson.id,
          topicId: lesson.topic_id,
          topicTitle: topicById.get(lesson.topic_id) || "Topic",
          title: lesson.title,
          preview: previewText(lesson.content, 120),
          order: lesson.order,
        }));
        const quizzes = (quizzesRes.data || []) as Array<{
          id: string;
          title: string;
          description: string | null;
          status: string | null;
          questions: unknown[] | null;
          points_possible: number | null;
          created_at: string | null;
        }>;
        const subjectName = subjectRes.data?.name || subjectFromDashboard?.name || null;

        if (!cancelled) {
          setData({
            subject: subjectRes.data
              ? {
                  id: subjectRes.data.id,
                  name: subjectRes.data.name,
                  description: subjectRes.data.description,
                  gradeTier: subjectRes.data.grade_tier,
                  category: subjectRes.data.category,
                }
              : subjectFromDashboard
                ? {
                    id: subjectFromDashboard.id,
                    name: subjectFromDashboard.name,
                    description: null,
                    gradeTier: subjectFromDashboard.gradeTier ?? null,
                    category: subjectFromDashboard.category ?? null,
                  }
                : null,
            topics: topics.map((topic) => ({
              id: topic.id,
              title: topic.title,
              order: topic.order,
              lessonCount: lessonCounts.get(topic.id) || 0,
            })),
            lessons: subjectLessons,
            quizzes: quizzes.map((quiz) => ({
              id: quiz.id,
              title: quiz.title,
              description: quiz.description,
              status: quiz.status,
              questionsCount: Array.isArray(quiz.questions) ? quiz.questions.length : 0,
              pointsPossible: quiz.points_possible,
              createdAt: quiz.created_at,
            })),
            assignments: dashboard.assignments.filter((assignment) => assignment.subjectId === subjectId),
            grades: dashboard.grades.filter((grade) => grade.subjectId === subjectId),
            conversations: dashboard.conversations.filter((conversation) => conversation.subjectId === subjectId),
            announcements: dashboard.announcements.filter((announcement) => announcement.subjectName === subjectName),
          });
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Could not load subject details.";
          setErrorMessage(message);
          setData(emptyData);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSubjectHub();

    return () => {
      cancelled = true;
    };
  }, [dashboard.announcements, dashboard.assignments, dashboard.conversations, dashboard.grades, subjectFromDashboard, subjectId]);

  return {
    data,
    loading: loading || dashboardLoading,
    errorMessage: errorMessage || dashboardError,
  };
}
