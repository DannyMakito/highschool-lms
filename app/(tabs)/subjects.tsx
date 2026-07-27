import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SectionCard } from "../../src/components/SectionCard";
import { useAuth } from "../../src/context/AuthContext";

const subjectScaffold = [
  { id: "mathematics", name: "Mathematics", teacher: "Subject teacher", latest: "Performance and homework will appear here." },
  { id: "english", name: "English", teacher: "Subject teacher", latest: "Quizzes, tests, and feedback will appear here." },
  { id: "life-sciences", name: "Life Sciences", teacher: "Subject teacher", latest: "Upcoming exams and scores will appear here." },
];

export default function SubjectsScreen() {
  const { activeChild } = useAuth();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Subjects</Text>
      <Text style={styles.subtitle}>{activeChild ? activeChild.fullName : "Select a learner to view subjects."}</Text>

      <View style={styles.stack}>
        {subjectScaffold.map((subject) => (
          <Link key={subject.id} href={`/subject/${subject.id}`} asChild>
            <Pressable>
              <SectionCard title={subject.name} subtitle={subject.teacher}>
                <Text style={styles.body}>{subject.latest}</Text>
                <Text style={styles.link}>Open subject</Text>
              </SectionCard>
            </Pressable>
          </Link>
        ))}
      </View>
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
  title: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: "#475569",
    marginTop: 6,
    marginBottom: 16,
  },
  stack: {
    gap: 12,
  },
  body: {
    color: "#334155",
    lineHeight: 20,
    marginBottom: 10,
  },
  link: {
    color: "#1d4ed8",
    fontWeight: "800",
  },
});
