import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { ClipboardList, Clock, ListChecks } from "lucide-react-native";
import { useAuth } from "../../src/context/AuthContext";
import { useSubjectsContext } from "../../src/context/SubjectsContext";
import { supabase } from "../../src/lib/supabase";
import { PlaceholderScreen, EmptyCheck } from "../../components/ui/placeholder-screen";

export default function QuizScreen() {
  const { user } = useAuth();
  const { quizzes, loading: quizzesLoading } = useSubjectsContext();
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

  const visibleQuizzes = useMemo(() => {
    return quizzes
      .filter((q) => q.status === "published" && enrolledIds.includes(q.subjectId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [quizzes, enrolledIds]);

  if (quizzesLoading || enrollLoading) {
    return (
      <PlaceholderScreen title="Quiz" subtitle="Available quizzes" icon={ClipboardList}>
        <View style={{ alignItems: "center", paddingVertical: 40 }}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ color: "#6b7280", marginTop: 12, fontSize: 14 }}>Loading quizzes...</Text>
        </View>
      </PlaceholderScreen>
    );
  }

  return (
    <PlaceholderScreen
      title="Quiz"
      subtitle={visibleQuizzes.length ? `${visibleQuizzes.length} quiz${visibleQuizzes.length !== 1 ? "zes" : ""} available` : "Available quizzes"}
      icon={ClipboardList}
    >
      {visibleQuizzes.length === 0 ? (
        <EmptyCheck message="No quiz available" />
      ) : (
        visibleQuizzes.map((quiz) => {
          const questionCount = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
          const timeLimit = quiz.settings?.timeLimit;
          return (
            <TouchableOpacity
              key={quiz.id}
              activeOpacity={0.7}
              style={{ borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 16, marginBottom: 12, backgroundColor: "#fff" }}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#0f172a", marginBottom: 6 }}>{quiz.title}</Text>
              {quiz.description ? (
                <Text style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }} numberOfLines={2}>
                  {quiz.description}
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <ListChecks color="#9ca3af" size={14} />
                  <Text style={{ fontSize: 12, color: "#94a3b8" }}>{questionCount} questions</Text>
                </View>
                {timeLimit ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Clock color="#9ca3af" size={14} />
                    <Text style={{ fontSize: 12, color: "#94a3b8" }}>{timeLimit} min</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </PlaceholderScreen>
  );
}
