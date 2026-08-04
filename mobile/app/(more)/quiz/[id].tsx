import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSubjectsContext } from "../../../src/context/SubjectsContext";
import { useAuth } from "../../../src/context/AuthContext";
import { ChevronLeft, Clock, GraduationCap, AlertCircle, ArrowRight, Calendar } from "lucide-react-native";

export default function QuizDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { quizzes, subjects, submissions } = useSubjectsContext();
  const { user } = useAuth();

  const quiz = quizzes.find((q) => q.id === id);
  const subject = subjects.find((s) => s.id === quiz?.subjectId);

  const userSubmissions = submissions.filter((s) => s.quizId === id && s.studentId === user?.id);
  const attemptsTaken = userSubmissions.length;
  const attemptsRemaining = quiz ? (quiz.settings?.allowedAttempts || 0) - attemptsTaken : 0;
  const isOutOfAttempts = attemptsRemaining <= 0 && quiz?.settings?.allowedAttempts !== 0;

  if (!quiz) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: "#fff" }}>
        <View style={{ height: 64, width: 64, backgroundColor: "#f1f5f9", borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <AlertCircle color="#94a3b8" size={32} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: "900", color: "#0f172a", marginBottom: 8 }}>Quiz not found</Text>
        <Text style={{ color: "#64748b", textAlign: "center", marginBottom: 24 }}>The quiz you are looking for might have been closed or removed.</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ backgroundColor: "#0f172a", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const startDate = quiz.settings?.availability?.startDate ? new Date(quiz.settings.availability.startDate).toLocaleDateString() : 'N/A';
  const endDate = quiz.settings?.availability?.endDate ? new Date(quiz.settings.availability.endDate).toLocaleDateString() : 'N/A';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 24 }}
      >
        <ChevronLeft color="#64748b" size={20} />
        <Text style={{ color: "#64748b", fontWeight: "700", fontSize: 16 }}>Back to Quizzes</Text>
      </TouchableOpacity>

      <View style={{ marginBottom: 32 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <View style={{ backgroundColor: "#eef2ff", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
            <Text style={{ color: "#4f46e5", fontWeight: "700", fontSize: 12 }}>{subject?.name || "General"}</Text>
          </View>
          <Text style={{ color: "#cbd5e1" }}>-</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Calendar color="#94a3b8" size={14} />
            <View style={{ flexDirection: "column", gap: 2 }}>
              <Text style={{ fontSize: 10, fontWeight: "900", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
                Starts: {startDate}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: "900", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
                Ends: {endDate}
              </Text>
            </View>
          </View>
        </View>
        <Text style={{ fontSize: 32, fontWeight: "900", color: "#0f172a", lineHeight: 40, marginBottom: 12 }}>
          {quiz.title}
        </Text>
        <Text style={{ fontSize: 16, color: "#475569", fontWeight: "500", lineHeight: 24 }}>
          {quiz.description || "Once you've completed the learning material, please complete the assessment by clicking \"Start Assessment\""}
        </Text>
      </View>

      <View style={{ backgroundColor: "#fff", borderRadius: 32, borderWidth: 1, borderColor: "#f1f5f9", overflow: "hidden", marginBottom: 32, padding: 24 }}>
        <View style={{ flexDirection: "column", gap: 32 }}>
          {/* Row 1 */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center" }}>
                <Clock color="#94a3b8" size={20} />
              </View>
              <Text style={{ fontWeight: "700", color: "#64748b" }}>Duration:</Text>
            </View>
            <Text style={{ fontWeight: "900", color: "#0f172a", fontSize: 18 }}>{quiz.settings?.timeLimit || 0} min</Text>
          </View>

          {/* Row 2 */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center" }}>
                <GraduationCap color="#94a3b8" size={20} />
              </View>
              <Text style={{ fontWeight: "700", color: "#64748b" }}>Pass Mark:</Text>
            </View>
            <Text style={{ fontWeight: "900", color: "#0f172a", fontSize: 18 }}>{quiz.settings?.passingGrade || 0}%</Text>
          </View>
          
          <View style={{ height: 1, backgroundColor: "#f1f5f9" }} />

          {/* Row 3 */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontWeight: "700", color: "#64748b" }}>Attempts Taken:</Text>
            <Text style={{ fontWeight: "900", color: "#0f172a", fontSize: 18 }}>{attemptsTaken}</Text>
          </View>

          {/* Row 4 */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontWeight: "700", color: "#64748b" }}>Attempts Remaining:</Text>
            <Text style={{ fontWeight: "900", color: "#0f172a", fontSize: 18 }}>
              {(quiz.settings?.allowedAttempts === 0 || !quiz.settings) ? "Unlimited" : attemptsRemaining}
            </Text>
          </View>

          {/* Row 5 */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontWeight: "700", color: "#64748b" }}>Status:</Text>
            <View style={{ backgroundColor: attemptsTaken > 0 ? "#ecfdf5" : "#f1f5f9", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
              <Text style={{ color: attemptsTaken > 0 ? "#10b981" : "#94a3b8", fontWeight: "700", fontSize: 12 }}>
                {attemptsTaken > 0 ? "Done" : "Not Attempted"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: "column", gap: 16 }}>
        <TouchableOpacity
          style={{
            backgroundColor: isOutOfAttempts ? "#e2e8f0" : "#4f46e5",
            borderRadius: 16,
            height: 56,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
          disabled={isOutOfAttempts}
          onPress={() => router.push(`/quiz/${quiz.id}/take`)}
        >
          <Text style={{ color: isOutOfAttempts ? "#94a3b8" : "#fff", fontWeight: "900", fontSize: 16 }}>
            {attemptsTaken > 0 ? "Retake Assessment" : "Start Assessment"}
          </Text>
          <ArrowRight color={isOutOfAttempts ? "#94a3b8" : "#fff"} size={20} />
        </TouchableOpacity>
      </View>

      {isOutOfAttempts && (
        <View style={{ marginTop: 24, backgroundColor: "#fff1f2", padding: 16, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <AlertCircle color="#f43f5e" size={16} />
          <Text style={{ color: "#f43f5e", fontWeight: "700", fontSize: 12 }}>
            You have reached the maximum number of attempts for this quiz.
          </Text>
        </View>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}
