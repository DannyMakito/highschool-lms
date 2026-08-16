import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { ChildDashboardData } from "../../types/dashboard";

const emptyDashboard: ChildDashboardData = {
  child: null,
  subjects: [],
  assignments: [],
  quizzes: [],
  grades: [],
  attendance: [],
  announcements: [],
  conversations: [],
};

function previewText(value: string, length: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > length ? `${normalized.slice(0, length - 1)}…` : normalized;
}

export function useChildDashboard(childId?: string | null) {
  const [data, setData] = useState<ChildDashboardData>(emptyDashboard);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchDashboard = async () => {
      if (!childId) {
        setData(emptyDashboard);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const { data: student, error: studentError } = await supabase
          .from("students")
          .select("id, register_class_id, grade_id, administration_number, status")
          .eq("id", childId)
          .maybeSingle();

        if (studentError) {
          console.warn("[ParentPortal] child lookup failed", studentError.message);
        }

        if (!student) {
          setData(emptyDashboard);
          return;
        }

        const [profileRes, gradeRes, classRes, subjectLinksRes] = await Promise.all([
          supabase.from("profiles").select("id, full_name, avatar_url").eq("id", childId).maybeSingle(),
          student.grade_id
            ? supabase.from("grades").select("id, name, level").eq("id", student.grade_id).maybeSingle()
            : Promise.resolve({ data: null, error: null } as const),
          student.register_class_id
            ? supabase.from("register_classes").select("id, name").eq("id", student.register_class_id).maybeSingle()
            : Promise.resolve({ data: null, error: null } as const),
          supabase.from("student_subjects").select("subject_id").eq("student_id", childId),
        ]);

        const subjectIds = (subjectLinksRes.data || []).map((item) => item.subject_id);

        const [subjectsRes, assignmentsRes, assignmentSubmissionsRes, quizzesRes, quizSubmissionsRes, gradesRes, attendanceRes, announcementsRes, conversationsRes] = await Promise.all([
          subjectIds.length > 0
            ? supabase.from("subjects").select("id, name, grade_tier, category").in("id", subjectIds).order("name", { ascending: true })
            : Promise.resolve({ data: [] as any[], error: null as any }),
          supabase.from("assignment_submissions").select("assignment_id, status, submitted_at, total_grade, is_released").eq("student_id", childId),
          subjectIds.length > 0
            ? supabase.from("quizzes").select("id, title, description, subject_id, status, settings").eq("status", "published").in("subject_id", subjectIds).order("created_at", { ascending: false }).limit(30)
            : Promise.resolve({ data: [] as any[], error: null as any }),
          supabase.from("quiz_submissions").select("quiz_id, status, score, total_points, completed_at").eq("student_id", childId),
          subjectIds.length > 0
            ? supabase
                .from("assignments")
                .select("id, title, due_date, available_from, status, subject_id")
                .eq("status", "published")
                .in("subject_id", subjectIds)
                .order("created_at", { ascending: false })
                .limit(10)
            : Promise.resolve({ data: [] as any[], error: null as any }),
          subjectIds.length > 0
            ? supabase
                .from("student_gradebook_scores")
                .select("id, subject_id, assignment_group_id, score, feedback, updated_at")
                .eq("student_id", childId)
                .in("subject_id", subjectIds)
                .order("updated_at", { ascending: false })
                .limit(12)
            : Promise.resolve({ data: [] as any[], error: null as any }),
          student.register_class_id
            ? supabase
                .from("register_attendance_entries")
                .select("id, mark, note, marked_at, session:register_attendance_sessions(attendance_date, register_class_id)")
                .eq("student_id", childId)
                .order("marked_at", { ascending: false })
                .limit(20)
            : Promise.resolve({ data: [] as any[], error: null as any }),
          supabase
            .from("announcements")
            .select("id, title, content, created_at, target_grades, profiles!author_id(full_name)")
            .order("created_at", { ascending: false })
            .limit(8),
          subjectIds.length > 0
            ? supabase
                .from("discussions")
                .select("id, title, content, subject_id, created_at, updated_at, profiles!author_id(full_name, role)")
                .in("subject_id", subjectIds)
                .order("updated_at", { ascending: false })
                .limit(10)
            : Promise.resolve({ data: [] as any[], error: null as any }),
        ]);

        if (subjectsRes.error) throw subjectsRes.error;
        if (assignmentsRes.error) throw assignmentsRes.error;
        if (assignmentSubmissionsRes.error) throw assignmentSubmissionsRes.error;
        if (quizzesRes.error) throw quizzesRes.error;
        if (quizSubmissionsRes.error) throw quizSubmissionsRes.error;

        const conversationIds = (conversationsRes.data || []).map((item) => item.id);
        const repliesRes = conversationIds.length > 0
          ? await supabase
              .from("discussion_replies")
              .select("id, discussion_id, content, created_at, profiles!author_id(full_name, role)")
              .in("discussion_id", conversationIds)
              .order("created_at", { ascending: true })
          : { data: [] as any[], error: null as any };

        if (cancelled) return;

        const repliesByDiscussionId = new Map<string, any[]>();
        for (const reply of repliesRes.data || []) {
          const bucket = repliesByDiscussionId.get(reply.discussion_id) || [];
          bucket.push(reply);
          repliesByDiscussionId.set(reply.discussion_id, bucket);
        }

        const submissionByAssignment = new Map((assignmentSubmissionsRes.data || []).map((item) => [item.assignment_id, item]));
        const assignments = (assignmentsRes.data || []).map((item) => {
          const submission = submissionByAssignment.get(item.id);
          return {
          id: item.id,
          title: item.title,
          dueDate: item.due_date || null,
          status: item.status || null,
          subjectId: item.subject_id || null,
          availableFrom: item.available_from || null,
          submissionStatus: submission?.status || null,
          submittedAt: submission?.submitted_at || null,
          grade: submission?.is_released ? Number(submission.total_grade || 0) : null,
          gradeReleased: Boolean(submission?.is_released),
        };});

        const quizSubmissionByQuiz = new Map((quizSubmissionsRes.data || []).map((item) => [item.quiz_id, item]));
        const quizzes = (quizzesRes.data || []).map((item) => {
          const submission = quizSubmissionByQuiz.get(item.id);
          return {
            id: item.id, title: item.title, description: item.description || null, subjectId: item.subject_id || null, status: item.status || null,
            endDate: item.settings?.availability?.endDate || null, submissionStatus: submission?.status || null,
            score: submission?.score ?? null, totalPoints: submission?.total_points ?? null, completedAt: submission?.completed_at || null,
          };
        });

        const grades = (gradesRes.data || []).map((item) => ({
          id: item.id,
          subjectId: item.subject_id,
          assignmentGroupId: item.assignment_group_id,
          score: Number(item.score || 0),
          feedback: item.feedback || null,
        }));

        const attendance = (attendanceRes.data || []).map((item) => ({
          id: item.id,
          date: item.session?.attendance_date || item.marked_at,
          mark: item.mark,
          note: item.note || null,
          className: item.session?.register_class_id || null,
        }));

        const announcements = (announcementsRes.data || []).map((item) => {
          const authorProfile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
          const targetGrades = Array.isArray(item.target_grades) ? item.target_grades : [];
          return {
            id: item.id,
            title: item.title,
            content: item.content,
            createdAt: item.created_at,
            authorName: authorProfile?.full_name || null,
            subjectName: targetGrades.length > 0 ? targetGrades.join(", ") : null,
          };
        });

        const subjects = (subjectsRes.data || []).map((item) => ({
          id: item.id,
          name: item.name,
          gradeTier: item.grade_tier || null,
          category: item.category || null,
        }));

        const subjectNameById = new Map(subjects.map((item) => [item.id, item.name]));

        const conversations = (conversationsRes.data || []).map((item) => {
          const authorProfile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
          const replies = repliesByDiscussionId.get(item.id) || [];
          const latestReply = replies.at(-1);
          return {
            id: item.id,
            subjectId: item.subject_id || null,
            subjectName: item.subject_id ? subjectNameById.get(item.subject_id) || null : null,
            title: item.title,
            preview: previewText(latestReply?.content || item.content || "Conversation thread", 120),
            authorName: authorProfile?.full_name || null,
            authorRole: authorProfile?.role || null,
            createdAt: item.created_at,
            updatedAt: item.updated_at || item.created_at,
            replyCount: replies.length,
          };
        });

        const child = {
          id: student.id,
          fullName: profileRes.data?.full_name || "Child",
          avatarUrl: profileRes.data?.avatar_url || null,
          administrationNumber: student.administration_number || null,
          gradeLabel: gradeRes.data?.name || student.grade_id || null,
          classLabel: classRes.data?.name || student.register_class_id || null,
          status: student.status || null,
          gradeLevel: gradeRes.data?.level ?? null,
          gradeName: gradeRes.data?.name || null,
          className: classRes.data?.name || null,
          subjectCount: subjectIds.length,
        };

        setData({
          child,
          subjects,
          assignments,
          quizzes,
          grades,
          attendance,
          announcements,
          conversations,
        });
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Failed to load child dashboard";
          setErrorMessage(message);
          setData(emptyDashboard);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, [childId]);

  return {
    data,
    loading,
    errorMessage,
  };
}
