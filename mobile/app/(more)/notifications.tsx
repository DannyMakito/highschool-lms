import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { Bell, ClipboardList, FileText, CheckCircle2, Megaphone } from "lucide-react-native";
import { useAuth } from "../../src/context/AuthContext";
import { useSubjectsContext } from "../../src/context/SubjectsContext";
import { useAssignmentsContext } from "../../src/context/AssignmentsContext";
import { useMessagingContext } from "../../src/context/MessagingContext";
import { supabase } from "../../src/lib/supabase";
import { PlaceholderScreen, EmptyCheck } from "../../components/ui/placeholder-screen";

interface NotifItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  category: "quiz" | "assessment" | "grading" | "announcement";
}

const CATEGORY_ICON: Record<NotifItem["category"], React.ComponentType<{ color?: string; size?: number }>> = {
  quiz: ClipboardList,
  assessment: FileText,
  grading: CheckCircle2,
  announcement: Megaphone,
};

const CATEGORY_COLOR: Record<NotifItem["category"], string> = {
  quiz: "#6366f1",
  assessment: "#0ea5e9",
  grading: "#22c55e",
  announcement: "#f59e0b",
};

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { quizzes, submissions: quizSubmissions, subjects, loading: subjectsLoading } = useSubjectsContext();
  const { assignments, submissions: assignmentSubmissions, loading: assignmentsLoading } = useAssignmentsContext();
  const { announcements, loading: messagingLoading } = useMessagingContext();
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [enrollLoading, setEnrollLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("student_subjects")
        .select("subject_id")
        .eq("student_id", user.id);
      if (!cancelled) {
        setEnrolledIds((data || []).map((r: any) => r.subject_id));
        setEnrollLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const subjectName = (subjectId: string) => subjects.find((s) => s.id === subjectId)?.name;

  const notifications = useMemo<NotifItem[]>(() => {
    if (!user) return [];
    const items: NotifItem[] = [];

    quizzes
      .filter((q) => q.status === "published" && enrolledIds.includes(q.subjectId))
      .forEach((q) => {
        items.push({
          id: `quiz:${q.id}`,
          title: `New quiz in ${subjectName(q.subjectId) || "your class"}`,
          description: q.title,
          createdAt: q.createdAt,
          category: "quiz",
        });
      });

    assignments
      .filter((a) => a.status === "published" && enrolledIds.includes(a.subjectId))
      .forEach((a) => {
        items.push({
          id: `assignment:${a.id}`,
          title: `New assessment in ${subjectName(a.subjectId) || "your class"}`,
          description: a.title,
          createdAt: a.availableFrom || a.createdAt,
          category: "assessment",
        });
      });

    quizSubmissions
      .filter((s) => s.studentId === user.id && s.status === "completed")
      .forEach((s) => {
        const quiz = quizzes.find((q) => q.id === s.quizId);
        items.push({
          id: `quiz-grade:${s.id}`,
          title: "Quiz result available",
          description: `${quiz?.title || "A quiz"} has a score ready for review.`,
          createdAt: s.completedAt,
          category: "grading",
        });
      });

    assignmentSubmissions
      .filter((s) => s.studentId === user.id && (s.isReleased || s.status === "graded"))
      .forEach((s) => {
        const assignment = assignments.find((a) => a.id === s.assignmentId);
        items.push({
          id: `assignment-grade:${s.id}`,
          title: "Assignment feedback released",
          description: assignment?.title || "One of your assignments has been graded.",
          createdAt: s.submittedAt,
          category: "grading",
        });
      });

    announcements.forEach((a) => {
      items.push({
        id: `announcement:${a.id}`,
        title: "School announcement posted",
        description: a.title,
        createdAt: a.createdAt,
        category: "announcement",
      });
    });

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [user, quizzes, assignments, quizSubmissions, assignmentSubmissions, announcements, enrolledIds, subjects]);

  const loading = subjectsLoading || assignmentsLoading || messagingLoading || enrollLoading;

  if (loading) {
    return (
      <PlaceholderScreen title="Notification" subtitle="Your recent alerts" icon={Bell}>
        <View style={{ alignItems: "center", paddingVertical: 40 }}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ color: "#6b7280", marginTop: 12, fontSize: 14 }}>Loading notifications...</Text>
        </View>
      </PlaceholderScreen>
    );
  }

  return (
    <PlaceholderScreen
      title="Notification"
      subtitle={notifications.length ? `${notifications.length} alert${notifications.length !== 1 ? "s" : ""}` : "Your recent alerts"}
      icon={Bell}
    >
      {notifications.length === 0 ? (
        <EmptyCheck message="No notification available" />
      ) : (
        notifications.map((n) => {
          const Icon = CATEGORY_ICON[n.category];
          const color = CATEGORY_COLOR[n.category];
          return (
            <View key={n.id} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 14, marginBottom: 10, backgroundColor: "#fff" }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: color + "1a", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                <Icon color={color} size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#0f172a" }}>{n.title}</Text>
                <Text style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{n.description}</Text>
                <Text style={{ fontSize: 11, color: "#cbd5e1", marginTop: 6 }}>{new Date(n.createdAt).toLocaleDateString()}</Text>
              </View>
            </View>
          );
        })
      )}
    </PlaceholderScreen>
  );
}
