import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { ChildDashboardData } from "../../types/dashboard";

const emptyDashboard: ChildDashboardData = {
  child: null,
  subjects: [],
  subjectTeachers: [],
  assignments: [],
  quizzes: [],
  homework: [],
  lessons: [],
  grades: [],
  attendance: [],
  announcements: [],
  conversations: [],
  alerts: [],
  progress: {
    averageScore: null,
    scoreCount: 0,
    attendanceRate: null,
    absenceCount: 0,
    lateCount: 0,
    overdueCount: 0,
    dueSoonCount: 0,
  },
};

function safeText(value: unknown, fallback = "Not available") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeDate(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function previewText(value: string, length: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > length ? `${normalized.slice(0, length - 1)}...` : normalized;
}

export function useChildDashboard(childId?: string | null, parentId?: string | null) {
  const [data, setData] = useState<ChildDashboardData>(emptyDashboard);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

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

        const [profileRes, gradeRes, classRes, subjectLinksRes, subjectClassLinksRes] = await Promise.all([
          supabase.from("profiles").select("id, full_name, avatar_url").eq("id", childId).maybeSingle(),
          student.grade_id
            ? supabase.from("grades").select("id, name, level").eq("id", student.grade_id).maybeSingle()
            : Promise.resolve({ data: null, error: null } as const),
          student.register_class_id
            ? supabase.from("register_classes").select("id, name").eq("id", student.register_class_id).maybeSingle()
            : Promise.resolve({ data: null, error: null } as const),
          supabase.from("student_subjects").select("subject_id").eq("student_id", childId),
          supabase.from("student_subject_classes").select("subject_class_id").eq("student_id", childId),
        ]);

        const directSubjectIds = (subjectLinksRes.data || []).map((item) => item.subject_id).filter(Boolean);
        const enrolledSubjectClassIds = (subjectClassLinksRes.data || []).map((item) => item.subject_class_id).filter(Boolean);
        const enrolledSubjectClassesRes = enrolledSubjectClassIds.length > 0
          ? await supabase.from("subject_classes").select("id, subject_id, name, teacher_id").in("id", enrolledSubjectClassIds)
          : { data: [] as any[], error: null as any };

        if (enrolledSubjectClassesRes.error) throw enrolledSubjectClassesRes.error;

        const classSubjectIds = (enrolledSubjectClassesRes.data || []).map((item) => item.subject_id).filter(Boolean);
        const subjectIds = [...new Set([...directSubjectIds, ...classSubjectIds])];

        const [subjectsRes, homeworkRes, subjectClassesRes, assignmentsRes, assignmentSubmissionsRes, quizzesRes, quizSubmissionsRes, gradesRes, attendanceRes, announcementsRes, alertsRes, topicsRes] = await Promise.all([
          subjectIds.length > 0
            ? supabase.from("subjects").select("id, name, grade_tier, category").in("id", subjectIds).order("name", { ascending: true })
            : Promise.resolve({ data: [] as any[], error: null as any }),
          subjectIds.length > 0
            ? supabase
                .from("homework_alerts")
                .select("id, title, instructions, textbook_reference, due_date, assigned_date, subject_id")
                .eq("status", "published")
                .in("subject_id", subjectIds)
                .order("due_date", { ascending: true })
                .limit(20)
            : Promise.resolve({ data: [] as any[], error: null as any }),
          subjectIds.length > 0
            ? supabase.from("subject_classes").select("id, subject_id, name, teacher_id").in("subject_id", subjectIds).order("name", { ascending: true })
            : Promise.resolve({ data: [] as any[], error: null as any }),
          subjectIds.length > 0
            ? supabase
                .from("assignments")
                .select("id, title, due_date, available_from, status, subject_id")
                .eq("status", "published")
                .in("subject_id", subjectIds)
                .order("created_at", { ascending: false })
                .limit(10)
            : Promise.resolve({ data: [] as any[], error: null as any }),
          supabase.from("assignment_submissions").select("assignment_id, status, submitted_at, total_grade, is_released").eq("student_id", childId),
          subjectIds.length > 0
            ? supabase.from("quizzes").select("id, title, subject_id, settings").eq("status", "published").in("subject_id", subjectIds).order("created_at", { ascending: false }).limit(30)
            : Promise.resolve({ data: [] as any[], error: null as any }),
          supabase.from("quiz_submissions").select("quiz_id, status, score, total_points").eq("student_id", childId),
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
          parentId
            ? supabase
                .from("user_notifications")
                .select("id, category, title, description, subject_name, created_at, read_at")
                .eq("recipient_id", parentId)
                .is("read_at", null)
                .order("created_at", { ascending: false })
                .limit(6)
            : Promise.resolve({ data: [] as any[], error: null as any }),
          subjectIds.length > 0
            ? supabase.from("topics").select("id, subject_id, title, order").in("subject_id", subjectIds).order("order", { ascending: true })
            : Promise.resolve({ data: [] as any[], error: null as any }),
        ]);

        if (subjectsRes.error) throw subjectsRes.error;
        if (subjectClassesRes.error) throw subjectClassesRes.error;
        if (assignmentsRes.error) throw assignmentsRes.error;
        // Homework alerts are an optional new table. Its migration should not
        // prevent the rest of the parent dashboard from loading.
        if (homeworkRes.error) console.warn("[ParentPortal] homework alerts unavailable", homeworkRes.error.message);
        if (assignmentSubmissionsRes.error) console.warn("[ParentPortal] assignment submissions unavailable", assignmentSubmissionsRes.error.message);
        if (quizzesRes.error) console.warn("[ParentPortal] quizzes unavailable", quizzesRes.error.message);
        if (quizSubmissionsRes.error) console.warn("[ParentPortal] quiz submissions unavailable", quizSubmissionsRes.error.message);
        if (gradesRes.error) console.warn("[ParentPortal] grades unavailable", gradesRes.error.message);
        if (attendanceRes.error) console.warn("[ParentPortal] attendance unavailable", attendanceRes.error.message);
        if (announcementsRes.error) console.warn("[ParentPortal] announcements unavailable", announcementsRes.error.message);
        if (alertsRes.error) console.warn("[ParentPortal] alerts unavailable", alertsRes.error.message);
        if (topicsRes.error) console.warn("[ParentPortal] topics unavailable", topicsRes.error.message);

        const topicRows = (topicsRes.data || []) as Array<{ id: string; subject_id: string; title: string; order: number }>;
        const topicIds = topicRows.map((item) => item.id);
        const lessonsRes = topicIds.length > 0
          ? await supabase.from("lessons").select("id, topic_id, title, content, order").in("topic_id", topicIds).order("order", { ascending: true })
          : { data: [] as any[], error: null as any };

        if (lessonsRes.error) console.warn("[ParentPortal] lessons unavailable", lessonsRes.error.message);

        const subjectClasses = (subjectClassesRes.data || []) as Array<{ id: string; subject_id: string | null; name: string | null; teacher_id: string | null }>;
        const subjectClassIds = subjectClasses.map((item) => item.id);
        const teacherIds = [...new Set(subjectClasses.map((item) => item.teacher_id).filter((value): value is string => Boolean(value)))];

        const [teacherProfilesRes, conversationsRes] = await Promise.all([
          teacherIds.length > 0
            ? supabase.from("profiles").select("id, full_name, role").in("id", teacherIds)
            : Promise.resolve({ data: [] as any[], error: null as any }),
          subjectClassIds.length > 0
            ? supabase
                .from("discussions")
                .select("id, title, content, subject_id, subject_class_id, created_at, updated_at, author_id, profiles!author_id(full_name, role)")
                .in("subject_class_id", subjectClassIds)
                .order("updated_at", { ascending: false })
                .limit(25)
            : Promise.resolve({ data: [] as any[], error: null as any }),
        ]);

        if (teacherProfilesRes.error) throw teacherProfilesRes.error;
        if (conversationsRes.error) throw conversationsRes.error;

        const conversationRows = (conversationsRes.data || []) as Array<{
          id: string;
          title: string;
          content: string;
          subject_id: string | null;
          subject_class_id: string | null;
          created_at: string;
          updated_at: string | null;
          author_id: string;
          profiles?: { full_name?: string | null; role?: string | null } | { full_name?: string | null; role?: string | null }[] | null;
        }>;

        const conversationIds = conversationRows.map((item) => item.id);
        const repliesRes = conversationIds.length > 0
          ? await supabase
              .from("discussion_replies")
              .select("id, discussion_id, content, created_at, profiles!author_id(full_name, role)")
              .in("discussion_id", conversationIds)
              .order("created_at", { ascending: true })
          : { data: [] as any[], error: null as any };

        if (repliesRes.error) throw repliesRes.error;

        if (cancelled) return;

        const repliesByDiscussionId = new Map<string, any[]>();
        for (const reply of repliesRes.data || []) {
          const bucket = repliesByDiscussionId.get(reply.discussion_id) || [];
          bucket.push(reply);
          repliesByDiscussionId.set(reply.discussion_id, bucket);
        }

        const submissionsByAssignment = new Map((assignmentSubmissionsRes.data || []).map((item) => [item.assignment_id, item]));
        const assignments = (assignmentsRes.data || []).map((item) => {
          const submission = submissionsByAssignment.get(item.id);
          return {
          id: item.id,
          title: safeText(item.title, "Untitled assignment"),
          dueDate: item.due_date || null,
          status: item.status || null,
          subjectId: item.subject_id || null,
          availableFrom: item.available_from || null,
          submissionStatus: submission?.status || null,
          submittedAt: submission?.submitted_at || null,
          grade: submission?.is_released ? Number(submission.total_grade || 0) : null,
          gradeReleased: Boolean(submission?.is_released),
        }; });

        const submissionsByQuiz = new Map((quizSubmissionsRes.data || []).map((item) => [item.quiz_id, item]));
        const quizzes = (quizzesRes.data || []).map((item) => {
          const submission = submissionsByQuiz.get(item.id);
          return { id: item.id, title: item.title, subjectId: item.subject_id || null, endDate: item.settings?.availability?.endDate || null, submissionStatus: submission?.status || null, score: submission?.score ?? null, totalPoints: submission?.total_points ?? null };
        });

        const homework = (homeworkRes.data || []).map((item) => ({
          id: item.id,
          title: item.title,
          instructions: item.instructions,
          textbookReference: item.textbook_reference || null,
          dueDate: item.due_date,
          assignedDate: item.assigned_date,
          subjectId: item.subject_id,
        }));

        const topicById = new Map(topicRows.map((item) => [item.id, item]));
        const lessons = (lessonsRes.data || []).map((item) => {
          const topic = topicById.get(item.topic_id);
          return {
            id: item.id,
            subjectId: topic?.subject_id || "",
            topicId: item.topic_id,
            topicTitle: safeText(topic?.title, "Topic"),
            title: safeText(item.title, "Untitled lesson"),
            preview: previewText(safeText(item.content, "Lesson content is available."), 140),
            order: Number(item.order || 0),
          };
        }).filter((item) => item.subjectId);

        const grades = (gradesRes.data || []).map((item) => {
          const numericScore = Number(item.score);
          return {
            id: item.id,
            subjectId: item.subject_id,
            assignmentGroupId: item.assignment_group_id,
            score: Number.isFinite(numericScore) ? numericScore : 0,
            hasScore: Number.isFinite(numericScore),
            feedback: item.feedback || null,
          };
        });

        const attendance = (attendanceRes.data || []).map((item) => ({
          id: item.id,
          date: safeDate(item.session?.attendance_date || item.marked_at) || new Date().toISOString(),
          mark: item.mark,
          note: item.note || null,
          className: item.session?.register_class_id || null,
        }));

        const announcements = (announcementsRes.data || []).map((item) => {
          const authorProfile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
          const targetGrades = Array.isArray(item.target_grades) ? item.target_grades : [];
          return {
            id: item.id,
          title: safeText(item.title, "School announcement"),
          content: safeText(item.content, "No announcement details were provided."),
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

        const alerts = (alertsRes.data || []).map((item) => ({
          id: item.id,
          category: safeText(item.category, "Update"),
          title: safeText(item.title, "New update for your child"),
          description: safeText(item.description, "Open the portal for more information."),
          subjectName: item.subject_name || null,
          createdAt: safeDate(item.created_at) || new Date().toISOString(),
          readAt: item.read_at || null,
        }));

        const scoredGrades = grades.filter((grade) => grade.hasScore).map((grade) => grade.score);
        const attendanceTotal = attendance.length;
        const attendancePresent = attendance.filter((entry) => ["present", "excused"].includes(String(entry.mark).toLowerCase())).length;
        const absenceCount = attendance.filter((entry) => String(entry.mark).toLowerCase() === "absent").length;
        const lateCount = attendance.filter((entry) => String(entry.mark).toLowerCase() === "late").length;
        const now = new Date();
        const inSevenDays = new Date(now);
        inSevenDays.setDate(now.getDate() + 7);
        const outstandingAssignments = assignments.filter((item) => !["submitted", "graded", "complete"].includes(String(item.submissionStatus).toLowerCase()));
        const overdueCount = outstandingAssignments.filter((item) => item.dueDate && new Date(item.dueDate) < now).length;
        const dueSoonCount = outstandingAssignments.filter((item) => item.dueDate && new Date(item.dueDate) >= now && new Date(item.dueDate) <= inSevenDays).length;
        const progress = {
          averageScore: scoredGrades.length ? scoredGrades.reduce((sum, score) => sum + score, 0) / scoredGrades.length : null,
          scoreCount: scoredGrades.length,
          attendanceRate: attendanceTotal ? (attendancePresent / attendanceTotal) * 100 : null,
          absenceCount,
          lateCount,
          overdueCount,
          dueSoonCount,
        };

        const subjectNameById = new Map(subjects.map((item) => [item.id, item.name]));
        const teacherById = new Map((teacherProfilesRes.data || []).map((item) => [item.id, item]));
        const conversationBySubjectClassId = new Map<string, (typeof conversationRows)[number]>();

        for (const item of conversationRows) {
          if (item.subject_class_id && !conversationBySubjectClassId.has(item.subject_class_id)) {
            conversationBySubjectClassId.set(item.subject_class_id, item);
          }
        }

        const subjectTeachers = subjectClasses
          .map((subjectClass) => {
            const teacher = subjectClass.teacher_id ? teacherById.get(subjectClass.teacher_id) : null;
            const subjectName = subjectClass.subject_id ? subjectNameById.get(subjectClass.subject_id) || null : null;
            const discussion = conversationBySubjectClassId.get(subjectClass.id) || null;
            const latestReply = discussion ? repliesByDiscussionId.get(discussion.id)?.at(-1) : null;

            return {
              id: subjectClass.id,
              subjectClassId: subjectClass.id,
              subjectId: subjectClass.subject_id,
              subjectName,
              teacherId: subjectClass.teacher_id,
              teacherName: teacher?.full_name || null,
              teacherRole: teacher?.role || null,
              discussionId: discussion?.id || null,
              discussionTitle: discussion?.title || null,
              preview: discussion ? previewText(latestReply?.content || discussion.content || "Conversation thread", 110) : null,
              replyCount: discussion ? (repliesByDiscussionId.get(discussion.id)?.length || 0) : 0,
              updatedAt: discussion?.updated_at || discussion?.created_at || null,
            };
          })
          .filter((item) => item.teacherId && item.teacherName);

        const conversations = conversationRows.map((item) => {
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
          subjectTeachers,
          assignments,
          quizzes,
          homework,
          lessons,
          grades,
          attendance,
          announcements,
          conversations,
          alerts,
          progress,
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
  }, [childId, parentId, reloadToken]);

  return {
    data,
    loading,
    errorMessage,
    reload: () => setReloadToken((current) => current + 1),
  };
}
