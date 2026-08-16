import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSubjects } from "../../../src/hooks/useSubjects";
import { useMessagingContext } from "../../../src/context/MessagingContext";
import { useAuth } from "../../../src/context/AuthContext";
import { Progress, ProgressFilledTrack } from "@/components/ui/progress";
import { ChevronLeft, ChevronDown, ChevronRight, Play, MessageCircle, CheckCircle, Circle } from "lucide-react-native";

export default function SubjectOutlineScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const {
    subjects,
    getSubjectTopics,
    getTopicLessons,
    getSubjectProgress,
    getSubjectLessonsCount,
    getSubjectCompletedLessonsCount,
    isLessonCompleted,
  } = useSubjects();
  const { getSubjectDiscussions } = useMessagingContext();

  const subject = subjects.find((s) => s.id === id);

  const topics = useMemo(() => {
    if (!id) return [];
    return getSubjectTopics(id);
  }, [id, getSubjectTopics]);

  const progress = useMemo(() => {
    if (!id) return 0;
    return getSubjectProgress(id);
  }, [id, getSubjectProgress]);

  const totalLessons = useMemo(() => {
    if (!id) return 0;
    return getSubjectLessonsCount(id);
  }, [id, getSubjectLessonsCount]);

  const completedLessons = useMemo(() => {
    if (!id) return 0;
    return getSubjectCompletedLessonsCount(id);
  }, [id, getSubjectCompletedLessonsCount]);

  const discussionsCount = useMemo(() => {
    if (!id) return 0;
    return getSubjectDiscussions(id).length;
  }, [id, getSubjectDiscussions]);

  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  const hasStarted = completedLessons > 0;

  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  const handleStartLearning = () => {
    if (!id) return;
    const firstTopic = topics[0];
    if (firstTopic) {
      const lessons = getTopicLessons(firstTopic.id);
      if (lessons.length > 0) {
        router.push(`/subjects/${id}/lessons/${lessons[0].id}` as any);
      }
    }
  };

  if (!subject) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 16, color: "#94a3b8" }}>Subject not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}
        >
          <ChevronLeft color="#1e293b" size={20} />
          <Text style={{ fontSize: 14, color: "#1e293b", marginLeft: 4 }}>Back to my courses</Text>
        </TouchableOpacity>

        {/* Badges */}
        {subject.gradeTier && (
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            <View style={{ backgroundColor: "#f1f5f9", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#475569" }}>Grade {subject.gradeTier}</Text>
            </View>
          </View>
        )}

        {/* Title */}
        <Text style={{ fontSize: 28, fontWeight: "900", color: "#0f172a", lineHeight: 34, marginBottom: 8 }}>
          {subject.name}
        </Text>

        {/* Description */}
        {subject.description ? (
          <Text style={{ fontSize: 15, color: "#64748b", lineHeight: 22 }}>{subject.description}</Text>
        ) : null}
      </View>

      {/* Course Progress */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
            Course Progress
          </Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#0f172a" }}>{progress}%</Text>
        </View>
        <Progress value={progress} style={{ height: 6, backgroundColor: "#e2e8f0", borderRadius: 3 }}>
          <ProgressFilledTrack style={{ backgroundColor: "#0f172a", borderRadius: 3 }} />
        </Progress>
        <Text style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
          {completedLessons} of {totalLessons} lessons completed
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 32 }}>
        <TouchableOpacity
          onPress={handleStartLearning}
          style={{
            flex: 1,
            backgroundColor: "#0f172a",
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>{hasStarted ? "Continue Learning" : "Start Learning"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push(`/subjects/${id}/discussions` as any)}
          style={{
            flex: 1,
            backgroundColor: "#f1f5f9",
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <MessageCircle color="#475569" size={16} />
          <Text style={{ color: "#475569", fontSize: 14, fontWeight: "700" }}>Discussions</Text>
          {discussionsCount > 0 && (
            <View style={{ backgroundColor: "#475569", borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{discussionsCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Course Curriculum */}
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: "#0f172a", marginBottom: 16 }}>Course Curriculum</Text>

        {topics.length === 0 && (
          <View style={{ padding: 32, alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0" }}>
            <Text style={{ fontSize: 14, color: "#94a3b8" }}>No curriculum available yet</Text>
          </View>
        )}

        {topics.map((topic, topicIdx) => {
          const lessons = getTopicLessons(topic.id);
          const isExpanded = expandedTopics[topic.id] ?? false;
          const topicCompletedCount = lessons.filter((l) => isLessonCompleted(l.id)).length;

          return (
            <View key={topic.id} style={{ marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, overflow: "hidden" }}>
              {/* Topic Header */}
              <TouchableOpacity
                onPress={() => toggleTopic(topic.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#f8fafc",
                  padding: 14,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#0f172a" }}>
                    {topicIdx + 1}. {topic.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                    {topicCompletedCount}/{lessons.length} lessons
                  </Text>
                </View>
                {isExpanded ? (
                  <ChevronDown color="#64748b" size={18} />
                ) : (
                  <ChevronRight color="#64748b" size={18} />
                )}
              </TouchableOpacity>

              {/* Lessons List */}
              {isExpanded && (
                <View style={{ borderTopWidth: 1, borderTopColor: "#e2e8f0" }}>
                  {lessons.map((lesson, lessonIdx) => {
                    const completed = isLessonCompleted(lesson.id);
                    return (
                      <TouchableOpacity
                        key={lesson.id}
                        onPress={() => router.push(`/subjects/${id}/lessons/${lesson.id}` as any)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          padding: 12,
                          paddingLeft: 20,
                          borderBottomWidth: lessonIdx < lessons.length - 1 ? 1 : 0,
                          borderBottomColor: "#f1f5f9",
                        }}
                      >
                        {completed ? (
                          <CheckCircle color="#22c55e" size={18} />
                        ) : (
                          <Circle color="#cbd5e1" size={18} />
                        )}
                        <Text
                          style={{
                            flex: 1,
                            marginLeft: 10,
                            fontSize: 13,
                            color: completed ? "#22c55e" : "#334155",
                          }}
                        >
                          {lesson.title}
                        </Text>
                        {lesson.videoUrl && (
                          <View style={{ backgroundColor: "#f1f5f9", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Play color="#64748b" size={10} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
