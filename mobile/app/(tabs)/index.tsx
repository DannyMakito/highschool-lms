import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Image, ActivityIndicator } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { supabase } from "../../src/lib/supabase";

const styles = {
  screen: { flex: 1, backgroundColor: "#0f172a", padding: 24 } as const,
  title: { color: "#ffffff", fontSize: 26, fontWeight: "700", marginBottom: 4 } as const,
  subtitle: { color: "#94a3b8", fontSize: 13 } as const,
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#0f172a",
    padding: 20,
  } as const,
  cardHeader: { color: "#ffffff", fontSize: 18, fontWeight: "600" } as const,
  muted: { color: "#94a3b8", fontSize: 13 } as const,
  announcementsList: { marginTop: 12, gap: 12 } as const,
  announcementItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "rgba(2,6,23,0.35)",
    paddingHorizontal: 12,
    paddingVertical: 12,
  } as const,
  announcementTitle: { color: "#ffffff", fontSize: 14, fontWeight: "700" } as const,
  announcementBody: { color: "#cbd5e1", fontSize: 12, marginTop: 4 } as const,
  subjectsList: { marginTop: 16, gap: 12 } as const,
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "rgba(2,6,23,0.35)",
    paddingHorizontal: 12,
    paddingVertical: 12,
  } as const,
  subjectName: { color: "#ffffff", fontSize: 14, fontWeight: "700" } as const,
  subjectMeta: { color: "#cbd5e1", fontSize: 12, marginTop: 6 } as const,
  thumb: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#1f2937" } as const,
  spacerMb4: { marginBottom: 16 } as const,
};

type StudentSubjectRow = {
  subject_id: string;
};

type StudentSubjectClassRow = {
  subject_id: string;
};

type SubjectRow = {
  id: string;
  name: string;
  thumbnail?: string | null;
};

type TopicRow = {
  id: string;
  subject_id: string;
};

type LessonRow = {
  id: string;
  topic_id: string;
};

type ProgressRow = {
  lesson_id: string;
};

type AnnouncementRow = {
  id: string;
  title?: string | null;
  body?: string | null;
  created_at?: string | null;
  // optional audience fields (schema may vary)
  audience_role?: string | string[] | null;
  role?: string | null;
};

function ProgressRing({
  percent,
  size = 46,
}: {
  percent: number;
  size?: number;
}) {
  // SVG-based ring requires `react-native-svg`.
  // This View-based fallback avoids hard dependency while still showing progress.
  const p = Math.max(0, Math.min(100, percent));
  const track = "rgba(148,163,184,0.25)";
  const fill = "#22c55e";

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: track,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.25)",
      }}
    >
      <View
        style={{
          position: "absolute",
          top: 2,
          left: 2,
          right: 2,
          bottom: 2,
          borderRadius: size / 2,
          backgroundColor: "rgba(2,6,23,0.35)",
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 2,
          left: 2,
          bottom: 2,
          width: `${p}%`,
          borderRadius: size / 2,
          backgroundColor: fill,
          opacity: 0.35,
        }}
      />
      <Text style={{ zIndex: 1, color: "#ffffff", fontSize: 10, fontWeight: "700" }}>
        {p}%
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { user, isAuthenticated, loading } = useAuth();

  const [studentSubjectIds, setStudentSubjectIds] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [progressBySubjectId, setProgressBySubjectId] = useState<Record<string, { completed: number; total: number }>>(
    {}
  );

  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const studentId = user?.id;

  const welcomeName = useMemo(() => {
    const name = user?.name?.trim();
    if (!name) return "Student";
    return name.split(" ")[0];
  }, [user?.name]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isAuthenticated || loading) return;
      if (!studentId) return;

      setLoadingDashboard(true);
      try {
        // 1) Fetch which subjects belong to this student
        // student_subjects
        const ssRes = await supabase
          .from("student_subjects")
          .select("subject_id")
          .eq("student_id", studentId);

        let subjectIds: string[] = [];
        if (!ssRes.error && Array.isArray(ssRes.data)) {
          subjectIds = ssRes.data.map((r: StudentSubjectRow) => r.subject_id).filter(Boolean);
        }

        // fallback: student_subject_classes
        if (subjectIds.length === 0) {
          const scRes = await supabase
            .from("student_subject_classes")
            .select("subject_id")
            .eq("student_id", studentId);

          if (!scRes.error && Array.isArray(scRes.data)) {
            subjectIds = scRes.data.map((r: StudentSubjectClassRow) => r.subject_id).filter(Boolean);
          }
        }

        if (cancelled) return;
        setStudentSubjectIds(subjectIds);

        if (subjectIds.length === 0) {
          setSubjects([]);
          setProgressBySubjectId({});
        } else {
          // 2) Fetch subjects filtered by assigned IDs
          const subjectsRes = await supabase
            .from("subjects")
            .select("id,name,thumbnail")
            .in("id", subjectIds);

          const fetchedSubjects: SubjectRow[] = !subjectsRes.error ? (subjectsRes.data as any) : [];
          if (cancelled) return;
          setSubjects(fetchedSubjects || []);

          // 3) Fetch topics for those subjects, then lessons
          const topicsRes = await supabase
            .from("topics")
            .select("id,subject_id")
            .in("subject_id", subjectIds);

          const topics: TopicRow[] = !topicsRes.error ? (topicsRes.data as any) : [];
          const topicIds = topics.map((t) => t.id);

          const lessonsRes = topicIds.length
            ? await supabase.from("lessons").select("id,topic_id").in("topic_id", topicIds)
            : ({ data: [], error: null } as any);

          const lessons: LessonRow[] = !lessonsRes.error ? (lessonsRes.data as any) : [];

          // 4) Fetch progress rows for this user (completed lessons)
          const progressRes = await supabase
            .from("user_lesson_progress")
            .select("lesson_id")
            .eq("user_id", studentId);

          const completedLessonIds: string[] = !progressRes.error
            ? (progressRes.data as any[]).map((p) => p.lesson_id).filter(Boolean)
            : [];

          // 5) Calculate completed/total per subject
          const lessonIdBySubject: Record<string, string[]> = {};
          const subjectIdByTopicId: Record<string, string> = {};
          for (const t of topics) subjectIdByTopicId[t.id] = t.subject_id;

          for (const l of lessons) {
            const sid = subjectIdByTopicId[l.topic_id];
            if (!sid) continue;
            if (!lessonIdBySubject[sid]) lessonIdBySubject[sid] = [];
            lessonIdBySubject[sid].push(l.id);
          }

          const nextProgress: Record<string, { completed: number; total: number }> = {};
          const completedSet = new Set(completedLessonIds);

          for (const sid of subjectIds) {
            const lessonIds = lessonIdBySubject[sid] || [];
            const total = lessonIds.length;
            const completed = lessonIds.filter((id) => completedSet.has(id)).length;
            nextProgress[sid] = { completed, total };
          }

          if (cancelled) return;
          setProgressBySubjectId(nextProgress);
        }

        // 6) Fetch announcements relevant to the student (best-effort)
        // Since schema may vary, we fetch latest and filter on known audience fields.
        const annRes = await supabase
          .from("announcements")
          .select("id,title,body,created_at")
          .order("created_at", { ascending: false })
          .limit(6);

        if (!annRes.error && Array.isArray(annRes.data)) {
          // Best-effort relevance without assuming optional columns exist.
          // If your table has audience columns later, we can re-introduce them safely.
          if (!cancelled) setAnnouncements((annRes.data as AnnouncementRow[]).slice(0, 3));
        } else {
          if (!cancelled) setAnnouncements([]);
        }
      } catch (e) {
        console.error("[Dashboard] load error:", e);
      } finally {
        if (!cancelled) setLoadingDashboard(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loading, studentId]);

  const isLoading = loading || loadingDashboard;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ marginBottom: 24 }}>
        <Text style={styles.title}>Welcome back, {welcomeName}!</Text>
        <Text style={styles.subtitle}>Track your progress and updates</Text>
      </View>

      {isLoading ? (
        <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
          <ActivityIndicator size="large" color="#06b6d4" />
        </View>
      ) : (
        <>
          {/* Announcements */}
          <View style={[styles.card, styles.spacerMb4]}>
            <Text style={styles.cardHeader}>Announcements</Text>

            {announcements.length === 0 ? (
              <Text style={[styles.muted, { marginTop: 8 }]}>No announcements right now.</Text>
            ) : (
              <View style={styles.announcementsList as any}>
                {announcements.map((a) => (
                  <View key={a.id} style={styles.announcementItem}>
                    <Text style={styles.announcementTitle}>{a.title || "Untitled"}</Text>
                    {a.body ? (
                      <Text style={styles.announcementBody} numberOfLines={2}>
                        {a.body}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Subjects */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Your Subjects</Text>
            <Text style={[styles.muted, { marginTop: 4 }]}>
              {subjects.length === 1 ? "1 subject" : `${subjects.length} subjects`}
            </Text>

            {subjects.length === 0 ? (
              <Text style={[styles.muted, { marginTop: 16 }]}>No subjects assigned.</Text>
            ) : (
              <View style={styles.subjectsList as any}>
                {subjects.map((s) => {
                  const prog = progressBySubjectId[s.id] || { completed: 0, total: 0 };
                  const percent =
                    prog.total === 0 ? 0 : Math.round((prog.completed / prog.total) * 100);

                  return (
                    <View key={s.id} style={styles.subjectRow}>
                      <View style={{ marginRight: 12 }}>
                        <ProgressRing percent={percent} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.subjectName}>{s.name}</Text>
                        <Text style={styles.subjectMeta}>
                          {prog.completed}/{prog.total} lessons
                        </Text>
                      </View>

                      {s.thumbnail ? (
                        <Image
                          source={{ uri: s.thumbnail }}
                          style={styles.thumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.thumb} />
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}
