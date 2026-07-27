import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { ChildDashboardData } from "../../types/dashboard";

const emptyDashboard: ChildDashboardData = {
  child: null,
  subjects: [],
  subjectTeachers: [],
  assignments: [],
  homework: [],
  grades: [],
  attendance: [],
  announcements: [],
  conversations: [],
};

function previewText(value: string, length: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > length ? `${normalized.slice(0, length - 1)}...` : normalized;
}

export function useChildDashboard(childId?: string | null) {
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

        const [subjectsRes, subjectClassesRes, assignmentsRes, homeworkRes, gradesRes, attendanceRes, announcementsRes] = await Promise.all([
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
        ]);

        if (subjectsRes.error) throw subjectsRes.error;
        if (subjectClassesRes.error) throw subjectClassesRes.error;
        if (assignmentsRes.error) throw assignmentsRes.error;
        if (homeworkRes.error) throw homeworkRes.error;
        if (gradesRes.error) throw gradesRes.error;
        if (attendanceRes.error) throw attendanceRes.error;
        if (announcementsRes.error) throw announcementsRes.error;

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

        const assignments = (assignmentsRes.data || []).map((item) => ({
          id: item.id,
          title: item.title,
          dueDate: item.due_date || null,
          status: item.status || null,
          subjectId: item.subject_id || null,
          availableFrom: item.available_from || null,
        }));

        const homework = (homeworkRes.data || []).map((item) => ({
          id: item.id,
          title: item.title,
          instructions: item.instructions,
          textbookReference: item.textbook_reference || null,
          dueDate: item.due_date,
          assignedDate: item.assigned_date,
          subjectId: item.subject_id,
        }));

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
          homework,
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
  }, [childId, reloadToken]);

  return {
    data,
    loading,
    errorMessage,
    reload: () => setReloadToken((current) => current + 1),
  };
}
