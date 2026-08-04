import React, { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSubjects } from "../../../../src/hooks/useSubjects";
import { HtmlContent } from "../../../../components/ui/html-content";
import { ChevronLeft, Play, FileText, CheckCircle, Circle } from "lucide-react-native";

export default function LessonScreen() {
  const router = useRouter();
  const { id, lessonId } = useLocalSearchParams<{ id: string; lessonId: string }>();
  const {
    subjects,
    lessons,
    getSubjectTopics,
    getTopicLessons,
    isLessonCompleted,
    toggleLessonCompletion,
    setLastLesson,
  } = useSubjects();

  const subject = subjects.find((s) => s.id === id);
  const lesson = lessons.find((l) => l.id === lessonId);

  const topics = useMemo(() => {
    if (!id) return [];
    return getSubjectTopics(id);
  }, [id, getSubjectTopics]);

  const allLessons = useMemo(() => {
    const result: { topic: string; lessons: typeof lessons }[] = [];
    for (const topic of topics) {
      const topicLessons = getTopicLessons(topic.id);
      if (topicLessons.length > 0) {
        result.push({ topic: topic.title, lessons: topicLessons });
      }
    }
    return result;
  }, [topics, getTopicLessons]);

  const currentIndex = useMemo(() => {
    for (const group of allLessons) {
      const idx = group.lessons.findIndex((l) => l.id === lessonId);
      if (idx !== -1) return { groupIdx: allLessons.indexOf(group), lessonIdx: idx };
    }
    return null;
  }, [allLessons, lessonId]);

  const nextLesson = useMemo(() => {
    if (!currentIndex) return null;
    const { groupIdx, lessonIdx } = currentIndex;
    const group = allLessons[groupIdx];
    if (lessonIdx < group.lessons.length - 1) {
      return group.lessons[lessonIdx + 1];
    }
    if (groupIdx < allLessons.length - 1) {
      return allLessons[groupIdx + 1].lessons[0];
    }
    return null;
  }, [allLessons, currentIndex]);

  React.useEffect(() => {
    if (id && lessonId) {
      setLastLesson(id, lessonId);
    }
  }, [id, lessonId]);

  if (!lesson || !subject) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 16, color: "#94a3b8" }}>Lesson not found</Text>
      </View>
    );
  }

  const completed = isLessonCompleted(lesson.id);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 }}>
        <TouchableOpacity
          onPress={() => router.push(`/subjects/${id}/outline` as any)}
          style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}
        >
          <ChevronLeft color="#1e293b" size={20} />
          <Text style={{ fontSize: 14, color: "#1e293b", marginLeft: 4 }}>{subject.name}</Text>
        </TouchableOpacity>

        {/* Video placeholder */}
        {lesson.videoUrl && (
          <View
            style={{
              backgroundColor: "#0f172a",
              borderRadius: 12,
              height: 200,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Play color="#fff" size={48} />
            <Text style={{ color: "#94a3b8", fontSize: 12, marginTop: 8 }}>Video Lesson</Text>
          </View>
        )}

        <Text style={{ fontSize: 22, fontWeight: "800", color: "#0f172a", marginBottom: 8 }}>{lesson.title}</Text>

        {/* Actions */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => toggleLessonCompletion(lesson.id)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: completed ? "#dcfce7" : "#f1f5f9",
              borderRadius: 8,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            {completed ? <CheckCircle color="#22c55e" size={16} /> : <Circle color="#64748b" size={16} />}
            <Text style={{ fontSize: 13, fontWeight: "600", color: completed ? "#166534" : "#475569" }}>
              {completed ? "Completed" : "Mark Complete"}
            </Text>
          </TouchableOpacity>

          {lesson.resourceUrl && (
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: "#f1f5f9",
                borderRadius: 8,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <FileText color="#475569" size={16} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#475569" }}>Resource</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <HtmlContent html={lesson.content} />
      </View>

      {/* Next Lesson */}
      {nextLesson && (
        <View style={{ paddingHorizontal: 20 }}>
          <TouchableOpacity
            onPress={() => router.push(`/subjects/${id}/lessons/${nextLesson.id}` as any)}
            style={{
              backgroundColor: "#0f172a",
              borderRadius: 12,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: "700", marginBottom: 4 }}>
                Next Lesson
              </Text>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>{nextLesson.title}</Text>
            </View>
            <ChevronLeft color="#fff" size={18} style={{ transform: [{ rotate: "180deg" }] }} />
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
