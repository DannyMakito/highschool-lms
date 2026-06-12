import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { ChildDashboardData } from "../../types/dashboard";

const emptyDashboard: ChildDashboardData = {
  assignments: [],
  grades: [],
  attendance: [],
  announcements: [],
};

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
        const { data: childRes, error: childError } = await supabase
          .from("students")
          .select("id, register_class_id, grade_id, administration_number")
          .eq("id", childId)
          .maybeSingle();
        if (childError) {
          console.warn("[ParentPortal] child lookup failed", childError.message);
        }

        const { data: subjectLinks } = await supabase
          .from("student_subjects")
          .select("subject_id")
          .eq("student_id", childId);

        const subjectIds = (subjectLinks || []).map((item) => item.subject_id);

        const assignmentsPromise = subjectIds.length > 0
          ? supabase
              .from("assignments")
              .select("id, title, due_date, available_from, status, subject_id")
              .eq("status", "published")
              .in("subject_id", subjectIds)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as any[], error: null as any });

        const gradesPromise = subjectIds.length > 0
          ? supabase
              .from("student_gradebook_scores")
              .select("id, subject_id, assignment_group_id, score, feedback")
              .eq("student_id", childId)
              .in("subject_id", subjectIds)
              .order("updated_at", { ascending: false })
          : Promise.resolve({ data: [] as any[], error: null as any });

        const attendancePromise = childRes?.register_class_id
          ? supabase
              .from("register_attendance_entries")
              .select("id, mark, note, marked_at, session:register_attendance_sessions(attendance_date, register_class_id)")
              .eq("student_id", childId)
              .order("marked_at", { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [] as any[], error: null as any });

        const announcementsPromise = supabase
          .from("announcements")
          .select("id, title, content, created_at, profiles!author_id(full_name)")
          .order("created_at", { ascending: false })
          .limit(8);

        const [assignmentsRes, gradesRes, attendanceRes, announcementsRes] = await Promise.all([
          assignmentsPromise,
          gradesPromise,
          attendancePromise,
          announcementsPromise,
        ]);

        if (cancelled) return;

        const assignments = (assignmentsRes.data || []).map((item) => ({
          id: item.id,
          title: item.title,
          dueDate: item.due_date || null,
          status: item.status || null,
          subjectId: item.subject_id || null,
          availableFrom: item.available_from || null,
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
          return {
            id: item.id,
            title: item.title,
            content: item.content,
            createdAt: item.created_at,
            authorName: authorProfile?.full_name || null,
          };
        });

        setData({ assignments, grades, attendance, announcements });
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
