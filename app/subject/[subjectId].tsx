import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SectionCard } from "../../src/components/SectionCard";
import { useAuth } from "../../src/context/AuthContext";

const subjectNames: Record<string, string> = {
  mathematics: "Mathematics",
  english: "English",
  "life-sciences": "Life Sciences",
};

export default function SubjectDetailScreen() {
  const params = useLocalSearchParams<{ subjectId?: string }>();
  const { activeChild } = useAuth();
  const subjectId = Array.isArray(params.subjectId) ? params.subjectId[0] : params.subjectId;
  const subjectName = subjectId ? subjectNames[subjectId] || "Subject" : "Subject";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>{activeChild ? activeChild.fullName : "Learner"}</Text>
      <Text style={styles.title}>{subjectName}</Text>

      <SectionCard title="Performance" subtitle="Scores and feedback by assessment">
        <View style={styles.metricRow}>
          <Text style={styles.metric}>Average</Text>
          <Text style={styles.metricValue}>--</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metric}>Latest score</Text>
          <Text style={styles.metricValue}>--</Text>
        </View>
      </SectionCard>

      <SectionCard title="Homework" subtitle="Upcoming and completed work">
        <Text style={styles.body}>Homework items will show due dates, status, score, and teacher feedback.</Text>
      </SectionCard>

      <SectionCard title="Tests And Exams" subtitle="Upcoming and completed assessments">
        <Text style={styles.body}>Quizzes, tests, and exam results will be grouped here.</Text>
      </SectionCard>

      <SectionCard title="Teacher Chat" subtitle="One-on-one subject support">
        <Text style={styles.body}>This will open a private thread with the subject teacher for this learner.</Text>
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  eyebrow: {
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    color: "#0f172a",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  metric: {
    color: "#475569",
    fontWeight: "700",
  },
  metricValue: {
    color: "#0f172a",
    fontWeight: "900",
  },
  body: {
    color: "#334155",
    lineHeight: 20,
  },
});
